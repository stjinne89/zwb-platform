import { NextResponse } from "next/server";
import { loadZrlLiveForZwift } from "@/lib/zrl-live/snapshot";

// Live ZRL-stand als JSON voor de Sauce for Zwift-mod (sauce-mod/zwb-zrl-live).
// De mod kent het Zwift-event en de subgroep van de renner in beeld. Dezelfde
// gegevens als de publieke pagina /live/zrl/[eventId], daarom CORS voor iedereen:
// de mod draait op de lokale Sauce-webserver, niet op ons domein.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ zwiftEventId: string; subgroupId: string }> },
) {
  const { zwiftEventId, subgroupId } = await params;
  const outcome = await loadZrlLiveForZwift(zwiftEventId, subgroupId);
  if (outcome.status !== "ok") {
    return NextResponse.json(
      { status: outcome.status },
      { status: outcome.status === "error" ? 502 : 404, headers: CORS },
    );
  }

  const { view } = outcome;
  const { score } = view;
  const label = (team: string | null) => (team ? view.teamLabels[team] ?? team : null);
  const lastPass = [...score.passes].reverse().find((pass) => pass.crossings.length > 0);
  const nameById = new Map(view.entrants.map((rider) => [rider.athleteId, rider.name]));

  return NextResponse.json(
    {
      status: "ok",
      title: view.event.title,
      liveUrl: `/live/zrl/${view.event.id}`,
      subgroup: view.subgroupLabel,
      startAt: view.startAt,
      fetchedAt: view.fetchedAt,
      final: score.final,
      starters: score.starters,
      ownTeam: label(view.ownTeam),
      teams: score.teams.map((team) => ({
        rank: team.rank,
        team: label(team.team),
        riders: team.riders,
        total: team.total,
        own: team.team === view.ownTeam,
      })),
      riders: score.riders.map((rider) => ({
        id: rider.athleteId,
        name: rider.name,
        team: label(rider.team),
        fal: rider.fal,
        fts: rider.fts,
        fin: rider.fin + rider.podium,
        total: rider.total,
        void: rider.void,
      })),
      lastPass: lastPass && {
        name: lastPass.name,
        lap: lastPass.lap,
        top: lastPass.crossings.slice(0, 3).map((c) => ({
          id: c.athleteId,
          name: nameById.get(c.athleteId) ?? String(c.athleteId),
          fal: c.fal,
        })),
      },
    },
    { headers: CORS },
  );
}
