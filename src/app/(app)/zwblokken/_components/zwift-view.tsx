"use client";

// ZWBlokken in de Zwift-werelden: dezelfde kaart en tabel als buiten, maar per
// wereld, op een fijner raster en zonder echte kaartondergrond.

import { useEffect, useMemo, useState } from "react";
import { Crown, Grid3x3, MapPin, Percent } from "lucide-react";
import { BlocksMap, type PackedBlocks, type PackedClubBlocks } from "./blocks-map";
import { CoverageTable, type CoverageRow, type RulerMap } from "./coverage";

export type ZwiftWorldMeta = {
  slug: string;
  name: string;
  /** [[zuid, west], [noord, oost]] */
  bounds: [[number, number], [number, number]];
  /** Zwifts minimap; null = alleen routelijnen. */
  imageUrl: string | null;
  /** Bekende wegblokken: routevormen plus alles wat de club reed. */
  known: number;
  /** Blokken van de club samen. */
  club: number;
};

export type ZwiftOwnData = {
  blocks: Record<string, PackedBlocks>;
  counts: Record<string, number>;
};

export type ZwiftLeader = { id: string; name: string; blocks: number };

type Props = {
  worlds: ZwiftWorldMeta[];
  blockZoom: number;
  club: Record<string, PackedClubBlocks>;
  maxRiders: Record<string, number>;
  own: ZwiftOwnData;
  rulers: RulerMap;
  leaderboards: Record<string, ZwiftLeader[]>;
  memberId: string;
  memberName: string;
};

const nl = (n: number) => n.toLocaleString("nl-NL");
// Vaste lege waarden: een nieuw {} per render laat de kaartlaag steeds opnieuw tekenen.
const NO_BLOCKS: PackedBlocks = {};
const NO_CLUB: PackedClubBlocks = {};
const NO_LINES: [number, number][][] = [];
const regionCode = (slug: string) => `zwift:${slug}`;

function percent(part: number, whole: number) {
  if (whole <= 0) return "0%";
  const value = (part / whole) * 100;
  const digits = value >= 10 ? 0 : 1;
  return `${value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/90 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ZwiftView({
  worlds,
  blockZoom,
  club,
  maxRiders,
  own,
  rulers,
  leaderboards,
  memberId,
  memberName,
}: Props) {
  const [slug, setSlug] = useState(worlds[0]?.slug ?? "");
  const [lines, setLines] = useState<Record<string, [number, number][][]>>({});
  // Werelden waarvan de minimap niet laadde; die krijgen de routelijnen.
  const [imageFailed, setImageFailed] = useState<Record<string, true>>({});
  const world = worlds.find((w) => w.slug === slug) ?? worlds[0];
  const showImage = Boolean(world?.imageUrl) && !imageFailed[world?.slug ?? ""];

  // Routelijnen alleen ophalen als er geen minimap is.
  useEffect(() => {
    if (!world || showImage || lines[world.slug]) return;
    let cancelled = false;
    fetch(`/api/zwblokken/zwift-roads?world=${encodeURIComponent(world.slug)}`)
      .then((res) => (res.ok ? res.json() : { lines: [] }))
      .then((json) => {
        if (!cancelled) setLines((prev) => ({ ...prev, [world.slug]: json.lines ?? [] }));
      })
      .catch(() => {
        if (!cancelled) setLines((prev) => ({ ...prev, [world.slug]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [world, lines, showImage]);

  const rows: CoverageRow[] = useMemo(
    () =>
      worlds.map((w) => ({
        region: { code: regionCode(w.slug), name: w.name, level: "country" as const, blocks: w.known },
        own: own.counts[w.slug] ?? 0,
        club: w.club,
      })),
    [worlds, own],
  );

  if (!world) return null;

  const ownCount = own.counts[world.slug] ?? 0;
  const leaders = leaderboards[world.slug] ?? [];
  const held = worlds.filter((w) => rulers[regionCode(w.slug)]?.profileId === memberId);

  return (
    <div className="space-y-4">
      <select
        value={world.slug}
        onChange={(e) => setSlug(e.target.value)}
        aria-label="Zwift-wereld"
        className="rounded-md border border-border bg-card px-3 py-2 text-sm"
      >
        {worlds.map((w) => (
          <option key={w.slug} value={w.slug}>
            {w.name}
          </option>
        ))}
      </select>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Grid3x3 className="size-3.5" />} label="Blokken" value={nl(ownCount)} />
        <Stat icon={<Percent className="size-3.5" />} label="Dekking" value={percent(ownCount, world.known)} />
        <Stat icon={<MapPin className="size-3.5" />} label="Hele club" value={nl(world.club)} />
      </div>

      {held.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {held.map((w) => (
            <li
              key={w.slug}
              className="flex items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1 text-sm"
            >
              <Crown aria-hidden className="size-3.5" style={{ color: "rgb(var(--zwblok-own-text))" }} />
              {rulers[regionCode(w.slug)].title} van {w.name}
            </li>
          ))}
        </ul>
      ) : null}

      <BlocksMap
        club={club[world.slug] ?? NO_CLUB}
        own={own.blocks[world.slug] ?? NO_BLOCKS}
        maxRiders={maxRiders[world.slug] ?? 1}
        zwift={{
          world: world.slug,
          blockZoom,
          bounds: world.bounds,
          imageUrl: showImage ? world.imageUrl : null,
          lines: showImage ? NO_LINES : (lines[world.slug] ?? NO_LINES),
          onImageError: () => setImageFailed((prev) => ({ ...prev, [world.slug]: true })),
        }}
      />

      <section className="space-y-5 rounded-lg border bg-card/90 p-4">
        <CoverageTable
          rows={rows}
          caption="Zwift-werelden"
          areaLabel="Wereld"
          memberName={memberName}
          memberId={memberId}
          rulers={rulers}
        />
      </section>

      {leaders.length > 0 ? (
        <section className="rounded-lg border bg-card/90 p-4">
          <h2 className="text-sm font-semibold">Meeste blokken in {world.name}</h2>
          <ol className="mt-3 space-y-1.5">
            {leaders.map((m, i) => (
              <li key={m.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className={m.id === memberId ? "font-semibold" : undefined}>{m.name}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">{nl(m.blocks)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
