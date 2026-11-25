"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTeam } from "../_actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TEAM_TYPES } from "@/lib/teams/team-types";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const LABEL = "mb-1 block text-sm font-medium";

export type EditableTeam = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  description: string | null;
  parent_team_id: string | null;
};

/**
 * Bewerken van een team of subteam. Type en hoofdteam staan vast zodra er iets
 * aan het team hangt (`structureLocked`); zonder `parentTeams` geen keuze voor
 * een hoofdteam.
 */
export function EditTeamButton({
  team,
  parentTeams = [],
  structureLocked,
}: {
  team: EditableTeam;
  parentTeams?: Array<{ id: string; name: string }>;
  structureLocked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const parentOptions = parentTeams.filter((row) => row.id !== team.id);
  const currentParent = parentTeams.find((row) => row.id === team.parent_team_id);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateTeam(team.id, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (res.redirectTo !== window.location.pathname) router.replace(res.redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Pencil data-icon="inline-start" />
        Bewerken
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team bewerken</DialogTitle>
          </DialogHeader>
          <form action={submit} className="space-y-4">
            <div>
              <label className={LABEL}>Naam</label>
              <input name="name" required defaultValue={team.name} className={FIELD} />
            </div>
            {(parentOptions.length > 0 || currentParent) && (
              <div>
                <label className={LABEL}>Hoofdteam</label>
                {structureLocked ? (
                  <select disabled defaultValue={team.parent_team_id ?? ""} className={FIELD}>
                    <option value="">Geen hoofdteam</option>
                    {currentParent && <option value={currentParent.id}>{currentParent.name}</option>}
                  </select>
                ) : (
                  <select
                    name="parent_team_id"
                    defaultValue={team.parent_team_id ?? ""}
                    className={FIELD}
                  >
                    <option value="">Geen hoofdteam</option>
                    {parentOptions.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Type</label>
                <select
                  name={structureLocked ? undefined : "type"}
                  defaultValue={team.type}
                  disabled={structureLocked}
                  className={FIELD}
                >
                  {TEAM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Divisie / poule</label>
                <input
                  name="division"
                  defaultValue={team.division ?? ""}
                  placeholder="Bv. Div 3, Pool B"
                  className={FIELD}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Korte omschrijving</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={team.description ?? ""}
                className={FIELD}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Opslaan…" : "Opslaan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
