import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { SETUP_STEPS, canCompleteSetup, setupStatus } from "@/lib/club-setup";
import { loadClubSetupRow, setupSnapshot, text } from "./_data";
import { CompleteSetupButton } from "./_components/complete-setup-button";
import { LoadError, NoSetupAccess, SetupHeader, canSetUpClub } from "./_components/setup-page";

const STATUS_LABEL = { eigen: "Eigen", standaard: "Standaard", open: "Open" } as const;
const STATUS_CLASS = {
  eigen: "bg-primary/10 text-primary",
  standaard: "bg-muted text-muted-foreground",
  open: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
} as const;

export default async function InrichtingPage() {
  if (!(await canSetUpClub())) return <NoSetupAccess />;
  const row = await loadClubSetupRow();
  if (!row) {
    return (
      <div className="space-y-6">
        <SetupHeader title="Inrichting" back={false} />
        <LoadError />
      </div>
    );
  }

  const snapshot = setupSnapshot(row);
  const status = setupStatus(snapshot);
  const completedAt = text(row, "setup_completed_at");
  const on = MODULES.length - snapshot.switchedOff;
  const summary: [string, string][] = [
    ["Naam", `${snapshot.name} (${snapshot.shortName})`],
    ["Lid", snapshot.memberNoun ?? "lid"],
    ["Contact", snapshot.contactEmail ?? "–"],
    ["Huisstijl", snapshot.hasBrand ? "Eigen" : "Standaard"],
    ["Modules", `${on} van ${MODULES.length} aan`],
    ["Eigen namen", String(snapshot.labels + snapshot.words)],
    ["Teamtag", snapshot.teamTag ?? snapshot.shortName],
    ["Eventmarkers", (snapshot.eventMarkers ?? [snapshot.shortName]).join(", ")],
  ];

  return (
    <div className="space-y-6">
      <SetupHeader title="Inrichting" back={false} />

      <ol className="grid gap-2">
        {SETUP_STEPS.map((step, index) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 font-medium">{step.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status[step.key]]}`}>
                {STATUS_LABEL[status[step.key]]}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Controle</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {summary.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b pb-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end">
          {completedAt ? (
            <p className="text-sm text-muted-foreground">
              Afgerond op{" "}
              {new Date(completedAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Amsterdam",
              })}
            </p>
          ) : (
            <CompleteSetupButton disabled={!canCompleteSetup(snapshot)} />
          )}
        </div>
      </section>
    </div>
  );
}
