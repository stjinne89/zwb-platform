"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EvidenceBadge } from "@/components/evidence-badge";
import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import {
  TEST_BANDEN,
  TEST_FIETSEN,
  TEST_HELMEN,
  TEST_SOKKEN,
  TEST_WIELEN,
  type ProductTest,
} from "@/lib/materiaal/producttests";
import {
  BAND_PRODUCTEN,
  FIETS_PRODUCTEN,
  HELM_PRODUCTEN,
  HOUDINGEN,
  RENDEMENTEN,
  SOK_PRODUCTEN,
  SPANNINGEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  WEGDEKKEN,
  WIEL_PRODUCTEN,
  vergelijkOpzet,
  wielenBijFiets,
  winstPerOnderdeel,
  winstPerProduct,
  type Onderdeel,
  type Opzet,
  type RekenRoute,
  type RekenSegment,
  type Rijder,
  type WegdekId,
} from "@/lib/materiaal/rekenaar";
import { cn } from "@/lib/utils";
import { RennerFiguur, VIEWBOX, ankers, type RennerBeeld, type Tenue } from "./renner";

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
  if (Math.round(winst) === 0) return "0:00";
  return `${winst > 0 ? "−" : "+"}${tijd(winst)}`;
}

function getal(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const procent = (value: number) => `${(value * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} %`;

function teken(value: number, decimalen: number): string {
  const afgerond = Number(value.toFixed(decimalen));
  if (afgerond === 0) return "0";
  return `${afgerond < 0 ? "−" : "+"}${Math.abs(afgerond).toLocaleString("nl-NL", { minimumFractionDigits: decimalen })}`;
}

type Stand = "nu" | "straks";
type ProductVeld = "helm" | "fiets" | "wielen" | "banden" | "sokken";
type ProductRij = { id: string; naam: string; verschil: number; gemeten: string };

const ONDERDELEN: { id: Onderdeel; label: string; artikel: string }[] = [
  { id: "helm", label: "Helm", artikel: "helm" },
  { id: "houding", label: "Houding", artikel: "houding" },
  { id: "fiets", label: "Fiets", artikel: "wielen-en-frame" },
  { id: "wielen", label: "Wielen", artikel: "wielen-en-frame" },
  { id: "banden", label: "Banden", artikel: "banden-en-bandenspanning" },
  { id: "kleding", label: "Kleding", artikel: "kleding" },
];

const PRODUCTEN: Record<ProductVeld, { rijen: readonly ProductRij[]; test: ProductTest; eenheid: string; decimalen: number }> = {
  helm: { rijen: HELM_PRODUCTEN, test: TEST_HELMEN, eenheid: "CdA", decimalen: 4 },
  fiets: { rijen: FIETS_PRODUCTEN, test: TEST_FIETSEN, eenheid: "CdA", decimalen: 4 },
  wielen: { rijen: WIEL_PRODUCTEN, test: TEST_WIELEN, eenheid: "CdA", decimalen: 4 },
  banden: { rijen: BAND_PRODUCTEN, test: TEST_BANDEN, eenheid: "Crr", decimalen: 4 },
  sokken: { rijen: SOK_PRODUCTEN, test: TEST_SOKKEN, eenheid: "CdA", decimalen: 4 },
};

const naamVan = (veld: ProductVeld, id: string) => PRODUCTEN[veld].rijen.find((r) => r.id === id)?.naam ?? "";

function beeldVan(opzet: Opzet): RennerBeeld {
  const fiets = (FIETS_PRODUCTEN.find((f) => f.id === opzet.fiets) ?? FIETS_PRODUCTEN[0]).uiterlijk;
  const wielen = (WIEL_PRODUCTEN.find((w) => w.id === opzet.wielen) ?? WIEL_PRODUCTEN[0]).uiterlijk;
  return {
    houding: opzet.houding,
    helm: (HELM_PRODUCTEN.find((h) => h.id === opzet.helm) ?? HELM_PRODUCTEN[0]).uiterlijk,
    fiets,
    // Een geteste fiets rijdt op zijn eigen wielen, zoals in de test.
    wielen: wielenBijFiets(opzet) ? fiets.wielen : wielen,
    spanning: opzet.spanning,
  };
}

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
  const [tenue, setTenue] = useState<Tenue>("zomer");
  const [stand, setStand] = useState<Stand>("straks");
  const [onderdeel, setOnderdeel] = useState<Onderdeel>("helm");
  const [opzet, setOpzet] = useState<Record<Stand, Opzet>>({ nu: STANDAARD_OPZET, straks: STANDAARD_OPZET });
  // Getalvelden houden hun tekst zelf bij, zodat je kunt wissen en een komma typen.
  const [tekst, setTekst] = useState<Record<Stand, { aero: string; kg: string }>>({
    nu: { aero: "0", kg: String(STANDAARD_OPZET.uitrustingKg) },
    straks: { aero: "0", kg: String(STANDAARD_OPZET.uitrustingKg) },
  });

  const routes = eventRoute ? [...VASTE_ROUTES, eventRoute] : VASTE_ROUTES;
  const route = routes.find((r) => r.id === routeId) ?? VASTE_ROUTES[0];
  const km = route.segments.reduce((sum, s) => sum + s.distanceM, 0) / 1000;

  const rijder: Rijder = useMemo(
    () => ({
      watts: Math.min(1500, Math.max(50, getal(watts, standaardWatts))),
      gewichtKg: Math.min(200, Math.max(30, getal(gewicht, standaardGewicht))),
      groep,
      wegdek,
    }),
    [watts, gewicht, groep, wegdek, standaardWatts, standaardGewicht],
  );

  const volledig = useMemo(() => {
    const maak = (s: Stand): Opzet => ({
      ...opzet[s],
      aeroPct: Math.min(50, Math.max(-50, getal(tekst[s].aero, 0))),
      uitrustingKg: Math.min(40, Math.max(3, getal(tekst[s].kg, STANDAARD_OPZET.uitrustingKg))),
    });
    return { nu: maak("nu"), straks: maak("straks") };
  }, [opzet, tekst]);

  const { uitkomst, perOnderdeel } = useMemo(() => {
    const input = { route: route.segments, rijder, nu: volledig.nu, straks: volledig.straks };
    return { uitkomst: vergelijkOpzet(input), perOnderdeel: winstPerOnderdeel(input) };
  }, [route, rijder, volledig]);

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

  const huidig = volledig[stand];
  const ander = volledig[stand === "nu" ? "straks" : "nu"];
  const beeld = beeldVan(huidig);
  const zelfde = Math.round(uitkomst.winstSeconden) === 0;
  const sneller = uitkomst.winstSeconden > 0;
  const plekken = ankers(beeld);
  const wielenVast = wielenBijFiets(huidig);

  const keuzeTekst: Record<Onderdeel, string> = {
    helm: naamVan("helm", huidig.helm),
    houding: HOUDINGEN.find((h) => h.id === huidig.houding)?.label ?? "",
    fiets: naamVan("fiets", huidig.fiets),
    wielen: wielenVast ? "Bij de fiets" : naamVan("wielen", huidig.wielen),
    banden: naamVan("banden", huidig.banden),
    kleding: naamVan("sokken", huidig.sokken),
  };

  const productTabel = (veld: ProductVeld, uit?: boolean) => (
    <ProductTabel
      veld={veld}
      route={route.segments}
      rijder={rijder}
      opzet={huidig}
      gekozen={huidig[veld]}
      uit={uit}
      onKies={(id) => zet(veld, id as never)}
    />
  );

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
          <div role="radiogroup" aria-label="Tenue" className="absolute left-4 top-2 z-10 flex rounded-full border bg-background/80 p-0.5 text-xs font-medium">
            {(["winter", "zomer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tenue === t}
                onClick={() => setTenue(t)}
                className={cn(
                  "min-h-8 rounded-full px-3",
                  tenue === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "winter" ? "Winter" : "Zomer"}
              </button>
            ))}
          </div>
          <RennerFiguur beeld={beeld} schim={ander.houding} tenue={tenue} wegdek={wegdek} focus={onderdeel} className="block h-auto w-full" />
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
              {verschil(uitkomst.winstSeconden)}
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
          <div role="tablist" aria-label="Onderdeel" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ONDERDELEN.map((o) => {
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
                    "min-h-11 min-w-0 rounded-md border px-3 py-2 text-left transition-colors",
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
                  <span className="mt-0.5 block truncate text-sm font-medium">{keuzeTekst[o.id]}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id="onderdeel-paneel" aria-labelledby={`tab-${onderdeel}`} className="mt-4 space-y-4">
            {onderdeel === "helm" && productTabel("helm")}
            {onderdeel === "houding" && (
              <Keuze label={`Houding ${stand}`} waarde={huidig.houding} opties={HOUDINGEN} onKies={(id) => zet("houding", id)} />
            )}
            {onderdeel === "fiets" && (
              <>
                {productTabel("fiets")}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1 text-sm">
                    <span className="block truncate text-muted-foreground">Fiets en uitrusting (kg)</span>
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
                </div>
              </>
            )}
            {onderdeel === "wielen" && productTabel("wielen", wielenVast)}
            {onderdeel === "banden" && (
              <>
                <Keuze label={`Bandenspanning ${stand}`} waarde={huidig.spanning} opties={SPANNINGEN} onKies={(id) => zet("spanning", id)} />
                {productTabel("banden")}
              </>
            )}
            {onderdeel === "kleding" && (
              <>
                {productTabel("sokken")}
                <label className="block max-w-48 space-y-1 text-sm">
                  <span className="block truncate text-muted-foreground">Shirt en broek (%)</span>
                  <input
                    className={veld}
                    inputMode="decimal"
                    value={tekst[stand].aero}
                    onChange={(e) => setTekst({ ...tekst, [stand]: { ...tekst[stand], aero: e.target.value } })}
                  />
                </label>
              </>
            )}
            <ArtikelRegel
              artikelen={[
                artikelen[ONDERDELEN.find((o) => o.id === onderdeel)!.artikel],
                ...(onderdeel === "fiets" ? [artikelen.gewicht, artikelen["ketting-en-smering"]] : []),
                ...(onderdeel === "kleding" ? [artikelen["sokken-en-overschoenen"]] : []),
              ]}
            />
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

const ZICHTBAAR = 6;

function ProductTabel({
  veld,
  route,
  rijder,
  opzet,
  gekozen,
  uit,
  onKies,
}: {
  veld: ProductVeld;
  route: RekenSegment[];
  rijder: Rijder;
  opzet: Opzet;
  gekozen: string;
  uit?: boolean;
  onKies: (id: string) => void;
}) {
  const [alles, setAlles] = useState(false);
  const { rijen, test, eenheid, decimalen } = PRODUCTEN[veld];
  const gesorteerd = useMemo(() => [...rijen].sort((a, b) => a.verschil - b.verschil), [rijen]);
  const winst = useMemo(
    () => winstPerProduct({ route, rijder, opzet, veld, ids: rijen.map((r) => r.id) as never }) as Map<string, { winstSeconden: number; wattWaarde: number }>,
    [route, rijder, opzet, veld, rijen],
  );
  const zichtbaar = alles
    ? gesorteerd
    : gesorteerd.filter((r, i) => i < ZICHTBAAR || r.id === gekozen || r.id === "basis");

  return (
    <div className={cn(uit && "pointer-events-none opacity-50")}>
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_3rem] gap-x-2 border-b pb-1 text-xs text-muted-foreground" aria-hidden="true">
        <span>Product</span>
        <span className="text-right">{eenheid}</span>
        <span className="text-right">Tijd</span>
        <span className="text-right">Watt</span>
      </div>
      <div role="radiogroup" aria-label={veld} aria-disabled={uit || undefined} className="divide-y">
        {zichtbaar.map((rij) => {
          const w = winst.get(rij.id);
          const watt = w ? Math.round(w.wattWaarde) : 0;
          return (
            <button
              key={rij.id}
              type="button"
              role="radio"
              aria-checked={gekozen === rij.id}
              disabled={uit}
              onClick={() => onKies(rij.id)}
              className={cn(
                "grid min-h-11 w-full grid-cols-[minmax(0,1fr)_4.5rem_3.5rem_3rem] items-center gap-x-2 px-1 py-1.5 text-left text-sm",
                gekozen === rij.id ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
              )}
            >
              <span className="min-w-0">
                <span className="line-clamp-2 leading-snug">{rij.naam}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{rij.gemeten}</span>
              </span>
              <span className="text-right text-xs tabular-nums">{teken(rij.verschil, decimalen)}</span>
              <span className={cn("text-right text-xs tabular-nums", w && Math.round(w.winstSeconden) < 0 && "text-destructive")}>
                {w ? verschil(w.winstSeconden) : ""}
              </span>
              <span className={cn("text-right text-xs tabular-nums", watt < 0 && "text-destructive")}>
                {watt === 0 ? "0" : `${watt > 0 ? "+" : "−"}${Math.abs(watt)}`}
              </span>
            </button>
          );
        })}
      </div>
      {gesorteerd.length > zichtbaar.length && !alles && (
        <button type="button" onClick={() => setAlles(true)} className="mt-1 min-h-11 text-sm font-medium text-primary hover:underline">
          Alle {gesorteerd.length} tonen
        </button>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        <a href={test.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-primary hover:underline">
          {test.bron}
        </a>
        , {test.datum}: {test.methode}, marge {test.marge}
      </p>
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
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {opties.map((optie) => (
        <button
          key={optie.id}
          type="button"
          role="radio"
          aria-checked={waarde === optie.id}
          onClick={() => onKies(optie.id)}
          className={cn(
            "min-h-11 flex-1 whitespace-nowrap rounded-md border px-3 text-sm font-medium",
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
