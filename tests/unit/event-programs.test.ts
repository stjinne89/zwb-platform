import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import {
  diffProgramIds,
  programsByEvent,
  programsForGroup,
  slugifyProgramName,
} from "@/lib/events/programs";
import {
  birthdaysMatchFilter,
  calendarHref,
  eventMatchesFilter,
  parseProgramFilter,
  splitTypeFilter,
  toggleProgramFilter,
} from "@/lib/events/type-filter";

const GF = { id: "p-gf", slug: "road-to-wk-gf", name: "Road to WK GF" };
const ZRL = { id: "p-zrl", slug: "zrl-2026-27", name: "ZRL 2026/27" };

describe("slugifyProgramName", () => {
  it("maakt een leesbare slug", () => {
    expect(slugifyProgramName("Road to WK GF 2027!")).toBe("road-to-wk-gf-2027");
    expect(slugifyProgramName("  ZRL 2026/27 — één  ")).toBe("zrl-2026-27-een");
    expect(slugifyProgramName("!!!")).toBe("");
  });
});

describe("programma's per event", () => {
  const byEvent = programsByEvent(
    [GF, ZRL],
    [
      { program_id: "p-zrl", event_id: "team-a" },
      { program_id: "p-gf", event_id: "kamp" },
      { program_id: "p-zrl", event_id: "kamp" },
      { program_id: "bestaat-niet", event_id: "kamp" },
    ],
  );

  it("laat een event in meerdere programma's zitten", () => {
    expect(byEvent.get("kamp")).toEqual([GF, ZRL]);
    expect(byEvent.get("los")).toBeUndefined();
  });

  it("telt een hoofdevent mee via wat eronder hangt", () => {
    const children = new Map([
      ["week", [{ id: "team-a" }, { id: "team-b" }]],
      ["tour", [{ id: "etappe" }]],
      ["etappe", [{ id: "team-a" }]],
    ]);
    expect(programsForGroup({ id: "week" }, children, byEvent)).toEqual([ZRL]);
    expect(programsForGroup({ id: "tour" }, children, byEvent)).toEqual([ZRL]);
    expect(programsForGroup({ id: "los" }, children, byEvent)).toEqual([]);
  });

  it("weet wat erbij en eraf moet", () => {
    expect(diffProgramIds(["a", "b"], ["b", "c"])).toEqual({ add: ["c"], remove: ["a"] });
  });
});

describe("programma als derde as van het filter", () => {
  const event = { type: "gran_fondo", kind: "training" };

  it("leest alleen wat een slug kan zijn", () => {
    expect(parseProgramFilter("zrl-2026-27, Road to,road-to-wk-gf,zrl-2026-27")).toEqual([
      "road-to-wk-gf",
      "zrl-2026-27",
    ]);
    expect(parseProgramFilter(undefined)).toEqual([]);
    expect(toggleProgramFilter(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleProgramFilter(["a", "b"], "a")).toEqual(["b"]);
  });

  it("is 'of' tussen programma's en 'en' met categorie en type", () => {
    const filter = splitTypeFilter(["training"], ["road-to-wk-gf", "zrl-2026-27"]);
    expect(eventMatchesFilter(event, filter, ["road-to-wk-gf"])).toBe(true);
    expect(eventMatchesFilter(event, filter, [])).toBe(false);
    expect(eventMatchesFilter({ ...event, kind: "social" }, filter, ["road-to-wk-gf"])).toBe(
      false,
    );
  });

  it("verbergt verjaardagen zodra er een programma gekozen is", () => {
    expect(birthdaysMatchFilter(splitTypeFilter([], ["road-to-wk-gf"]))).toBe(false);
    expect(birthdaysMatchFilter(splitTypeFilter([], []))).toBe(true);
  });

  it("zet het programma in zijn eigen parameter", () => {
    expect(
      calendarHref({ onlyForMe: true, types: ["zwift"], programs: ["road-to-wk-gf"] }),
    ).toBe("/kalender?voor=mij&type=zwift&programma=road-to-wk-gf");
    expect(calendarHref({ onlyForMe: false, types: [], programs: [] })).toBe("/kalender");
  });
});

describe("migratie 0226", () => {
  it("maakt de tabellen, weigert een dubbele koppeling en ruimt op bij verwijderen", async () => {
    const db = new PGlite();
    // Wat de migratie van Supabase verwacht: rollen, auth.uid() en de rechtenfunctie.
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create table public.profiles (id uuid primary key);
      create table public.events (
        id uuid primary key default gen_random_uuid(),
        created_by uuid
      );
      create function public.current_user_has_permission(p text) returns boolean
        language sql as 'select false';
    `);
    const sql = readFileSync("supabase/migrations/0226_event_programs.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);

    await db.exec(`
      insert into public.event_programs (id, slug, name)
        values ('00000000-0000-0000-0000-0000000000a1', 'road-to-wk-gf', 'Road to WK GF'),
               ('00000000-0000-0000-0000-0000000000a2', 'zrl-2026-27', 'ZRL 2026/27');
      insert into public.events (id) values ('00000000-0000-0000-0000-0000000000e1');
      insert into public.event_program_links (program_id, event_id)
        values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1'),
               ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1');
    `);
    await expect(
      db.exec(`insert into public.event_program_links (program_id, event_id)
        values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1')`),
    ).rejects.toThrow();
    await expect(
      db.exec(`insert into public.event_programs (slug, name) values ('Geen Slug', 'x')`),
    ).rejects.toThrow();

    await db.exec(`delete from public.event_programs where slug = 'zrl-2026-27'`);
    const afterProgram = await db.query("select count(*)::int as n from public.event_program_links");
    expect(afterProgram.rows).toEqual([{ n: 1 }]);
    await db.exec(`delete from public.events`);
    const afterEvent = await db.query("select count(*)::int as n from public.event_program_links");
    expect(afterEvent.rows).toEqual([{ n: 0 }]);
  }, 60_000);
});
