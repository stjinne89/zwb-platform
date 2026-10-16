import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { StravaAttribution } from "@/components/strava-brand";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { EMPTY_CLUB_DATA, yearsNeeded } from "@/lib/stats/club";
import {
  bucketLabel,
  bucketsBetween,
  GRANULARITIES,
  parseGranularity,
  parseRange,
  RANGES,
  windowFor,
} from "@/lib/stats/personal";
import { CLUB_STATS_TILES, normalizeLayout, type ClubTileId } from "@/lib/stats/tiles";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { StatsTabs } from "./_components/stats-tabs";
import { Chip, ChipRow, PillChip } from "./_components/controls";
import { ClubTile, type ClubTileContext } from "./_components/club-tile";
import { loadClubData, loadClubProfiles, loadFirstClubDay } from "./_data";
import { loadTileChoice } from "./ik/_data";
import { TileCustomizer } from "./ik/_components/tile-customizer";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Clubstatistieken: dezelfde periodes, grafieken en tegelkeuze als Stats → Ik,
 * opgeteld over alle leden. De data komt per jaar uit een gedeelde cache
 * (_data.ts); per weergave is dat hooguit een handvol cachehits.
 */
export default async function StatsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const per = parseGranularity(first(params.per));
  const range = parseRange(first(params.bereik));
  const today = amsterdamDayKey();

  const supabase = await createClient();
  const [firstDay, choice, profiles] = await Promise.all([
    loadFirstClubDay().catch(() => null),
    loadTileChoice(supabase, user.id, "club_tiles"),
    loadClubProfiles().catch(() => []),
  ]);
  const span = windowFor(range, per, today, firstDay);
  const keys = bucketsBetween(span.start, span.end, per);
  const data = await loadClubData(yearsNeeded(span.start, today)).catch(() => EMPTY_CLUB_DATA);

  // Eén periode uitlichten (vroeger de maandchips): de ranglijst, disciplines,
  // regio's en totalen gaan dan over die periode. Per week zijn dat er te veel.
  const periodParam = first(params.periode) ?? null;
  const period = per !== "week" && periodParam && keys.includes(periodParam) ? periodParam : null;

  const layout = normalizeLayout<ClubTileId>(choice, CLUB_STATS_TILES);
  const visible = layout.filter((item) => item.visible);

  const href = (changes: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const merged: Record<string, string | null> = {
      per: per === "maand" ? null : per,
      bereik: range === "12m" ? null : range,
      periode: period,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const qs = query.toString();
    return qs ? `/stats?${qs}` : "/stats";
  };

  const context: ClubTileContext = { data, profiles, per, today, span, keys, period, firstDay, viewerId: user.id };
  const hasData = data.days.length > 0;

  return (
    <div className="st-page space-y-4">
      <StatsTabs active="/stats" title="Clubstatistieken" />

      {!hasData ? (
        <EmptyState>Nog geen ritten van de club.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ChipRow label="Per">
                {GRANULARITIES.map((item) => (
                  <Chip
                    key={item.key}
                    href={href({ per: item.key === "maand" ? null : item.key, periode: null })}
                    active={per === item.key}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChipRow>
              <ChipRow label="Bereik">
                {RANGES.map((item) => (
                  <Chip
                    key={item.key}
                    href={href({ bereik: item.key === "12m" ? null : item.key, periode: null })}
                    active={range === item.key}
                  >
                    {item.label}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <TileCustomizer
              page="club"
              layout={layout}
              tiles={CLUB_STATS_TILES.map((tile) => ({ id: tile.id, title: tile.title, lock: null }))}
            />
          </div>

          {per !== "week" && keys.length > 1 && (
            <ScrollTabs ariaLabel="Periode">
              <PillChip href={href({ periode: null })} active={!period}>
                Hele bereik
              </PillChip>
              {keys.map((key) => (
                <PillChip key={key} href={href({ periode: key })} active={period === key}>
                  {bucketLabel(key, per)}
                </PillChip>
              ))}
            </ScrollTabs>
          )}

          {visible.length === 0 ? (
            <EmptyState>Geen tegels gekozen.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((item) => (
                <ClubTile key={item.id} id={item.id} context={context} />
              ))}
            </div>
          )}
        </>
      )}

      <StravaAttribution />
    </div>
  );
}
