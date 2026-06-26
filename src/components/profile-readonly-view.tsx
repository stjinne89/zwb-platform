import Link from "next/link";
import { Bike, ExternalLink } from "lucide-react";
import { AchievementBadge } from "@/components/achievement-badge";
import { BadgeVault, type MilestoneBadgeRow } from "@/app/(app)/profiel/_components/badge-vault";
import { ProfileHeader } from "@/app/(app)/profiel/_components/profile-header";
import {
  bikeBrandModel,
  bikeName,
  formatBikeDistance,
  hasBikeDistance,
  type StravaBikeRow,
} from "@/lib/strava/bikes";

export type ReadonlyProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  region: string | null;
  zwift_id: string | null;
  strava_id: string | null;
  zrl_category: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  bio: string | null;
  birth_date?: string | null;
  is_admin: boolean | null;
  community_roles: string[] | null;
  public_profile_enabled?: boolean | null;
};

export type WeeklyAwardView = {
  id: string;
  period_start: string;
  value?: number | string | null;
  achievement_badges:
    | {
        title: string;
        icon: string | null;
        color: string | null;
        description?: string | null;
      }
    | {
        title: string;
        icon: string | null;
        color: string | null;
        description?: string | null;
      }[]
    | null;
};

function awardBadge(row: WeeklyAwardView) {
  return Array.isArray(row.achievement_badges)
    ? row.achievement_badges[0]
    : row.achievement_badges;
}

function formatWeight(value: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  return `${value} kg`;
}

function formatBirthDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "long",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function ProfileReadonlyView({
  profile,
  milestones,
  earnedMilestoneIds,
  weeklyAwards,
  publicUrl,
  publicLabel = "Publiek profiel",
  extraBeforeBadges,
  bikes,
}: {
  profile: ReadonlyProfile;
  milestones: MilestoneBadgeRow[];
  earnedMilestoneIds: string[];
  weeklyAwards: WeeklyAwardView[];
  publicUrl?: string | null;
  publicLabel?: string;
  /** Optionele sectie tussen profile-info en de badge-kast in (bv. RiderStats). */
  extraBeforeBadges?: React.ReactNode;
  /** Op het profiel getoonde fietsen (al gefilterd op zichtbaarheid). */
  bikes?: StravaBikeRow[];
}) {
  const infoTiles = [
    { label: "ZRL-categorie", value: profile.zrl_category },
    { label: "Zwift-ID", value: profile.zwift_id },
    {
      label: "FTP",
      value: profile.ftp_watts ? `${profile.ftp_watts} watt` : null,
    },
    { label: "Gewicht", value: formatWeight(profile.weight_kg) },
    { label: "Geboortedatum", value: formatBirthDate(profile.birth_date) },
  ].filter((tile): tile is { label: string; value: string } => Boolean(tile.value));

  return (
    <div className="space-y-6">
      <ProfileHeader
        displayName={profile.display_name ?? ""}
        email=""
        region={profile.region}
        avatarUrl={profile.avatar_url}
        stravaUsername={profile.strava_id}
        stravaConnected={Boolean(profile.strava_id)}
        communityRoles={profile.community_roles}
        isAdmin={profile.is_admin ?? false}
        earnedCount={earnedMilestoneIds.length}
        totalCount={milestones.length}
      />

      {publicUrl && (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Deelbaar profiel
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Deze pagina kan buiten de ledenomgeving bekeken worden.
              </p>
            </div>
            <Link
              href={publicUrl}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {publicLabel}
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </section>
      )}

      {infoTiles.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {infoTiles.map((tile) => (
            <InfoTile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </section>
      )}

      {profile.bio && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Over dit lid
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>
        </section>
      )}

      {bikes && bikes.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Fietsen
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bikes.map((b) => (
              <BikeCard key={b.id} bike={b} />
            ))}
          </ul>
        </section>
      )}

      {extraBeforeBadges}

      {milestones.length > 0 && (
        <BadgeVault badges={milestones} earnedIds={earnedMilestoneIds} />
      )}

      {milestones.length > 0 && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Behaalde weekbadges
          </h2>
          {weeklyAwards.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nog geen vastgelegde weekbadges.
            </p>
          ) : (
            <WeeklyBadges awards={weeklyAwards} />
          )}
        </section>
      )}
    </div>
  );
}

function BikeCard({ bike }: { bike: StravaBikeRow }) {
  const brandModel = bikeBrandModel(bike);

  return (
    <li className="overflow-hidden rounded-lg border bg-background">
      <div className="flex aspect-[16/10] items-center justify-center bg-muted">
        {bike.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bike.image_url}
            alt={bikeName(bike)}
            className="size-full object-cover"
          />
        ) : (
          <Bike className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium">{bikeName(bike)}</p>
        {brandModel && (
          <p className="truncate text-sm text-muted-foreground">{brandModel}</p>
        )}
        {hasBikeDistance(bike.distance_m) && (
          <p className="text-sm text-muted-foreground">
            {formatBikeDistance(bike.distance_m)}
          </p>
        )}
      </div>
    </li>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function WeeklyBadges({ awards }: { awards: WeeklyAwardView[] }) {
  const grouped = new Map<
    string,
    {
      badge: NonNullable<ReturnType<typeof awardBadge>>;
      count: number;
      latest: WeeklyAwardView;
    }
  >();

  for (const award of awards) {
    const badge = awardBadge(award);
    if (!badge) continue;
    const existing = grouped.get(badge.title);
    if (existing) {
      existing.count += 1;
      if (award.period_start > existing.latest.period_start) {
        existing.latest = award;
      }
    } else {
      grouped.set(badge.title, { badge, count: 1, latest: award });
    }
  }

  return (
    <ul className="mt-4 flex flex-wrap gap-3">
      {Array.from(grouped.values()).map(({ badge, count, latest }) => (
        <li
          key={badge.title}
          title={`${badge.title} - laatst behaald in week van ${new Date(latest.period_start).toLocaleDateString("nl-NL", { dateStyle: "medium" })}`}
        >
          <AchievementBadge
            title={badge.title}
            icon={badge.icon}
            color={badge.color}
            size="lg"
            count={count}
          />
        </li>
      ))}
    </ul>
  );
}
