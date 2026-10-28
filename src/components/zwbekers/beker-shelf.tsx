import Link from "next/link";
import { dayLabel } from "@/lib/zwbekers/nomination";
import type { BekerSummary } from "@/lib/zwbekers/server";
import { BekerIcon } from "./beker-icon";

/**
 * De ZWBekers van een lid op zijn profiel (wens eigenaar, 2026-10-28): een plank
 * met de bekers naast elkaar, nieuwste eerst. Een teambeker staat op het profiel
 * van iedereen die meereed. Zonder bekers geen plank.
 */
export function BekerShelf({ bekers }: { bekers: BekerSummary[] }) {
  if (bekers.length === 0) return null;
  return (
    <section className="rounded-lg border bg-card p-6" aria-labelledby="zwbekers-plank">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="zwbekers-plank" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ZWBekers ({bekers.length})
        </h2>
        <Link href="/zwbekers" className="text-sm font-medium hover:underline">
          Prijzenkast
        </Link>
      </div>
      {/* Een donkere plank in de kleur van de galerij, met een gouden rand waar de bekers op staan. */}
      <ul className="mt-4 flex snap-x gap-3 overflow-x-auto rounded-md bg-[#0a2b34] px-3 pt-4 pb-3 [scrollbar-width:thin]">
        {bekers.map((beker) => (
          <li key={beker.id} className="w-32 shrink-0 snap-start">
            <Link
              href={`/zwbekers/${beker.id}`}
              className="group block rounded-sm text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c56b]"
            >
              <span className="flex h-28 items-end justify-center border-b-[3px] border-[#c9a45a] pb-0.5">
                <BekerIcon design={beker.design} title="" className="h-24 w-auto max-w-full transition-transform group-hover:-translate-y-0.5" />
              </span>
              <span className="mt-2 block text-sm font-medium leading-tight text-[#f4efe4] group-hover:underline">{beker.title}</span>
              <span className="mt-0.5 block text-xs text-[#a8a296]">
                {beker.kind === "team" && beker.teamName ? `${beker.teamName} · ` : ""}
                {dayLabel(beker.achievedOn)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
