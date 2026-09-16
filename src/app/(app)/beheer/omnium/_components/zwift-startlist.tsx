"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import { loadZwiftGroups, saveZwiftGroups, syncEntrantsAction } from "../zwift-actions";

function PartMapping({ part }: { part: { id: string; title: string } }) {
  const [groups, setGroups] = useState<Array<{ id: string; label: string; name: string; league: string | null }> | null>(null);
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return <div className="space-y-2">
    <Button variant="outline" disabled={pending} onClick={() => start(async () => {
      const r = await loadZwiftGroups(part.id);
      if (!r.ok) { setMessage(r.error); return; }
      setGroups(r.groups); setEventId(r.eventId); setMessage("");
    })}>{part.title}: leagues instellen</Button>
    {groups && <><div className="grid gap-2 sm:grid-cols-2">{groups.map((g) => <label key={g.id} className="text-sm">{g.label} · {g.name}
      <select className="ml-2 rounded border bg-background p-2" value={g.league ?? ""} onChange={(e) => setGroups(groups.map((x) => x.id === g.id ? { ...x, league: e.target.value || null } : x))}>
        <option value="">Kies league</option>{OMNIUM_LEAGUES.map((l) => <option key={l}>{l}</option>)}
      </select></label>)}</div>
      <Button disabled={pending || groups.some((g) => !g.league)} onClick={() => start(async () => {
        const r = await saveZwiftGroups(part.id, eventId, Object.fromEntries(groups.map((g) => [g.id, g.league!])));
        setMessage(r.ok ? "League-indeling opgeslagen." : r.error);
      })}>Indeling bevestigen</Button></>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

export function ZwiftStartlist({ editionId, parts }: { editionId: string; parts: Array<{ id: string; title: string }> }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return <section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Zwift-startlijst</h2>
    {parts.map((p) => <PartMapping key={p.id} part={p} />)}
    <Button disabled={pending} onClick={() => start(async () => {
      const r = await syncEntrantsAction(editionId);
      setMessage(r.ok ? `${r.synced} inschrijvingen opgehaald. ${r.failures.join(" ")}` : r.error);
    })}>{pending ? "Ophalen…" : "Startlijst ophalen"}</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
