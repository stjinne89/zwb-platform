"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  COMPONENT_TYPES,
  DISCIPLINES,
  disciplineLabel,
} from "@/lib/maintenance/component-types";
import type { QuoteCandidate } from "@/lib/maintenance/whatsapp-export";
import { parseExport, saveQuote, type ImportProfile } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const SMALL = "rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm";

export function ImportForm() {
  const [raw, setRaw] = useState("");
  const [candidates, setCandidates] = useState<QuoteCandidate[] | null>(null);
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Record<number, true>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    if (!candidates) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates.map((c, i) => ({ c, i }));
    return candidates
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c }) =>
          c.text.toLowerCase().includes(needle) ||
          c.author.toLowerCase().includes(needle),
      );
  }, [candidates, query]);

  function onParse() {
    setError(null);
    startTransition(async () => {
      const res = await parseExport(raw);
      if (!res.ok) {
        setError(res.error);
        setCandidates(null);
        return;
      }
      setCandidates(res.candidates);
      setProfiles(res.profiles);
      setSaved({});
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <textarea
          rows={6}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Plak hier de geëxporteerde WhatsApp-chat"
          className={FIELD}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={onParse}>
            {pending ? "Uitlezen…" : "Uitlezen"}
          </Button>
          {candidates && (
            <span className="text-sm text-muted-foreground">
              {candidates.length} berichten gevonden
            </span>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {candidates && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op woord of naam"
            className={FIELD}
          />
          <ul className="space-y-3">
            {shown.map(({ c, i }) => (
              <CandidateRow
                key={i}
                candidate={c}
                profiles={profiles}
                saved={Boolean(saved[i])}
                onSaved={() => setSaved((prev) => ({ ...prev, [i]: true }))}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  profiles,
  saved,
  onSaved,
}: {
  candidate: QuoteCandidate;
  profiles: ImportProfile[];
  saved: boolean;
  onSaved: () => void;
}) {
  const [profileId, setProfileId] = useState(candidate.matchedProfileId ?? "");
  const [type, setType] = useState(COMPONENT_TYPES[0].slug);
  const [discipline, setDiscipline] = useState("");
  const [body, setBody] = useState(candidate.text);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveQuote({
        body,
        profileId,
        componentType: type,
        discipline: discipline || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <li className={`rounded-lg border p-3 ${saved ? "opacity-60" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">
        {candidate.author}
        {!candidate.matchedProfileId && (
          <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
            naam niet herkend
          </span>
        )}
      </p>

      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={saved}
        className={`${FIELD} mt-2`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          aria-label="Lid"
          className={SMALL}
          value={profileId}
          disabled={saved}
          onChange={(e) => setProfileId(e.target.value)}
        >
          <option value="">Kies lid…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>

        <select
          aria-label="Onderdeel"
          className={SMALL}
          value={type}
          disabled={saved}
          onChange={(e) => setType(e.target.value)}
        >
          {COMPONENT_TYPES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Fietstype"
          className={SMALL}
          value={discipline}
          disabled={saved}
          onChange={(e) => setDiscipline(e.target.value)}
        >
          <option value="">Elk fietstype</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {disciplineLabel(d)}
            </option>
          ))}
        </select>

        <Button
          type="button"
          size="sm"
          disabled={pending || saved || !profileId}
          onClick={save}
        >
          {saved ? "Opgeslagen" : pending ? "Opslaan…" : "Als citaat opslaan"}
        </Button>
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  );
}
