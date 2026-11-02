import { routes as zwiftRoutes } from "zwift-data";
import { normalizeTeamName } from "@/lib/ladder";
import type { LadderFixturePage, LadderSignup } from "./fixture-page";
import { CLUB_LADDER_FIXTURE_URL } from "./fixture-page";
import { findLadderRouteSlug, ladderRouteBySlug, worldLabel } from "./routes";
import type { ClubLadderFixture, ClubLadderStanding } from "./summary";

export type LadderTeamRef = { id: string; name: string };

export type LadderFixtureMatch = {
  fixture: ClubLadderFixture & { fixtureId: number; startsAt: string };
  team: LadderTeamRef;
  side: "home" | "away";
};

/** Wedstrijden met een ZWB-ladderteam, één per team (twee ZWB-teams tegen elkaar geeft er twee). */
export function ladderFixtureMatches(fixtures: ClubLadderFixture[], teams: LadderTeamRef[]): LadderFixtureMatch[] {
  const byName = new Map(teams.map((team) => [normalizeTeamName(team.name), team]));
  const matches: LadderFixtureMatch[] = [];
  for (const fixture of fixtures) {
    if (!fixture.fixtureId || !fixture.startsAt) continue;
    for (const side of ["home", "away"] as const) {
      const team = byName.get(normalizeTeamName(fixture[side]));
      if (team) matches.push({ fixture: fixture as LadderFixtureMatch["fixture"], team, side });
    }
  }
  return matches;
}

/**
 * Een team staat op de ladder zolang het in de stand staat of een wedstrijd
 * heeft (een team van het kerkhof dat terugkomt, staat pas na zijn eerste
 * wedstrijd weer in de stand).
 */
export function activeLadderTeamIds(
  teams: LadderTeamRef[],
  standings: ClubLadderStanding[],
  fixtures: ClubLadderFixture[],
): Set<string> {
  const names = new Set([
    ...standings.map((row) => normalizeTeamName(row.name)),
    ...fixtures.flatMap((fixture) => [normalizeTeamName(fixture.home), normalizeTeamName(fixture.away)]),
  ]);
  return new Set(teams.filter((team) => names.has(normalizeTeamName(team.name))).map((team) => team.id));
}

export type LadderEventFields = {
  title: string;
  start_at: string;
  location: string;
  description: string | null;
  external_url: string;
  zwift_route_id: number | null;
  /** Alleen van de wedstrijdpagina (achter login). */
  zwift_event_id?: number;
  laps: number | null;
  distance_km: number | null;
  elevation_m: number | null;
  /** Ladder-naam van de tegenstander, voor de matchup (0302). */
  club_ladder_opponent: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function powerupLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * De velden van het event. Route, rondes en het Zwift-event komen van de
 * wedstrijdpagina als die gelezen is; anders het kleinste rondental dat binnen
 * de ladderregel past, en geen Zwift-event.
 */
export function ladderEventFields(match: LadderFixtureMatch, page: LadderFixturePage | null): LadderEventFields {
  const { fixture } = match;
  const routeName = page?.routeName ?? fixture.route;
  const slug = findLadderRouteSlug(routeName);
  const route = slug ? zwiftRoutes.find((item) => item.slug === slug) : undefined;
  const laps = page?.laps ?? (slug ? ladderRouteBySlug(slug)?.laps[0]?.laps : undefined) ?? (route ? 1 : null);
  const distance = route && laps ? round1((route.leadInDistance ?? 0) + laps * route.distance) : null;
  const elevation = route && laps ? Math.round((route.leadInElevation ?? 0) + laps * route.elevation) : null;

  return {
    ...(page?.zwiftEventId ? { zwift_event_id: page.zwiftEventId } : {}),
    title: `Club Ladder: ${fixture.home} – ${fixture.away}`,
    start_at: new Date(fixture.startsAt).toISOString(),
    location: route ? `Zwift · ${worldLabel(route.world)}` : "Zwift",
    description: fixture.powerups.length > 0 ? `Powerups: ${fixture.powerups.map(powerupLabel).join(", ")}` : null,
    external_url: `${CLUB_LADDER_FIXTURE_URL}${fixture.fixtureId}`,
    zwift_route_id: route?.id ?? null,
    laps,
    distance_km: page?.km ?? distance,
    elevation_m: elevation,
    club_ladder_opponent: match.side === "home" ? fixture.away : fixture.home,
  };
}

/**
 * Tegenstander uit de titel die `ladderEventFields` maakt ("Club Ladder: thuis – uit"),
 * voor events van vóór 0302 tot de sync de kolom heeft gevuld.
 */
export function ladderOpponentFromTitle(title: string, teamName: string): string | null {
  const match = title.match(/^Club Ladder: (.+) – (.+)$/);
  if (!match) return null;
  const [, home, away] = match;
  if (normalizeTeamName(home) === normalizeTeamName(teamName)) return away;
  if (normalizeTeamName(away) === normalizeTeamName(teamName)) return home;
  return null;
}

/** Wie de captain heeft opgesteld: alleen renners met een startplek, op volgorde. */
export function ladderLineup(page: LadderFixturePage, side: "home" | "away"): LadderSignup[] {
  return page[side]
    .filter((rider) => rider.position !== null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}
