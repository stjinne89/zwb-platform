// Herstel en belastbaarheid van vandaag: waar sta je nu, en hoeveel mag je
// daarop trainen. Hoort op de dagpagina en niet bij de belastingcijfers — het
// gaat over de toestand van dit moment, niet over de opbouw van weken.
//
// Opent vanuit de tegel Trainingsruimte (today-stand.tsx), dus de waarden staan
// hier meteen open. `/zwbeter-worden#herstel` is de link naar de instelling.

import type { ZwbAdvice } from "@/lib/training/zwbeterworden";
import { hasRecoveryValues, readinessAgeLabel, type WellnessSummary } from "@/lib/training/wellness";
import { RecoveryStat, recoveryStateLabel } from "./ui";
import { WellnessOptInToggle } from "./wellness-optin-toggle";
import { ClubShortName, ClubText } from "@/components/club-texts-provider";

export function RecoveryCard({
  optIn,
  summary,
  advice,
  lastWellnessDay,
}: {
  optIn: boolean;
  summary: WellnessSummary | null;
  /** Alleen als de dagkaart het advies niet al toont. */
  advice: ZwbAdvice | null;
  /** Laatste dag met een echte meting, voor als de reeks stilstaat. */
  lastWellnessDay: string | null;
}) {
  const hasValues = hasRecoveryValues(summary);

  return (
    <section id="herstel" className="scroll-mt-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Herstel &amp; belastbaarheid</h3>
        <WellnessOptInToggle initialOptIn={optIn} />
      </div>

      {optIn &&
        (summary ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
              <RecoveryStat label="Status" value={recoveryStateLabel(summary.state)} />
              <RecoveryStat
                label="Readiness"
                value={summary.readiness != null ? `${summary.readiness}` : "-"}
                hint={
                  summary.readinessSource === "afgeleid" ? (
                    <>berekend door <ClubShortName /></>
                  ) : (
                    (readinessAgeLabel(summary) ?? undefined)
                  )
                }
              />
              <RecoveryStat
                label="HRV (7d gem.)"
                value={summary.hrv != null ? `${summary.hrv}` : "—"}
              />
              <RecoveryStat
                label="Rust-HR (7d gem.)"
                value={summary.restingHr != null ? `${summary.restingHr}` : "—"}
              />
              <RecoveryStat
                label="Slaap (7d gem.)"
                value={
                  summary.sleepHours != null
                    ? `${summary.sleepHours.toLocaleString("nl-NL")}u`
                    : "—"
                }
              />
            </div>
            {/* Zonder verse waarden de laatste dag waarop er wél iets
                binnenkwam, in rood: dan stokt meestal de koppeling. */}
            {hasValues ? (
              <p className="text-xs text-muted-foreground">{summary.note}</p>
            ) : (
              <p className="text-xs text-destructive">
                {lastWellnessDay
                  ? `Geen herstelwaarden in de laatste 7 dagen; laatste meting ${new Date(
                      `${lastWellnessDay}T12:00:00`,
                    ).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.`
                  : "Nog geen herstelwaarden ontvangen uit intervals.icu."}
              </p>
            )}
            {advice ? (
              <div className={`rounded-md p-3 ${advice.block}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium"><ClubText text="{adviesnaam}" /></p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}>
                    {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{advice.title}</p>
                <p className="mt-1 text-xs text-muted-foreground"><ClubText text={advice.description} /></p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nog geen herstel-data gevonden in intervals.icu.
          </p>
        ))}
    </section>
  );
}
