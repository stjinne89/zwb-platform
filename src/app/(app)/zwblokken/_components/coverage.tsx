"use client";

// Dekking per provincie en per Europees land: hoeveel van de blokken die er
// zijn, heeft dit lid (en heeft de club) al gehad?
//
// Bewust geen wereldpercentage: dat blijft onder de honderdste procent hangen
// en zegt niemand iets. Een provincie is een schaal waarop je vooruitgang ziet.

/** Alleen de metadata van een regio — de omtrekken blijven server-side. */
export type RegionMeta = {
  code: string;
  name: string;
  level: "country" | "province";
  blocks: number;
};

type Props = {
  regions: RegionMeta[];
  own: Record<string, number>;
  club: Record<string, number>;
  memberName: string;
};

type Row = { region: RegionMeta; own: number; club: number };

const pct = (part: number, whole: number) => (part / whole) * 100;

function formatPct(value: number): string {
  if (value > 0 && value < 0.05) return "<0,1%";
  // Onder de 10% is één decimaal het verschil tussen "iets" en "niets".
  const digits = value >= 10 ? 0 : 1;
  return `${value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function Table({
  rows,
  caption,
  memberName,
}: {
  rows: Row[];
  caption: string;
  memberName: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{caption}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 text-left font-medium">Gebied</th>
              <th className="py-1.5 pr-3 text-right font-medium">
                {memberName}
              </th>
              <th className="py-1.5 text-right font-medium">Club</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ region, own, club }) => {
              const clubPct = pct(club, region.blocks);
              return (
                <tr key={region.code} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">
                    {region.name}
                    <span
                      aria-hidden
                      className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"
                    >
                      <span
                        className="block h-full rounded-full bg-[rgb(var(--zwblok-club-busy))]"
                        style={{
                          width: `${Math.max(1.5, Math.min(100, clubPct))}%`,
                        }}
                      />
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right align-top tabular-nums">
                    {formatPct(pct(own, region.blocks))}
                  </td>
                  <td className="py-1.5 text-right align-top tabular-nums text-muted-foreground">
                    {formatPct(clubPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Coverage({ regions, own, club, memberName }: Props) {
  const rows: Row[] = regions
    .map((region) => ({
      region,
      own: own[region.code] ?? 0,
      club: club[region.code] ?? 0,
    }))
    // Alleen gebieden waar de club ooit geweest is; anders staan er vijftig
    // Europese landen op nul.
    .filter((row) => row.club > 0);

  if (rows.length === 0) return null;

  const byClub = (a: Row, b: Row) =>
    pct(b.club, b.region.blocks) - pct(a.club, a.region.blocks);

  return (
    <section className="space-y-5 rounded-lg border bg-card/90 p-4">
      <Table
        rows={rows.filter((r) => r.region.level === "province").sort(byClub)}
        caption="Provincies"
        memberName={memberName}
      />
      <Table
        rows={rows.filter((r) => r.region.level === "country").sort(byClub)}
        caption="Landen"
        memberName={memberName}
      />
    </section>
  );
}
