"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LadderRouteProfile } from "@/lib/club-ladder/route-profile";
import { cn } from "@/lib/utils";
import { ZwiftProfile } from "../../../events/[id]/_components/zwift-route-section";
import { getLadderRouteProfile, setLadderFavoriteRoute } from "../_actions";

const FIELD =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0";

export type LadderRouteRow = {
  slug: string;
  name: string;
  world: string;
  worldLabel: string;
  eventOnly: boolean;
  zwiftInsiderUrl: string | null;
  classLabel: string;
  laps: Array<{ laps: number; km: number; elevationM: number }>;
};

function lapsLabel(laps: LadderRouteRow["laps"]) {
  const km = (value: number) => value.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return laps.map((lap) => `${lap.laps}× ${km(lap.km)} km · ${lap.elevationM} hm`).join(" / ");
}

type ProfileState = LadderRouteProfile | null | "laden";

/**
 * Eén parcours. De eerste klik klapt het hoogteprofiel uit; daarna is het hele
 * blok een link naar de route op ZwiftInsider.
 */
function RouteLine({
  route,
  favorite,
  canEdit,
  pending,
  onToggle,
  open,
  profile,
  onOpen,
}: {
  route: LadderRouteRow;
  favorite: boolean;
  canEdit: boolean;
  pending: boolean;
  onToggle: () => void;
  open: boolean;
  profile: ProfileState | undefined;
  onOpen: () => void;
}) {
  const link = open && route.zwiftInsiderUrl;
  const details = (
    <>
      <span className="flex items-center gap-1.5 font-medium">
        {route.name}
        {route.eventOnly && <span className="text-xs font-normal text-muted-foreground">event-only</span>}
        {link && <ExternalLink aria-hidden className="size-3.5 text-muted-foreground" />}
      </span>
      <span className="block text-xs text-muted-foreground">
        {route.worldLabel} · {route.classLabel} · {lapsLabel(route.laps)}
      </span>
    </>
  );
  const chart = open && (
    <div className="px-2.5 pb-2.5">
      {profile === "laden" || profile === undefined ? (
        <p className="text-xs text-muted-foreground">Profiel laden…</p>
      ) : profile ? (
        <ZwiftProfile segments={profile.segments} accents={profile.accents} totalKm={profile.totalKm} />
      ) : (
        <p className="text-xs text-muted-foreground">Geen profiel.</p>
      )}
    </div>
  );

  return (
    <li className={cn("rounded-md border bg-background text-sm", open && "md:col-span-2 border-primary/40")}>
      <div className="flex items-start gap-2 p-2.5">
        <FavoriteStar route={route} favorite={favorite} canEdit={canEdit} pending={pending} onToggle={onToggle} />
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:underline">
            {details}
          </a>
        ) : (
          <button type="button" onClick={onOpen} aria-expanded={open} className="min-w-0 flex-1 text-left">
            {details}
          </button>
        )}
      </div>
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

function FavoriteStar({
  route,
  favorite,
  canEdit,
  pending,
  onToggle,
}: {
  route: LadderRouteRow;
  favorite: boolean;
  canEdit: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {canEdit ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={pending}
          onClick={onToggle}
          aria-pressed={favorite}
          aria-label={favorite ? `${route.name} geen favoriet meer` : `${route.name} favoriet maken`}
          className="max-sm:size-11"
        >
          <Star className={cn(favorite && "fill-primary text-primary")} />
        </Button>
      ) : (
        favorite && <Star aria-label="Favoriet" className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />
      )}
    </>
  );
}

export function LadderRoutes({
  teamId,
  routes,
  favorites: initialFavorites,
  canEdit,
}: {
  teamId: string;
  routes: LadderRouteRow[];
  favorites: string[];
  canEdit: boolean;
}) {
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [routeClass, setRouteClass] = useState("");
  const [world, setWorld] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileState>>({});

  const worlds = useMemo(
    () => [...new Map(routes.map((route) => [route.world, route.worldLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1], "nl")),
    [routes],
  );
  const classes = useMemo(() => [...new Set(routes.map((route) => route.classLabel))], [routes]);
  const favoriteRoutes = routes.filter((route) => favorites.has(route.slug));
  const needle = query.trim().toLowerCase();
  const filtered = routes.filter(
    (route) =>
      !favorites.has(route.slug) &&
      (!needle || route.name.toLowerCase().includes(needle)) &&
      (!routeClass || route.classLabel === routeClass) &&
      (!world || route.world === world),
  );

  function openRoute(slug: string) {
    setOpen(slug);
    if (profiles[slug] !== undefined) return;
    setProfiles((current) => ({ ...current, [slug]: "laden" }));
    getLadderRouteProfile(slug)
      .then((profile) => setProfiles((current) => ({ ...current, [slug]: profile })))
      .catch(() => setProfiles((current) => ({ ...current, [slug]: null })));
  }

  function toggle(slug: string) {
    const next = !favorites.has(slug);
    setBusy(slug);
    startTransition(async () => {
      const res = await setLadderFavoriteRoute(teamId, slug, next);
      if (!res.ok) window.alert(res.error);
      else
        setFavorites((current) => {
          const updated = new Set(current);
          if (next) updated.add(slug);
          else updated.delete(slug);
          return updated;
        });
      setBusy(null);
    });
  }

  return (
    <div className="mt-3 space-y-4">
      {favoriteRoutes.length > 0 ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {favoriteRoutes.map((route) => (
            <RouteLine
              key={route.slug}
              route={route}
              favorite
              canEdit={canEdit}
              pending={busy === route.slug}
              onToggle={() => toggle(route.slug)}
              open={open === route.slug}
              profile={profiles[route.slug]}
              onOpen={() => openRoute(route.slug)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nog geen favorieten.</p>
      )}

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Alle ladderparcoursen ({routes.length})</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoeken"
            aria-label="Parcours zoeken"
            className={FIELD}
          />
          <select value={routeClass} onChange={(event) => setRouteClass(event.target.value)} aria-label="Type" className={FIELD}>
            <option value="">Alle types</option>
            {classes.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <select value={world} onChange={(event) => setWorld(event.target.value)} aria-label="Wereld" className={FIELD}>
            <option value="">Alle werelden</option>
            {worlds.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {filtered.map((route) => (
            <RouteLine
              key={route.slug}
              route={route}
              favorite={false}
              canEdit={canEdit}
              pending={busy === route.slug}
              onToggle={() => toggle(route.slug)}
              open={open === route.slug}
              profile={profiles[route.slug]}
              onOpen={() => openRoute(route.slug)}
            />
          ))}
        </ul>
      </details>
    </div>
  );
}
