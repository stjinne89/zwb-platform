// Herstel en belastbaarheid van vandaag: waar sta je nu, en hoeveel mag je
// daarop trainen. Hoort op de dagpagina en niet bij de belastingcijfers — het
// gaat over de toestand van dit moment, niet over de opbouw van weken.

import { Activity } from "lucide-react";
import type { ZwbAdvice } from "@/lib/training/zwbeterworden";
import type { WellnessSummary } from "@/lib/training/wellness";
import { RecoveryStat, recoveryStateLabel } from "./ui";
import { WellnessOptInToggle } from "./wellness-optin-toggle";

export function RecoveryCard({
  optIn,
  summary,
  advice,
  lastWellnessDay,
}: {
  optIn: boolean;
  summary: WellnessSummary | null;
  advice: ZwbAdvice;
  /** Laatste dag met een echte meting, voor als de reeks stilstaat. */
  lastWellnessDay: string | null;
}) {
  return (
    <section id="herstel" className="scroll-mt-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Activity className="size-5 text-primary" />
          Herstel &amp; belastbaarheid
        </h2>
        <WellnessOptInToggle initialOptIn={optIn} />
      </div>

      {optIn &&
        (summary ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RecoveryStat label="Status" value={recoveryStateLabel(summary.state)} />
              <RecoveryStat
                label="Readiness"
                value={summary.readiness != null ? `${summary.readiness}` : "-"}
                hint={summary.readinessSource === "afgeleid" ? "berekend door ZWB" : undefined}
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
                value={summary.sleepHours != null ? `${summary.sleepHours}u` : "—"}
              />
            </div>
            {/* Zonder verse waarden zegt de notitie "binnen de normale range"
                terwijl er niets gemeten is; dan liever de laatste dag waarop er
                wél iets binnenkwam. */}
            {summary.hrv != null || summary.restingHr != null || summary.sleepHours != null ? (
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
            <div className={`rounded-md p-3 ${advice.block}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">ZWBeterWorden</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${advice.pill}`}>
                  {advice.level > 0 ? `Niveau ${advice.level}/5` : "—"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{advice.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{advice.description}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nog geen herstel-data gevonden in intervals.icu.
          </p>
        ))}
    </section>
  );
}
