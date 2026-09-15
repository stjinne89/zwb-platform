"use client";

// Houdt bij welk lid je bekijkt en zorgt dat de kaart, de tellers en de
// dekkingstabel allemaal datzelfde lid tonen.

import { useEffect, useState } from "react";
import { Crown, Grid3x3, Landmark, MapPin, Sparkles } from "lucide-react";
import { countryOfProvince } from "@/lib/zwblokken/titles";
import {
  BlocksMap,
  type PackedBlocks,
  type PackedClubBlocks,
} from "./blocks-map";
import { Coverage, type RegionMeta, type RulerMap } from "./coverage";

export type MemberOption = { id: string; name: string; blocks: number };

/** Wat de API per lid teruggeeft. */
type MemberData = {
  blocks: PackedBlocks;
  regions: Record<string, number>;
  total: number;
  newThisYear: number;
};

type Props = {
  club: PackedClubBlocks;
  clubRegions: Record<string, number>;
  clubTotal: number;
  maxRiders: number;
  regions: RegionMeta[];
  rulers: RulerMap;
  members: MemberOption[];
  selectedId: string;
  initial: MemberData;
};

const EMPTY: MemberData = {
  blocks: {},
  regions: {},
  total: 0,
  newThisYear: 0,
};

const nl = (n: number) => n.toLocaleString("nl-NL");

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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

/**
 * De titels van één lid: landen eerst, daarna provincies, het grootste gebied
 * voorop. Namen die in meer landen voorkomen (Limburg, Luxemburg) krijgen de
 * landcode erachter.
 */
function Titles({
  regions,
  rulers,
  memberId,
}: {
  regions: RegionMeta[];
  rulers: RulerMap;
  memberId: string;
}) {
  const seen = new Map<string, number>();
  for (const r of regions) seen.set(r.name, (seen.get(r.name) ?? 0) + 1);

  const held = regions
    .filter((r) => rulers[r.code]?.profileId === memberId)
    .sort((a, b) =>
      a.level === b.level
        ? b.blocks - a.blocks
        : a.level === "country"
          ? -1
          : 1,
    );
  if (held.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {held.map((region) => {
        const Icon = region.level === "country" ? Crown : Landmark;
        const name =
          region.level === "province" && (seen.get(region.name) ?? 0) > 1
            ? `${region.name} (${countryOfProvince(region.code)})`
            : region.name;
        return (
          <li
            key={region.code}
            className="flex items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1 text-sm"
          >
            <Icon
              aria-hidden
              className="size-3.5"
              style={{ color: "rgb(var(--zwblok-own-text))" }}
            />
            {rulers[region.code].title} van {name}
          </li>
        );
      })}
    </ul>
  );
}

export function ZwblokkenView({
  club,
  clubRegions,
  clubTotal,
  maxRiders,
  regions,
  rulers,
  members,
  selectedId,
  initial,
}: Props) {
  const [memberId, setMemberId] = useState(selectedId);
  // Opgehaalde sets per lid, zodat heen-en-weer wisselen niet opnieuw fetcht.
  const [fetched, setFetched] = useState<Record<string, MemberData>>({});

  const pending = memberId !== selectedId && !fetched[memberId];
  const data = memberId === selectedId ? initial : fetched[memberId] ?? EMPTY;
  const memberName =
    members.find((m) => m.id === memberId)?.name ?? "Geselecteerd lid";

  useEffect(() => {
    if (memberId === selectedId || fetched[memberId]) return;

    let cancelled = false;
    fetch(`/api/zwblokken?profile=${encodeURIComponent(memberId)}`)
      .then((res) => (res.ok ? res.json() : EMPTY))
      .then((json) => {
        if (cancelled) return;
        setFetched((prev) => ({
          ...prev,
          [memberId]: {
            blocks: json.blocks ?? {},
            regions: json.regions ?? {},
            total: json.total ?? 0,
            newThisYear: json.newThisYear ?? 0,
          },
        }));
      })
      .catch(() => {
        // Ook bij een fout iets opslaan, anders blijft "Laden…" staan.
        if (!cancelled) setFetched((prev) => ({ ...prev, [memberId]: EMPTY }));
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, selectedId, fetched]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({nl(m.blocks)})
            </option>
          ))}
        </select>
        {pending ? (
          <span className="text-sm text-muted-foreground">Laden…</span>
        ) : null}
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-[2px]"
              style={{ background: "rgb(var(--zwblok-club) / 0.55)" }}
            />
            Club
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-[2px]"
              style={{ background: "rgb(var(--zwblok-own) / 0.7)" }}
            />
            {memberName}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Grid3x3 className="size-3.5" />}
          label="Blokken"
          value={nl(data.total)}
        />
        <Stat
          icon={<Sparkles className="size-3.5" />}
          label="Nieuw dit jaar"
          value={nl(data.newThisYear)}
        />
        <Stat
          icon={<MapPin className="size-3.5" />}
          label="Hele club"
          value={nl(clubTotal)}
        />
      </div>

      <Titles regions={regions} rulers={rulers} memberId={memberId} />

      <BlocksMap club={club} own={data.blocks} maxRiders={maxRiders} />

      <Coverage
        regions={regions}
        own={data.regions}
        club={clubRegions}
        rulers={rulers}
        memberId={memberId}
        memberName={memberName}
      />
    </div>
  );
}
