"use client";

import { ExternalLink, Star } from "lucide-react";
import type { RouteAdvice } from "@/lib/club-ladder/advice";
import { EDGE_TONE_TEXT, edgeTone, formatEdge } from "@/lib/club-ladder/edge-tone";
import { cn } from "@/lib/utils";
import { RouteProfileChart, useRouteProfiles, type LadderRouteRow, type ProfileState } from "./ladder-routes";

/**
 * Geadviseerde parcoursen, net als de favorieten: de eerste klik klapt het
 * hoogteprofiel uit, daarna is het hele blok een link naar ZwiftInsider.
 */
export function LadderAdviceRoutes({
  routes,
  extraFavorite,
  options,
}: {
  routes: RouteAdvice[];
  extraFavorite: RouteAdvice | null;
  options: LadderRouteRow[];
}) {
  const { open, profiles, openRoute } = useRouteProfiles();
  const bySlug = new Map(options.map((option) => [option.slug, option]));
  const card = (route: RouteAdvice, rank: number | null) => (
    <AdviceCard
      key={route.slug}
      route={route}
      rank={rank}
      option={bySlug.get(route.slug)}
      open={open === route.slug}
      profile={profiles[route.slug]}
      onOpen={() => openRoute(route.slug)}
    />
  );
  return (
    <>
      <ol className="grid gap-2 lg:grid-cols-3">{routes.map((route, index) => card(route, index + 1))}</ol>
      {extraFavorite && <ol className="grid gap-2 lg:grid-cols-3">{card(extraFavorite, null)}</ol>}
    </>
  );
}

function AdviceCard({
  route,
  rank,
  option,
  open,
  profile,
  onOpen,
}: {
  route: RouteAdvice;
  rank: number | null;
  option?: LadderRouteRow;
  open: boolean;
  profile: ProfileState | undefined;
  onOpen: () => void;
}) {
  const link = open && option?.zwiftInsiderUrl;
  const meta = [option?.worldLabel, option?.classLabel, option?.laps.map((lap) => `${lap.laps}×`).join("/")].filter(Boolean);
  // Spans in plaats van een lijst: het blok staat in een knop.
  const details = (
    <>
      <span className="flex items-center gap-1.5 font-medium">
        {rank != null && <span className="tabular-nums text-muted-foreground">{rank}.</span>}
        {route.favorite && <Star aria-label="Favoriet" className="size-3.5 shrink-0 fill-primary text-primary" />}
        {route.name}
        {link && <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
      </span>
      {meta.length > 0 && <span className="block text-xs text-muted-foreground">{meta.join(" · ")}</span>}
      {route.reasons.length > 0 && (
        <span className="mt-2 block space-y-0.5 text-xs">
          {route.reasons.map((reason) => {
            const tone = edgeTone(reason.pct);
            return (
              <span key={reason.text} className="block">
                {reason.text}
                {tone && reason.pct != null && (
                  <span className={cn("font-medium tabular-nums", EDGE_TONE_TEXT[tone])}> {formatEdge(reason.pct)}</span>
                )}
              </span>
            );
          })}
        </span>
      )}
    </>
  );
  const chart = open && <RouteProfileChart profile={profile} />;

  return (
    <li className={cn("rounded-md border bg-background text-sm", open && "border-primary/40 lg:col-span-3")}>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block p-3 hover:underline">
          {details}
        </a>
      ) : (
        <button type="button" onClick={onOpen} aria-expanded={open} className="block w-full p-3 text-left">
          {details}
        </button>
      )}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`${route.name} op ZwiftInsider`} className="block">
          {chart}
        </a>
      ) : (
        chart
      )}
    </li>
  );
}
