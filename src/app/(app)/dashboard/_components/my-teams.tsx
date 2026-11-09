// "Jouw teams": een tegel in de tegelrij van het dashboard met een regel per
// team waar het lid in zit (wens eigenaar, 2026-11-03). Petrol, want teams zijn
// koers (kleurbeleid in globals.css). De kop leidt naar /teams.
//
// Wie in een subteam zit, zit meestal ook in de paraplu erboven (migr. 0070,
// 0179). Dan staat alleen het subteam er, met de naam van de paraplu erbij: de
// pagina van het subteam toont de raceweken van de paraplu ook. Wie captain of
// co-captain van de paraplu is, houdt die regel wel.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { teamHref } from "@/lib/teams/href";

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  parent_team_id: string | null;
};

type MyTeam = {
  id: string;
  href: string;
  name: string;
  meta: string;
  sortKey: string;
};

const TYPE_ORDER = ["zrl", "ladder", "social", "outdoor", "src"];

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Club Ladder",
  social: "Social",
  outdoor: "Outdoor",
  src: "Sunday Race Club",
};

const ROLE_LABELS: Record<string, string> = {
  captain: "captain",
  "co-captain": "co-captain",
};

export async function MyTeams({ userId }: { userId: string }) {
  const supabase = await createClient();
  // Alle teams in één keer: het zijn er een handvol, en zo komt de naam van de
  // paraplu mee zonder tweede ronde.
  const [{ data: memberRows }, { data: teamRows }] = await Promise.all([
    supabase.from("team_members").select("team_id, role").eq("profile_id", userId),
    supabase.from("teams").select("id, name, type, division, parent_team_id"),
  ]);

  const teams = new Map(((teamRows ?? []) as TeamRow[]).map((team) => [team.id, team]));
  const roles = new Map(
    ((memberRows ?? []) as Array<{ team_id: string; role: string }>).map((row) => [
      row.team_id,
      row.role,
    ]),
  );
  // Een captain houdt de paraplu wel: daar staat de opstelling van alle subteams.
  const coveredParents = new Set<string>();
  for (const id of roles.keys()) {
    const parentId = teams.get(id)?.parent_team_id;
    if (parentId && !ROLE_LABELS[roles.get(parentId) ?? ""]) coveredParents.add(parentId);
  }

  const mine: MyTeam[] = [];
  for (const [teamId, role] of roles) {
    const team = teams.get(teamId);
    if (!team || coveredParents.has(team.id)) continue;
    const parent = team.parent_team_id ? teams.get(team.parent_team_id) : null;
    const typeRank = TYPE_ORDER.indexOf(team.type);
    mine.push({
      id: team.id,
      href: teamHref(team),
      name: team.name,
      meta: [parent?.name ?? TYPE_LABELS[team.type] ?? team.type, ROLE_LABELS[role]]
        .filter(Boolean)
        .join(" · "),
      sortKey: [
        String(typeRank === -1 ? TYPE_ORDER.length : typeRank),
        parent?.name ?? team.name,
        // De paraplu vóór zijn subteams.
        `${parent ? 1 : 0}${team.name}`,
      ].join("|"),
    });
  }
  if (mine.length === 0) return null;
  mine.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "nl"));

  // Vanaf drie teams twee kolommen breed, zodat de tegel niet ver boven zijn
  // buren uitsteekt; het tegelveld vult het gat ervoor op (grid-flow-row-dense).
  const wide = mine.length > 2;
  return (
    <nav aria-label="Jouw teams" className={`tg-tile tg-kalender ${wide ? "col-span-2" : ""}`}>
      <span className="tg-tile-small">Club</span>
      <Link href="/teams" className="tg-tile-title mt-0.5 w-fit hover:underline">
        Jouw teams
      </Link>
      <ul className={`-mx-3.5 mt-auto pt-2 ${wide ? "md:grid md:grid-cols-2" : ""}`}>
        {mine.map((team) => (
          <li
            key={team.id}
            className="border-t border-[color-mix(in_oklab,var(--tg-fg)_22%,transparent)]"
          >
            <Link
              href={team.href}
              className="flex min-h-11 flex-col justify-center px-3.5 py-1.5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none"
            >
              <span className="truncate text-[1.1875rem] font-medium leading-tight">
                {team.name}
              </span>
              <span className="truncate text-sm leading-snug opacity-85">{team.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
