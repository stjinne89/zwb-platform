import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { TTT_COUNTING_RIDERS, type ProjectedTeam } from "@/lib/race-briefing/field";
import type { BriefingRider, ZrlExpectedResult } from "@/lib/race-briefing/load";
import { cn } from "@/lib/utils";

// Verwachte uitslag van een ZRL-teamrace: de ploegen en het veld. Stond tot
// 2026-11-25 op de briefing ("Het veld"), nu op de racepagina.

const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wkg = (value: number | null | undefined) => (value == null ? "—" : nl2.format(value));

/** Plek per eerdere race van deze ronde; een gewonnen race vet. */
export function History({ labels, places }: { labels: string[]; places: Array<number | null> }) {
  if (labels.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {places.map((p, i) => (
        <span key={labels[i]} className={cn("mr-1.5", p === 1 && "font-semibold")} title={labels[i]}>
          {p ?? "·"}
        </span>
      ))}
    </span>
  );
}

export function ZrlTeamsTable({ view }: { view: ZrlExpectedResult }) {
  const teams = view.projection?.teams ?? [];
  if (teams.length === 0) return null;
  const label = (t: ProjectedTeam) => view.teamLabels[t.team] ?? t.team;
  if (view.format === "ttt") {
    // Gecombineerde kracht: gemiddeld 20 minuten van de sterkste vier (field.ts, tttStrength).
    const tttColumns: Array<ResponsiveColumn<ProjectedTeam>> = [
      { key: "team", header: "Ploeg", cell: (t) => <span className={cn(t.own && "font-semibold")}>{label(t)}</span>, primary: true },
      { key: "starters", header: "Renners", cell: (t) => t.starters, align: "right" },
      {
        key: "strength",
        header: "Kracht (W/kg)",
        cell: (t) =>
          t.strength ? (
            <span className="tabular-nums">
              {wkg(t.strength.wkg)}
              {t.strength.riders < TTT_COUNTING_RIDERS && <span className="text-muted-foreground"> ({t.strength.riders})</span>}
            </span>
          ) : (
            "—"
          ),
        align: "right",
      },
    ];
    return <ResponsiveTable columns={tttColumns} rows={teams} rowKey={(t) => t.team} rowClassName={(t) => (t.own ? "bg-primary/5" : undefined)} />;
  }
  const columns: Array<ResponsiveColumn<ProjectedTeam>> = [
    { key: "team", header: "Ploeg", cell: (t) => <span className={cn(t.own && "font-semibold")}>{label(t)}</span>, primary: true },
    { key: "starters", header: "Renners", cell: (t) => t.starters, align: "right" },
    ...(view.projection?.basis
      ? [{ key: "points", header: "Verwacht", cell: (t: ProjectedTeam) => t.points ?? "—", align: "right" as const }]
      : []),
    ...(view.projection?.basis
      ? [{ key: "places", header: "Plekken", cell: (t: ProjectedTeam) => <span className="tabular-nums">{t.riders.map((r) => r.place).join(", ")}</span> }]
      : []),
  ];
  return <ResponsiveTable columns={columns} rows={teams} rowKey={(t) => t.team} rowClassName={(t) => (t.own ? "bg-primary/5" : undefined)} />;
}

export function ZrlFieldTable({ view }: { view: ZrlExpectedResult }) {
  const velo = view.zwiftRacing;
  const ttt = view.format === "ttt";
  const columns: Array<ResponsiveColumn<BriefingRider>> = [
    ...(ttt ? [] : [{ key: "place", header: "#", cell: (r: BriefingRider) => r.expectedPlace ?? "—", secondary: true }]),
    { key: "name", header: "Renner", cell: (r) => <span className={cn(r.own && "font-semibold")}>{r.name}</span>, primary: true },
    { key: "team", header: "Ploeg", cell: (r) => r.teamLabel ?? "—" },
    { key: "zrs", header: "ZRS", cell: (r) => r.racingScore ?? "—", align: "right" },
    ...(velo ? [{ key: "velo", header: "vELO", cell: (r: BriefingRider) => (r.velo ? Math.round(r.velo) : "—"), align: "right" as const }] : []),
    ...(ttt
      ? [{ key: "m20", header: "20 min", cell: (r: BriefingRider) => wkg(r.power?.m20), align: "right" as const }]
      : velo
        ? [
            { key: "m1", header: "1 min", cell: (r: BriefingRider) => wkg(r.power?.m1), align: "right" as const },
            { key: "m5", header: "5 min", cell: (r: BriefingRider) => wkg(r.power?.m5), align: "right" as const },
          ]
        : []),
    { key: "history", header: view.historyLabels.join(" · ") || "Eerder", cell: (r) => <History labels={view.historyLabels} places={r.history} />, align: "right" },
  ];
  return (
    <ResponsiveTable
      columns={columns}
      rows={view.briefingField}
      rowKey={(r) => String(r.zwiftId)}
      rowClassName={(r) => (r.own ? "bg-primary/5" : undefined)}
      minWidth={velo ? 720 : 560}
    />
  );
}
