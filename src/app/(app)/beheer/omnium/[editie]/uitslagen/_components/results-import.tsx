"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { defaultModeFor } from "@/lib/omnium/import";
import type { ParseMode, ParsedResultRow } from "@/lib/omnium/parse-results";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import type { Discipline } from "@/lib/omnium/scoring";
import { previewOmniumResults, saveOmniumResults, fetchZwiftResultsAction, type PreviewOutcome } from "../_actions";
const FIELD = "w-full rounded border bg-background p-2 text-sm";
const LABELS: Record<ParseMode, string> = { finish: "Finishvolgorde", segment: "Segmenttijd", crit_points: "Punten per renner", crit_detailed: "Sprint- en finishblokken", sheet_csv: "Sheet-CSV" };
export function ResultsImport({ editionEventId, discipline, title, resultsState }: { editionEventId: string; discipline: Discipline; title: string; resultsState: string }) {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<ParseMode>(defaultModeFor(discipline));
  const [league, setLeague] = useState("");
  const [apiRows, setApiRows] = useState<ParsedResultRow[]>();
  const [apiWarnings, setApiWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<Extract<PreviewOutcome, {ok:true}> | null>(null);
  const [final, setFinal] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const modes: ParseMode[] = discipline === "crit" ? ["crit_points", "crit_detailed", "sheet_csv"] : discipline === "sprint" ? ["segment", "finish", "sheet_csv"] : ["finish", "sheet_csv"];
  const input = { editionEventId, raw, mode, defaultLeague: league || null, parsedRows: apiRows, final };
  const groups = preview ? [{ title: "Meetellende renners", rows: preview.rows.filter(r => !r.guest) }, { title: "Gasten — tellen niet mee", rows: preview.rows.filter(r => r.guest) }] : [];
  function showPreview() { start(async () => {
    setMessage(""); setPreview(null);
    const r = await previewOmniumResults(input);
    if (!r.ok) { setMessage(r.error); return; }
    setPreview(r);
  }); }
  return <section className="space-y-3 rounded-lg border bg-card p-4">
    <div className="flex justify-between gap-2"><h2 className="font-semibold">{title}</h2><span className="text-sm">{resultsState === "final" ? "Definitief" : resultsState === "partial" ? "Voorlopig" : "Geen uitslag"}</span></div>
    <div className="flex flex-wrap gap-2">
      {discipline !== "sprint" && <Button variant="outline" disabled={pending} onClick={() => start(async () => {
        setMessage(""); setPreview(null);
        const r = await fetchZwiftResultsAction(editionEventId);
        if (!r.ok) { setMessage(r.error); return; }
        setApiRows(r.rows); setApiWarnings(r.warnings); setFinal(false);
        const nextMode = discipline === "crit" ? "crit_detailed" : "finish";
        setMode(nextMode);
        const checked = await previewOmniumResults({ ...input, raw: discipline === "crit" && mode === "crit_detailed" ? raw : "", mode: nextMode, parsedRows: r.rows });
        if (!(discipline === "crit" && mode === "crit_detailed")) setRaw("");
        if (checked.ok) setPreview(checked); else setMessage(checked.error);
      })}>Ophalen uit Zwift</Button>}
      {apiRows && <Button variant="outline" disabled={pending} onClick={() => { setApiRows(undefined); setApiWarnings([]); setPreview(null); setMode(defaultModeFor(discipline)); }}>Plak-import gebruiken</Button>}
    </div>
    {!apiRows && <label className="block text-sm">Invoervorm<select className={FIELD} value={mode} onChange={e => { setMode(e.target.value as ParseMode); setPreview(null); }}>{modes.map(m => <option key={m} value={m}>{LABELS[m]}</option>)}</select></label>}
    <label className="block text-sm">Standaardleague<select className={FIELD} value={league} onChange={e => { setLeague(e.target.value); setPreview(null); }}><option value="">Geen</option>{OMNIUM_LEAGUES.map(l => <option key={l}>{l}</option>)}</select></label>
    {(!apiRows || discipline === "crit") && <label className="block text-sm">{apiRows ? "Tussensprints plakken" : "Uitslag plakken"}<textarea rows={6} value={raw} className={FIELD + " font-mono"} onChange={e => { setRaw(e.target.value); setPreview(null); }} /></label>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={final} onChange={e => setFinal(e.target.checked)} />Uitslag compleet en definitief</label>
    {message && <p role="status" className="text-sm">{message}</p>}
    {[...apiWarnings, ...(preview?.warnings ?? [])].map((w,i) => <p key={i} role="status" className="text-sm text-amber-700 dark:text-amber-400">{w}</p>)}
    {groups.filter(g => g.rows.length).map(g => <div key={g.title} className="overflow-x-auto"><h3 className="mb-2 text-sm font-semibold">{g.title} ({g.rows.length})</h3><table className="w-full text-left text-sm"><thead><tr><th>#</th><th>Renner</th><th>League</th><th>Status</th><th>Punten</th><th>Match</th></tr></thead><tbody>{g.rows.map(r => <tr key={r.lineNumber} className="border-t"><td className="py-2">{r.position ?? "—"}</td><td>{r.name}</td><td>{r.league}</td><td>{r.status}</td><td>{r.points}</td><td>{r.match === "new" ? "Nieuw" : r.matchedVia === "zwift_id" ? "Zwift-ID" : "Naam"}</td></tr>)}</tbody></table></div>)}
    {preview?.issues.map((i,n) => <p key={n} className="text-sm text-destructive">Regel {i.lineNumber}: {i.reason}</p>)}
    <div className="flex gap-2"><Button variant="outline" disabled={pending || (!raw.trim() && !apiRows)} onClick={showPreview}>Voorbeeld</Button><Button disabled={pending || !preview || preview.issues.length > 0 || !preview.rows.some(r => !r.guest)} onClick={() => start(async () => {
      if (!preview) return;
      const r = await saveOmniumResults({ ...input, expectedSync: preview.syncedAt });
      if (!r.ok) { setMessage(r.error); return; }
      setMessage(r.saved + " uitslagen opgeslagen."); setPreview(null); router.refresh();
    })}>Opslaan</Button></div>
  </section>;
}
