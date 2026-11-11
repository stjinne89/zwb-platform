"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ZWIFT_TOKEN_URL,
  describeFetchError,
  loginBody,
  segmentResultsUrl,
  subgroupResultsUrl,
  summarizePassages,
  tallyBurst,
} from "@/lib/zwift/browser-probe";
import { decodeSegmentResults } from "@/lib/zwift/segment-results-pb";

type Segment = { segmentId: string; name: string };
type LogLine = { at: number; action: string; status: string; ms: number | null; detail: string };
type Target = "segment" | "uitslag";

const INPUT = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const REPEAT_MS = 15_000;

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString("nl-NL", { hour12: false });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ZwiftProbe({ segments, defaultSegmentId }: { segments: Segment[]; defaultSegmentId: string }) {
  // Het token blijft alleen in het geheugen van deze pagina: niet opslaan, niet tonen.
  const token = useRef<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [segmentId, setSegmentId] = useState(defaultSegmentId);
  const [minutes, setMinutes] = useState(60);
  const [subgroupId, setSubgroupId] = useState("");
  const [apiVersion, setApiVersion] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [burstTarget, setBurstTarget] = useState<Target>("segment");
  const [burstRate, setBurstRate] = useState(2);
  const [burstCount, setBurstCount] = useState(60);
  const [busy, setBusy] = useState(false);
  const stopBurst = useRef(false);
  const [log, setLog] = useState<LogLine[]>([]);

  function add(line: Omit<LogLine, "at">) {
    setLog((lines) => [{ at: Date.now(), ...line }, ...lines].slice(0, 500));
  }

  async function login() {
    const started = performance.now();
    try {
      const response = await fetch(ZWIFT_TOKEN_URL, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: loginBody(username, password),
      });
      const ms = Math.round(performance.now() - started);
      const json = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
      if (response.ok && json?.access_token) {
        token.current = json.access_token;
        setExpiresAt(Date.now() + (json.expires_in ?? 3600) * 1000);
        add({ action: "inloggen", status: String(response.status), ms, detail: `token voor ${json.expires_in ?? "?"} s` });
      } else {
        add({ action: "inloggen", status: String(response.status), ms, detail: "geen token" });
      }
    } catch (error) {
      add({ action: "inloggen", status: "fout", ms: null, detail: describeFetchError(error) });
    } finally {
      setPassword("");
    }
  }

  function headers(accept: string, withVersion = false): Record<string, string> {
    const result: Record<string, string> = { accept, authorization: `Bearer ${token.current ?? ""}` };
    if (withVersion) result["Zwift-Api-Version"] = "2.7";
    return result;
  }

  async function fetchSegment(quiet = false): Promise<number | "fout"> {
    const started = performance.now();
    try {
      const url = segmentResultsUrl(segmentId, Date.now() - minutes * 60_000);
      const response = await fetch(url, { cache: "no-store", headers: headers("application/x-protobuf-lite") });
      const ms = Math.round(performance.now() - started);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!quiet) {
        let detail = `${bytes.length} bytes`;
        if (response.status === 200) {
          const summary = summarizePassages(decodeSegmentResults(bytes), Date.now());
          detail = `${summary.passages} passages, ${summary.riders} renners, laatste ${summary.newestAgeS ?? "–"} s geleden`;
        }
        add({ action: "segment", status: String(response.status), ms, detail });
      }
      return response.status;
    } catch (error) {
      if (!quiet) add({ action: "segment", status: "fout", ms: null, detail: describeFetchError(error) });
      return "fout";
    }
  }

  async function fetchResults(quiet = false): Promise<number | "fout"> {
    const started = performance.now();
    try {
      const response = await fetch(subgroupResultsUrl(subgroupId), {
        cache: "no-store",
        headers: headers("application/json", apiVersion),
      });
      const ms = Math.round(performance.now() - started);
      if (!quiet) {
        let detail = response.headers.get("content-type") ?? "";
        if (response.status === 200) {
          const payload = (await response.json().catch(() => null)) as unknown;
          const rows = Array.isArray(payload) ? payload : ((payload as { entries?: unknown[] })?.entries ?? []);
          detail = `${rows.length} rijen`;
        }
        add({ action: apiVersion ? "uitslag (met versie)" : "uitslag", status: String(response.status), ms, detail });
      }
      return response.status;
    } catch (error) {
      if (!quiet) add({ action: "uitslag", status: "fout", ms: null, detail: describeFetchError(error) });
      return "fout";
    }
  }

  async function burst() {
    setBusy(true);
    stopBurst.current = false;
    const statuses: Array<number | "fout"> = [];
    const spacing = 1000 / burstRate;
    const started = performance.now();
    for (let i = 0; i < burstCount && !stopBurst.current; i++) {
      const tick = performance.now();
      const status = await (burstTarget === "segment" ? fetchSegment(true) : fetchResults(true));
      statuses.push(status);
      // Stoppen bij het eerste niet-200 antwoord: doorgaan maakt een blokkade alleen langer.
      if (status !== 200) break;
      const wait = spacing - (performance.now() - tick);
      if (wait > 0) await sleep(wait);
    }
    const tally = tallyBurst(statuses);
    const counts = Object.entries(tally.byStatus).map(([status, n]) => `${status}×${n}`).join(", ");
    add({
      action: `burst ${burstTarget} ${burstRate}/s`,
      status: tally.firstFailAt ? "stop" : "klaar",
      ms: Math.round(performance.now() - started),
      detail: `${tally.sent} verzoeken: ${counts}; eerste niet-200 bij ${tally.firstFailAt ?? "–"}`,
    });
    setBusy(false);
  }

  // Herhalen zoals de live stand: elke 15 s één keer het segment.
  const fetchSegmentRef = useRef(fetchSegment);
  useEffect(() => {
    fetchSegmentRef.current = fetchSegment;
  });
  useEffect(() => {
    if (!repeat) return;
    const timer = setInterval(() => void fetchSegmentRef.current(), REPEAT_MS);
    return () => clearInterval(timer);
  }, [repeat]);

  async function copyLog() {
    const text = [...log]
      .reverse()
      .map((line) => `${clock(line.at)}\t${line.action}\t${line.status}\t${line.ms ?? ""}\t${line.detail}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
  }

  const loggedIn = expiresAt !== null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Zwift-meting</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Inloggen</h2>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <input
            className={INPUT}
            type="email"
            autoComplete="username"
            placeholder="E-mail"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            className={INPUT}
            type="password"
            autoComplete="current-password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" disabled={!username || !password}>
            Inloggen
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          {expiresAt !== null ? `Ingelogd tot ${clock(expiresAt)}` : "Niet ingelogd"}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Segmentresultaten</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
          <select className={INPUT} value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>
            {segments.map((segment) => (
              <option key={segment.segmentId} value={segment.segmentId}>
                {segment.name}
              </option>
            ))}
          </select>
          <input
            className={INPUT}
            type="number"
            min={1}
            max={240}
            aria-label="Minuten terug"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value) || 60)}
          />
          <Button onClick={() => void fetchSegment()} disabled={!loggedIn}>
            Ophalen
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={repeat} disabled={!loggedIn} onChange={(event) => setRepeat(event.target.checked)} />
          Elke 15 s
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Uitslag van een subgroep</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className={INPUT}
            inputMode="numeric"
            placeholder="Subgroep-ID"
            value={subgroupId}
            onChange={(event) => setSubgroupId(event.target.value.trim())}
          />
          <Button onClick={() => void fetchResults()} disabled={!loggedIn || !/^\d+$/.test(subgroupId)}>
            Ophalen
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={apiVersion} onChange={(event) => setApiVersion(event.target.checked)} />
          Zwift-Api-Version
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Burst</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
          <select className={INPUT} value={burstTarget} onChange={(event) => setBurstTarget(event.target.value as Target)}>
            <option value="segment">Segment</option>
            <option value="uitslag" disabled={!/^\d+$/.test(subgroupId)}>
              Uitslag
            </option>
          </select>
          <select
            className={INPUT}
            aria-label="Per seconde"
            value={burstRate}
            onChange={(event) => setBurstRate(Number(event.target.value))}
          >
            {[0.5, 1, 2, 4, 8].map((rate) => (
              <option key={rate} value={rate}>
                {rate}/s
              </option>
            ))}
          </select>
          <input
            className={INPUT}
            type="number"
            min={1}
            max={500}
            aria-label="Aantal"
            value={burstCount}
            onChange={(event) => setBurstCount(Number(event.target.value) || 60)}
          />
          {busy ? (
            <Button variant="outline" onClick={() => (stopBurst.current = true)}>
              Stop
            </Button>
          ) : (
            <Button onClick={() => void burst()} disabled={!loggedIn}>
              Start
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Log</h2>
          <Button variant="outline" size="sm" onClick={() => void copyLog()} disabled={log.length === 0}>
            Kopiëren
          </Button>
        </div>
        <ol className="space-y-1 font-mono text-xs">
          {log.map((line, index) => (
            <li key={`${line.at}-${index}`} className="grid grid-cols-[5rem_9rem_3rem_4rem_1fr] gap-2">
              <span>{clock(line.at)}</span>
              <span>{line.action}</span>
              <span>{line.status}</span>
              <span>{line.ms === null ? "" : `${line.ms} ms`}</span>
              <span className="break-words">{line.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
