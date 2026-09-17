import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0168 en 0169 tegen een geïsoleerde PostgreSQL. Zegt niets over de
// productiedatabase zelf; die migraties zijn daar met de hand toegepast.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const APPROVED = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const PENDING = "00000000-0000-0000-0000-000000000003";

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
      `insert into profiles values ('${APPROVED}', true), ('${OTHER}', true), ('${PENDING}', false);`,
    ].join("\n"),
  );
  await db.exec(await migration("0168_nutrition.sql"));
  await db.exec(await migration("0169_nutrition_seed.sql"));
  await db.exec(
    "grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;",
  );
}, 60000);

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

async function count(sql: string, params: unknown[] = []) {
  const { rows } = await db.query<{ count: number }>(sql, params);
  return Number(rows[0].count);
}

describe("voeding (0168 + 0169)", () => {
  it("laadt heel NEVO en de clubrecepten met hun ingrediënten", async () => {
    expect(await count("select count(*) from nutrition_foods")).toBe(2328);
    expect(await count("select count(*) from nutrition_recipes where is_standard")).toBe(24);
    expect(
      await count(
        "select count(*) from nutrition_recipes r where is_standard and not exists (select 1 from nutrition_recipe_ingredients i where i.recipe_id = r.id)",
      ),
    ).toBe(0);
  });

  it("neemt NEVO-waarden ongewijzigd over, lege waarden blijven leeg", async () => {
    const { rows } = await db.query<{ carbs_g: string; protein_g: string; name_nl: string }>(
      "select name_nl, carbs_g, protein_g from nutrition_foods where nevo_code = 213",
    );
    expect(rows[0].name_nl).toBe("Vlokken haver-");
    expect(Number(rows[0].carbs_g)).toBe(59.2);
    expect(Number(rows[0].protein_g)).toBe(12.8);
    expect(await count("select count(*) from nutrition_foods where sodium_mg is null")).toBeGreaterThan(0);
  });

  it("is opnieuw te draaien zonder dubbele rijen", async () => {
    await db.exec(await migration("0168_nutrition.sql"));
    await db.exec(await migration("0169_nutrition_seed.sql"));
    expect(await count("select count(*) from nutrition_foods")).toBe(2328);
    expect(
      await count(
        "select count(*) from nutrition_recipe_ingredients i join nutrition_recipes r on r.id = i.recipe_id where r.slug = 'havermout-banaan-kwark'",
      ),
    ).toBe(5);
  });

  it("houdt onbekende waarden tegen", async () => {
    await expect(
      db.query(
        "insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,is_standard) values('x','X','middernacht','gemengd',true)",
      ),
    ).rejects.toThrow(/nutrition_recipes_meal_moment_check/);
    await expect(
      db.query(
        "insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,diet_tags,is_standard) values('y','Y','lunch','gemengd',array['keto'],true)",
      ),
    ).rejects.toThrow(/nutrition_recipes_diet_tags_check/);
    await expect(
      db.query(`insert into nutrition_profiles(profile_id,height_cm) values('${APPROVED}', 300)`),
    ).rejects.toThrow(/nutrition_profiles_height_cm_check/);
  });

  it("toont clubrecepten alleen aan goedgekeurde leden", async () => {
    expect(await as(APPROVED, () => count("select count(*) from nutrition_recipes"))).toBe(24);
    expect(await as(PENDING, () => count("select count(*) from nutrition_recipes"))).toBe(0);
    expect(await as(PENDING, () => count("select count(*) from nutrition_foods"))).toBe(0);
  });

  it("houdt eigen recepten en de lengte privé", async () => {
    await as(APPROVED, async () => {
      await db.query(
        `insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,owner_id,is_standard) values('eigen-1','Eigen','lunch','gemengd','${APPROVED}',false)`,
      );
      await db.query(`insert into nutrition_profiles(profile_id,height_cm) values('${APPROVED}', 181)`);
    });
    expect(await as(APPROVED, () => count("select count(*) from nutrition_recipes where slug = 'eigen-1'"))).toBe(1);
    expect(await as(OTHER, () => count("select count(*) from nutrition_recipes where slug = 'eigen-1'"))).toBe(0);
    expect(await as(OTHER, () => count("select count(*) from nutrition_profiles"))).toBe(0);
  });

  it("laat een gewoon lid geen clubrecept aanmaken of wijzigen", async () => {
    await expect(
      as(OTHER, () =>
        db.query(
          "insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,is_standard) values('nep','Nep','lunch','gemengd',true)",
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await as(OTHER, () =>
      db.query("update nutrition_recipes set title = 'Gekaapt' where slug = 'havermout-banaan-kwark'"),
    );
    const { rows } = await db.query<{ title: string }>(
      "select title from nutrition_recipes where slug = 'havermout-banaan-kwark'",
    );
    expect(rows[0].title).toBe("Havermout met banaan en kwark");
  });
});
