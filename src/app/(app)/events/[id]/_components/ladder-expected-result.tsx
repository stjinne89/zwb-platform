import { cookies } from "next/headers";
import { PowerUnitProvider } from "@/components/power-unit";
import type { LadderProjection } from "@/lib/club-ladder/briefing";
import type { PowerDuration } from "@/lib/club-ladder/routes";
import { POWER_UNIT_COOKIE } from "@/lib/training/power-unit";
import { cn } from "@/lib/utils";
import { LadderExpectedTable } from "./ladder-expected-table";

/**
 * Verwachte uitslag van een ladderrace, op de plek van de uitslag. Staat de
 * uitslag van de ladder er, dan neemt LadderResultView deze plek over.
 */
export async function LadderExpectedResultView({
  projection,
  keyDuration,
  ownTeam,
  opponent,
}: {
  projection: LadderProjection;
  keyDuration: PowerDuration;
  ownTeam: string;
  opponent: string;
}) {
  // Watt alleen als iemand dat elders (Teams, ZWBeter Worden, de matchup) koos; anders W/kg zoals de ladder.
  const unitCookie = (await cookies()).get(POWER_UNIT_COOKIE)?.value;
  return (
    <section id="uitslag" className="scroll-mt-20 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Verwachte uitslag{" "}
        <span
          className={cn("ml-1 tabular-nums", projection.win ? "text-primary" : "text-muted-foreground")}
          aria-label={`${ownTeam} ${projection.ours}, ${opponent} ${projection.theirs}`}
        >
          {projection.ours}–{projection.theirs}
        </span>
      </h2>
      <div className="rounded-lg border bg-card p-4">
        <PowerUnitProvider initialUnit={unitCookie === "w" ? "w" : "wkg"} weightKg={null}>
          <LadderExpectedTable rows={projection.order} keyDuration={keyDuration} ownTeam={ownTeam} opponent={opponent} />
        </PowerUnitProvider>
      </div>
    </section>
  );
}
