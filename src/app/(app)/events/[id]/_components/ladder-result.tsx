import { ArrowUpRight } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { LadderEventResult, LadderResultRow } from "@/lib/club-ladder/event-result";
import { cn } from "@/lib/utils";

const RESULT_URL = "https://ladder.cycleracing.club/public/result/";

function clock(seconds: number | null) {
  if (seconds == null) return "–";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">–</span>;
  if (value === 0) return <span className="text-muted-foreground">=</span>;
  return (
    <span className={value > 0 ? "font-medium text-primary" : "text-destructive"}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

/** Uitslag van een gereden ladderrace: plek per renner, naast de verwachting. */
export function LadderResultView({ result }: { result: LadderEventResult }) {
  const { ourName, opponent, ourScore, theirScore, won, expectedScore, rows } = result;
  const showExpected = rows.some((row) => row.expected != null);

  return (
    <section id="uitslag" className="scroll-mt-20 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Uitslag</h2>
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
          <p className="font-semibold">{ourName}</p>
          <p className="text-center text-xl font-semibold tabular-nums">
            <span className={cn(won && "text-primary")}>{ourScore}</span>
            <span className="px-1.5 text-muted-foreground">–</span>
            <span>{theirScore}</span>
          </p>
          <p className="text-right font-semibold">{opponent}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              won ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {won ? "Gewonnen" : "Verloren"}
          </span>
          {expectedScore && (
            <span className="tabular-nums text-muted-foreground">
              verwacht {expectedScore.ours}–{expectedScore.theirs}
            </span>
          )}
        </div>

        <ResponsiveTable<LadderResultRow>
          rows={rows}
          rowKey={(row) => String(row.position)}
          rowClassName={(row) => (row.own ? "bg-primary/5" : undefined)}
          columns={[
            {
              key: "name",
              header: "Renner",
              primary: true,
              cell: (row) => (
                <span className={cn(row.own && "font-medium")}>
                  <span className="mr-1.5 tabular-nums text-muted-foreground sm:hidden">{row.position}.</span>
                  {row.name}
                </span>
              ),
            },
            { key: "team", header: "Team", secondary: true, cell: (row) => row.team, cellClassName: "text-muted-foreground" },
            { key: "position", header: "Plek", align: "right", hideOnCard: true, cell: (row) => row.position },
            ...(showExpected
              ? [
                  { key: "expected", header: "Verwacht", align: "right" as const, cell: (row: LadderResultRow) => row.expected ?? "–" },
                  { key: "delta", header: "±", align: "right" as const, cell: (row: LadderResultRow) => <Delta value={row.delta} /> },
                ]
              : []),
            { key: "points", header: "Punten", align: "right", cell: (row) => row.points },
            { key: "time", header: "Tijd", align: "right", cell: (row) => clock(row.timeS) },
            { key: "wkg", header: "W/kg", align: "right", cell: (row) => (row.avgWkg == null ? "–" : row.avgWkg.toFixed(2)) },
          ]}
          empty="Renners nog niet opgehaald."
        />

        <a
          href={`${RESULT_URL}${result.resultId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Uitslag op de ladder
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </section>
  );
}
