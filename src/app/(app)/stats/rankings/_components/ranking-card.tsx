"use client";

import {
  CalendarCheck,
  Clock,
  Gem,
  House,
  type LucideIcon,
  Mountain,
  RefreshCw,
  Route,
  Sun,
  Timer,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MemberLink } from "@/components/member-link";
import type { Ranking, RankingEntry, RankingIcon } from "@/lib/rankings/rankings";
import { cn } from "@/lib/utils";

const ICONS: Record<RankingIcon, LucideIcon> = {
  clock: Clock,
  route: Route,
  mountain: Mountain,
  refresh: RefreshCw,
  timer: Timer,
  sun: Sun,
  home: House,
  calendar: CalendarCheck,
  users: Users,
  gem: Gem,
};

/** Goud, zilver en brons, de tinten van de ring van de badges (achievement-badge.tsx). */
const MEDALS: Record<number, string> = {
  1: "bg-[#d4a84e] text-[#3b2a10]",
  2: "bg-[#c4c4cc] text-[#2f2f36]",
  3: "bg-[#b06d3a] text-white",
};

export type NamedEntry = RankingEntry & { name: string };

function Rank({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
        MEDALS[rank] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {rank}
    </span>
  );
}

function Row({ entry, own, link }: { entry: NamedEntry; own: boolean; link?: boolean }) {
  return (
    <li className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5", own && "bg-primary/10")}>
      <Rank rank={entry.rank} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {link ? <MemberLink id={entry.profileId}>{entry.name}</MemberLink> : entry.name}
        </p>
        {entry.detail && <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>}
      </div>
      <span className="text-sm font-semibold tabular-nums">{entry.label}</span>
    </li>
  );
}

/** Kilometers of uren: boven de knop die de lijst opent, dus een eigen laag. */
function ViewToggle({
  views,
  active,
  onChange,
}: {
  views: Array<{ label: string }>;
  active: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="relative z-10 flex shrink-0 rounded-full border p-0.5 text-xs">
      {views.map((view, index) => (
        <button
          key={view.label}
          type="button"
          aria-pressed={index === active}
          onClick={() => onChange(index)}
          className={cn(
            "rounded-full px-2.5 py-0.5",
            index === active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Eén ranglijst: de top 3 in goud, zilver en brons, en je eigen plek eronder als
 * je er niet bij staat. Tikken opent de hele lijst. Met meer weergaven (km en
 * uren) een schakelaar, die in de kaart en de lijst dezelfde stand heeft.
 */
export function RankingCard({
  ranking,
  views,
  viewerId,
}: {
  ranking: Pick<Ranking, "id" | "title" | "icon">;
  views: Array<{ label: string; entries: NamedEntry[] }>;
  viewerId: string | null;
}) {
  const [active, setActive] = useState(0);
  const Icon = ICONS[ranking.icon];
  const entries = views[active]?.entries ?? [];
  const top = entries.slice(0, 3);
  const ownIndex = entries.findIndex((entry) => entry.profileId === viewerId);
  const own = ownIndex >= 3 ? entries[ownIndex] : null;

  const heading = (
    <span className="flex items-center gap-2 font-semibold">
      <Icon className="size-4 text-primary" />
      {ranking.title}
    </span>
  );
  const toggle = views.length > 1 && <ViewToggle views={views} active={active} onChange={setActive} />;

  return (
    <Dialog>
      <section className="relative flex flex-col rounded-md border bg-card transition has-[[data-slot=dialog-trigger]:hover]:border-primary/60">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2>{heading}</h2>
          {toggle}
        </div>
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nog niemand.</p>
        ) : (
          <>
            <ol className="divide-y">
              {top.map((entry) => (
                <Row key={entry.profileId} entry={entry} own={entry.profileId === viewerId} />
              ))}
            </ol>
            {/* Je eigen plek onder de top 3; de stippellijn zegt dat er rijen tussen zitten. */}
            {own && (
              <ol start={own.rank} className="border-t-2 border-dashed">
                <Row entry={own} own />
              </ol>
            )}
          </>
        )}
        {/* Over de hele kaart: tikken waar dan ook opent de lijst. */}
        {entries.length > 0 && (
          <DialogTrigger
            aria-label={`${ranking.title}: hele lijst`}
            className="absolute inset-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        )}
      </section>
      <DialogContent className="p-0">
        <DialogHeader className="mb-0 flex-row items-center justify-between gap-2 border-b px-4 py-3 pr-12">
          <DialogTitle>{heading}</DialogTitle>
          {toggle}
        </DialogHeader>
        <ol className="divide-y">
          {entries.map((entry) => (
            <Row key={entry.profileId} entry={entry} own={entry.profileId === viewerId} link />
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
