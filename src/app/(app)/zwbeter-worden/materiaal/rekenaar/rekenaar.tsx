"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EvidenceBadge } from "@/components/evidence-badge";
import type { ArticleEvidence } from "@/lib/knowledge/evidence";
import {
  HOUDINGEN,
  RENDEMENTEN,
  ROLWEERSTANDEN,
  STANDAARD_OPZET,
  VASTE_ROUTES,
  vergelijkOpzet,
  type HoudingId,
  type Opzet,
  type RekenRoute,
} from "@/lib/materiaal/rekenaar";
import { cn } from "@/lib/utils";

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

function getal(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const procent = (value: number) => `${(value * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} %`;

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
  const [nu, setNu] = useState<Opzet>(STANDAARD_OPZET);
  const [straks, setStraks] = useState<Opzet>(STANDAARD_OPZET);
  // Getalvelden houden hun tekst zelf bij, zodat je kunt wissen en een komma typen.
  const [tekst, setTekst] = useState({
    nuAero: "0",
    straksAero: "0",
    nuKg: String(STANDAARD_OPZET.uitrustingKg),
    straksKg: String(STANDAARD_OPZET.uitrustingKg),
  });

  const routes = eventRoute ? [...VASTE_ROUTES, eventRoute] : VASTE_ROUTES;
  const route = routes.find((r) => r.id === routeId) ?? VASTE_ROUTES[0];
  const km = route.segments.reduce((sum, s) => sum + s.distanceM, 0) / 1000;

  const uitkomst = useMemo(() => {
    const rijder = {
      watts: Math.min(1500, Math.max(50, getal(watts, standaardWatts))),
      gewichtKg: Math.min(200, Math.max(30, getal(gewicht, standaardGewicht))),
      groep,
    };
    const aero = (value: string) => Math.min(50, Math.max(-50, getal(value, 0)));
    const kg = (value: string) => Math.min(40, Math.max(3, getal(value, STANDAARD_OPZET.uitrustingKg)));
    return vergelijkOpzet({
      route: route.segments,
      rijder,
      nu: { ...nu, aeroPct: aero(tekst.nuAero), uitrustingKg: kg(tekst.nuKg) },
      straks: { ...straks, aeroPct: aero(tekst.straksAero), uitrustingKg: kg(tekst.straksKg) },
    });
  }, [route, watts, gewicht, groep, nu, straks, tekst, standaardWatts, standaardGewicht]);

  function kiesRoute(value: string) {
    if (value.startsWith("event:")) {
      router.push(`${pathname}?event=${value.slice("event:".length)}`);
      return;
    }
    setRouteId(value);
    if (eventId) router.replace(pathname);
  }

  const zelfde = uitkomst.winstSeconden === 0;
  const sneller = uitkomst.winstSeconden > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
        <div role="radiogroup" aria-label="Rijden" className="flex gap-2">
          {[
            { value: false, label: "Alleen" },
            { value: true, label: "In een groep" },
          ].map((optie) => (
            <button
              key={optie.label}
              type="button"
              role="radio"
              aria-checked={groep === optie.value}
              onClick={() => setGroep(optie.value)}
              className={cn(
                "min-h-[44px] flex-1 rounded-md border px-3 text-sm font-medium",
                groep === optie.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              {optie.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4" aria-live="polite">
        <h2 className="font-semibold">Wat het oplevert</h2>
        <p className="text-3xl font-semibold tabular-nums">
          {zelfde ? "0:00" : `${sneller ? "−" : "+"}${tijd(uitkomst.winstSeconden)}`}
        </p>
        <p className="text-sm text-muted-foreground">
          {tijd(uitkomst.nuSeconden)} → {tijd(uitkomst.straksSeconden)} over {km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km
        </p>
        {!zelfde && (
          <p className="text-sm">
            Dat is {Math.abs(uitkomst.wattWaarde) < 0.5 ? "minder dan 1" : Math.abs(Math.round(uitkomst.wattWaarde))} W{" "}
            {sneller ? "waard" : "verlies"}.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 lg:col-span-2">
        <h2 className="mb-3 font-semibold">Wat verandert er?</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <span className="max-sm:hidden" />
          <span>Nu</span>
          <span>Straks</span>
        </div>
        <ul className="divide-y">
          <Rij artikelen={[artikelen.houding]} label="Houding">
            <select aria-label="Houding nu" className={veld} value={nu.houding} onChange={(e) => setNu({ ...nu, houding: e.target.value as HoudingId })}>
              {HOUDINGEN.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
            <select aria-label="Houding straks" className={veld} value={straks.houding} onChange={(e) => setStraks({ ...straks, houding: e.target.value as HoudingId })}>
              {HOUDINGEN.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </Rij>
          <Rij artikelen={[artikelen.helm, artikelen.kleding, artikelen["wielen-en-frame"]]} label="Luchtweerstand van helm, kleding of wielen (%)">
            <input aria-label="Luchtweerstand nu, in procent" className={veld} inputMode="decimal" value={tekst.nuAero} onChange={(e) => setTekst({ ...tekst, nuAero: e.target.value })} />
            <input aria-label="Luchtweerstand straks, in procent" className={veld} inputMode="decimal" value={tekst.straksAero} onChange={(e) => setTekst({ ...tekst, straksAero: e.target.value })} />
          </Rij>
          <Rij artikelen={[artikelen["banden-en-bandenspanning"]]} label="Banden en wegdek">
            <select aria-label="Banden en wegdek nu" className={veld} value={nu.crr} onChange={(e) => setNu({ ...nu, crr: Number(e.target.value) })}>
              {ROLWEERSTANDEN.map((r) => (
                <option key={r.crr} value={r.crr}>
                  {r.label}
                </option>
              ))}
            </select>
            <select aria-label="Banden en wegdek straks" className={veld} value={straks.crr} onChange={(e) => setStraks({ ...straks, crr: Number(e.target.value) })}>
              {ROLWEERSTANDEN.map((r) => (
                <option key={r.crr} value={r.crr}>
                  {r.label}
                </option>
              ))}
            </select>
          </Rij>
          <Rij artikelen={[artikelen.gewicht]} label="Fiets en uitrusting (kg)">
            <input aria-label="Fiets en uitrusting nu, in kg" className={veld} inputMode="decimal" value={tekst.nuKg} onChange={(e) => setTekst({ ...tekst, nuKg: e.target.value })} />
            <input aria-label="Fiets en uitrusting straks, in kg" className={veld} inputMode="decimal" value={tekst.straksKg} onChange={(e) => setTekst({ ...tekst, straksKg: e.target.value })} />
          </Rij>
          <Rij artikelen={[artikelen["ketting-en-smering"]]} label="Rendement van de aandrijving">
            <select aria-label="Rendement nu" className={veld} value={nu.rendement} onChange={(e) => setNu({ ...nu, rendement: Number(e.target.value) })}>
              {RENDEMENTEN.map((r) => (
                <option key={r} value={r}>
                  {procent(r)}
                </option>
              ))}
            </select>
            <select aria-label="Rendement straks" className={veld} value={straks.rendement} onChange={(e) => setStraks({ ...straks, rendement: Number(e.target.value) })}>
              {RENDEMENTEN.map((r) => (
                <option key={r} value={r}>
                  {procent(r)}
                </option>
              ))}
            </select>
          </Rij>
        </ul>
      </section>
    </div>
  );
}

function Rij({
  label,
  artikelen,
  children,
}: {
  label: string;
  artikelen: (ArtikelLink | undefined)[];
  children: [React.ReactNode, React.ReactNode];
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="text-sm font-medium">{label}</p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {artikelen.filter((a): a is ArtikelLink => Boolean(a)).map((artikel) => (
            <li key={artikel.href} className="flex items-center gap-1.5">
              <Link href={artikel.href} className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
                {artikel.title}
              </Link>
              <EvidenceBadge evidence={artikel.evidence} className="px-1.5 py-0 text-[10px]" />
            </li>
          ))}
        </ul>
      </div>
      {children[0]}
      {children[1]}
    </li>
  );
}
