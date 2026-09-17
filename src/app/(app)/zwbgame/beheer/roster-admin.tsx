"use client";
import { useState } from "react";
import { excludeRosterRider } from "../actions";

export function RosterAdmin({ rows: initial }: { rows: { id: string; name: string; excluded: boolean }[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function change(id: string, excluded: boolean) {
    setBusy(true); setError("");
    try {
      const reply = await excludeRosterRider(id, excluded);
      if (!reply.ok) setError(reply.error);
      else setRows((current) => current.map((r) => r.id === id ? { ...r, excluded } : r));
    } catch { setError("Opslaan mislukt."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">{error && <p role="alert">{error}</p>}{rows.map((r) => <label className="flex items-center justify-between gap-4 rounded-lg border p-3" key={r.id}><span>{r.name}</span><span className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!r.excluded} disabled={busy} onChange={(e) => change(r.id, !e.target.checked)} />Deelname</span></label>)}</div>;
}
