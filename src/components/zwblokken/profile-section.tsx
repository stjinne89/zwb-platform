import { ModuleName } from "@/components/club-texts-provider";
import type { HonourTitle } from "@/lib/zwblokken/honours";
import type { PuzzlePiece } from "@/lib/zwblokken/puzzle";
import { ZwiftPuzzle } from "./zwift-puzzle";

/**
 * ZWBlokken op het profiel (wens eigenaar, 2026-11-25): de titels die het lid
 * draagt en de Zwiftpuzzel. Is de hele puzzel af, dan krijgt het blok een gouden
 * rand. Zonder titels en zonder Zwift-blokken geen blok.
 */
export function ZwblokkenProfileSection({
  profileId,
  titles,
  pieces,
}: {
  profileId: string;
  titles: HonourTitle[];
  pieces: PuzzlePiece[];
}) {
  const rode = pieces.some((p) => p.own > 0);
  if (titles.length === 0 && !rode) return null;
  const done = pieces.filter((p) => p.done).length;
  const full = rode && done === pieces.length;
  const map = `/zwblokken?lid=${encodeURIComponent(profileId)}`;
  return (
    <section
      className={`rounded-lg border bg-card p-6${full ? " outline-2 outline-offset-4 outline-[rgb(var(--zwblok-own))]" : ""}`}
      aria-labelledby="zwblokken-profiel"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="zwblokken-profiel" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ModuleName module="blokkenjacht" />
        </h2>
        {rode ? (
          <p className="shrink-0 leading-none">
            <span className={`text-3xl font-light tabular-nums${full ? " text-[rgb(var(--zwblok-own-text))]" : ""}`}>
              {done}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">/ {pieces.length} werelden</span>
          </p>
        ) : null}
      </div>
      {titles.length > 0 ? (
        <dl className="mt-3 space-y-1 text-sm">
          {groupTitles(titles).map((group) => (
            <div key={group.label} className="flex gap-3">
              <dt className="w-36 shrink-0 font-semibold">{group.label}</dt>
              <dd className="text-muted-foreground">{group.regions.join(", ")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rode ? (
        <div className="mt-4">
          <ZwiftPuzzle pieces={pieces} href={(slug) => `${map}&wereld=${encodeURIComponent(slug)}`} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Eén regel per titel: een lid kan er tientallen dragen. De volgorde blijft die
 * van de lijst (landen, provincies, Zwift-werelden).
 */
function groupTitles(titles: HonourTitle[]): { label: string; regions: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const t of titles) {
    const label = t.kind === "zwift" ? `${t.title} in Zwift` : t.title;
    groups.set(label, [...(groups.get(label) ?? []), t.region]);
  }
  return [...groups].map(([label, regions]) => ({ label, regions }));
}
