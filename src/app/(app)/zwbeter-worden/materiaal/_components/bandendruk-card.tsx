"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WEGDEKKEN,
  WEGDEK_LABEL,
  bandendruk,
  formatBar,
  standaardWegdek,
  type BandSetup,
  type Wegdek,
  type WielDruk,
} from "@/lib/materiaal/bandendruk";

export type BandendrukFiets = {
  id: string;
  label: string;
  discipline: string | null;
  setup: BandSetup | null;
};

const FIELD =
  "rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** De laatst gekozen fiets; alleen een gemak per browser. */
const FIETS_KEY = "zwb.bandendruk.fiets";

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(FIETS_KEY);
  } catch {
    return null;
  }
}

const noSubscribe = () => () => {};

function garageHref(bikeId: string): string {
  return `/mijn-garage#fiets-${encodeURIComponent(bikeId)}`;
}

function Wiel({ label, druk }: { label: string; druk: WielDruk }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatBar(druk.bar)} <span className="text-base font-normal text-muted-foreground">bar</span>
      </p>
      <p className="text-sm tabular-nums text-muted-foreground">
        {druk.psi} psi{druk.begrensd ? " · maximum" : ""}
      </p>
    </div>
  );
}

export function BandendrukCard({ fietsen, renKg }: { fietsen: BandendrukFiets[]; renKg: number | null }) {
  // Eigen keuze in deze weergave, anders de laatst gekozen fiets in deze
  // browser, anders de hoofdfiets. Het wegdek volgt het fietstype tot je zelf kiest.
  const [keuze, setKeuze] = useState<string | null>(null);
  const saved = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const fietsId = keuze ?? saved;
  const fiets = fietsen.find((f) => f.id === fietsId) ?? fietsen[0];
  const [wegdekKeuze, setWegdekKeuze] = useState<Wegdek | null>(null);
  const wegdek = wegdekKeuze ?? standaardWegdek(fiets?.discipline ?? null);
  const [nat, setNat] = useState(false);
  const groupId = useId();

  if (!fiets) return null;

  function kiesFiets(id: string) {
    setKeuze(id);
    setWegdekKeuze(null);
    try {
      window.localStorage.setItem(FIETS_KEY, id);
    } catch {
      // Niet bewaren is geen probleem.
    }
  }

  const druk = fiets.setup && renKg ? bandendruk({ renKg, setup: fiets.setup, wegdek, nat }) : null;
  const samenvatting = druk
    ? `voor ${formatBar(druk.voor.bar)} · achter ${formatBar(druk.achter.bar)} bar · ${fiets.label}`
    : fiets.label;

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-5 transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <Gauge className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="font-semibold">Bandendruk</span>
        <span className="min-w-0 flex-1 truncate text-sm tabular-nums text-muted-foreground">{samenvatting}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>

      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          {fietsen.length > 1 ? (
            <select
              aria-label="Fiets"
              className={FIELD}
              value={fiets.id}
              onChange={(e) => kiesFiets(e.target.value)}
            >
              {fietsen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium">{fiets.label}</span>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={nat} onChange={(e) => setNat(e.target.checked)} />
            Nat
          </label>
        </div>

        <div role="radiogroup" aria-labelledby={`${groupId}-wegdek`} className="grid w-full max-w-lg grid-cols-2 rounded-md border p-0.5 sm:grid-cols-4">
          <span id={`${groupId}-wegdek`} className="sr-only">
            Wegdek
          </span>
          {WEGDEKKEN.map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={wegdek === w}
              onClick={() => setWegdekKeuze(w)}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-sm px-2 py-1.5 text-sm",
                wegdek === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {WEGDEK_LABEL[w]}
            </button>
          ))}
        </div>

        {druk ? (
          <div className="grid max-w-lg grid-cols-2 gap-3">
            <Wiel label="Voor" druk={druk.voor} />
            <Wiel label="Achter" druk={druk.achter} />
          </div>
        ) : !renKg ? (
          <p className="text-sm">
            <Link href="/profiel?weergave=bewerken" className="font-medium text-primary underline-offset-2 hover:underline">
              Vul je gewicht in
            </Link>
          </p>
        ) : null}

        <p className="text-sm">
          <Link href={garageHref(fiets.id)} className="font-medium text-primary underline-offset-2 hover:underline">
            {fiets.setup ? "Wielen aanpassen" : "Vul je wielen in"}
          </Link>
        </p>
      </div>
    </details>
  );
}
