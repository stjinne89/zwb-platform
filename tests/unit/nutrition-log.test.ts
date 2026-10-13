import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  LOG_CONSENT_VERSION,
  dayTotals,
  floorStatus,
  mealMacros,
  mealsByMoment,
  parseLogDay,
  repeatableMeals,
  type LoggedMeal,
} from "@/lib/nutrition/log";

const rice = { id: "rijst", name_nl: "Rijst witte gekookt", quantity_unit: "g" as const, carbs_g: 28, protein_g: 2.5 };
const chicken = { id: "kip", name_nl: "Kipfilet bereid", quantity_unit: "g" as const, carbs_g: 0, protein_g: 30 };
const unknown = { id: "x", name_nl: "Onbekend", quantity_unit: "g" as const, carbs_g: null, protein_g: 5 };

function meal(patch: Partial<LoggedMeal> = {}): LoggedMeal {
  return {
    id: "m1",
    eatenOn: "2026-10-14",
    moment: "diner",
    source: "handmatig",
    recipeId: null,
    title: "Rijst met kip",
    items: [
      { food: rice, grams: 250 },
      { food: chicken, grams: 120 },
    ],
    ...patch,
  };
}

describe("eetdagboek, rekenwerk", () => {
  it("telt koolhydraten en eiwit uit NEVO-waarden en grammen", () => {
    expect(mealMacros(meal())).toEqual({ carbsG: 70, proteinG: 42.3, incomplete: false });
  });

  it("geeft alleen koolhydraten en eiwit terug, geen vet of kcal", () => {
    expect(Object.keys(mealMacros(meal())).sort()).toEqual(["carbsG", "incomplete", "proteinG"]);
  });

  it("markeert het totaal als ondergrens als een NEVO-waarde ontbreekt", () => {
    const totals = dayTotals([meal(), meal({ id: "m2", items: [{ food: unknown, grams: 100 }] })]);
    expect(totals).toEqual({ carbsG: 70, proteinG: 47.3, incomplete: true });
  });

  it("groepeert per moment in de volgorde van de dag", () => {
    const groups = mealsByMoment([meal(), meal({ id: "m2", moment: "ontbijt" }), meal({ id: "m3" })]);
    expect(groups.map((group) => [group.moment, group.meals.length])).toEqual([
      ["ontbijt", 1],
      ["diner", 2],
    ]);
    expect(groups[1].total.carbsG).toBe(140);
  });
});

describe("eetdagboek, ondergrens", () => {
  it("rekent tegen de onderkant van de band", () => {
    expect(floorStatus(140, { min: 350, max: 490 })).toEqual({
      eatenG: 140,
      floorG: 350,
      remainingG: 210,
      progress: 0.4,
      reached: false,
    });
  });

  it("kent geen te veel: ver boven de band is gewoon gehaald", () => {
    const status = floorStatus(900, { min: 350, max: 490 });
    expect(status.reached).toBe(true);
    expect(status.remainingG).toBe(0);
    expect(status.progress).toBe(1);
  });

  it("toont zonder gewicht alleen wat er gegeten is", () => {
    expect(floorStatus(80, null)).toEqual({ eatenG: 80, floorG: null, remainingG: 0, progress: 0, reached: false });
  });
});

describe("eetdagboek, dagen en herhalen", () => {
  it("laat alleen vandaag en de zeven dagen ervoor toe", () => {
    expect(parseLogDay("2026-10-10", "2026-10-14")).toBe("2026-10-10");
    expect(parseLogDay("2026-10-07", "2026-10-14")).toBe("2026-10-07");
    expect(parseLogDay("2026-10-06", "2026-10-14")).toBe("2026-10-14");
    expect(parseLogDay("2026-10-15", "2026-10-14")).toBe("2026-10-14");
    expect(parseLogDay("gisteren", "2026-10-14")).toBe("2026-10-14");
    expect(parseLogDay(undefined, "2026-10-14")).toBe("2026-10-14");
  });

  it("biedt elke samenstelling één keer aan, de laatste eerst", () => {
    const repeats = repeatableMeals([
      meal({ id: "nieuw" }),
      meal({ id: "oud", eatenOn: "2026-10-12" }),
      meal({ id: "anders", items: [{ food: rice, grams: 300 }] }),
      meal({ id: "leeg", title: "Leeg", items: [] }),
    ]);
    expect(repeats.map((item) => item.id)).toEqual(["nieuw", "anders"]);
  });
});

// 0231 tegen een geïsoleerde PostgreSQL, zonder de NEVO-seed: één product is
// genoeg. Zegt niets over de productiedatabase; daar gaat de migratie met de hand.
describe("eetdagboek, migratie 0231", () => {
  let db: PGlite;
  const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

  const MEMBER = "00000000-0000-0000-0000-000000000001";
  const OTHER = "00000000-0000-0000-0000-000000000002";
  const FOOD = "00000000-0000-0000-0000-0000000000f1";

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create role anon; create role authenticated; create role service_role;",
        "create schema auth;",
        "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
        "create table profiles(id uuid primary key, is_approved boolean);",
        "create function current_user_has_permission(text) returns boolean language sql stable as $$ select false $$;",
        "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
        `insert into profiles values ('${MEMBER}', true), ('${OTHER}', true);`,
      ].join("\n"),
    );
    await db.exec(await migration("0168_nutrition.sql"));
    await db.exec(await migration("0213_nutrition_expansion.sql"));
    await db.exec(await migration("0231_nutrition_log.sql"));
    await db.exec(
      `insert into nutrition_foods(id, nevo_code, name_nl, carbs_g, protein_g, nevo_version) values ('${FOOD}', 1, 'Rijst', 28, 2.5, 'test');`,
    );
    await db.exec(
      "grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;",
    );
  }, 120000);

  afterAll(async () => {
    await db?.close();
  });

  async function as<T>(userId: string, run: () => Promise<T>): Promise<T> {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    await db.exec("set role authenticated");
    try {
      return await run();
    } finally {
      await db.exec("reset role");
    }
  }

  async function count(sql: string) {
    const { rows } = await db.query<{ count: number }>(sql);
    return Number(rows[0].count);
  }

  const insertMeal = (profile: string) =>
    db.query<{ id: string }>(
      `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${profile}', '2026-10-14', 'diner', 'handmatig', 'Rijst') returning id`,
    );

  it("laat geen maaltijd toe zonder toestemming", async () => {
    await expect(as(MEMBER, () => insertMeal(MEMBER))).rejects.toThrow(/row-level security|foreign key/);
  });

  it("accepteert alleen de huidige toestemmingstekst", async () => {
    await expect(
      as(MEMBER, () =>
        db.query(`insert into nutrition_log_settings(profile_id, consent_version) values('${MEMBER}', '2020-01-01')`),
      ),
    ).rejects.toThrow(/consent_version/);
    await as(MEMBER, () =>
      db.query(`insert into nutrition_log_settings(profile_id, consent_version) values('${MEMBER}', $1)`, [
        LOG_CONSENT_VERSION,
      ]),
    );
    expect(await as(MEMBER, () => count("select count(*) from nutrition_log_settings"))).toBe(1);
  });

  it("houdt het eetdagboek privé", async () => {
    const { rows } = await as(MEMBER, () => insertMeal(MEMBER));
    await as(MEMBER, () =>
      db.query(`insert into nutrition_log_items(meal_id, food_id, sort_order, grams) values($1, '${FOOD}', 0, 250)`, [
        rows[0].id,
      ]),
    );
    expect(await as(MEMBER, () => count("select count(*) from nutrition_log_items"))).toBe(1);
    expect(await as(OTHER, () => count("select count(*) from nutrition_log_settings"))).toBe(0);
    expect(await as(OTHER, () => count("select count(*) from nutrition_log_meals"))).toBe(0);
    expect(await as(OTHER, () => count("select count(*) from nutrition_log_items"))).toBe(0);
    // Een ander kan er ook niets aan hangen of namens dit lid invoeren.
    await expect(
      as(OTHER, () =>
        db.query(`insert into nutrition_log_items(meal_id, food_id, sort_order, grams) values($1, '${FOOD}', 1, 100)`, [
          rows[0].id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(as(OTHER, () => insertMeal(MEMBER))).rejects.toThrow(/row-level security/);
  });

  it("houdt onbekende waarden tegen", async () => {
    await expect(
      db.query(
        `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${MEMBER}', '2026-10-14', 'diner', 'foto', 'X')`,
      ),
    ).rejects.toThrow(/source_check/);
    await expect(
      db.query(
        `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${MEMBER}', '2026-10-14', 'middernacht', 'handmatig', 'X')`,
      ),
    ).rejects.toThrow(/meal_moment_check/);
  });

  it("laat tijdens een pauze niets toevoegen, wel lezen en verwijderen", async () => {
    await as(MEMBER, () => db.query("update nutrition_log_settings set paused = true"));
    await expect(as(MEMBER, () => insertMeal(MEMBER))).rejects.toThrow(/row-level security/);
    expect(await as(MEMBER, () => count("select count(*) from nutrition_log_meals"))).toBe(1);
    await as(MEMBER, () => db.query("update nutrition_log_settings set paused = false"));
    await as(MEMBER, () => insertMeal(MEMBER));
    expect(await as(MEMBER, () => count("select count(*) from nutrition_log_meals"))).toBe(2);
  });

  it("wist alles als de toestemming wordt ingetrokken", async () => {
    await as(MEMBER, () => db.query("delete from nutrition_log_settings"));
    expect(await count("select count(*) from nutrition_log_settings")).toBe(0);
    expect(await count("select count(*) from nutrition_log_meals")).toBe(0);
    expect(await count("select count(*) from nutrition_log_items")).toBe(0);
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0231_nutrition_log.sql"));
    expect(await count("select count(*) from pg_policies where tablename like 'nutrition_log_%'")).toBe(5);
  });
});
