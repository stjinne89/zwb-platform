import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  componentType,
  isDiscipline,
  resolveThreshold,
  type Discipline,
} from "@/lib/maintenance/component-types";

// De seed is losse SQL en wordt door niets anders gecontroleerd. Een typefout in
// een component_type levert een tip op die stilletjes nooit verschijnt, want
// pickTip filtert op precies die string.

const SQL = readFileSync(
  join(process.cwd(), "supabase", "migrations", "0124_seed_maintenance_tips.sql"),
  "utf8",
);

type SeedRow = {
  componentType: string;
  discipline: string | null;
  body: string;
  sourceType: string;
  sourceUrl: string | null;
};

function parseSeed(): SeedRow[] {
  const rows: SeedRow[] = [];
  // ('slug', null|'discipline', '...body...', 'source_type', name, url)
  const re =
    /\(\s*'([a-z_]+)',\s*(null|'[a-z]+')\s*,\s*'([\s\S]*?)',\s*'(pro|algemeen|lid)',\s*(null|'[^']*')\s*,\s*(null|'[^']*')\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(SQL)) !== null) {
    rows.push({
      componentType: match[1],
      discipline: match[2] === "null" ? null : match[2].slice(1, -1),
      body: match[3],
      sourceType: match[4],
      sourceUrl: match[6] === "null" ? null : match[6].slice(1, -1),
    });
  }
  return rows;
}

const rows = parseSeed();

describe("seed voor de tips-databank", () => {
  it("bevat een flink aantal tips", () => {
    expect(rows.length).toBeGreaterThanOrEqual(25);
  });

  it("gebruikt alleen bestaande onderdeeltypes", () => {
    const onbekend = rows
      .map((row) => row.componentType)
      .filter((slug) => componentType(slug) === null);
    expect(onbekend).toEqual([]);
  });

  it("koppelt elke tip aan een discipline waar dat onderdeel bestaat", () => {
    const mismatch = rows
      .filter((row) => row.discipline !== null)
      .filter((row) => {
        if (!isDiscipline(row.discipline!)) return true;
        return (
          resolveThreshold(row.componentType, row.discipline as Discipline, "normal") ===
          null
        );
      })
      .map((row) => `${row.componentType}/${row.discipline}`);
    expect(mismatch).toEqual([]);
  });

  it("geeft elke pro-tip een bronlink", () => {
    const zonderBron = rows
      .filter((row) => row.sourceType === "pro" && !row.sourceUrl)
      .map((row) => row.componentType);
    expect(zonderBron).toEqual([]);
  });

  it("houdt elke tip binnen de lengte die de tabel toestaat", () => {
    for (const row of rows) {
      // De kolom heeft een check tussen 3 en 600 tekens.
      expect(row.body.trim().length).toBeGreaterThanOrEqual(3);
      expect(row.body.trim().length).toBeLessThanOrEqual(600);
    }
  });

  it("bevat geen ledencitaten — die komen via de import", () => {
    expect(rows.some((row) => row.sourceType === "lid")).toBe(false);
  });
});
