import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { StravaAttribution } from "@/components/strava-brand";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { DISCIPLINE_LABELS } from "@/lib/strava/sports";
import { loadFtpAt } from "@/lib/training/ftp-history";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import {
  bucketsBetween,
  GRANULARITIES,
  parseGranularity,
  parseRange,
  personalRidesFromRows,
  RANGES,
  windowFor,
} from "@/lib/stats/personal";
import { normalizeLayout, STATS_TILES, tileDef, type TileId } from "@/lib/stats/tiles";
import { StatsTabs } from "../_components/stats-tabs";
import { Chip, ChipRow, PillChip } from "../_components/controls";
import { loadPersonalRideRows, loadStatsConnection, loadTileChoice } from "./_data";
import { TileFallback } from "./_components/tiles";
import { StatsTile, type TileContext } from "./_components/stats-tile";
import { TileCustomizer } from "./_components/tile-customizer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Search = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function MyStatsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const per = parseGranularity(first(params.per));
  const range = parseRange(first(params.bereik));
  const sport = first(params.sport) ?? null;
  const page = Math.max(1, Math.floor(Number(first(params.pagina)) || 1));

  const supabase = await createClient();
  const [rows, profile, choice, connection] = await Promise.all([
    loadPersonalRideRows(supabase, user.id),
    supabase.from("profiles").select("ftp_watts").eq("id", user.id).maybeSingle(),
    loadTileChoice(supabase, user.id),
    loadStatsConnection(supabase, user.id),
  ]);
  const currentFtp = profile.data?.ftp_watts == null ? null : Number(profile.data.ftp_watts);
  const ftpAt = await loadFtpAt(supabase, user.id, currentFtp);

  const today = amsterdamDayKey();
  const allRides = personalRidesFromRows(rows, ftpAt);
  const sports = [...new Set(allRides.map((ride) => ride.sportType ?? "Ride"))];
  const activeSport = sport && sports.includes(sport) ? sport : null;
  const rides = activeSport ? allRides.filter((ride) => (ride.sportType ?? "Ride") === activeSport) : allRides;

  const span = windowFor(range, per, today, rides[0]?.day ?? null);
  const keys = bucketsBetween(span.start, span.end, per);
  const inWindow = rides.filter((ride) => ride.day >= span.start && ride.day <= span.end);

  const layout = normalizeLayout(choice);
  const lockOf = (id: TileId) => {
    const def = tileDef(id);
    if (def.source === "intervals" && !connection) return { label: "intervals.icu", href: "/zwbeter-worden/doelen" };
    if (def.needsWellnessOptIn && !connection?.wellness_opt_in) {
      return { label: "Herstel-opt-in", href: "/zwbeter-worden#herstel" };
    }
    return null;
  };
  const locked = (id: TileId) => lockOf(id) != null;
  const visible = layout.filter((item) => item.visible && !locked(item.id));

  const href = (changes: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const merged: Record<string, string | null> = {
      per: per === "maand" ? null : per,
      bereik: range === "12m" ? null : range,
      sport: activeSport,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const qs = query.toString();
    return qs ? `/stats/ik?${qs}` : "/stats/ik";
  };

  const context: TileContext = {
    profileId: user.id,
    per,
    range,
    today,
    span,
    keys,
    rides,
    inWindow,
    ftpAt,
    connection,
    page,
    pageHref: (next) => href({ pagina: next > 1 ? String(next) : null }),
  };

  return (
    <div className="st-page space-y-4">
      <PageHeader title="Mijn statistieken" />
      <StatsTabs active="/stats/ik" />

      {allRides.length === 0 ? (
        <EmptyState action={<Link href="/dashboard#strava-sync" className="text-sm font-medium text-primary">Naar Strava-sync</Link>}>
          Nog geen ritten.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ChipRow label="Per">
                {GRANULARITIES.map((item) => (
                  <Chip key={item.key} href={href({ per: item.key === "maand" ? null : item.key })} active={per === item.key}>
                    {item.label}
                  </Chip>
                ))}
              </ChipRow>
              <ChipRow label="Bereik">
                {RANGES.map((item) => (
                  <Chip key={item.key} href={href({ bereik: item.key === "12m" ? null : item.key })} active={range === item.key}>
                    {item.label}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <TileCustomizer
              layout={layout}
              tiles={STATS_TILES.map((tile) => ({ id: tile.id, title: tile.title, lock: lockOf(tile.id) }))}
            />
          </div>

          {sports.length > 1 && (
            <ScrollTabs ariaLabel="Discipline">
              <PillChip href={href({ sport: null })} active={!activeSport}>
                Alles
              </PillChip>
              {sports.map((item) => (
                <PillChip key={item} href={href({ sport: item })} active={activeSport === item}>
                  {DISCIPLINE_LABELS[item] ?? item}
                </PillChip>
              ))}
            </ScrollTabs>
          )}

          {visible.length === 0 ? (
            <EmptyState>Geen tegels gekozen.</EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((item) => {
                const def = tileDef(item.id);
                return (
                  <Suspense key={item.id} fallback={<TileFallback title={def.title} width={def.width} />}>
                    <StatsTile id={item.id} context={context} />
                  </Suspense>
                );
              })}
            </div>
          )}
        </>
      )}

      <StravaAttribution />
    </div>
  );
}
