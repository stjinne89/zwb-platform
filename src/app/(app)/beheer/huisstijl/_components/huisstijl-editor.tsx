"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  deriveTheme,
  normalizeHex,
  paletteChecks,
  type ClubPalette,
  type PaletteKey,
  type TileKey,
} from "@/lib/club-theme";
import { updateClubColors } from "../_actions";

const LABELS: Record<PaletteKey, string> = {
  primary: "Primair",
  secondary: "Secundair",
  neutral: "Neutraal",
  accent: "Accent",
  ink: "Donkere inkt",
};

const TILES: { key: TileKey; label: string }[] = [
  { key: "vandaag", label: "Vandaag" },
  { key: "kalender", label: "Kalender" },
  { key: "zwbeter", label: "Training" },
  { key: "club", label: "Club" },
  { key: "meer", label: "Meer" },
];

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; msg: string };

export function HuisstijlEditor({ stored }: { stored: Record<PaletteKey, string | null> }) {
  const isCustom = PALETTE_KEYS.some((key) => stored[key]);
  const [draft, setDraft] = useState<Record<PaletteKey, string>>(
    () =>
      Object.fromEntries(
        PALETTE_KEYS.map((key) => [key, stored[key] ?? DEFAULT_PALETTE[key]]),
      ) as Record<PaletteKey, string>,
  );
  const [custom, setCustom] = useState(isCustom);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const palette = useMemo<ClubPalette | null>(() => {
    const entries = PALETTE_KEYS.map((key) => [key, normalizeHex(draft[key])] as const);
    if (entries.some(([, value]) => !value)) return null;
    return Object.fromEntries(entries) as ClubPalette;
  }, [draft]);
  const theme = useMemo(() => (palette ? deriveTheme(palette) : null), [palette]);
  const failing = useMemo(
    () => (palette ? paletteChecks(palette).filter((check) => !check.ok) : []),
    [palette],
  );

  function setColor(key: PaletteKey, value: string) {
    setStatus({ kind: "idle" });
    setCustom(true);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(input: Record<PaletteKey, string> | null) {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateClubColors(input);
      if (res.ok && !input) {
        setDraft({ ...DEFAULT_PALETTE });
        setCustom(false);
      }
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error ?? "Onbekende fout." });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">{custom ? "Eigen kleuren" : "Standaardkleuren"}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {status.kind === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>
          )}
          {status.kind === "error" && (
            <span className="max-w-72 text-sm text-destructive">{status.msg}</span>
          )}
          <Button type="button" variant="outline" disabled={pending || !custom} onClick={() => save(null)}>
            Standaardkleuren
          </Button>
          <Button type="button" disabled={pending || !palette} onClick={() => save(draft)}>
            {pending ? "Opslaan..." : "Kleuren opslaan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          {PALETTE_KEYS.map((key) => {
            const valid = normalizeHex(draft[key]);
            return (
              <div key={key} className="flex items-center gap-3 text-sm">
                <input
                  type="color"
                  value={valid ?? "#000000"}
                  onChange={(event) => setColor(key, event.currentTarget.value)}
                  className="size-10 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                  aria-label={LABELS[key]}
                />
                <span className="min-w-0 flex-1 font-medium">{LABELS[key]}</span>
                <input
                  type="text"
                  value={draft[key]}
                  onChange={(event) => setColor(key, event.currentTarget.value)}
                  spellCheck={false}
                  className={`w-24 rounded-md border bg-background px-2 py-1 font-mono text-xs ${
                    valid ? "" : "border-destructive"
                  }`}
                  aria-label={`${LABELS[key]} als hex`}
                />
              </div>
            );
          })}
        </section>

        {theme && (
          <section className="grid gap-4 sm:grid-cols-2">
            {(["light", "dark"] as const).map((mode) => {
              const t =
                mode === "light"
                  ? theme.light
                  : { ...theme.light, ...theme.dark, ...theme.tegelsDark };
              return (
                <div
                  key={mode}
                  className="space-y-3 rounded-lg border p-3"
                  style={{ background: t["--background"], color: t["--foreground"] }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: t["--muted-foreground"] }}
                  >
                    {mode === "light" ? "Licht" : "Donker"}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TILES.map(({ key, label }) => (
                      <div
                        key={key}
                        className={`flex min-h-14 items-end rounded-sm p-2 text-sm font-semibold ${
                          key === "vandaag" ? "col-span-2" : ""
                        }`}
                        style={{ background: theme.tiles[mode][key].bg, color: theme.tiles[mode][key].fg }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 rounded-md p-2" style={{ background: t["--card"] }}>
                    <div className="flex h-10 items-end gap-1">
                      {[0.55, 0.8, 0.4, 1, 0.65].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t-sm"
                          style={{ height: `${height * 100}%`, background: t[`--chart-${index + 1}`] }}
                        />
                      ))}
                    </div>
                    <span
                      className="inline-flex rounded-md px-3 py-1.5 text-sm font-medium"
                      style={{ background: t["--primary"], color: t["--primary-foreground"] }}
                    >
                      Knop
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {failing.length > 0 && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <h3 className="font-semibold text-destructive">Slecht leesbaar</h3>
          <ul className="mt-2 space-y-1">
            {failing.map((check) => (
              <li key={check.label}>
                {check.label}: {check.ratio.toFixed(1).replace(".", ",")}:1
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
