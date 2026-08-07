"use client";

// Houdt bij welk lid je bekijkt en zorgt dat de kaart, de tellers en de
// dekkingstabel allemaal datzelfde lid tonen.

import { useEffect, useState } from "react";
import { Grid3x3, MapPin, Sparkles } from "lucide-react";
import {
  BlocksMap,
  type PackedBlocks,
  type PackedClubBlocks,
} from "./blocks-map";
import { Coverage, type RegionMeta } from "./coverage";

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

export function ZwblokkenView({
  club,
  clubRegions,
  clubTotal,
  maxRiders,
  regions,
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

      <BlocksMap club={club} own={data.blocks} maxRiders={maxRiders} />

      <Coverage
        regions={regions}
        own={data.regions}
        club={clubRegions}
        memberName={memberName}
      />
    </div>
  );
}
