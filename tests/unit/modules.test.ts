import { readFileSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  MODULES,
  MODULE_KEYS,
  dependentsOf,
  isModuleCron,
  moduleForPath,
  pathAllowed,
  resolveDisabled,
} from "@/lib/modules";
import { moduleGateResponse, resetModuleGateCache } from "@/lib/modules-gate";
import { ADMIN_AREAS } from "@/lib/admin-areas";
import {
  AVATAR_NAV,
  NAV_GROUPS,
  beheerCategoriesFor,
  filterNavForPermissions,
  navHrefs,
} from "@/app/(app)/_components/nav-config";

// Fase 1 van de generieke versie (docs/multi-club-ontwerp.md): het register van
// de modules, de poort in de middleware en de migratie 0313.

const ROOT = join(__dirname, "..", "..");
const APP_DIR = join(ROOT, "src", "app");

/** Alle routes uit de mappen: groepen weg, [param] wordt *. */
function routePaths(dir: string): string[] {
  const found: string[] = [];
  const entries = readdirSync(dir);
  if (entries.some((e) => e === "page.tsx" || e === "route.ts")) {
    const url = relative(APP_DIR, dir)
      .split(sep)
      .filter((part) => part && !(part.startsWith("(") && part.endsWith(")")))
      .map((part) => (part.startsWith("[") ? "*" : part));
    found.push(`/${url.join("/")}`);
  }
  for (const entry of entries) {
    if (entry.startsWith("_") || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...routePaths(full));
  }
  return found;
}

const ROUTES = routePaths(APP_DIR);

/** Bestaat er een route onder dit patroon? */
function patternHasRoute(pattern: string): boolean {
  const want = pattern.split("/").filter(Boolean);
  return ROUTES.some((route) => {
    const got = route.split("/").filter(Boolean);
    return got.length >= want.length && want.every((part, i) => part === "*" || part === got[i]);
  });
}

const PUBLIC_PATHS = (() => {
  const source = readFileSync(join(ROOT, "src", "lib", "supabase", "middleware.ts"), "utf8");
  const block = source.match(/const PUBLIC_PATHS = \[([\s\S]*?)\];/);
  if (!block) throw new Error("PUBLIC_PATHS niet gevonden in middleware.ts");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
})();

describe("moduleregister", () => {
  it("heeft unieke sleutels", () => {
    expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length);
  });

  it("wijst alleen naar paden die bestaan", () => {
    for (const m of MODULES) {
      for (const pattern of m.paths) expect(patternHasRoute(pattern), `${m.key}: ${pattern}`).toBe(true);
    }
  });

  it("noemt alleen crons die bestaan, publiek zijn en bij de eigen module horen", () => {
    for (const m of MODULES) {
      for (const cron of m.crons ?? []) {
        expect(ROUTES, `${m.key}: ${cron}`).toContain(cron);
        expect(PUBLIC_PATHS.some((p) => cron.startsWith(p)), `${cron} niet publiek`).toBe(true);
        expect(moduleForPath(cron)).toBe(m.key);
        expect(isModuleCron(m.key, cron)).toBe(true);
      }
    }
  });

  it("vereist alleen bestaande modules, zonder kring", () => {
    for (const m of MODULES) {
      for (const dep of m.requires ?? []) {
        expect(MODULE_KEYS).toContain(dep);
        expect(dependentsOf(m.key)).not.toContain(dep);
      }
    }
  });

  it("kiest het meest specifieke patroon", () => {
    expect(moduleForPath("/zwbeter-worden/schema")).toBe("training");
    expect(moduleForPath("/zwbeter-worden/briljant")).toBe("rennersniveau");
    expect(moduleForPath("/stats/zwbriljant")).toBe("rennersniveau");
    expect(moduleForPath("/stats/rankings")).toBe("stats");
    expect(moduleForPath("/live/abc")).toBe("samen_fietsen");
    expect(moduleForPath("/live/zrl/abc")).toBe("live_race");
    expect(moduleForPath("/api/live/zrl/abc")).toBe("live_race");
    expect(moduleForPath("/api/live/cleanup")).toBe("samen_fietsen");
    expect(moduleForPath("/events/abc/pacing")).toBe("pacing");
    expect(moduleForPath("/profiel/segments/collecties")).toBe("segmenten");
    expect(moduleForPath("/beheer/zrl/teams")).toBe("teams");
    expect(moduleForPath("/zwbgame/beheer")).toBe("managerspel");
    expect(moduleForPath("/omnium/rules?x=1")).toBe("omnium");
  });

  it("laat de kern altijd staan", () => {
    for (const path of [
      "/dashboard",
      "/club",
      "/leden",
      "/profiel",
      "/kalender",
      "/events/abc",
      "/hulp",
      "/beheer",
      "/beheer/rechten",
      "/beheer/modules",
      "/beheer/strava",
      "/login",
      "/api/strava/sync",
      "/api/intervals/rides/sync",
      // Een segment dat met een modulenaam begint, is die module niet.
      "/srcx",
    ]) {
      expect(moduleForPath(path), path).toBeNull();
    }
  });

  it("zet modules uit die een uitgeschakelde module vereisen", () => {
    const off = resolveDisabled(["teams", "bestaat-niet"]);
    expect([...off].sort()).toEqual(["live_race", "managerspel", "teams"]);
    expect(dependentsOf("teams").sort()).toEqual(["live_race", "managerspel"]);
    expect(pathAllowed("/ds/abc", off)).toBe(false);
    expect(pathAllowed("/dashboard", off)).toBe(true);
  });

  it("kent elk beheergebied een module of de kern toe die bestaat", () => {
    for (const area of Object.values(ADMIN_AREAS)) {
      const key = moduleForPath(area.href);
      if (key !== null) expect(MODULE_KEYS).toContain(key);
    }
    expect(moduleForPath(ADMIN_AREAS.modules.href)).toBeNull();
  });
});

describe("menu en beheer", () => {
  const allowsWithout = (off: string[]) => (href: string) =>
    pathAllowed(href, resolveDisabled(off));

  it("haalt items van uitgeschakelde modules uit het menu", () => {
    const nodes = filterNavForPermissions(NAV_GROUPS, () => true, null, allowsWithout(["teams", "training"]));
    const hrefs = navHrefs(nodes);
    expect(hrefs).not.toContain("/teams");
    expect(hrefs).not.toContain("/zwbgame");
    expect(hrefs.some((href) => href.startsWith("/zwbeter-worden"))).toBe(false);
    expect(hrefs).toContain("/leden");
    expect(nodes.some((node) => node.type === "group" && node.label === "ZWBeter Worden")).toBe(false);
  });

  it("laat alles staan zonder uitgeschakelde modules", () => {
    const all = navHrefs(filterNavForPermissions(NAV_GROUPS, () => true));
    expect(navHrefs(filterNavForPermissions(NAV_GROUPS, () => true, null, allowsWithout([])))).toEqual(all);
  });

  it("haalt beheergebieden van uitgeschakelde modules weg", () => {
    const hrefs = beheerCategoriesFor(() => true, allowsWithout(["src", "omnium"])).flatMap((c) =>
      c.items.map((item) => item.href),
    );
    expect(hrefs).not.toContain("/beheer/src");
    expect(hrefs).not.toContain("/beheer/omnium");
    expect(hrefs).toContain("/beheer/zrl");
    expect(hrefs).toContain("/beheer/modules");
  });

  it("filtert de persoonlijke links", () => {
    const allows = allowsWithout(["garage"]);
    expect(AVATAR_NAV.filter((item) => allows(item.href)).map((item) => item.href)).not.toContain(
      "/mijn-garage",
    );
  });
});

/** Een nep-client: geeft de uitgeschakelde modules terug, telt de vragen. */
function fakeClient(result: { data: { module_key: string }[] | null; error: unknown }) {
  const calls = { count: 0 };
  const builder = {
    select: () => builder,
    eq: () => {
      calls.count += 1;
      return Promise.resolve(result);
    },
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, calls };
}

const request = (path: string) => new NextRequest(new URL(`https://club.test${path}`));

describe("poort in de middleware", () => {
  beforeEach(() => resetModuleGateCache());

  it("vraagt niets voor de kern", async () => {
    const { client, calls } = fakeClient({ data: [{ module_key: "teams" }], error: null });
    expect(await moduleGateResponse(request("/dashboard"), client)).toBeNull();
    expect(calls.count).toBe(0);
  });

  it("laat een module die aan staat door", async () => {
    const { client } = fakeClient({ data: [{ module_key: "src" }], error: null });
    expect(await moduleGateResponse(request("/teams"), client)).toBeNull();
  });

  it("geeft een pagina van een uitgeschakelde module een 404-pagina", async () => {
    const { client } = fakeClient({ data: [{ module_key: "teams" }], error: null });
    const res = await moduleGateResponse(request("/zwbgame"), client);
    expect(res?.headers.get("x-middleware-rewrite")).toContain("/_module-uit");
  });

  it("geeft een API-route een 404 en een cron een lege 200", async () => {
    const { client } = fakeClient({ data: [{ module_key: "src" }], error: null });
    const api = await moduleGateResponse(request("/api/src/iets"), client);
    expect(api?.status).toBe(404);
    const cron = await moduleGateResponse(request("/api/src/sync"), client);
    expect(cron?.status).toBe(200);
    expect(await cron?.json()).toMatchObject({ ok: true, module: "src" });
  });

  it("onthoudt de stand een minuut", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await moduleGateResponse(request("/teams"), client);
    await moduleGateResponse(request("/src"), client);
    expect(calls.count).toBe(1);
  });

  it("faalt open als lezen niet lukt, en probeert het daarna opnieuw", async () => {
    const { client, calls } = fakeClient({ data: null, error: { message: "relation does not exist" } });
    expect(await moduleGateResponse(request("/teams"), client)).toBeNull();
    expect(await moduleGateResponse(request("/teams"), client)).toBeNull();
    expect(calls.count).toBe(2);
  });
});

describe("migratie 0313", () => {
  let db: PGlite;
  const sql = readFileSync(join(ROOT, "supabase", "migrations", "0313_club_settings.sql"), "utf8");

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create role anon; create role authenticated; create role service_role;",
        "create table public.profiles(id uuid primary key);",
        "grant usage on schema public to anon, authenticated;",
      ].join("\n"),
    );
    await db.exec(sql);
  });

  afterAll(async () => {
    await db.close();
  });

  it("zet ZWB neer met alle modules aan", async () => {
    const { rows } = await db.query<{ name: string; short_name: string }>(
      "select name, short_name from club_settings",
    );
    expect(rows).toEqual([{ name: "ZWB Cycling", short_name: "ZWB" }]);
    const mods = await db.query<{ module_key: string; enabled: boolean }>(
      "select module_key, enabled from club_modules",
    );
    expect(mods.rows.length).toBeGreaterThan(0);
    for (const row of mods.rows) {
      expect(MODULE_KEYS).toContain(row.module_key);
      expect(row.enabled).toBe(true);
    }
  });

  it("kan maar één rij clubinstellingen hebben", async () => {
    await expect(
      db.exec("insert into club_settings (id, name, short_name) values (false, 'X', 'X')"),
    ).rejects.toThrow();
  });

  it("is opnieuw uit te voeren", async () => {
    await db.exec(sql);
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from club_settings");
    expect(rows[0].n).toBe(1);
  });

  it("laat anon lezen maar niet schrijven", async () => {
    await db.exec("set role anon");
    try {
      const { rows } = await db.query("select name from club_settings");
      expect(rows).toHaveLength(1);
      await expect(
        db.exec("update club_modules set enabled = false where module_key = 'training'"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });

  it("laat een ingelogd lid niet schrijven", async () => {
    await db.exec("set role authenticated");
    try {
      await expect(
        db.exec("insert into club_modules (module_key, enabled) values ('teams', false)"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });

  it("noemt alleen modules die de code kent", async () => {
    const keys = [...(await readFile(join(ROOT, "supabase", "migrations", "0313_club_settings.sql"), "utf8"))
      .matchAll(/\('([a-z_]+)', true, '/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(MODULE_KEYS).toContain(key);
  });
});
