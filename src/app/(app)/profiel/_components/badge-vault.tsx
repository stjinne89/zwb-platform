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
  trigger_config: { achievement?: string; visual?: string } | null;
  sort_order: number;
};

export function BadgeVault({
  badges,
  earnedIds,
}: {
  badges: MilestoneBadgeRow[];
  earnedIds: Set<string>;
}) {
  // Groepeer per achievement_code, behoud sort_order
  const byCode = new Map<string, MilestoneBadgeRow[]>();
  const codeOrder: string[] = [];
  for (const b of badges) {
    if (!byCode.has(b.achievement_code)) codeOrder.push(b.achievement_code);
    const arr = byCode.get(b.achievement_code) ?? [];
    arr.push(b);
    byCode.set(b.achievement_code, arr);
  }

  const totalAchievements = codeOrder.length;
  const totalEarned = badges.filter((b) => earnedIds.has(b.id)).length;
  const totalBadges = badges.length;

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Badge-kast
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalAchievements} achievements × 4 tiers. Verdiende badges
            glimmen, nog niet behaalde zijn vergrendeld.
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
          // Sorteer op tier-volgorde
          tiers.sort(
            (a, b) =>
              TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
          );
          const first = tiers[0];
          const achievementName =
            first?.trigger_config?.achievement ??
            first?.title.split(" - ")[0] ??
            code;
          const earnedInGroup = tiers.filter((t) => earnedIds.has(t.id)).length;

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
              <div className="flex items-center gap-3">
                {tiers.map((b) => {
                  const earned = earnedIds.has(b.id);
                  return (
                    <div
                      key={b.id}
                      className="flex flex-col items-center gap-1"
                      title={`${b.title} — ${b.description ?? ""}${earned ? " (behaald)" : " (nog niet)"}`}
                    >
                      <AchievementBadge
                        title={b.title}
                        icon={b.icon}
                        color={b.tier}
                        size="md"
                        locked={!earned}
                      />
                      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        {TIER_LABEL[b.tier]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {first?.description && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {first.trigger_config?.visual ?? first.visual_hint ?? ""}
                </p>
              )}
              {first?.trigger_source === "manual" && (
                <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Handmatige toekenning door admin
                </p>
              )}
              {first?.trigger_source === "future" && (
                <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
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
