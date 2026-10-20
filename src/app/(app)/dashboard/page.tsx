import { Suspense } from "react";
import { isStravaActivityId } from "@/lib/intervals/ride-id";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Bike,
  CalendarDays,
  Camera,
  Flag,
  Gift,
  HeartHandshake,
  Medal,
  Mountain,
  Newspaper,
  Pin,
  Trophy,
  Vote,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteRitverslagButton } from "../ritverslagen/_components/delete-ritverslag-button";
import { EmptyState, InlineMoreLink, PageHeader, SectionHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import {
  IntervalsRideSyncButton,
  IntervalsVisitReminder,
} from "@/components/intervals-rides";
import { loadRideSourceStatus } from "@/lib/intervals/ride-source-status";
import { garminAttribution } from "@/lib/intervals/rides";
import { AchievementBadge } from "@/components/achievement-badge";
import { Markdown } from "@/components/markdown";
import { MemberLink } from "@/components/member-link";
import { CLUB_RACE_TYPES, eventLabel } from "@/lib/event-types";
import { MEDIA_KIND_LABELS } from "@/lib/media-kinds";
import {
  INSTAGRAM_STORY_SOURCE,
  INSTAGRAM_STORY_TTL_MS,
  INSTAGRAM_TAG_HIDDEN_SOURCE,
  INSTAGRAM_TAG_SOURCE,
} from "@/lib/instagram-sync";
import { amsterdamHour } from "@/lib/greeting";
import { ClubStats } from "./_components/club-stats";
import { CoreStatus, CoreStatusSkeleton } from "./_components/core-status";
import { FrrStandings } from "./_components/frr-standings";
import { Greeting } from "./_components/greeting";
import { MyRaces } from "./_components/my-races";
import { PhotoNudge } from "./_components/photo-nudge";
import { QaDashboard } from "./_components/qa";
import { InstagramStrip, type InstagramPost } from "./_components/instagram-strip";
import { SrcResults } from "./_components/src-results";
import {
  TrainingStatus,
  TrainingStatusSkeleton,
  type TrainingStatusConn,
  type TrainingStatusWorkout,
} from "./_components/training-status";
import type { WellnessDevice } from "@/lib/training/wellness";
import { MaintenanceStatus } from "./_components/maintenance-status";
import { WeekReviewDashboardLink } from "@/components/weekoverzicht/dashboard-link";
import { StravaImportForm } from "@/components/strava-import-form";
import { StravaSyncButton } from "@/components/strava-sync-button";
import {
  ConnectWithStrava,
  StravaAttribution,
  ViewOnStravaLabel,
} from "@/components/strava-brand";
import { hasActivityScope } from "@/lib/strava/scope";
import {
  INTENSITY_FTP_RANGE,
  normalizeWorkoutBlocks,
  plannedWorkoutIntensity,
  powerRangePercentForBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { getDesign } from "@/lib/design";
import {
  TegelsVandaag,
  type VandaagEvent,
  type VandaagLive,
  type VandaagLiveEvent,
} from "@/components/tegels/vandaag";
import { refreshExternalLiveSessions } from "@/lib/live/external-refresh";
import { liveRidersLabel } from "@/lib/live/riders-label";
import {
  isEventRunning,
  splitLiveRiders,
  type LiveRider,
  type RunningEvent,
} from "@/lib/live/event-riders";

const INSTAGRAM_NON_POST_SOURCES = [INSTAGRAM_STORY_SOURCE, INSTAGRAM_TAG_HIDDEN_SOURCE];

type ProfileRef = {
  display_name: string | null;
};

type ClubActivityRow = {
  id: number;
  profile_id: string;
  name: string | null;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string;
  total_elevation_gain_m: number | string;
  kudos_count: number;
  moving_time_seconds: number;
  trainer: boolean;
  import_source: string | null;
  device_name: string | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

type MediaItemRow = {
  id: string;
  kind: string;
  title: string;
  body_md: string | null;
  pinned: boolean;
  published_at: string;
  author_id: string | null;
  profiles: ProfileRef | ProfileRef[] | null;
};

type TeamRef = {
  id: string;
  name: string;
  type: string;
  division: string | null;
};

type TeamStanding = {
  id: string;
  team_id: string;
  competition: string;
  round_label: string | null;
  round_at: string | null;
  position: number | null;
  points: number | null;
  total_teams: number | null;
  created_at: string;
  source_url: string | null;
  /** Alleen ZRL: de hele ronde in plaats van het teamevent. */
  round_url?: string;
  teams: TeamRef | TeamRef[] | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: string;
  kind: string | null;
  start_at: string;
  location: string | null;
  cover_image_path: string | null;
};

type TeamStandingWithTeam = TeamStanding & { team: TeamRef; href: string };

// Bevroren ZRL-uitslag van een teamevent (migr. 0188), gevuld door de
// freeze-job uit Zwift-data. Sinds de WTRL-sync uit staat de enige ZRL-bron.
type ZrlTeamResultRow = {
  event_id: string;
  team_id: string | null;
  rank: number;
  total_teams: number;
  points: number;
  computed_at: string;
  events: ZrlResultEvent | ZrlResultEvent[] | null;
  team: TeamRef | TeamRef[] | null;
};
type ZrlResultEvent = { title: string; start_at: string; parent_event_id: string | null };

type AwardRow = {
  id: string;
  profile_id: string;
  award_scope: "weekly" | "milestone";
  period_start: string;
  awarded_at: string;
  value: number | string;
  metadata: { unit?: string } | null;
  profiles: ProfileRef | ProfileRef[] | null;
  achievement_badges:
    | {
        title: string;
        icon: string | null;
        color: string | null;
      }
    | {
        title: string;
        icon: string | null;
        color: string | null;
      }[]
    | null;
};

type PollRow = {
  id: string;
  question: string;
  description_md: string | null;
  multi_select: boolean;
  closes_at: string | null;
  created_at: string;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  display_order: number;
};

type PollVoteRow = {
  poll_id: string;
  option_id: string;
  profile_id: string;
};

type BenefitRow = {
  id: string;
  title: string;
  discount_code: string | null;
  redeem_url: string | null;
  valid_until: string | null;
  active: boolean;
  display_order: number;
  sponsors:
    | { name: string; logo_url: string | null }
    | { name: string; logo_url: string | null }[]
    | null;
};

type DashboardPoll = PollRow & {
  options: Array<PollOptionRow & { voteCount: number }>;
  totalVotes: number;
};

function singleProfileName(rel: ProfileRef | ProfileRef[] | null): string | null {
  if (!rel) return null;
  const single = Array.isArray(rel) ? rel[0] : rel;
  return single?.display_name ?? null;
}

function activityProfile(row: ClubActivityRow): string {
  return singleProfileName(row.profiles) ?? "ZWB'er";
}

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function relatedTeam(result: TeamStanding) {
  return Array.isArray(result.teams) ? result.teams[0] : result.teams;
}

function zrlStandings(rows: ZrlTeamResultRow[], sinceIso: string): TeamStanding[] {
  const standings: TeamStanding[] = [];
  for (const row of rows) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!row.team_id || !event || event.start_at < sinceIso) continue;
    standings.push({
      id: `zrl:${row.event_id}`,
      team_id: row.team_id,
      competition: "Zwift Racing League",
      round_label: event.title,
      round_at: event.start_at,
      position: row.rank,
      points: row.points,
      total_teams: row.total_teams,
      created_at: row.computed_at,
      source_url: `/events/${row.event_id}`,
      // De raceweek zelf (het hoofdevent, migr. 0178), met alle teams van die ronde.
      round_url: `/events/${event.parent_event_id ?? row.event_id}`,
      teams: row.team,
    });
  }
  return standings;
}

// Eén regel per team per competitie: de nieuwste uitslag.
function latestStandings(results: TeamStanding[]): TeamStandingWithTeam[] {
  const byTeam = new Map<string, TeamStandingWithTeam>();
  const sorted = [...results].sort((a, b) =>
    (b.round_at ?? b.created_at).localeCompare(a.round_at ?? a.created_at),
  );

  for (const result of sorted) {
    const team = relatedTeam(result);
    if (!result.position || !team) continue;
    const key = `${result.competition}|${result.team_id}`;
    if (byTeam.has(key)) continue;
    const href = result.id.startsWith("zrl:")
      ? (result.source_url ?? `/teams/${result.team_id}`)
      : `/teams/${result.team_id}`;
    byTeam.set(key, { ...result, team, href });
  }

  return Array.from(byTeam.values()).sort((a, b) => {
    const competition = a.competition.localeCompare(b.competition, "nl");
    if (competition !== 0) return competition;
    return (a.position ?? 9999) - (b.position ?? 9999);
  });
}

function awardBadge(row: AwardRow) {
  return Array.isArray(row.achievement_badges)
    ? row.achievement_badges[0]
    : row.achievement_badges;
}

function singleSponsorName(rel: BenefitRow["sponsors"]): string | null {
  if (!rel) return null;
  const single = Array.isArray(rel) ? rel[0] : rel;
  return single?.name ?? null;
}

function dashboardPolls(
  polls: PollRow[],
  options: PollOptionRow[],
  votes: PollVoteRow[],
): DashboardPoll[] {
  const optionsByPoll = new Map<string, PollOptionRow[]>();
  for (const option of options) {
    const list = optionsByPoll.get(option.poll_id) ?? [];
    list.push(option);
    optionsByPoll.set(option.poll_id, list);
  }

  const votesByOption = new Map<string, number>();
  const totalVotesByPoll = new Map<string, number>();
  for (const vote of votes) {
    votesByOption.set(vote.option_id, (votesByOption.get(vote.option_id) ?? 0) + 1);
    totalVotesByPoll.set(vote.poll_id, (totalVotesByPoll.get(vote.poll_id) ?? 0) + 1);
  }

  return polls.map((poll) => ({
    ...poll,
    options: (optionsByPoll.get(poll.id) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((option) => ({
        ...option,
        voteCount: votesByOption.get(option.id) ?? 0,
      })),
    totalVotes: totalVotesByPoll.get(poll.id) ?? 0,
  }));
}

function formatKm(meters: number | string) {
  return `${(toNumber(meters) / 1000).toLocaleString("nl-NL", {
    maximumFractionDigits: 1,
  })} km`;
}

function stravaActivityUrl(activityId: number) {
  return `https://www.strava.com/activities/${activityId}`;
}

const ACTIVITY_ROW_CLASS =
  "grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center";

/**
 * Een rit uit een import of via intervals.icu heeft geen Strava-pagina (negatief
 * id); die rij linkt nergens heen.
 */
function ActivityRow({
  activityId,
  children,
}: {
  activityId: number;
  children: React.ReactNode;
}) {
  if (!isStravaActivityId(activityId)) {
    return <div className={ACTIVITY_ROW_CLASS}>{children}</div>;
  }
  return (
    <a
      href={stravaActivityUrl(activityId)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${ACTIVITY_ROW_CLASS} transition hover:bg-muted/50`}
      title="Open activiteit op Strava"
    >
      {children}
    </a>
  );
}

/**
 * Wie er nu live rijdt: dezelfde regel als Samen fietsen (open sessie, binnen
 * 15 minuten gezien). Garmin en Wahoo eerst bijwerken, zoals de kalender doet:
 * zonder nieuwe Wahoo-links te zoeken, want dat gebeurt op Samen fietsen zelf.
 * Wie in een lopend event rijdt waar die zich voor aanmeldde, krijgt de tegel
 * van dat event in plaats van Samen fietsen (lib/live/event-riders.ts).
 */
async function loadLiveNow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string,
): Promise<{ together: VandaagLive | null; events: VandaagLiveEvent[] }> {
  await refreshExternalLiveSessions({ detect: false });
  const now = Date.now();
  const cutoff = new Date(now - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("live_sessions")
    .select("profile_id, started_at, profiles(display_name)")
    .is("ended_at", null)
    .gte("last_seen_at", cutoff)
    .order("started_at", { ascending: true });
  // Eén renner met twee open sessies telt één keer.
  const byProfile = new Map<string, LiveRider>();
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = ((row.profiles as any)?.display_name as string) ?? "ZWB'er";
    const profileId = row.profile_id as string;
    if (!byProfile.has(profileId)) {
      byProfile.set(profileId, { profileId, name, sessionStartedAt: row.started_at as string });
    }
  }
  const riders = [...byProfile.values()];
  if (riders.length === 0) return { together: null, events: [] };

  // Events die vandaag lopen kunnen hooguit een dag geleden begonnen zijn.
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, start_at, end_at")
    .gte("start_at", new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .lte("start_at", new Date(now + 60 * 60 * 1000).toISOString());
  const events: RunningEvent[] = (eventRows ?? [])
    .map((row) => ({
      id: row.id as string,
      title: String(row.title ?? ""),
      startAt: row.start_at as string,
      endAt: (row.end_at as string | null) ?? null,
    }))
    .filter((event) => isEventRunning(event, now));
  const { data: rsvpRows } =
    events.length > 0
      ? await supabase
          .from("event_rsvps")
          .select("event_id, profile_id, status")
          .in("event_id", events.map((event) => event.id))
          .in("profile_id", riders.map((rider) => rider.profileId))
      : { data: [] };
  const split = splitLiveRiders(
    riders,
    events,
    (rsvpRows ?? []).map((row) => ({
      eventId: row.event_id as string,
      profileId: row.profile_id as string,
      status: row.status as string,
    })),
    now,
  );
  return {
    together:
      split.together.length > 0
        ? { count: split.together.length, riders: liveRidersLabel(split.together, viewerId) }
        : null,
    events: split.byEvent.map(({ event, riders: eventRiders }) => ({
      id: event.id,
      title: event.title,
      count: eventRiders.length,
      riders: liveRidersLabel(eventRiders, viewerId),
    })),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // De Strava-koppeling komt hier terug uit OAuth; de melding hoort dus ook
  // hier, bij de knop die het lid net gebruikte.
  const params = (await searchParams) ?? {};
  const rawStravaError = params.strava_error;
  const stravaError = Array.isArray(rawStravaError) ? rawStravaError[0] : rawStravaError;
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  // Elke databasevraag is een oversteek (functies in Ohio, database in Ierland), dus
  // wat niet van elkaar afhangt, vertrekt tegelijk: de rechten en de ritbron lopen
  // mee met de grote ronde hieronder in plaats van ervoor en erna.
  const accessPromise = getRequestAccess();
  const rideStatusPromise = user
    ? loadRideSourceStatus(user.id).catch(() => null)
    : Promise.resolve(null);
  // Wie er nu live rijdt, voor de tegel Samen fietsen in het design "tegels".
  // Loopt mee met de rest, want Garmin en Wahoo eerst bijwerken kost een oversteek.
  const livePromise = getDesign()
    .then((design) => (design === "tegels" && user ? loadLiveNow(supabase, user.id) : null))
    .catch(() => null);

  const nowIso = new Date().toISOString();
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const since7Iso = since7.toISOString();
  // Een badge staat er tot en met twee dagen na de dag waarop hij is behaald,
  // zoals het FRR-klassement na het einde van een tour (besluit eigenaar).
  const badgesSinceIso =
    amsterdamWallTimeToIso(
      new Date(Date.parse(`${amsterdamDateKey()}T12:00:00Z`) - 2 * 86400_000)
        .toISOString()
        .slice(0, 10),
      "00:00",
    ) ?? since7Iso;
  const since8 = new Date(since7);
  since8.setDate(since8.getDate() - 1);
  const since8Iso = since8.toISOString();
  const plus7 = new Date();
  plus7.setDate(plus7.getDate() + 7);
  const plus7Iso = plus7.toISOString();
  // Clubraces kijken verder vooruit dan de overige events: een ZRL-ronde wil je
  // ruim van tevoren zien staan.
  const plus14 = new Date();
  plus14.setDate(plus14.getDate() + 14);
  const plus14Iso = plus14.toISOString();
  const today = new Date().toISOString().slice(0, 10);
  // Amsterdam-datum: zo verdwijnt de workout van vandaag niet zodra het geplande
  // tijdstip voorbij is (zelfde keuze als de trainingspagina).
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Amsterdam",
  });

  const [
    { data: profile },
    { data: mediaRows },
    { data: pollRows },
    { data: benefitRows },
    { data: upcoming },
    { data: standingRows },
    { data: clubActivities },
    { data: awardRows },
    { data: recentPastEventRows },
    { data: trainingConn },
    { data: nextWorkoutRows },
    { data: stravaConn },
    { data: instagramRows },
    { data: zrlResultRows },
    { data: repRows },
    { data: chatRows },
    { data: photoRows },
  ] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("display_name, sex, wellness_device, zwift_id, zwift_opt_out, ftp_watts")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("media_items")
      .select("id, title, body_md, pinned, published_at, kind, author_id, profiles(display_name)")
      .gte("published_at", since7Iso)
      .neq("kind", "instagram")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("polls")
      // Opties en stemmen alleen van deze twee polls; eerder kwamen alle stemmen
      // van alle polls ooit mee (en boven 1000 rijen stilletjes afgekapt).
      .select(
        "id, question, description_md, multi_select, closes_at, created_at, poll_options!poll_options_poll_id_fkey(id, poll_id, label, display_order), poll_votes!poll_votes_poll_id_fkey(poll_id, option_id, profile_id)",
      )
      .eq("scope", "free")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .order("display_order", { referencedTable: "poll_options" })
      .limit(2),
    supabase
      .from("member_benefits")
      .select(
        "id, title, discount_code, redeem_url, valid_until, active, display_order, sponsors(name, logo_url)",
      )
      .eq("active", true)
      .order("display_order")
      .limit(3),
    supabase
      .from("events")
      .select("id, title, type, kind, start_at, location, cover_image_path")
      // Teamevents staan onder hun hoofdevent (migr. 0178).
      .is("parent_event_id", null)
      .gte("start_at", nowIso)
      .lte("start_at", plus14Iso)
      .order("start_at", { ascending: true })
      .limit(30),
    supabase
      .from("team_results")
      .select(
        "id, team_id, competition, round_label, round_at, position, points, total_teams, created_at, source_url, teams(id, name, type, division)",
      )
      .not("position", "is", null)
      .gte("round_at", since7Iso)
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer, import_source:raw->>import_source, device_name:raw->>device_name, profiles(display_name)",
      )
      .gte("start_date", since7.toISOString())
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: false })
      .limit(8),
    supabase
      .from("achievement_awards")
      .select(
        "id, profile_id, award_scope, period_start, awarded_at, value, metadata, profiles(display_name), achievement_badges(title, icon, color)",
      )
      .gte("awarded_at", badgesSinceIso)
      .order("awarded_at", { ascending: false })
      .order("period_start", { ascending: false })
      .limit(8),
    supabase
      .from("events")
      .select("id, title, start_at, location, cover_image_path, created_by")
      .gte("start_at", since7Iso)
      .lt("start_at", nowIso)
      // FRR-tijdsloten (migr. 0195) niet: een tourweek heeft er ruim veertig.
      .or("type.neq.flamme_rouge,parent_event_id.is.null")
      .order("start_at", { ascending: false })
      .limit(6),
    user
      ? supabase
          .from("intervals_connections")
          .select("api_key, athlete_id, wellness_opt_in")
          .eq("profile_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("training_workouts")
          .select("title, scheduled_at, intensity, duration_minutes, structure_json, test_type")
          .is("superseded_at", null)
          .eq("profile_id", user.id)
          .gte("scheduled_at", `${todayKey}T00:00:00`)
          .order("scheduled_at", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("strava_connections")
          .select("scope")
          .eq("profile_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("media_items")
      .select("id, title, web_url, cover_url, source, published_at")
      .eq("kind", "instagram")
      .not("cover_url", "is", null)
      .order("published_at", { ascending: false })
      .limit(30),
    // computed_at ligt kort na de race; de racedatum zelf filtert zrlStandings.
    supabase
      .from("zrl_team_results")
      .select(
        "event_id, team_id, rank, total_teams:teams, points, computed_at, events(title, start_at, parent_event_id), team:team_id(id, name, type, division)",
      )
      .gte("computed_at", since7Iso)
      .order("computed_at", { ascending: false })
      .limit(40),
    // Verslagen, chat en foto's bij de voorbije events van deze week. Op datum in
    // plaats van op event-id, zodat ze met de rest mee kunnen in plaats van in een
    // tweede ronde; hieronder houden we alleen over wat bij een getoond event hoort.
    // Een dag marge: de chat van een event begint op de dag zelf, soms vóór de start.
    supabase
      .from("event_reports")
      .select("event_id, body_md, created_at, profiles(display_name)")
      .gte("created_at", since8Iso)
      .order("created_at", { ascending: false }),
    supabase.from("event_chat_messages").select("event_id").gte("created_at", since8Iso),
    supabase
      .from("event_photos")
      .select("event_id, storage_path")
      .gte("created_at", since8Iso)
      .order("created_at", { ascending: false }),
  ]);
  const access = await accessPromise;
  const isModerator = access.has("events.manage_all");

  // Ritverslagen = voorbije events van de afgelopen 7 dagen, verrijkt met een
  // eventueel geschreven verslag, foto's en de live-chat.
  const recentPastEvents = (recentPastEventRows ?? []) as Array<{
    id: string;
    title: string;
    start_at: string;
    location: string | null;
    cover_image_path: string | null;
    created_by: string | null;
  }>;
  const recentEventIds = new Set(recentPastEvents.map((e) => e.id));

  const reportByEvent = new Map<string, { count: number; author: string; snippet: string }>();
  const chatCountByEvent = new Map<string, number>();
  const photoCountByEvent = new Map<string, number>();
  const photoPathsByEvent = new Map<string, string[]>();
  if (recentEventIds.size > 0) {
    for (const r of (repRows ?? []) as Array<{
      event_id: string;
      body_md: string;
      profiles: ProfileRef | ProfileRef[] | null;
    }>) {
      if (!recentEventIds.has(r.event_id)) continue;
      const cur = reportByEvent.get(r.event_id);
      if (cur) {
        cur.count += 1;
      } else {
        const text = r.body_md.replace(/[#*_>`-]/g, "").replace(/\s+/g, " ").trim();
        reportByEvent.set(r.event_id, {
          count: 1,
          author: singleProfileName(r.profiles) ?? "ZWB'er",
          snippet: text.length > 120 ? `${text.slice(0, 120)}…` : text,
        });
      }
    }
    for (const c of (chatRows ?? []) as { event_id: string }[]) {
      if (!recentEventIds.has(c.event_id)) continue;
      chatCountByEvent.set(c.event_id, (chatCountByEvent.get(c.event_id) ?? 0) + 1);
    }
    for (const p of (photoRows ?? []) as { event_id: string; storage_path: string }[]) {
      if (!recentEventIds.has(p.event_id)) continue;
      photoCountByEvent.set(p.event_id, (photoCountByEvent.get(p.event_id) ?? 0) + 1);
      const list = photoPathsByEvent.get(p.event_id) ?? [];
      list.push(p.storage_path);
      photoPathsByEvent.set(p.event_id, list);
    }
  }

  const mediaItems = (mediaRows ?? []) as unknown as MediaItemRow[];
  // Live stories (hooguit 24 uur oud) eerst, dan de drie nieuwste posts: eigen
  // posts en posts van anderen waarin de club is getagd door elkaar, op datum.
  const instagramItems = (instagramRows ?? []) as Array<
    Omit<InstagramPost, "story" | "tagged"> & { source: string | null; published_at: string }
  >;
  // eslint-disable-next-line react-hooks/purity
  const storyCutoff = new Date(Date.now() - INSTAGRAM_STORY_TTL_MS).toISOString();
  const instagramPosts: InstagramPost[] = [
    ...instagramItems
      .filter((i) => i.source === INSTAGRAM_STORY_SOURCE && i.published_at >= storyCutoff)
      .slice(0, 3)
      .map((i) => ({ ...i, story: true, tagged: false })),
    ...instagramItems
      .filter((i) => !INSTAGRAM_NON_POST_SOURCES.includes(i.source ?? ""))
      .slice(0, 3)
      .map((i) => ({ ...i, story: false, tagged: i.source === INSTAGRAM_TAG_SOURCE })),
  ];
  // Het design "tegels" toont alleen posts van de laatste zeven dagen.
  const instagramRecentIds = new Set(
    instagramItems.filter((item) => item.published_at >= since7Iso).map((item) => item.id),
  );
  const pollsWithVotes = (pollRows ?? []) as unknown as Array<
    PollRow & { poll_options: PollOptionRow[] | null; poll_votes: PollVoteRow[] | null }
  >;
  const polls = dashboardPolls(
    pollsWithVotes,
    pollsWithVotes.flatMap((poll) => poll.poll_options ?? []),
    pollsWithVotes.flatMap((poll) => poll.poll_votes ?? []),
  ).filter((poll) => !poll.closes_at || new Date(poll.closes_at) > new Date());
  const benefits = ((benefitRows ?? []) as unknown as BenefitRow[]).filter(
    (benefit) => benefit.active && (!benefit.valid_until || benefit.valid_until >= today),
  );
  const standings = latestStandings([
    ...((standingRows ?? []) as unknown as TeamStanding[]),
    ...zrlStandings((zrlResultRows ?? []) as unknown as ZrlTeamResultRow[], since7Iso),
  ]);
  const activities = (clubActivities ?? []) as unknown as ClubActivityRow[];
  const awards = (awardRows ?? []) as unknown as AwardRow[];
  const reportPreviews = recentPastEvents.map((ev) => {
    const rep = reportByEvent.get(ev.id);
    // Header-beeld: stabiel gekozen uit cover + foto's, zodat renders puur blijven.
    const imagePool = [
      ...(ev.cover_image_path ? [ev.cover_image_path] : []),
      ...(photoPathsByEvent.get(ev.id) ?? []),
    ];
    const pickedIndex =
      imagePool.length > 0
        ? Array.from(ev.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
          imagePool.length
        : -1;
    const pickedPath =
      pickedIndex >= 0 ? imagePool[pickedIndex] : null;
    const coverUrl = pickedPath
      ? supabase.storage.from("event-photos").getPublicUrl(pickedPath).data
          .publicUrl
      : null;
    return {
      id: ev.id,
      eventId: ev.id,
      eventTitle: ev.title,
      dateLabel: new Date(ev.start_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Amsterdam",
      }),
      coverUrl,
      author: rep?.author ?? null,
      snippet: rep?.snippet ?? null,
      reportCount: rep?.count ?? 0,
      chatCount: chatCountByEvent.get(ev.id) ?? 0,
      photoCount: photoCountByEvent.get(ev.id) ?? 0,
      canDelete: isModerator || ev.created_by === user?.id,
    };
  });

  // Ritverslagen met een verslag of foto's eerst; drie kaarten zijn genoeg om
  // de clubraces en events niet onder de vouw te duwen.
  const shownReports = [...reportPreviews]
    .sort(
      (a, b) =>
        Number(b.reportCount + b.photoCount > 0) - Number(a.reportCount + a.photoCount > 0),
    )
    .slice(0, 3);

  // Clubraces krijgen een eigen blok boven de overige events, die hun venster
  // van zeven dagen houden.
  const upcomingEvents = (upcoming ?? []) as UpcomingEvent[];
  const clubRaces = upcomingEvents
    .filter((event) => CLUB_RACE_TYPES.includes(event.type))
    .slice(0, 5);
  const otherEvents = upcomingEvents
    .filter((event) => !CLUB_RACE_TYPES.includes(event.type) && event.start_at <= plus7Iso)
    .slice(0, 5);

  const firstName = (profile?.display_name ?? user?.email?.split("@")[0] ?? "")
    .trim()
    .split(/\s+/)[0];

  // Persoonlijk trainingsblok: alleen tonen als het lid intervals.icu gekoppeld
  // heeft óf een geplande workout heeft. De trage intervals-fetch zit in het
  // gesuspende <TrainingStatus>, niet in deze pagina-render.
  const conn = (trainingConn ?? null) as TrainingStatusConn | null;
  const nextWorkoutRow = (nextWorkoutRows ?? [])[0] ?? null;
  const nextWorkout: TrainingStatusWorkout | null = nextWorkoutRow
    ? (() => {
        const ftp = Number((profile as { ftp_watts?: number | null } | null)?.ftp_watts);
        const planned = plannedWorkoutIntensity(nextWorkoutRow, ftp > 0 ? ftp : null);
        return {
          title: nextWorkoutRow.title,
          scheduled_at: nextWorkoutRow.scheduled_at,
          duration_minutes: nextWorkoutRow.duration_minutes,
          intensity: planned.intensity,
          intensityLabel: planned.label,
        };
      })()
    : null;
  const sex = (profile as { sex?: string | null } | null)?.sex ?? null;
  const zwiftProfile = profile as
    | { zwift_id?: string | null; zwift_opt_out?: boolean | null }
    | null;
  const needsZwiftId = Boolean(
    user && zwiftProfile && !zwiftProfile.zwift_id && !zwiftProfile.zwift_opt_out,
  );
  const wellnessDevice =
    ((profile as { wellness_device?: string | null } | null)?.wellness_device ??
      null) as WellnessDevice | null;
  const showTraining = Boolean(conn) || Boolean(nextWorkout);
  // Syncen kan alleen met een koppeling die ook activiteiten mag lezen. Lukt
  // koppelen niet — de Strava-atletenlimiet raakt niet elk lid — dan blijft de
  // CSV/GPX-import de volwaardige route, dus die staat er altijd.
  const strava = (stravaConn ?? null) as { scope?: string | null } | null;
  // Waar de ritten vandaan komen: Strava, intervals.icu (leden zonder
  // Strava-koppeling) of nog nergens. Faalt het ophalen, dan valt het blok terug
  // op het oude gedrag.
  const rideStatus = await rideStatusPromise;
  const canSyncStrava =
    hasActivityScope(strava?.scope ?? null) && (rideStatus?.stravaActive ?? true);

  // Design "tegels" (achter de schakelaar, lib/design.ts): dezelfde data, bovenaan
  // als tegels. Clubraces, scorebord en aankomende events staan dan in de tegels
  // en in de kalender; ritverslagen vervalt daar als los blok.
  const tegels = (await getDesign()) === "tegels";
  const amsterdam = { timeZone: "Europe/Amsterdam" } as const;
  const dayKeyOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA", amsterdam);
  // eslint-disable-next-line react-hooks/purity
  const tomorrowKey = dayKeyOf(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  const whenLabel = (iso: string) => {
    const key = dayKeyOf(iso);
    if (key === todayKey) return "vandaag";
    if (key === tomorrowKey) return "morgen";
    return new Date(iso).toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...amsterdam,
    });
  };
  const toTile = (event: UpcomingEvent, place: VandaagEvent["place"]): VandaagEvent => ({
    id: event.id,
    title: event.title,
    when: whenLabel(event.start_at),
    time: new Date(event.start_at).toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      ...amsterdam,
    }),
    place,
  });
  // Clubraces staan niet in deze tegels: de races waar je zelf in zit komen er
  // direct onder (MyRaces), en alle andere staan in de kalender.
  // Het verloop van de eerstvolgende training voor de lijn in de tegel: per blok
  // de duur en het midden van het doelvermogen, of van de zone als het blok geen
  // eigen doel heeft.
  const workoutProfile =
    tegels && nextWorkoutRow
      ? normalizeWorkoutBlocks(
          nextWorkoutRow.structure_json,
          nextWorkoutRow.intensity as WorkoutIntensity,
        ).map((block) => {
          const ftp = Number((profile as { ftp_watts?: number | null } | null)?.ftp_watts);
          const [low, high] =
            powerRangePercentForBlock(block, ftp > 0 ? ftp : null) ??
            INTENSITY_FTP_RANGE[block.intensity];
          return { minutes: block.durationMinutes, pct: (low + high) / 2 };
        })
      : undefined;
  const liveNow = await livePromise;
  // Een event dat al een eigen live-tegel heeft, staat er niet nog eens bij.
  const liveEventIds = new Set((liveNow?.events ?? []).map((event) => event.id));
  const tileEvents = otherEvents
    .filter((event) => !liveEventIds.has(event.id))
    .slice(0, 3)
    .map((event) => toTile(event, "kalender"));
  // De uitslagtegel toont de nieuwste uitslag van een eigen team. Wie in een
  // paraplu zit, telt de subteams als eigen team (zelfde regel als MyRaces en de
  // kalender, migr. 0179). Geen eigen team met een uitslag: geen tegel.
  let tileStanding: TeamStandingWithTeam | null = null;
  if (tegels && user && standings.length > 0) {
    const { data: memberRows } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("profile_id", user.id);
    const directTeamIds = (memberRows ?? []).map((row) => row.team_id as string);
    const { data: subteamRows } =
      directTeamIds.length > 0
        ? await supabase.from("teams").select("id").in("parent_team_id", directTeamIds)
        : { data: [] };
    const ownTeamIds = new Set([
      ...directTeamIds,
      ...(subteamRows ?? []).map((row) => row.id as string),
    ]);
    tileStanding =
      standings
        .filter((standing) => ownTeamIds.has(standing.team_id))
        .sort((x, y) =>
          (y.round_at ?? y.created_at).localeCompare(x.round_at ?? x.created_at),
        )[0] ?? null;
  }

  function eventList(events: UpcomingEvent[]) {
    return (
      <ul className="divide-y rounded-lg border bg-card">
        {events.map((event) => {
          const coverUrl = event.cover_image_path
            ? supabase.storage
                .from("event-photos")
                .getPublicUrl(event.cover_image_path).data.publicUrl
            : null;
          return (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex items-center gap-3 p-4 transition hover:bg-muted/50"
            >
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.start_at).toLocaleString("nl-NL", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "Europe/Amsterdam",
                  })}
                  {event.location ? ` - ${event.location}` : ""}
                </p>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                {eventLabel(event.type, event.kind)}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={tegels ? "tg-dash space-y-2" : "space-y-8"}>
      {tegels ? (
        <TegelsVandaag
          weekday={new Date().toLocaleDateString("nl-NL", { weekday: "long", ...amsterdam })}
          date={new Date().toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            ...amsterdam,
          })}
          workout={
            nextWorkout
              ? {
                  title: nextWorkout.title,
                  profile: workoutProfile,
                  when: whenLabel(nextWorkout.scheduled_at),
                  today: dayKeyOf(nextWorkout.scheduled_at) === todayKey,
                  meta: [
                    nextWorkout.duration_minutes ? `${nextWorkout.duration_minutes} min` : null,
                    nextWorkout.intensityLabel ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }
              : null
          }
          events={tileEvents}
          live={liveNow?.together ?? null}
          liveEvents={liveNow?.events ?? []}
          standing={
            tileStanding && tileStanding.position
              ? {
                  href: tileStanding.round_url ?? tileStanding.href,
                  team: tileStanding.team.name,
                  competition: tileStanding.competition,
                  position: tileStanding.position,
                  totalTeams: tileStanding.total_teams ?? null,
                }
              : null
          }
        />
      ) : (
        <PageHeader
          eyebrow={<Greeting name={firstName || null} serverHour={amsterdamHour()} />}
          title="Welkom thuis op ZWBasis"
        />
      )}

      {/* Vaste plek voor het weekoverzicht: de hele week, naar de laatst
          afgesloten week. In tegels staat het in de tegelrij hieronder. */}
      {!tegels && user && <WeekReviewDashboardLink />}

      {/* Blijft staan tot het ID er is: de dialoog bij inloggen mag weggeklikt
          worden, maar dan moet het ergens zichtbaar blijven. */}
      {needsZwiftId && (
        <Link
          href="/profiel?weergave=bewerken#racen"
          className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 transition hover:border-amber-500/70 dark:text-amber-300"
        >
          <AlertTriangle className="size-4 shrink-0" />
          Vul je Zwift-ID in, anders sta je niet in de ZwiftPower- en ZwiftRacing-standen.
        </Link>
      )}

      {tegels ? (
        // Eén tegelrij: jouw races, met de Instagram-posts van deze week ernaast.
        <div className="grid grid-cols-2 gap-2 empty:hidden md:grid-cols-4">
          {user && <WeekReviewDashboardLink tegels />}
          {user && (
            <Suspense fallback={null}>
              <MyRaces userId={user.id} tegels />
            </Suspense>
          )}
          <InstagramStrip
            tegels
            posts={instagramPosts.filter((post) => instagramRecentIds.has(post.id))}
          />
        </div>
      ) : (
        user && (
          <Suspense fallback={null}>
            <MyRaces userId={user.id} />
          </Suspense>
        )
      )}

      {/* Naast elkaar op desktop: de trainingsstatus is het brede blok, het
          core-advies de smalle kolom ernaast. Zonder trainingsstatus staat core
          gewoon over de volle breedte. */}
      <div
        className={
          tegels
            ? "grid gap-2"
            : showTraining
            ? "grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            : "grid items-start gap-6"
        }
      >
        {showTraining && (
          <Suspense fallback={<TrainingStatusSkeleton />}>
            <TrainingStatus
              tegels={tegels}
              conn={conn}
              nextWorkout={nextWorkout}
              sex={sex}
              wellnessDevice={wellnessDevice}
            />
          </Suspense>
        )}
        <Suspense fallback={<CoreStatusSkeleton />}>
          <CoreStatus tegels={tegels} />
        </Suspense>
      </div>

      {!tegels && instagramPosts.length > 0 && <InstagramStrip posts={instagramPosts} />}

      {user?.id && <MaintenanceStatus profileId={user.id} />}

      {!tegels && clubRaces.length > 0 && (
        <section>
          <SectionHeader
            icon={Flag}
            title="Clubraces"
            action={<InlineMoreLink href="/kalender">Kalender</InlineMoreLink>}
          />
          {eventList(clubRaces)}
        </section>
      )}

      {!tegels && standings.length > 0 && (
        <section>
          <SectionHeader
            icon={Trophy}
            title="Teams en scorebord"
            action={<InlineMoreLink href="/teams">Teams</InlineMoreLink>}
          />
          <ul className="divide-y rounded-lg border bg-card">
            {standings.map((standing) => (
              <li key={standing.id}>
                <Link
                  href={standing.href}
                  className="grid gap-3 p-4 transition hover:bg-muted/50 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{standing.team.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {standing.team.type}
                      {standing.team.division ? ` - ${standing.team.division}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate">{standing.competition}</p>
                    {standing.round_label && (
                      <p className="truncate text-xs text-muted-foreground">
                        {standing.round_label}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="inline-flex min-w-16 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-sm font-semibold tabular-nums text-primary-foreground">
                      <Medal className="size-4" />
                      #{standing.position}
                      {standing.total_teams ? `/${standing.total_teams}` : ""}
                    </span>
                    {standing.points !== null && standing.points !== undefined && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {standing.points} pt
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={null}>
        <FrrStandings userId={user?.id ?? null} />
      </Suspense>

      <Suspense fallback={null}>
        <SrcResults userId={user?.id ?? null} />
      </Suspense>

      {!tegels && (
      <section>
        <SectionHeader
          icon={CalendarDays}
          title="Aankomende events"
          action={<InlineMoreLink href="/kalender">Kalender</InlineMoreLink>}
        />
        {otherEvents.length === 0 ? (
          <EmptyState>Geen events ingepland.</EmptyState>
        ) : (
          eventList(otherEvents)
        )}
      </section>
      )}

      {mediaItems.length > 0 && (
        <section>
          <SectionHeader
            icon={Newspaper}
            title="Nieuws, mededelingen en media"
            action={<InlineMoreLink href="/media">Alles</InlineMoreLink>}
          />

          <ul className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            {mediaItems.map((item, index) => {
              const authorName = singleProfileName(item.profiles);
              const prominent = index === 0;
              return (
                <li
                  key={item.id}
                  className={`rounded-lg border bg-card p-4 ${
                    prominent ? "lg:row-span-2" : ""
                  } ${item.pinned ? "border-foreground/40" : ""}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {item.pinned && <Pin className="size-4 text-foreground/60" />}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                      {MEDIA_KIND_LABELS[item.kind] ?? item.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <MemberLink id={authorName ? item.author_id : null}>
                        {authorName ?? "Bestuur"}
                      </MemberLink>{" "}
                      -{" "}
                      {new Date(item.published_at).toLocaleDateString("nl-NL", {
                        dateStyle: "medium",
                        timeZone: "Europe/Amsterdam",
                      })}
                    </span>
                  </div>
                  <h3 className={prominent ? "text-lg font-semibold" : "font-medium"}>
                    {item.title}
                  </h3>
                  {prominent && item.body_md && (
                    <div className="mt-3">
                      <Markdown source={item.body_md} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Vragen over de app, in beide designs (wens eigenaar, 2026-10-19). */}
      <Suspense fallback={null}>
        <QaDashboard />
      </Suspense>

      {!tegels && shownReports.length > 0 && (
        <section>
          <SectionHeader
            icon={Camera}
            title={
              <Link
                href="/ritverslagen"
                className="hover:text-primary hover:underline"
              >
                Ritverslagen
              </Link>
            }
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownReports.map((r) => (
              <li key={r.id} className="relative">
                {r.canDelete && (
                  <div className="absolute right-2 top-2 z-10">
                    <DeleteRitverslagButton eventId={r.eventId} />
                  </div>
                )}
                <Link
                  href={`/events/${r.eventId}`}
                  className="group block h-full overflow-hidden rounded-lg border bg-card transition hover:border-primary/40"
                >
                  <div className="relative aspect-[16/8] w-full bg-gradient-to-br from-primary/20 to-secondary">
                    {r.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="line-clamp-1 text-sm font-semibold text-white">
                        {r.eventTitle}
                      </p>
                      <p className="text-xs text-white/80">
                        {[
                          r.dateLabel,
                          r.reportCount > 0
                            ? `${r.reportCount} verslag${r.reportCount === 1 ? "" : "en"}`
                            : null,
                          r.photoCount > 0 ? `${r.photoCount} foto's` : null,
                          r.chatCount > 0 ? `${r.chatCount} chat` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <p className="line-clamp-2 p-3 text-sm text-muted-foreground">
                    {r.snippet
                      ? r.snippet
                      : r.reportCount === 0 && r.photoCount === 0
                        ? "Nog geen verslag of foto's — voeg jouw verslag toe."
                        : r.author
                          ? `Verslag van ${r.author}`
                          : "Bekijk het ritverslag."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* In het design "tegels" vervalt dit blok (besluit eigenaar, 2026-10-12). */}
      {user && !tegels && <PhotoNudge userId={user.id} />}

      {awards.length > 0 && (
        <section>
          <SectionHeader
            icon={BadgeCheck}
            title="Nieuwste badges"
            action={<InlineMoreLink href="/stats/achievements">Achievements</InlineMoreLink>}
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {awards.map((award) => {
              const badge = awardBadge(award);
              const profileName = singleProfileName(award.profiles) ?? "ZWB'er";
              return (
                <li key={award.id}>
                  <Link
                    href={`/leden/${award.profile_id}`}
                    className="flex h-full gap-3 rounded-lg border bg-card p-3 transition hover:border-foreground/30"
                  >
                    {badge && (
                      <AchievementBadge
                        title={badge.title}
                        icon={badge.icon}
                        color={badge.color}
                        size="md"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{profileName}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {badge?.title ?? "Badge behaald"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {award.award_scope === "weekly" ? "Week van " : ""}
                        {new Date(award.period_start).toLocaleDateString("nl-NL", {
                          dateStyle: "medium",
                          timeZone: "Europe/Amsterdam",
                        })}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader
          icon={Bike}
          title="Training en clubactiviteit"
          action={<InlineMoreLink href="/stats">Clubstats</InlineMoreLink>}
        />
        {stravaError ? (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {stravaError}
          </p>
        ) : null}
        {strava &&
        (rideStatus?.stravaActive ?? true) &&
        !hasActivityScope(strava.scope ?? null) ? (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Je ritten kunnen niet worden opgehaald omdat het recht op je
              activiteiten ontbreekt. Koppel opnieuw en zet het vinkje voor je
              activiteiten aan.
            </p>
          </div>
        ) : null}
        {rideStatus?.visitReminderDue ? <IntervalsVisitReminder /> : null}
        {user && (
          // Op een telefoon passen de twee groepen niet naast elkaar. Ze
          // wrapten dan wel, maar hielden hun uitlijning: syncknoppen links,
          // importrij rechts. Onder sm staan ze daarom onder elkaar en allebei
          // links.
          <div
            id="strava-sync"
            className="mb-3 flex scroll-mt-4 flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            {canSyncStrava ? (
              <StravaSyncButton variant="sync" />
            ) : rideStatus?.source === "intervals" ? (
              <IntervalsRideSyncButton />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {rideStatus?.stravaCapFull ? null : (
                  <ConnectWithStrava reconnect={Boolean(strava)} />
                )}
                {rideStatus?.intervalsConnected ? null : (
                  <Link
                    href="/zwbeter-worden/doelen"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Koppel intervals.icu
                  </Link>
                )}
              </div>
            )}
            <StravaImportForm />
          </div>
        )}
        {activities.length === 0 ? (
          <EmptyState>Geen recente clubritten.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {activities.map((activity) => (
              <li key={activity.id}>
                <ActivityRow activityId={activity.id}>
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{activityProfile(activity)}</span>{" "}
                      <span className="text-muted-foreground">-</span>{" "}
                      <span className="text-muted-foreground">
                        {activity.name ?? "Activiteit"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(activity.start_date).toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Amsterdam",
                      })}
                      {activity.trainer ? " - trainer" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums text-muted-foreground sm:justify-end">
                    <span className="inline-flex items-center gap-1">
                      <Bike className="size-3.5" />
                      {formatKm(activity.distance_m)}
                    </span>
                    {toNumber(activity.total_elevation_gain_m) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Mountain className="size-3.5" />
                        {Math.round(toNumber(activity.total_elevation_gain_m)).toLocaleString("nl-NL")}m
                      </span>
                    )}
                    {activity.kudos_count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <HeartHandshake className="size-3.5" />
                        {activity.kudos_count}
                      </span>
                    )}
                    {garminAttribution(activity) ? (
                      <span className="text-xs">{garminAttribution(activity)}</span>
                    ) : null}
                    {isStravaActivityId(activity.id) ? <ViewOnStravaLabel /> : null}
                  </div>
                </ActivityRow>
              </li>
            ))}
          </ul>
        )}
        <StravaAttribution />
      </section>

      <ClubStats />

      {/* Alleen tonen wat er is: een lege poll- of voordeelkaart duwde de rest
          omlaag zonder iets te zeggen. */}
      {(polls.length > 0 || benefits.length > 0) && (
        <div
          className={
            polls.length > 0 && benefits.length > 0 ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
          }
        >
          {polls.length > 0 && (
            <section>
              <SectionHeader
                icon={Vote}
                title="Polls"
                action={<InlineMoreLink href="/polls">Stem mee</InlineMoreLink>}
              />
              <ul className="divide-y rounded-lg border bg-card">
                {polls.map((poll) => {
                  const topOption = [...poll.options].sort(
                    (a, b) => b.voteCount - a.voteCount,
                  )[0];
                  return (
                    <li key={poll.id} className="p-3">
                      <p className="line-clamp-2 text-sm font-medium">
                        {poll.question}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {poll.totalVotes} {poll.totalVotes === 1 ? "stem" : "stemmen"}
                        {topOption ? ` - bovenaan: ${topOption.label}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {benefits.length > 0 && (
            <section>
              <SectionHeader
                icon={Gift}
                title="Ledenvoordeel"
                action={<InlineMoreLink href="/sponsors">Alles</InlineMoreLink>}
              />
              <ul className="divide-y rounded-lg border bg-card">
                {benefits.map((benefit) => (
                  <li
                    key={benefit.id}
                    className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {singleSponsorName(benefit.sponsors) ?? "ZWB Cycling"}
                        {benefit.valid_until
                          ? ` - geldig t/m ${new Date(
                              benefit.valid_until,
                            ).toLocaleDateString("nl-NL", {
                              dateStyle: "medium",
                              timeZone: "Europe/Amsterdam",
                            })}`
                          : ""}
                      </p>
                    </div>
                    {benefit.discount_code && (
                      <span className="w-fit rounded-md border bg-background px-2 py-1 text-xs font-semibold tabular-nums">
                        {benefit.discount_code}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
