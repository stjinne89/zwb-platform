"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EvidenceBadge } from "@/components/evidence-badge";
import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import {
  FIETSEN,
  HELMEN,
  HOUDINGEN,
  RENDEMENTEN,
  SPANNINGEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  WEGDEKKEN,
  vergelijkOpzet,
  winstPerOnderdeel,
  type Onderdeel,
  type Opzet,
  type RekenRoute,
  type WegdekId,
} from "@/lib/materiaal/rekenaar";
import { cn } from "@/lib/utils";
import { RennerFiguur, VIEWBOX, ankers } from "./renner";

export type ArtikelLink = { href: string; title: string; evidence: ArticleEvidence };

const veld =
  "w-full rounded-md border border-input bg-background px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function tijd(seconden: number): string {
  const s = Math.round(Math.abs(seconden));
  const u = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = u > 0 ? String(m).padStart(2, "0") : String(m);
  return `${u > 0 ? `${u}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

function verschil(winst: number): string {
  return `${winst > 0 ? "−" : "+"}${tijd(winst)}`;
}

function getal(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const procent = (value: number) => `${(value * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} %`;

type Stand = "nu" | "straks";

const ONDERDELEN: {
  id: Onderdeel;
  label: string;
  artikel: string;
  opties: readonly { id: string; label: string }[];
}[] = [
  { id: "helm", label: "Helm", artikel: "helm", opties: HELMEN },
  { id: "houding", label: "Houding", artikel: "houding", opties: HOUDINGEN },
  { id: "fiets", label: "Fiets", artikel: "wielen-en-frame", opties: FIETSEN },
  { id: "spanning", label: "Banden", artikel: "banden-en-bandenspanning", opties: SPANNINGEN },
];

const ankerStijl = ([x, y]: [number, number]) => ({
  left: `${((x - VIEWBOX.x) / VIEWBOX.w) * 100}%`,
  top: `${((y - VIEWBOX.y) / VIEWBOX.h) * 100}%`,
});

export function Rekenaar({
  events,
  eventId,
  eventRoute,
  eventFout,
  standaardWatts,
  standaardGewicht,
  artikelen,
}: {
  events: { id: string; label: string }[];
  eventId: string | null;
  eventRoute: RekenRoute | null;
  eventFout: string | null;
  standaardWatts: number;
  standaardGewicht: number;
  artikelen: Record<string, ArtikelLink>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [routeId, setRouteId] = useState(eventRoute ? eventRoute.id : VASTE_ROUTES[0].id);
  const [watts, setWatts] = useState(String(standaardWatts));
  const [gewicht, setGewicht] = useState(String(standaardGewicht));
  const [groep, setGroep] = useState(false);
  const [wegdek, setWegdek] = useState<WegdekId>("glad");
  const [stand, setStand] = useState<Stand>("straks");
  const [onderdeel, setOnderdeel] = useState<Onderdeel>("houding");
  const [opzet, setOpzet] = useState<Record<Stand, Opzet>>({ nu: STANDAARD_OPZET, straks: STANDAARD_OPZET });
  // Getalvelden houden hun tekst zelf bij, zodat je kunt wissen en een komma typen.
  const [tekst, setTekst] = useState<Record<Stand, { aero: string; kg: string }>>({
    nu: { aero: "0", kg: String(STANDAARD_OPZET.uitrustingKg) },
    straks: { aero: "0", kg: String(STANDAARD_OPZET.uitrustingKg) },
  });

  const routes = eventRoute ? [...VASTE_ROUTES, eventRoute] : VASTE_ROUTES;
  const route = routes.find((r) => r.id === routeId) ?? VASTE_ROUTES[0];
  const km = route.segments.reduce((sum, s) => sum + s.distanceM, 0) / 1000;

  const { uitkomst, perOnderdeel } = useMemo(() => {
    const rijder = {
      watts: Math.min(1500, Math.max(50, getal(watts, standaardWatts))),
      gewichtKg: Math.min(200, Math.max(30, getal(gewicht, standaardGewicht))),
      groep,
      wegdek,
    };
    const volledig = (s: Stand): Opzet => ({
      ...opzet[s],
      aeroPct: Math.min(50, Math.max(-50, getal(tekst[s].aero, 0))),
      uitrustingKg: Math.min(40, Math.max(3, getal(tekst[s].kg, STANDAARD_OPZET.uitrustingKg))),
    });
    const input = { route: route.segments, rijder, nu: volledig("nu"), straks: volledig("straks") };
    return { uitkomst: vergelijkOpzet(input), perOnderdeel: winstPerOnderdeel(input) };
  }, [route, watts, gewicht, groep, wegdek, opzet, tekst, standaardWatts, standaardGewicht]);

  function kiesRoute(value: string) {
    if (value.startsWith("event:")) {
      router.push(`${pathname}?event=${value.slice("event:".length)}`);
      return;
    }
    setRouteId(value);
    if (eventId) router.replace(pathname);
  }

  function zet<K extends keyof Opzet>(sleutel: K, waarde: Opzet[K]) {
    setOpzet((oud) => ({ ...oud, [stand]: { ...oud[stand], [sleutel]: waarde } }));
  }

  const huidig = opzet[stand];
  const ander = opzet[stand === "nu" ? "straks" : "nu"];
  const actief = ONDERDELEN.find((o) => o.id === onderdeel)!;
  const zelfde = Math.round(uitkomst.winstSeconden) === 0;
  const sneller = uitkomst.winstSeconden > 0;
  const plekken = ankers(huidig);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <section className="renner overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <h2 className="font-semibold">Je opzet</h2>
          <div role="radiogroup" aria-label="Welke opzet je kiest" className="view-slider view-slider-breed" data-pos={stand === "nu" ? "0" : "1"}>
            <span className="view-slider-knob" aria-hidden="true" />
            {(["nu", "straks"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stand === s}
                onClick={() => setStand(s)}
                className={cn("view-slider-option text-sm font-medium", stand === s && "view-slider-option-active")}
              >
                {s === "nu" ? "Nu" : "Straks"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-xl px-2">
          <RennerFiguur opzet={huidig} schim={ander} wegdek={wegdek} className="block h-auto w-full" />
          {ONDERDELEN.map((o) => (
            <button
              key={o.id}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOnderdeel(o.id)}
              style={ankerStijl(plekken[o.id])}
              className="renner-knop group absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center transition-[left,top] duration-500"
              data-actief={onderdeel === o.id || undefined}
            >
              <span className="renner-stip" />
            </button>
          ))}
        </div>

        <div aria-live="polite" className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t px-4 py-3">
          <div>
            <p className={cn("text-3xl font-semibold tabular-nums", !zelfde && sneller && "text-primary", !zelfde && !sneller && "text-destructive")}>
              {zelfde ? "0:00" : verschil(uitkomst.winstSeconden)}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {tijd(uitkomst.nuSeconden)} → {tijd(uitkomst.straksSeconden)} over {km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km
            </p>
          </div>
          {!zelfde && (
            <p className="text-sm tabular-nums">
              {Math.abs(uitkomst.wattWaarde) < 0.5 ? "Minder dan 1" : Math.abs(Math.round(uitkomst.wattWaarde))} W {sneller ? "waard" : "verlies"}
            </p>
          )}
        </div>

        <div className="border-t p-4">
          <div role="tablist" aria-label="Onderdeel" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ONDERDELEN.map((o) => {
              const keuze = o.opties.find((x) => x.id === huidig[o.id])?.label;
              const winst = perOnderdeel[o.id];
              return (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  id={`tab-${o.id}`}
                  aria-selected={onderdeel === o.id}
                  aria-controls="onderdeel-paneel"
                  onClick={() => setOnderdeel(o.id)}
                  className={cn(
                    "min-h-11 rounded-md border px-3 py-2 text-left transition-colors",
                    onderdeel === o.id ? "border-accent bg-accent/10" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{o.label}</span>
                    {Math.round(winst) !== 0 && (
                      <span className={cn("text-xs font-semibold tabular-nums", winst > 0 ? "text-primary" : "text-destructive")}>
                        {verschil(winst)}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium">{keuze}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id="onderdeel-paneel" aria-labelledby={`tab-${actief.id}`} className="mt-4 space-y-3">
            <div role="radiogroup" aria-label={`${actief.label} ${stand}`} className="flex flex-wrap gap-2">
              {actief.opties.map((optie) => (
                <button
                  key={optie.id}
                  type="button"
                  role="radio"
                  aria-checked={huidig[actief.id] === optie.id}
                  onClick={() => zet(actief.id, optie.id as never)}
                  className={cn(
                    "min-h-11 flex-1 whitespace-nowrap rounded-md border px-3 text-sm font-medium",
                    huidig[actief.id] === optie.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  {optie.label}
                </button>
              ))}
            </div>
            <ArtikelRegel artikelen={[artikelen[actief.artikel]]} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t p-4">
          <label className="block space-y-1 text-sm">
            <span className="block truncate text-muted-foreground">Kleding (%)</span>
            <input
              className={veld}
              inputMode="decimal"
              value={tekst[stand].aero}
              onChange={(e) => setTekst({ ...tekst, [stand]: { ...tekst[stand], aero: e.target.value } })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="block truncate text-muted-foreground">Uitrusting (kg)</span>
            <input
              className={veld}
              inputMode="decimal"
              value={tekst[stand].kg}
              onChange={(e) => setTekst({ ...tekst, [stand]: { ...tekst[stand], kg: e.target.value } })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="block truncate text-muted-foreground">Aandrijving</span>
            <select className={veld} value={huidig.rendement} onChange={(e) => zet("rendement", Number(e.target.value))}>
              {RENDEMENTEN.map((r) => (
                <option key={r} value={r}>
                  {procent(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-3">
            <ArtikelRegel artikelen={[artikelen.kleding, artikelen.gewicht, artikelen["ketting-en-smering"]]} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Route en rijder</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Route</span>
          <select className={veld} value={eventRoute && routeId === eventRoute.id ? eventRoute.id : routeId} onChange={(e) => kiesRoute(e.target.value)}>
            <optgroup label="Vaste routes">
              {VASTE_ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </optgroup>
            {events.length > 0 && (
              <optgroup label="Buitenevents">
                {events.map((e) => (
                  <option key={e.id} value={`event:${e.id}`}>
                    {e.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {eventFout && <p className="text-sm text-destructive">{eventFout}</p>}
        <Keuze label="Wegdek" waarde={wegdek} opties={WEGDEKKEN} onKies={setWegdek} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Vermogen (W)</span>
            <input className={veld} inputMode="numeric" value={watts} onChange={(e) => setWatts(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Je gewicht (kg)</span>
            <input className={veld} inputMode="decimal" value={gewicht} onChange={(e) => setGewicht(e.target.value)} />
          </label>
        </div>
        <Keuze
          label="Rijden"
          waarde={groep ? "groep" : "alleen"}
          opties={[
            { id: "alleen", label: "Alleen" },
            { id: "groep", label: "In een groep" },
          ]}
          onKies={(id) => setGroep(id === "groep")}
        />
      </section>
    </div>
  );
}

function Keuze<T extends string>({
  label,
  waarde,
  opties,
  onKies,
}: {
  label: string;
  waarde: T;
  opties: readonly { id: T; label: string }[];
  onKies: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {opties.map((optie) => (
        <button
          key={optie.id}
          type="button"
          role="radio"
          aria-checked={waarde === optie.id}
          onClick={() => onKies(optie.id)}
          className={cn(
            "min-h-11 flex-1 rounded-md border px-3 text-sm font-medium",
            waarde === optie.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
          )}
        >
          {optie.label}
        </button>
      ))}
    </div>
  );
}

function ArtikelRegel({ artikelen }: { artikelen: (ArtikelLink | undefined)[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {artikelen.filter((a): a is ArtikelLink => Boolean(a)).map((artikel) => (
        <li key={artikel.href} className="flex items-center gap-1.5">
          <Link href={artikel.href} className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
            {artikel.title}
          </Link>
          <EvidenceBadge evidence={artikel.evidence} className="px-1.5 py-0 text-[10px]" />
        </li>
      ))}
    </ul>
  );
}
