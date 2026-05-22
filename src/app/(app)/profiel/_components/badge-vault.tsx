"use client";

import { useMemo, useState } from "react";
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

function sourceLabel(source: MilestoneBadgeRow["trigger_source"]) {
  if (source === "auto") return "Automatisch via Strava";
  if (source === "manual") return "Handmatig door beheer";
  return "Toekomstige bron";
}

export function BadgeVault({
  badges,
  earnedIds,
}: {
  badges: MilestoneBadgeRow[];
  earnedIds: string[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
            {totalAchievements} achievements x 4 tiers. Klik een badge om de
            exacte eis uit de achievementlijst te bekijken.
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
          const selected = tiers.find((tier) => tier.id === selectedId) ?? first;
          const selectedEarned = earnedSet.has(selected.id);

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
                  const isSelected = selected.id === badge.id;

                  return (
                    <button
                      type="button"
                      key={badge.id}
                      className={[
                        "flex min-w-0 flex-col items-center gap-1 rounded-md border p-2 text-center transition",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:border-foreground/20 hover:bg-card",
                      ].join(" ")}
                      title={`${badge.title} - ${requirement}${earned ? " (behaald)" : " (nog niet)"}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(badge.id)}
                    >
                      <AchievementBadge
                        title={badge.title}
                        icon={badge.icon}
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
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{selected.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedEarned ? "Behaald" : "Nog niet behaald"} -{" "}
                      {sourceLabel(selected.trigger_source)}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                    {TIER_LABEL[selected.tier]}
                  </span>
                </div>

                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Eis
                    </dt>
                    <dd>{requirementFor(selected)}</dd>
                  </div>
                  {(selected.trigger_config?.visual || selected.visual_hint) && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Beeldtaal
                      </dt>
                      <dd className="text-muted-foreground">
                        {selected.trigger_config?.visual ?? selected.visual_hint}
                      </dd>
                    </div>
                  )}
                </dl>
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
