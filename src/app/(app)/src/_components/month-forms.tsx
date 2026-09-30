"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  joinSrcMonth,
  leaveSrcMonth,
  removeSrcMemberEntry,
  setSrcMemberEntry,
} from "../_actions";

type Race = "men" | "women";
type Team = { id: string; name: string };

const FIELD =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  return { error, pending, run };
}

function EntryFields({
  teams,
  teamId,
  race,
  category,
  onTeam,
  onRace,
  onCategory,
  idPrefix,
}: {
  teams: Team[];
  teamId: string;
  race: Race;
  category: string;
  onTeam: (value: string) => void;
  onRace: (value: Race) => void;
  onCategory: (value: string) => void;
  idPrefix: string;
}) {
  return (
    <>
      {teams.length > 1 && (
        <select
          aria-label="Team"
          id={`${idPrefix}-team`}
          value={teamId}
          onChange={(e) => onTeam(e.target.value)}
          className={FIELD}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Race"
        id={`${idPrefix}-race`}
        value={race}
        onChange={(e) => onRace(e.target.value as Race)}
        className={FIELD}
      >
        <option value="men">Heren</option>
        <option value="women">Dames</option>
      </select>
      <select
        aria-label="Categorie"
        id={`${idPrefix}-category`}
        value={category}
        onChange={(e) => onCategory(e.target.value)}
        className={FIELD}
      >
        <option value="">Cat ?</option>
        {[1, 2, 3, 4, 5, 6].map((cat) => (
          <option key={cat} value={String(cat)}>
            Cat {cat}
          </option>
        ))}
      </select>
    </>
  );
}

/** Meedoen deze maand, of race en categorie aanpassen. */
export function SrcJoinForm({
  month,
  monthLabel,
  teams,
  initial,
  defaultRace,
}: {
  month: string;
  monthLabel: string;
  teams: Team[];
  initial: { teamId: string; race: Race; category: number | null } | null;
  defaultRace: Race;
}) {
  const [teamId, setTeamId] = useState(initial?.teamId ?? teams[0]?.id ?? "");
  const [race, setRace] = useState<Race>(initial?.race ?? defaultRace);
  const [category, setCategory] = useState(initial?.category ? String(initial.category) : "");
  const { error, pending, run } = useAction();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <EntryFields
          teams={teams}
          teamId={teamId}
          race={race}
          category={category}
          onTeam={setTeamId}
          onRace={setRace}
          onCategory={setCategory}
          idPrefix="src-self"
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !teamId}
          onClick={() =>
            run(() =>
              joinSrcMonth({
                month,
                teamId,
                race,
                category: category ? Number(category) : null,
              }),
            )
          }
        >
          {initial ? "Opslaan" : `Meedoen in ${monthLabel}`}
        </Button>
        {initial && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => leaveSrcMonth(month))}
          >
            Stoppen
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Beheer: een lid toevoegen of verplaatsen. */
export function SrcAddMemberForm({
  month,
  teams,
  members,
}: {
  month: string;
  teams: Team[];
  members: Array<{ id: string; name: string }>;
}) {
  const [profileId, setProfileId] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [race, setRace] = useState<Race>("men");
  const [category, setCategory] = useState("");
  const { error, pending, run } = useAction();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Lid"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className={FIELD}
        >
          <option value="">Lid kiezen…</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <EntryFields
          teams={teams}
          teamId={teamId}
          race={race}
          category={category}
          onTeam={setTeamId}
          onRace={setRace}
          onCategory={setCategory}
          idPrefix="src-manage"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !profileId || !teamId}
          onClick={() =>
            run(() =>
              setSrcMemberEntry({
                month,
                profileId,
                teamId,
                race,
                category: category ? Number(category) : null,
              }),
            )
          }
        >
          Toevoegen
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function SrcRemoveEntryButton({ month, profileId }: { month: string; profileId: string }) {
  const { error, pending, run } = useAction();
  return (
    <button
      type="button"
      title={error ?? "Uit de maand halen"}
      aria-label="Uit de maand halen"
      disabled={pending}
      onClick={() => run(() => removeSrcMemberEntry(month, profileId))}
      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  );
}
