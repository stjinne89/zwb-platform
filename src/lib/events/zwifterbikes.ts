// De ZwifterBikes-pagina van een Zwift-route: welke fiets is daar het snelst.
//
// ZwifterBikes kent routes onder een eigen naam (`/route/<naam>`), meestal gelijk
// aan de slug in `zwift-data`. De afwijkingen hieronder zijn op 2026-10-10
// vergeleken met `assets/routes.json` van de site, op naam en wereld: 289 van de
// 292 fietsroutes hebben er een pagina. Een route die later bijkomt, gaat op de
// eigen slug.
//
// Vermogen, gewicht en lengte kunnen niet mee in de link: de routepagina leest
// die alleen uit de localStorage van de bezoeker.

import { routes } from "zwift-data";
import type { RaceLink } from "@/lib/events/race-links";

const ZWIFTERBIKES_BASE = "https://zwifterbikes.web.app";

const ROUTE_NAME_BY_SLUG: Record<string, string> = {
  "2015-uci-worlds-course": "2015-worlds-course",
  "2018-uci-worlds-course-short-lap": "2018-worlds-short-lap",
  "2022-bambino-fondo": "zwift-bambino-fondo-2022",
  "2022-gran-fondo": "zwift-gran-fondo-2022",
  "2022-medio-fondo": "zwift-medio-fondo-2022",
  "2023-continental-qualifiers": "innsbruckconti",
  "2919739330": "mech-isle-mayhem",
  "362278484": "twilight-crit",
  "4092230492": "urumaze",
  "811898717": "whatyumeziwerelost",
  "bell-lap": "the-bell-lap",
  "big-loop-rev": "big-loop-reverse",
  "classique-rev": "london-classique-reverse",
  "cobbled-climbs-rev": "cobbled-climbs-reverse",
  "downtown-eruoption": "downtown-eruption",
  "flat-route-rev": "flat-route-reverse",
  "gotham-grind-rev": "gotham-grind-reverse",
  "grand-central-circuit-rev": "grand-central-circuit-reverse",
  "greater-london-loop-rev": "greater-london-loop-reverse",
  "greatest-london-loop-rev": "greatest-london-loop-reverse",
  "harrogate-circuit": "2019-worlds-harrogate-circuit",
  "harrogate-circuit-rev": "harrogate-circuit-reverse",
  "hilly-route-rev": "hilly-route-reverse",
  "jungle-circuit-rev": "jungle-circuit-reverse",
  "london-8-rev": "london-8-reverse",
  "london-loop-rev": "london-loop-reverse",
  "london-the-prl-full": "the-prl-full",
  "london-triple-loops": "triple-loops",
  "new-york-kom-after-party": "nyc-kom-after-party",
  "park-perimeter-rev": "park-perimeter-reverse",
  "richmond-uci-rev": "richmond-2015-worlds-reverse",
  "road-to-ruins-rev": "road-to-ruins-reverse",
  "the-6-train-rev": "the-6-train-reverse",
  "the-highline-rev": "the-highline-reverse",
  "three-sisters-rev": "three-sisters-reverse",
  "volcano-flat-rev": "volcano-flat-reverse",
};

/** Routes die ZwifterBikes niet heeft. */
const NO_PAGE = new Set(["climb-portal-volcano", "climb-portal-mont-saint-michel", "time-trial"]);

/** De ZwifterBikes-pagina bij een `zwift-data`-slug, of null als die er niet is. */
export function zwifterBikesRouteUrl(slug: string | null | undefined): string | null {
  const own = (slug ?? "").trim();
  if (!own || NO_PAGE.has(own)) return null;
  const name = ROUTE_NAME_BY_SLUG[own] ?? own;
  return /^[a-z0-9-]+$/.test(name) ? `${ZWIFTERBIKES_BASE}/route/${name}` : null;
}

/** De ZwifterBikes-link voor de route van een event (`events.zwift_route_id`). */
export function zwifterBikesLinks(zwiftRouteId: number | string | null | undefined): RaceLink[] {
  const id = Number(zwiftRouteId);
  if (!zwiftRouteId || !Number.isFinite(id)) return [];
  const url = zwifterBikesRouteUrl(routes.find((route) => route.id === id)?.slug);
  return url
    ? [{ key: `zb-${id}`, kind: "zwifterbikes", label: "ZwifterBikes", url, icon: { glyph: "bike" } }]
    : [];
}
