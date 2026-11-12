import { MemberLink } from "@/components/member-link";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import type { ZrSignupRow } from "@/lib/zwiftracing/event-signups";

/** Gewone Zwift-race: de aangemelde leden met hun verwachte plek volgens ZwiftRacing. */
export function ZwiftRacingSignups({ rows }: { rows: ZrSignupRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Verwachting ZwiftRacing</h2>
      <ResponsiveTable<ZrSignupRow>
        rows={rows}
        rowKey={(row) => row.profileId}
        columns={[
          { key: "name", header: "Lid", primary: true, cell: (row) => <MemberLink id={row.profileId}>{row.name}</MemberLink> },
          { key: "pen", header: "Pen", cell: (row) => row.pen ?? "–" },
          { key: "expected", header: "Verwacht", align: "right", cell: (row) => `${row.expected}e van ${row.penSize}` },
          { key: "type", header: "Type", secondary: true, cell: (row) => row.type ?? "–", cellClassName: "text-muted-foreground" },
        ]}
      />
    </section>
  );
}
