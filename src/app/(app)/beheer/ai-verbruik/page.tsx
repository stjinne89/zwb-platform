import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader, SectionHeader } from "@/components/app-ui";
import { MemberLink } from "@/components/member-link";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { adminAreaPermission } from "@/lib/admin-areas";
import {
  AI_KIND_LABEL,
  AI_TRIGGERS,
  AI_TRIGGER_LABEL,
  summarizeUsage,
  usageMonth,
  type AiTrigger,
  type UsageSummary,
  type UsageTotal,
} from "@/lib/ai/usage";
import { getRequestAccess } from "@/lib/auth/request";
import { loadAiUsage } from "./_data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "AI-verbruik" };

const dollars = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function cost(total: UsageTotal): string {
  const text = dollars.format(total.costUsd);
  return total.unpriced > 0 ? `${text} + ${total.unpriced} zonder prijs` : text;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 15)).toLocaleDateString("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" });
}

type KindRow = UsageSummary["byKind"][number];
type MemberRow = UsageSummary["byMember"][number] & { name: string };

const kindColumns: Array<ResponsiveColumn<KindRow>> = [
  { key: "kind", header: "Soort", primary: true, cell: (row) => AI_KIND_LABEL[row.kind] ?? row.kind },
  { key: "trigger", header: "Herkomst", secondary: true, cell: (row) => AI_TRIGGER_LABEL[row.trigger] },
  { key: "calls", header: "Aanroepen", align: "right", cell: (row) => row.total.calls },
  {
    key: "avg",
    header: "Gemiddeld",
    align: "right",
    cell: (row) => {
      const priced = row.total.calls - row.total.unpriced;
      return priced > 0 ? dollars.format(row.total.costUsd / priced) : "–";
    },
  },
  { key: "cost", header: "Kosten", align: "right", cell: (row) => cost(row.total) },
];

const memberColumns: Array<ResponsiveColumn<MemberRow>> = [
  {
    key: "name",
    header: "Lid",
    primary: true,
    cell: (row) => <MemberLink id={row.profileId}>{row.name}</MemberLink>,
  },
  ...AI_TRIGGERS.map(
    (trigger: AiTrigger): ResponsiveColumn<MemberRow> => ({
      key: trigger,
      header: AI_TRIGGER_LABEL[trigger],
      align: "right",
      cell: (row) => (row.byTrigger[trigger].calls > 0 ? cost(row.byTrigger[trigger]) : "–"),
    }),
  ),
  { key: "total", header: "Totaal", align: "right", cell: (row) => cost(row.total) },
];

export default async function AiVerbruikPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("aiVerbruik"))) redirect("/dashboard");

  const period = usageMonth((await searchParams).maand);
  const data = await loadAiUsage(period.from, period.to);

  const nav = (
    <nav className="flex items-center gap-1 text-sm" aria-label="Maand">
      <Link
        href={`/beheer/ai-verbruik?maand=${period.previous}`}
        className="rounded-md p-1.5 hover:bg-muted"
        aria-label={monthLabel(period.previous)}
      >
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-32 text-center font-medium">{monthLabel(period.month)}</span>
      {period.next ? (
        <Link
          href={`/beheer/ai-verbruik?maand=${period.next}`}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label={monthLabel(period.next)}
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="size-7" />
      )}
    </nav>
  );

  if (!data.available) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Beheer" title="AI-verbruik" />
        <EmptyState>Het verbruik wordt nog niet bijgehouden.</EmptyState>
      </div>
    );
  }

  const summary = summarizeUsage(data.rows);
  const members: MemberRow[] = summary.byMember.map((row) => ({
    ...row,
    name: data.names.get(row.profileId) ?? "Onbekend lid",
  }));
  const tiles: Array<{ label: string; total: UsageTotal }> = [
    { label: "Totaal", total: summary.total },
    ...AI_TRIGGERS.map((trigger) => ({ label: AI_TRIGGER_LABEL[trigger], total: summary.byTrigger[trigger] })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Beheer" title="AI-verbruik" actions={nav} />

      {summary.total.calls === 0 ? (
        <EmptyState>Geen AI-aanroepen in {monthLabel(period.month)}.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-lg border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{dollars.format(tile.total.costUsd)}</p>
                <p className="text-sm text-muted-foreground tabular-nums">{tile.total.calls} aanroepen</p>
              </div>
            ))}
          </div>

          <section>
            <SectionHeader title="Per soort" />
            <ResponsiveTable columns={kindColumns} rows={summary.byKind} rowKey={(row) => `${row.kind}|${row.trigger}`} />
          </section>

          <section>
            <SectionHeader title="Per lid" />
            <ResponsiveTable
              columns={memberColumns}
              rows={members}
              rowKey={(row) => row.profileId}
              minWidth={640}
              empty="Geen aanroepen voor leden."
            />
            {summary.club.calls > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Voor de hele club: {cost(summary.club)} ({summary.club.calls} aanroepen).
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
