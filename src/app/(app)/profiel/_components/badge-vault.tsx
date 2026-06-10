"use client";

import { useMemo } from "react";
import { AchievementBadge } from "@/components/achievement-badge";

const TIER_ORDER = ["bronze", "silver", "gold", "platinum"] as const;
type Tier = (typeof TIER_ORDER)[number];

const TIER_LABEL: Record<Tier, string> = {
  bronze: "Brons",
  silver: "Zilver",
  gold: "Goud",
  platinum: "Platinum",
};

export type MilestoneBadgeRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  achievement_code: string;
  tier: Tier;
  visual_hint: string | null;
  trigger_source: "auto" | "manual" | "future";
  trigger_config: {
    achievement?: string;
    visual?: string;
    threshold?: { raw?: string; value?: number; unit?: string };
  } | null;
  sort_order: number;
};

function requirementFor(badge: MilestoneBadgeRow) {
  return (
    badge.trigger_config?.threshold?.raw ??
    badge.description ??
    "Geen threshold vastgelegd"
  );
}

function visualIconFor(badge: MilestoneBadgeRow) {
  const visual = `${badge.trigger_config?.visual ?? ""} ${badge.visual_hint ?? ""} ${badge.title}`
    .toLowerCase();

  if (/berg|alpe|col|klim|haarspeld|alpen|dolom|everest|ventoux|stelvio|limburg|ardennen/.test(visual)) return "mountain";
  if (/groep|peloton|team|renners|kopwerk|helper|captain|no drop/.test(visual)) return "users";
  if (/kudo|hart|hand|help|mentor|cheer/.test(visual)) return "heart";
  if (/snel|sprint|power|watt|vermogen|ftp|grafiek|pacing/.test(visual)) return "zap";
  if (/klok|tijd|duur|nacht|maan|avond|zonsondergang/.test(visual)) return "moon";
  if (/zonsopkomst|horizon/.test(visual)) return "sunrise";
  if (/wind|storm/.test(visual)) return "wind";
  if (/regen|weer|nat/.test(visual)) return "rain";
  if (/winter|kou|sneeuw/.test(visual)) return "snow";
  if (/kaart|route|komoot|tegel|cluster|square|provincie|land|border|explorer|weg/.test(visual)) return "map";
  if (/foto|camera/.test(visual)) return "camera";
  if (/koffie/.test(visual)) return "coffee";
  if (/monteur|band|ketting|pech/.test(visual)) return "wrench";
  if (/trofee|kroon|win|podium|kom|qom|legend/.test(visual)) return "crown";
  if (/gravel|modder|bos|zand|offroad|strand/.test(visual)) return "navigation";
  if (/zwift|indoor|binnen|trainer|workout|robo/.test(visual)) return "dumbbell";
  if (/pont|water|zee|brug|dijk/.test(visual)) return "waves";
  if (/brevet|startnummer|finish|medaille/.test(visual)) return "medal";
  if (/kalender|week|maand|jaar|streak/.test(visual)) return "calendar";
  return badge.icon ?? "route";
}

export function BadgeVault({
  badges,
  earnedIds,
}: {
  badges: MilestoneBadgeRow[];
  earnedIds: string[];
}) {
  const earnedSet = useMemo(() => new Set(earnedIds), [earnedIds]);
  const { byCode, codeOrder } = useMemo(() => {
    const grouped = new Map<string, MilestoneBadgeRow[]>();
    const order: string[] = [];

    for (const badge of badges) {
      if (!grouped.has(badge.achievement_code)) order.push(badge.achievement_code);
      const current = grouped.get(badge.achievement_code) ?? [];
      current.push(badge);
      grouped.set(badge.achievement_code, current);
    }

    for (const tiers of grouped.values()) {
      tiers.sort(
        (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
      );
    }

    return { byCode: grouped, codeOrder: order };
  }, [badges]);

  const totalAchievements = codeOrder.length;
  const totalEarned = badges.filter((badge) => earnedSet.has(badge.id)).length;
  const totalBadges = badges.length;

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Badge-kast
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalAchievements} achievements x 4 tiers
          </p>
        </div>
        <p className="text-sm tabular-nums">
          <strong>{totalEarned}</strong>
          <span className="text-muted-foreground"> / {totalBadges} behaald</span>
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {codeOrder.map((code) => {
          const tiers = byCode.get(code) ?? [];
          const first = tiers[0];
          const achievementName =
            first?.trigger_config?.achievement ??
            first?.title.split(" - ")[0] ??
            code;
          const earnedInGroup = tiers.filter((tier) => earnedSet.has(tier.id)).length;
          return (
            <li
              key={code}
              className="rounded-md border bg-background p-3 transition hover:border-foreground/20"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="truncate text-sm font-semibold">
                  {achievementName}
                </h3>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {earnedInGroup}/4
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
                {tiers.map((badge) => {
                  const earned = earnedSet.has(badge.id);
                  const requirement = requirementFor(badge);

                  return (
                    <div
                      key={badge.id}
                      className="flex min-w-0 flex-col items-center gap-1 rounded-md border border-transparent p-2 text-center"
                      title={`${badge.title} - ${requirement}${earned ? " (behaald)" : " (nog niet)"}`}
                    >
                      <AchievementBadge
                        title={badge.title}
                        icon={visualIconFor(badge)}
                        color={badge.tier}
                        size="md"
                        locked={!earned}
                      />
                      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        {TIER_LABEL[badge.tier]}
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] text-[0.68rem] leading-tight text-foreground">
                        {requirement}
                      </span>
                    </div>
                  );
                })}
              </div>

              {first?.trigger_source === "manual" && (
                <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Deze achievement vraagt handmatige toekenning door beheer.
                </p>
              )}
              {first?.trigger_source === "future" && (
                <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  Toekomstige bron
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
