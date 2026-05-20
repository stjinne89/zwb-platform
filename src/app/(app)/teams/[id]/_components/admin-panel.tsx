"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addMember, addResult, deleteResult, removeMember } from "../_actions";
import { Button } from "@/components/ui/button";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

type Profile = { id: string; display_name: string };
type Member = { profile_id: string; role: string; display_name: string };
type Result = { id: string };

export function AdminPanel({
  teamId,
  candidates,
  members,
}: {
  teamId: string;
  candidates: Profile[];
  members: Member[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function call<T extends unknown[]>(
    fn: (...args: T) => Promise<{ ok: boolean; error?: string } | undefined>,
    ...args: T
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn(...args);
      if (res && !res.ok) setError(res.error ?? "Onbekende fout.");
    });
  }

  function onAddMember(fd: FormData) {
    const profileId = String(fd.get("profile_id") ?? "");
    const role = String(fd.get("role") ?? "member");
    if (!profileId) return setError("Kies een lid.");
    call(addMember, teamId, profileId, role as "member" | "captain" | "co-captain");
  }

  function onAddResult(fd: FormData) {
    call(addResult, teamId, fd);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Beheer
      </h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Lid toevoegen</h3>
        <form action={onAddMember} className="flex gap-2">
          <select name="profile_id" className={FIELD} defaultValue="">
            <option value="" disabled>
              Kies een lid…
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
          <select name="role" defaultValue="member" className={FIELD}>
            <option value="member">Lid</option>
            <option value="captain">Captain</option>
            <option value="co-captain">Co-captain</option>
          </select>
          <Button type="submit" disabled={pending}>
            Toevoegen
          </Button>
        </form>
        {members.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Lid verwijderen:</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Button
                  key={m.profile_id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => call(removeMember, teamId, m.profile_id)}
                >
                  <X data-icon="inline-start" />
                  {m.display_name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Resultaat toevoegen</h3>
        <form action={onAddResult} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Competitie</label>
            <input
              name="competition"
              required
              placeholder="Bv. ZRL S15 Div 3"
              className={FIELD}
            />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Ronde / label</label>
            <input
              name="round_label"
              placeholder="Race 1 — Crit City Reverse"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Datum</label>
            <input type="datetime-local" name="round_at" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Plek</label>
            <input type="number" name="position" min={1} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Punten</label>
            <input type="number" name="points" step="0.01" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Aantal teams</label>
            <input type="number" name="total_teams" min={1} className={FIELD} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Notities</label>
            <textarea name="notes" rows={2} className={FIELD} />
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={pending}>
              Resultaat opslaan
            </Button>
          </div>
        </form>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DeleteResultButton({
  teamId,
  resultId,
}: {
  teamId: string;
  resultId: Result["id"];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Resultaat verwijderen"
      onClick={() =>
        startTransition(async () => {
          await deleteResult(teamId, resultId);
        })
      }
    >
      <X />
    </Button>
  );
}
