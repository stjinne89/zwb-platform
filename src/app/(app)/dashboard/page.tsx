import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CalendarDays,
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
import { EmptyState, InlineMoreLink, PageHeader, SectionHeader } from "@/components/app-ui";
import { AchievementBadge } from "@/components/achievement-badge";
import { Markdown } from "@/components/markdown";
import { MEDIA_KIND_LABELS } from "@/lib/media-kinds";
import { ClubStats } from "./_components/club-stats";
import { PhotoNudge } from "./_components/photo-nudge";
import { SponsorCarousel } from "./_components/sponsor-carousel";

const CYCLING_SPORTS = [
  "Ride",
  "VirtualRide",
  "MountainBikeRide",
  "EBikeRide",
  "GravelRide",
  "EMountainBikeRide",
  "Velomobile",
  "Handcycle",
];

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
  profiles: ProfileRef | ProfileRef[] | null;
};

type MediaItemRow = {
  id: string;
  kind: string;
  title: string;
  body_md: string | null;
  pinned: boolean;
  published_at: string;
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
  teams: TeamRef | TeamRef[] | null;
};

type TeamStandingWithTeam = TeamStanding & { team: TeamRef };

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

function latestStandings(results: TeamStanding[]): TeamStandingWithTeam[] {
  const byTeam = new Map<string, TeamStandingWithTeam>();

  for (const result of results) {
    const team = relatedTeam(result);
    if (!result.position || !team) continue;
    if (!byTeam.has(result.team_id)) byTeam.set(result.team_id, { ...result, team });
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: profile },
    { data: mediaRows },
    { data: pollRows },
    { data: pollOptionRows },
    { data: pollVoteRows },
    { data: benefitRows },
    { data: upcoming },
    { data: standingRows },
    { data: clubActivities },
    { data: awardRows },
    { data: sponsorRows },
  ] = await Promise.all([
    user
      ? supabase.from("profiles").select("display_name").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("media_items")
      .select("id, title, body_md, pinned, published_at, kind, profiles(display_name)")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("polls")
      .select("id, question, description_md, multi_select, closes_at, created_at")
      .eq("scope", "free")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("poll_options")
      .select("id, poll_id, label, display_order")
      .order("display_order"),
    supabase.from("poll_votes").select("poll_id, option_id, profile_id"),
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
      .select("id, title, type, start_at, location")
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("team_results")
      .select(
        "id, team_id, competition, round_label, round_at, position, points, total_teams, created_at, source_url, teams(id, name, type, division)",
      )
      .not("position", "is", null)
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("strava_activities")
      .select(
        "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer, profiles(display_name)",
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
      .order("awarded_at", { ascending: false })
      .order("period_start", { ascending: false })
      .limit(8),
    supabase
      .from("sponsors")
      .select("name, logo_url, website_url")
      .eq("active", true)
      .not("logo_url", "is", null)
      .order("tier")
      .order("display_order"),
  ]);

  const mediaItems = (mediaRows ?? []) as unknown as MediaItemRow[];
  const polls = dashboardPolls(
    (pollRows ?? []) as unknown as PollRow[],
    (pollOptionRows ?? []) as unknown as PollOptionRow[],
    (pollVoteRows ?? []) as unknown as PollVoteRow[],
  ).filter((poll) => !poll.closes_at || new Date(poll.closes_at) > new Date());
  const benefits = ((benefitRows ?? []) as unknown as BenefitRow[]).filter(
    (benefit) => benefit.active && (!benefit.valid_until || benefit.valid_until >= today),
  );
  const standings = latestStandings((standingRows ?? []) as unknown as TeamStanding[]);
  const activities = (clubActivities ?? []) as unknown as ClubActivityRow[];
  const awards = (awardRows ?? []) as unknown as AwardRow[];
  const carouselSponsors = (
    (sponsorRows ?? []) as {
      name: string;
      logo_url: string | null;
      website_url: string | null;
    }[]
  )
    .filter((s) => s.logo_url)
    .map((s) => ({
      name: s.name,
      logoUrl: s.logo_url as string,
      websiteUrl: s.website_url,
    }));
  const firstName = (profile?.display_name ?? user?.email?.split("@")[0] ?? "")
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={firstName ? `Hoi ${firstName}` : "Welkom"}
        title="Home app van ZWB Cycling Community"
      />

      {mediaItems.length > 0 && (
        <section>
          <SectionHeader
            icon={Newspaper}
            title="Nieuws, mededelingen en media"
            action={<InlineMoreLink href="/media">Alles</InlineMoreLink>}
          />

          <ul className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            {mediaItems.map((item, index) => {
              const author = singleProfileName(item.profiles) ?? "Bestuur";
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
                      {author} -{" "}
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Vote className="size-5 text-primary" />
                Polls
              </h2>
            </div>
            <Link
              href="/polls"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Stem mee
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {polls.length === 0 ? (
            <EmptyState>Geen open polls.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {polls.map((poll) => {
                const topOption = [...poll.options].sort(
                  (a, b) => b.voteCount - a.voteCount,
                )[0];
                return (
                  <li key={poll.id} className="rounded-md bg-muted/40 p-3">
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
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Gift className="size-5 text-primary" />
                Ledenvoordeel
              </h2>
            </div>
            <Link
              href="/sponsors"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Alles
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {benefits.length === 0 ? (
            <EmptyState>Geen actief ledenvoordeel.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li
                  key={benefit.id}
                  className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
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
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          icon={CalendarDays}
          title="Aankomende events"
          action={<InlineMoreLink href="/kalender">Kalender</InlineMoreLink>}
        />
        {!upcoming || upcoming.length === 0 ? (
          <EmptyState>Geen events ingepland.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="grid gap-3 p-4 transition hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
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
                  <span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                    {event.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user && <PhotoNudge userId={user.id} />}

      {standings.length > 0 && (
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
                  href={`/teams/${standing.team_id}`}
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

      <ClubStats />

      <section>
        <SectionHeader
          icon={Bike}
          title="Training en clubactiviteit"
          action={<InlineMoreLink href="/training">Training</InlineMoreLink>}
        />
        {activities.length === 0 ? (
          <EmptyState>Geen recente clubritten.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
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
                <div className="flex items-center gap-3 text-sm tabular-nums text-muted-foreground sm:justify-end">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          icon={BadgeCheck}
          title="Nieuwste badges"
          action={<InlineMoreLink href="/achievements">Achievements</InlineMoreLink>}
        />
        {awards.length === 0 ? (
          <EmptyState>Geen vastgelegde badges.</EmptyState>
        ) : (
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
        )}
      </section>

      {carouselSponsors.length > 0 && (
        <SponsorCarousel sponsors={carouselSponsors} />
      )}
    </div>
  );
}
