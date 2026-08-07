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

// Vlakken krijgen de kaartkleur, tekst een variant met genoeg contrast: het
// merkgoud haalt als kleine tekst op een lichte achtergrond maar 3,1:1.
const OWN_FILL = "rgb(var(--zwblok-own))";
const OWN_TEXT = "rgb(var(--zwblok-own-text))";
const CLUB = "rgb(var(--zwblok-club-busy))";

/**
 * Eén balk voor beide waarden, met goud binnen teal. Dat mag omdat je eigen
 * blokken per definitie een deelverzameling van de clubblokken zijn: jouw
 * percentage kan nooit hoger liggen. Zo leest de balk hetzelfde als de kaart,
 * waar jouw goud ook binnen het clubgebied ligt.
 */
function Bar({ ownPct, clubPct }: { ownPct: number; clubPct: number }) {
  // Een waarde die niet nul is moet zichtbaar blijven, ook bij 0,1%.
  const width = (value: number) =>
    value <= 0 ? 0 : Math.max(2, Math.min(100, value));
  return (
    <span
      aria-hidden
      className="relative mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${width(clubPct)}%`, background: CLUB }}
      />
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${width(ownPct)}%`, background: OWN_FILL }}
      />
    </span>
  );
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
            <tr className="border-b text-xs">
              <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">
                Gebied
              </th>
              <th
                className="py-1.5 pr-3 text-right font-medium"
                style={{ color: OWN_TEXT }}
              >
                {memberName}
              </th>
              <th
                className="py-1.5 text-right font-medium"
                style={{ color: CLUB }}
              >
                Club
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ region, own, club }) => {
              const ownPct = pct(own, region.blocks);
              const clubPct = pct(club, region.blocks);
              return (
                <tr key={region.code} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">
                    {region.name}
                    <Bar ownPct={ownPct} clubPct={clubPct} />
                  </td>
                  <td
                    className="py-1.5 pr-3 text-right align-top font-medium tabular-nums"
                    style={{ color: OWN_TEXT }}
                  >
                    {formatPct(ownPct)}
                  </td>
                  <td
                    className="py-1.5 text-right align-top tabular-nums"
                    style={{ color: CLUB }}
                  >
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
