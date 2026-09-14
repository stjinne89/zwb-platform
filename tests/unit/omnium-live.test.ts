// Integratiecontrole tegen de ECHTE database. Staat standaard uit.
//
//   OMNIUM_LIVE=1 npx vitest run tests/unit/omnium-live.test.ts
//
// Maakt een duidelijk gemarkeerd testseizoen aan, loopt de hele keten door
// (seizoen -> edities -> onderdelen -> uitslagen -> stand -> GC) en ruimt
// alles daarna weer op. Met OMNIUM_KEEP=1 blijft de data staan om de publieke
// pagina's in een browser te kunnen bekijken; opruimen gaat dan met de hand.
//
// Dit is het enige dat de dingen dekt die met alleen unittests niet te bewijzen
// zijn: dat de migraties kloppen, dat de RLS-policies precies het gepubliceerde
// materiaal vrijgeven, en dat de kitcodes voor niemand leesbaar zijn.

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// vitest laadt .env.local niet zelf.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const { createAdminClient } = await import("@/lib/supabase/admin");
const { createPublicClient } = await import("@/lib/supabase/public");
const { planOmniumSeason, OMNIUM_2026_27_PLAN } = await import(
  "@/lib/omnium/season-plan"
);
const { DEFAULT_OMNIUM_PARTS } = await import("@/lib/omnium/edition");
const { parseOmniumResults } = await import("@/lib/omnium/parse-results");
const { scoreParsedRows, nameKeyOf } = await import("@/lib/omnium/import");
const { recomputeEditionStandings } = await import("@/lib/omnium/standings");

const admin = createAdminClient();
const anon = createPublicClient();

const SLUG = process.env.OMNIUM_KEEP === "1" ? "test-omnium-preview" : `test-omnium-${Date.now()}`;
const RUBY = "DIAMOND-RUBY";
const RIDERS = ["Anna Testrider", "Bert Testrider", "Carla Testrider", "Dave Testrider"];

let seasonId = "";
let editionOneId = "";
let editionTwoId = "";
const riderIds = new Map<string, string>();
const createdEventIds: string[] = [];

// Opruimen van een eerdere run, zodat het script herhaalbaar is: met
// OMNIUM_KEEP=1 blijft de vorige testdata staan en botst de unieke slug.
async function purgeTestData() {
  await admin.from("omnium_seasons").delete().like("slug", "test-omnium-%");
  await admin.from("omnium_riders").delete().like("display_name", "% Testrider");
}

beforeAll(purgeTestData);

afterAll(async () => {
  // Met OMNIUM_KEEP=1 blijft de testdata staan om de publieke pagina's in de
  // browser te kunnen bekijken; opruimen gebeurt dan apart.
  if (process.env.OMNIUM_KEEP === "1") {
    console.log(`[omnium] testdata bewaard, seizoen ${SLUG}`);
    return;
  }
  // Alles wat aan het seizoen hangt cascade't mee; renners en kalenderitems
  // niet, dus die expliciet weg.
  await purgeTestData();
  if (createdEventIds.length > 0) {
    await admin.from("events").delete().in("id", createdEventIds);
  }
});

describe.skipIf(process.env.OMNIUM_LIVE !== "1")("Omnium tegen de echte database", () => {
  it("maakt een seizoen met zes edities en vier onderdelen per editie", async () => {
    const { data: season, error } = await admin
      .from("omnium_seasons")
      .insert({
        slug: SLUG,
        name: "TEST — niet publiceren",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    seasonId = season!.id as string;

    const planned = planOmniumSeason({ ...OMNIUM_2026_27_PLAN, season: SLUG });
    expect(planned).toHaveLength(6);

    for (const edition of planned) {
      const { data: row, error: insertError } = await admin
        .from("omnium_editions")
        .insert({
          season_id: seasonId,
          number: edition.number,
          slug: `${SLUG}-editie-${edition.number}`,
          title: `Testeditie ${edition.number}`,
          starts_at: edition.startAtIso,
          preshow_at: edition.preshowAtIso,
          // Alleen de eerste is publiek; de tweede blijft concept om de
          // RLS-afscherming te kunnen controleren.
          published_at: edition.number === 1 ? new Date().toISOString() : null,
          status: edition.number === 1 ? "published" : "concept",
        })
        .select("id")
        .single();
      expect(insertError).toBeNull();
      if (edition.number === 1) editionOneId = row!.id as string;
      if (edition.number === 2) editionTwoId = row!.id as string;

      let cursor = new Date(edition.startAtIso).getTime();
      for (const [index, part] of DEFAULT_OMNIUM_PARTS.entries()) {
        const { error: partError } = await admin
          .from("omnium_edition_events")
          .insert({
            edition_id: row!.id as string,
            discipline: part.discipline,
            order_index: index + 1,
            title: part.title,
            starts_at: new Date(cursor).toISOString(),
            duration_minutes: part.durationMinutes,
            break_minutes: part.breakMinutes,
            sprint_count: part.sprintCount ?? 0,
          });
        expect(partError).toBeNull();
        cursor += (part.durationMinutes + part.breakMinutes) * 60_000;
      }
    }

    const { count } = await admin
      .from("omnium_edition_events")
      .select("id", { count: "exact", head: true })
      .in(
        "edition_id",
        await admin
          .from("omnium_editions")
          .select("id")
          .eq("season_id", seasonId)
          .then((res) => (res.data ?? []).map((r) => r.id as string)),
      );
    expect(count).toBe(24);
  });

  it("slaat uitslagen op en berekent de stand", async () => {
    for (const name of RIDERS) {
      const { data, error } = await admin
        .from("omnium_riders")
        .insert({ name_key: nameKeyOf(name), display_name: name, last_league: RUBY })
        .select("id")
        .single();
      expect(error).toBeNull();
      riderIds.set(nameKeyOf(name), data!.id as string);
    }

    const { data: parts } = await admin
      .from("omnium_edition_events")
      .select("id, discipline")
      .eq("edition_id", editionOneId);
    const partByDiscipline = new Map(
      (parts ?? []).map((p) => [p.discipline as string, p.id as string]),
    );

    const fixtures = [
      {
        discipline: "prologue" as const,
        mode: "finish" as const,
        raw: "1\tAnna Testrider\tRUBY\t18:00\n2\tBert Testrider\tRUBY\t18:05\n3\tCarla Testrider\tRUBY\t18:10",
      },
      {
        discipline: "scratch" as const,
        mode: "finish" as const,
        raw: "1\tBert Testrider\tRUBY\t25:00\n2\tAnna Testrider\tRUBY\t25:01\n3\tCarla Testrider\tRUBY\t25:09",
      },
      {
        discipline: "sprint" as const,
        mode: "segment" as const,
        raw: "Anna Testrider\tRUBY\t0:58\nBert Testrider\tRUBY\t1:00\nCarla Testrider\tRUBY\t1:02",
      },
      {
        // Dave rijdt alleen de crit: die punten horen door de nulregel te
        // vervallen.
        discipline: "crit" as const,
        mode: "crit_points" as const,
        raw: "Anna Testrider\tRUBY\t15\nBert Testrider\tRUBY\t20\nCarla Testrider\tRUBY\t10\nDave Testrider\tRUBY\t12",
      },
    ];

    for (const fixture of fixtures) {
      const { rows, issues } = parseOmniumResults(fixture.raw, {
        mode: fixture.mode,
      });
      expect(issues).toHaveLength(0);
      const scored = scoreParsedRows(rows, {
        discipline: fixture.discipline,
        mode: fixture.mode,
        idOf: (row) => riderIds.get(nameKeyOf(row.name))!,
      });
      const { error } = await admin.from("omnium_results").insert(
        scored.map((result) => ({
          edition_id: editionOneId,
          edition_event_id: partByDiscipline.get(fixture.discipline)!,
          rider_id: result.riderId,
          league: result.league,
          status: result.status,
          position: result.position,
          overall_position: result.overallPosition,
          time_seconds: result.timeSeconds,
          time_text: result.timeText,
          segment_seconds: result.segmentSeconds,
          finish_points: result.finishPoints,
          sprint_points: result.sprintPoints,
          points: result.points,
          points_raw: result.pointsRaw,
          voided_reason: result.voidedReason,
          matched_via: "name",
          source: "paste",
        })),
      );
      expect(error).toBeNull();

      // Zoals saveOmniumResults doet: het onderdeel als gescoord markeren, want
      // daar leest de live-pagina de voortgang uit af.
      const { error: stateError } = await admin
        .from("omnium_edition_events")
        .update({ results_state: "final" })
        .eq("id", partByDiscipline.get(fixture.discipline)!);
      expect(stateError).toBeNull();
    }

    const recomputed = await recomputeEditionStandings(admin, editionOneId);
    expect(recomputed).toMatchObject({ ok: true });

    const { data: standings } = await admin
      .from("omnium_edition_standings")
      .select("rider_id, total_points, rank, is_provisional")
      .eq("edition_id", editionOneId)
      .order("rank");

    const byName = new Map(
      [...riderIds.entries()].map(([key, id]) => [id, key]),
    );
    const table = (standings ?? []).map((row) => ({
      name: byName.get(row.rider_id as string),
      total: Number(row.total_points),
      rank: row.rank as number,
    }));

    // Bert 38+40+18+20 = 116, Anna 40+38+20+15 = 113, Carla 36+36+16+10 = 98,
    // Dave 12 verdiend maar 0 na de crit-nulregel.
    expect(table).toEqual([
      { name: nameKeyOf("Bert Testrider"), total: 116, rank: 1 },
      { name: nameKeyOf("Anna Testrider"), total: 113, rank: 2 },
      { name: nameKeyOf("Carla Testrider"), total: 98, rank: 3 },
      { name: nameKeyOf("Dave Testrider"), total: 0, rank: 4 },
    ]);
    expect((standings ?? []).every((row) => row.is_provisional === false)).toBe(
      true,
    );

    const { data: daveCrit } = await admin
      .from("omnium_results")
      .select("points, points_raw, voided_reason")
      .eq("rider_id", riderIds.get(nameKeyOf("Dave Testrider"))!)
      .single();
    expect(Number(daveCrit!.points)).toBe(0);
    expect(Number(daveCrit!.points_raw)).toBe(12);
    expect(daveCrit!.voided_reason).toBe("no_other_race");
  });

  it("telt het seizoensklassement op", async () => {
    const { data: season } = await admin
      .from("omnium_season_standings")
      .select("rider_id, total_points, rank, editions_raced, points_by_edition")
      .eq("season_id", seasonId)
      .order("rank");
    expect(season).toHaveLength(4);
    expect(Number(season![0].total_points)).toBe(116);
    expect(season![0].editions_raced).toBe(1);
    expect(season![0].points_by_edition).toEqual({ "1": 116 });
  });

  it("laat anon alleen gepubliceerd materiaal zien", async () => {
    const { data: publicEditions } = await anon
      .from("omnium_editions")
      .select("id, published_at")
      .eq("season_id", seasonId);
    const visible = (publicEditions ?? []).map((row) => row.id as string);
    expect(visible).toContain(editionOneId);
    expect(visible).not.toContain(editionTwoId);

    const { data: publicStandings } = await anon
      .from("omnium_edition_standings")
      .select("rider_id")
      .eq("edition_id", editionOneId);
    expect((publicStandings ?? []).length).toBe(4);

    const { data: hiddenStandings } = await anon
      .from("omnium_edition_standings")
      .select("rider_id")
      .eq("edition_id", editionTwoId);
    expect((hiddenStandings ?? []).length).toBe(0);
  });

  it("markeert de stand als voorlopig zolang niet alles binnen is", async () => {
    // De situatie tijdens de uitzending: de Crit Royale is nog niet gereden.
    const { data: crit } = await admin
      .from("omnium_edition_events")
      .select("id")
      .eq("edition_id", editionOneId)
      .eq("discipline", "crit")
      .single();

    await admin.from("omnium_results").delete().eq("edition_event_id", crit!.id);
    await admin
      .from("omnium_edition_events")
      .update({ results_state: "pending" })
      .eq("id", crit!.id);

    const recomputed = await recomputeEditionStandings(admin, editionOneId);
    expect(recomputed).toMatchObject({ ok: true });

    const { data: standings } = await admin
      .from("omnium_edition_standings")
      .select("rider_id, total_points, rank, is_provisional")
      .eq("edition_id", editionOneId)
      .order("rank");

    expect((standings ?? []).every((row) => row.is_provisional === true)).toBe(
      true,
    );
    // Zonder de crit: Anna 40+38+20 = 98, Bert 38+40+18 = 96, Carla 88.
    // Dave reed alleen de crit en verdwijnt dus uit de stand.
    expect(standings).toHaveLength(3);
    expect(Number(standings![0].total_points)).toBe(98);
  });

  it("houdt de kitcodes voor iedereen behalve de service-role dicht", async () => {
    const { error: insertError } = await admin.from("omnium_kit_codes").insert({
      season_id: seasonId,
      code: `TEST-${Date.now()}`,
    });
    expect(insertError).toBeNull();

    const { data: leaked } = await anon.from("omnium_kit_codes").select("code");
    expect(leaked ?? []).toHaveLength(0);

    const { data: viaAdmin } = await admin
      .from("omnium_kit_codes")
      .select("code")
      .eq("season_id", seasonId);
    expect((viaAdmin ?? []).length).toBe(1);
  });
});
