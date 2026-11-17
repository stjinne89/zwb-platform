import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parseModuleKeys, roleBlockedModules } from "@/lib/module-access";
import {
  HIDEABLE_MODULES,
  HIDEABLE_ZWBETER_TABS,
  hiddenByMember,
  isHideableKey,
  parseMemberHidden,
} from "@/lib/member-view";
import { MODULE_KEYS } from "@/lib/modules";
import { moduleGateResponse, resetModuleGateCache } from "@/lib/modules-gate";
import { ZWBETER_WORDEN_SECTIONS } from "@/app/(app)/_components/nav-config";
import { TRIGGER_MODULE } from "@/lib/push/trigger-modules";

// Onderdelen per ledengroep afsluiten en per lid verbergen (0336).

const ROOT = join(__dirname, "..", "..");

describe("afsluiten per ledengroep", () => {
  const rows = [
    { role: "community_member", blocked_modules: ["training", "omnium", "teams"] },
    { role: "paying_member", blocked_modules: ["omnium"] },
  ];

  it("sluit af wat de enige groep van het lid dicht heeft", () => {
    const blocked = roleBlockedModules(rows, ["community_member"], false);
    expect(blocked.has("training")).toBe(true);
    expect(blocked.has("omnium")).toBe(true);
    expect(blocked.has("stats")).toBe(false);
  });

  it("laat open winnen bij meerdere groepen", () => {
    const blocked = roleBlockedModules(rows, ["community_member", "paying_member"], false);
    expect([...blocked].sort()).toEqual(["omnium"]);
  });

  it("sluit ook af wat een dichte module vereist", () => {
    const blocked = roleBlockedModules(rows, ["community_member"], false);
    expect(blocked.has("managerspel")).toBe(true);
    expect(blocked.has("live_race")).toBe(true);
  });

  it("houdt alles open voor een beheerder", () => {
    expect(roleBlockedModules(rows, ["community_member"], true).size).toBe(0);
  });

  it("houdt alles open voor een groep zonder rij of zonder kolom", () => {
    expect(roleBlockedModules(rows, ["trainer"], false).size).toBe(0);
    expect(roleBlockedModules([{ role: "community_member" }], ["community_member"], false).size).toBe(0);
    expect(roleBlockedModules(null, ["community_member"], false).size).toBe(0);
  });

  it("valt zonder groepen terug op de basisrol", () => {
    expect(roleBlockedModules(rows, [], false).has("training")).toBe(true);
  });

  it("laat onbekende sleutels vallen", () => {
    expect(parseModuleKeys(["training", "bestaat_niet", 3, "training"])).toEqual(["training"]);
    expect(parseModuleKeys("training")).toEqual([]);
  });
});

describe("verbergen per lid", () => {
  it("kent alleen bestaande modules en ZWBeter-paden", () => {
    for (const key of HIDEABLE_MODULES) expect(MODULE_KEYS).toContain(key);
    const hrefs = ZWBETER_WORDEN_SECTIONS.map((section) => section.href);
    for (const tab of HIDEABLE_ZWBETER_TABS) expect(hrefs).toContain(tab);
  });

  it("laat Vandaag, Schema en de trainer staan", () => {
    expect(HIDEABLE_ZWBETER_TABS).not.toContain("/zwbeter-worden");
    expect(HIDEABLE_ZWBETER_TABS).not.toContain("/zwbeter-worden/schema");
    expect(HIDEABLE_ZWBETER_TABS).not.toContain("/zwbeter-worden/trainer");
    expect(isHideableKey("sponsors")).toBe(false);
  });

  it("leest modules en paden uit de opgeslagen lijst", () => {
    const hidden = parseMemberHidden(["omnium", "/zwbeter-worden/voeding", "onzin", "/elders", 7]);
    expect([...hidden.modules]).toEqual(["omnium"]);
    expect([...hidden.tabs]).toEqual(["/zwbeter-worden/voeding"]);
    expect(parseMemberHidden(null).modules.size).toBe(0);
  });

  it("verbergt een pad van een verborgen module of onderdeel, met wat eronder valt", () => {
    const hidden = parseMemberHidden(["omnium", "/zwbeter-worden/voeding"]);
    expect(hiddenByMember("/omnium", hidden)).toBe(true);
    expect(hiddenByMember("/zwbeter-worden/voeding/recepten", hidden)).toBe(true);
    expect(hiddenByMember("/zwbeter-worden/schema", hidden)).toBe(false);
    expect(hiddenByMember("/kalender", hidden)).toBe(false);
  });

  it("verbergt heel ZWBeter als het lid de module verbergt", () => {
    const hidden = parseMemberHidden(["training"]);
    expect(hiddenByMember("/zwbeter-worden", hidden)).toBe(true);
    expect(hiddenByMember("/zwbeter-worden/schema", hidden)).toBe(true);
  });
});

describe("meldingen", () => {
  it("koppelt alleen bestaande modules aan een melding", () => {
    for (const key of Object.values(TRIGGER_MODULE)) expect(MODULE_KEYS).toContain(key);
  });
});

/** Een nep-client: club_modules en community_role_permissions apart, telt de vragen. */
function fakeClient(roleRows: unknown[]) {
  const calls: string[] = [];
  const client = {
    from: (table: string) => {
      calls.push(table);
      const result =
        table === "club_modules"
          ? { data: [], error: null }
          : { data: roleRows, error: null };
      const builder = {
        select: () => (table === "club_modules" ? builder : Promise.resolve(result)),
        eq: () => Promise.resolve(result),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const request = (path: string) => new NextRequest(new URL(`https://club.test${path}`));
const ROWS = [{ role: "community_member", blocked_modules: ["omnium"] }];

describe("poort per ledengroep", () => {
  beforeEach(() => resetModuleGateCache());

  it("sluit een dichte module af voor het lid", async () => {
    const { client } = fakeClient(ROWS);
    const res = await moduleGateResponse(request("/omnium"), client, {
      isAdmin: false,
      roles: ["community_member"],
    });
    expect(res?.headers.get("x-middleware-rewrite")).toContain("/_module-uit");
    const api = await moduleGateResponse(request("/api/zwblokken/iets"), client, {
      isAdmin: false,
      roles: ["community_member"],
    });
    expect(api).toBeNull();
  });

  it("laat een beheerder en een lid met een open groep door", async () => {
    const { client, calls } = fakeClient(ROWS);
    expect(
      await moduleGateResponse(request("/omnium"), client, { isAdmin: true, roles: ["community_member"] }),
    ).toBeNull();
    expect(calls).not.toContain("community_role_permissions");
    expect(
      await moduleGateResponse(request("/omnium"), client, {
        isAdmin: false,
        roles: ["community_member", "paying_member"],
      }),
    ).toBeNull();
  });

  it("laat een cronjob zonder lid gewoon draaien", async () => {
    const { client } = fakeClient([{ role: "community_member", blocked_modules: ["src"] }]);
    expect(await moduleGateResponse(request("/api/src/sync"), client)).toBeNull();
  });

  it("vraagt niets voor de kern", async () => {
    const { client, calls } = fakeClient(ROWS);
    expect(
      await moduleGateResponse(request("/kalender"), client, { isAdmin: false, roles: null }),
    ).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("migratie 0336", () => {
  let db: PGlite;
  const sql = readFileSync(join(ROOT, "supabase", "migrations", "0336_module_access.sql"), "utf8");

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create table public.community_role_permissions(role text primary key, permissions text[] not null default '{}');",
        "insert into public.community_role_permissions(role) values ('community_member');",
        "create table public.profile_stats_tiles(profile_id uuid primary key, dashboard_hidden jsonb not null default '[]');",
      ].join("\n"),
    );
    await db.exec(sql);
  });

  afterAll(async () => {
    await db.close();
  });

  it("zet alles open en niets verborgen", async () => {
    const { rows } = await db.query<{ blocked_modules: string[] }>(
      "select blocked_modules from community_role_permissions",
    );
    expect(rows).toEqual([{ blocked_modules: [] }]);
    await db.exec("insert into profile_stats_tiles(profile_id) values ('00000000-0000-0000-0000-000000000001')");
    const tiles = await db.query<{ module_hidden: unknown }>("select module_hidden from profile_stats_tiles");
    expect(tiles.rows).toEqual([{ module_hidden: [] }]);
  });

  it("weigert iets anders dan een lijst als verborgen onderdelen", async () => {
    await expect(
      db.exec(`update profile_stats_tiles set module_hidden = '{"a":1}'::jsonb`),
    ).rejects.toThrow();
  });

  it("is opnieuw uit te voeren", async () => {
    await db.exec(sql);
  });
});
