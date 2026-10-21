import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { FUEL_DAY_TYPES } from "@/lib/nutrition/day-type";
import { portionFit, rankRecipes } from "@/lib/nutrition/menu";
import type { Recipe } from "@/lib/nutrition/recipes";
import { MEAL_MOMENTS } from "@/lib/nutrition/targets";

// 0168, 0169, 0213, 0214, 0259, 0261 en 0264 tegen een geïsoleerde PostgreSQL. Zegt niets over de
// productiedatabase zelf; daar worden migraties met de hand toegepast.

let db: PGlite;
const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

const APPROVED = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const PENDING = "00000000-0000-0000-0000-000000000003";
// Mag schema's maken, en dus gedeelde recepten beoordelen.
const REVIEWER = "00000000-0000-0000-0000-000000000004";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create table profiles(id uuid primary key, is_approved boolean);",
      `create function current_user_has_permission(text) returns boolean language sql stable security definer as $$ select auth.uid() = '${REVIEWER}' $$;`,
      "create function touch_training_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;",
      `insert into profiles values ('${APPROVED}', true), ('${OTHER}', true), ('${PENDING}', false), ('${REVIEWER}', true);`,
    ].join("\n"),
  );
  await db.exec(await migration("0168_nutrition.sql"));
  await db.exec(await migration("0169_nutrition_seed.sql"));
  await db.exec(await migration("0213_nutrition_expansion.sql"));
  await db.exec(await migration("0214_nutrition_seed_v2.sql"));
  await db.exec(await migration("0259_nutrition_household.sql"));
  await db.exec(await migration("0261_nutrition_menu_choices.sql"));
  await db.exec(await migration("0264_nutrition_recipe_sharing.sql"));
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

async function count(sql: string, params: unknown[] = []) {
  const { rows } = await db.query<{ count: number }>(sql, params);
  return Number(rows[0].count);
}

describe("voeding (0168, 0169, 0213, 0214)", () => {
  it("laadt heel NEVO en de clubrecepten met hun ingrediënten", async () => {
    expect(await count("select count(*) from nutrition_foods")).toBe(2328);
    expect(await count("select count(*) from nutrition_recipes where is_standard")).toBe(120);
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
    await db.exec(await migration("0213_nutrition_expansion.sql"));
    await db.exec(await migration("0214_nutrition_seed_v2.sql"));
    // 0213 zet de leespolicy en de beoordeelfunctie terug; 0264 vervangt ze weer.
    await db.exec(await migration("0264_nutrition_recipe_sharing.sql"));
    expect(await count("select count(*) from nutrition_foods")).toBe(2328);
    expect(await count("select count(*) from nutrition_recipes where is_standard")).toBe(120);
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
    expect(await as(APPROVED, () => count("select count(*) from nutrition_recipes"))).toBe(120);
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

  it("bewaart het gezin bij de lengte, met grenzen en alleen bekende maaltijden (0259)", async () => {
    const { rows } = await db.query<{ household_adults: number; household_moments: string[] }>(
      `select household_adults, household_moments from nutrition_profiles where profile_id = '${APPROVED}'`,
    );
    expect(rows[0]).toEqual({ household_adults: 0, household_moments: ["diner"] });
    await as(APPROVED, () =>
      db.query(
        `update nutrition_profiles set household_adults = 1, household_children_half = 2, household_moments = array['ontbijt','diner'] where profile_id = '${APPROVED}'`,
      ),
    );
    expect(await as(OTHER, () => count("select count(*) from nutrition_profiles where household_adults > 0"))).toBe(0);
    await expect(
      db.query(`update nutrition_profiles set household_children_full = 11 where profile_id = '${APPROVED}'`),
    ).rejects.toThrow(/household_children_full_check/);
    await expect(
      db.query(`update nutrition_profiles set household_moments = array['voor_rit'] where profile_id = '${APPROVED}'`),
    ).rejects.toThrow(/household_moments_check/);
  });

  it("bewaart zelf gekozen menurecepten alleen voor het lid zelf (0261)", async () => {
    const recipeId = (await db.query<{ id: string }>("select id from nutrition_recipes where slug = 'havermout-banaan-kwark'")).rows[0].id;
    const own = (await db.query<{ id: string }>("select id from nutrition_recipes where slug = 'eigen-1'")).rows[0].id;
    await as(APPROVED, async () => {
      await db.query(
        `insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values('${APPROVED}', '2026-10-21', 'ontbijt', '${recipeId}')`,
      );
      // Eén recept per dag en moment: opnieuw kiezen vervangt.
      await db.query(
        `insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values('${APPROVED}', '2026-10-21', 'ontbijt', '${own}')
         on conflict (profile_id, day, meal_moment) do update set recipe_id = excluded.recipe_id`,
      );
    });
    expect(await as(APPROVED, () => count("select count(*) from nutrition_menu_choices"))).toBe(1);
    expect(await as(OTHER, () => count("select count(*) from nutrition_menu_choices"))).toBe(0);
    // Een ander lid kan het eigen recept van iemand anders niet in zijn menu zetten, en niet voor een ander kiezen.
    await expect(
      as(OTHER, () =>
        db.query(`insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values('${OTHER}', '2026-10-21', 'lunch', '${own}')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(OTHER, () =>
        db.query(`insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values('${APPROVED}', '2026-10-21', 'lunch', '${recipeId}')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(`insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values('${APPROVED}', '2026-10-22', 'brunch', '${recipeId}')`),
    ).rejects.toThrow(/nutrition_menu_choices_meal_moment_check/);
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

  it("vult de micronutriënten en de productgroep uit NEVO", async () => {
    const { rows } = await db.query<{ food_group: string; calcium_mg: string; vitamin_d_ug: string }>(
      "select food_group, calcium_mg, vitamin_d_ug from nutrition_foods where nevo_code = 286",
    );
    expect(rows[0].food_group).toBe("Melk en melkproducten");
    expect(Number(rows[0].calcium_mg)).toBeGreaterThan(100);
    expect(await count("select count(*) from nutrition_foods where food_group is null")).toBe(0);
    // Zalm levert EPA en DHA; die staan apart, zoals NEVO ze geeft.
    expect(
      await count("select count(*) from nutrition_foods where nevo_code = 1587 and epa_g > 0 and dha_g > 0"),
    ).toBe(1);
  });

  it("heeft voor elk moment genoeg clubrecepten om af te wisselen", async () => {
    const { rows } = await db.query<{ meal_moment: string; n: number }>(
      "select meal_moment, count(*)::int as n from nutrition_recipes where is_standard group by meal_moment",
    );
    expect(rows).toHaveLength(8);
    for (const row of rows) expect(row.n, row.meal_moment).toBeGreaterThanOrEqual(8);
  });

  it("zet geen dieetlabel op een recept dat er niet aan voldoet", async () => {
    const offenders = (tag: string, where: string) =>
      db.query<{ slug: string }>(
        `select distinct r.slug from nutrition_recipes r
           join nutrition_recipe_ingredients i on i.recipe_id = r.id
           join nutrition_foods f on f.id = i.food_id
          where r.is_standard and '${tag}' = any(r.diet_tags) and (${where})`,
      );
    const meat = "f.food_group in ('Vlees en gevogelte', 'Vis, schaal- en schelpdieren', 'Vleeswaren')";
    const dairy = "f.food_group in ('Melk en melkproducten', 'Kaas')";
    // 443 = honing, 310 = boter, 439 = gelatine, 752 = winegum.
    expect((await offenders("vegetarisch", `${meat} or f.nevo_code in (439, 752)`)).rows).toEqual([]);
    expect(
      (await offenders("vegan", `${meat} or ${dairy} or f.food_group = 'Eieren' or f.nevo_code in (443, 310)`)).rows,
    ).toEqual([]);
    // 5538 is de lactosevrije kwark.
    expect((await offenders("lactosevrij", `(${dairy} and f.nevo_code <> 5538) or f.nevo_code = 310`)).rows).toEqual(
      [],
    );
    expect((await offenders("glutenvrij", "f.food_group in ('Brood', 'Gebak en koek') and f.nevo_code <> 1481")).rows).toEqual(
      [],
    );
  });

  it("vermeldt bij een externe bron altijd een naam en een https-adres", async () => {
    expect(await count("select count(*) from nutrition_recipes where source_name is not null")).toBeGreaterThan(15);
    await expect(
      db.query("update nutrition_recipes set source_url = 'https://voorbeeld.nl', source_name = null where slug = 'dadelrepen'"),
    ).rejects.toThrow(/nutrition_recipes_source_check/);
    await expect(
      db.query("update nutrition_recipes set source_url = 'http://voorbeeld.nl', source_name = 'X' where slug = 'dadelrepen'"),
    ).rejects.toThrow(/nutrition_recipes_source_check/);
  });

  it("houdt een voorkeur per recept privé", async () => {
    const { rows } = await db.query<{ id: string }>("select id from nutrition_recipes where slug = 'dadelrepen'");
    const recipeId = rows[0].id;
    await as(APPROVED, () =>
      db.query(`insert into nutrition_recipe_prefs(profile_id, recipe_id, pref) values('${APPROVED}', $1, 'favoriet')`, [
        recipeId,
      ]),
    );
    expect(await as(APPROVED, () => count("select count(*) from nutrition_recipe_prefs"))).toBe(1);
    expect(await as(OTHER, () => count("select count(*) from nutrition_recipe_prefs"))).toBe(0);
    await expect(
      as(OTHER, () =>
        db.query(`insert into nutrition_recipe_prefs(profile_id, recipe_id, pref) values('${APPROVED}', $1, 'verborgen')`, [
          recipeId,
        ]),
      ),
    ).rejects.toThrow(/row-level security|duplicate key/);
    await expect(
      db.query(`insert into nutrition_recipe_prefs(profile_id, recipe_id, pref) values('${OTHER}', $1, 'lekker')`, [recipeId]),
    ).rejects.toThrow(/nutrition_recipe_prefs_pref_check/);
  });

  it("laat een gedeeld recept alleen door een beoordelaar clubrecept worden", async () => {
    await as(APPROVED, () =>
      db.query(
        `insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,owner_id,is_standard) values('eigen-deel','Gedeeld','lunch','gemengd','${APPROVED}',false)`,
      ),
    );
    const visible = (user: string) =>
      as(user, () => count("select count(*) from nutrition_recipes where slug = 'eigen-deel'"));

    // Niet gedeeld: ook de beoordelaar ziet het niet.
    expect(await visible(REVIEWER)).toBe(0);
    await as(APPROVED, () =>
      db.query("update nutrition_recipes set share_status = 'voorgesteld' where slug = 'eigen-deel'"),
    );
    expect(await visible(REVIEWER)).toBe(1);
    expect(await visible(OTHER)).toBe(0);

    // De maker kan zichzelf niet tot clubrecept maken, en geen naam op een eigen recept zetten.
    await expect(
      as(APPROVED, () =>
        db.query("update nutrition_recipes set is_standard = true, owner_id = null, share_status = null where slug = 'eigen-deel'"),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(APPROVED, () =>
        db.query(`update nutrition_recipes set contributed_by = '${OTHER}' where slug = 'eigen-deel'`),
      ),
    ).rejects.toThrow(/nutrition_recipes_contributed_check/);

    // Een gewoon lid kan niet goedkeuren: niet rechtstreeks en niet via de functie.
    const { rows } = await db.query<{ id: string }>("select id from nutrition_recipes where slug = 'eigen-deel'");
    const recipeId = rows[0].id;
    await as(OTHER, () =>
      db.query("update nutrition_recipes set is_standard = true, owner_id = null, share_status = null where slug = 'eigen-deel'"),
    );
    await expect(
      as(OTHER, () => db.query("select review_shared_nutrition_recipe($1, true, 'gekaapt')", [recipeId])),
    ).rejects.toThrow(/Geen rechten/);
    await expect(
      as(APPROVED, () => db.query("select review_shared_nutrition_recipe($1, true, 'eigen-baas')", [recipeId])),
    ).rejects.toThrow(/Geen rechten/);
    expect(await count("select count(*) from nutrition_recipes where slug = 'eigen-deel' and is_standard")).toBe(0);

    await as(REVIEWER, () => db.query("select review_shared_nutrition_recipe($1, true, 'gedeeld-recept')", [recipeId]));
    expect(await as(OTHER, () => count("select count(*) from nutrition_recipes where slug = 'gedeeld-recept'"))).toBe(1);
    expect(
      await count(
        `select count(*) from nutrition_recipes where slug = 'gedeeld-recept' and is_standard and owner_id is null and share_status is null and contributed_by = '${APPROVED}'`,
      ),
    ).toBe(1);
    // Een tweede keer beoordelen doet niets meer.
    const again = await as(REVIEWER, () =>
      db.query<{ done: boolean }>("select review_shared_nutrition_recipe($1, false) as done", [recipeId]),
    );
    expect(again.rows[0].done).toBe(false);
    await db.query("delete from nutrition_recipes where slug = 'gedeeld-recept'");
  });

  it("laat een beoordelaar een voorstel afwijzen zonder het recept over te nemen", async () => {
    await as(OTHER, () =>
      db.query(
        `insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,owner_id,is_standard,share_status) values('eigen-nee','Nee','lunch','gemengd','${OTHER}',false,'voorgesteld')`,
      ),
    );
    const { rows: target } = await db.query<{ id: string }>("select id from nutrition_recipes where slug = 'eigen-nee'");
    await as(REVIEWER, () => db.query("select review_shared_nutrition_recipe($1, false)", [target[0].id]));
    const { rows } = await db.query<{ share_status: string; owner_id: string }>(
      "select share_status, owner_id from nutrition_recipes where slug = 'eigen-nee'",
    );
    expect(rows[0]).toEqual({ share_status: "afgewezen", owner_id: OTHER });
    expect(await as(REVIEWER, () => count("select count(*) from nutrition_recipes where slug = 'eigen-nee'"))).toBe(0);
    await db.query("delete from nutrition_recipes where slug = 'eigen-nee'");
  });

  it("heeft voor elke renner, dag en elk moment een clubrecept dat het doel haalt", async () => {
    const { rows } = await db.query<{ recipe: Recipe }>(
      `select jsonb_build_object(
         'id', r.id, 'slug', r.slug, 'title', r.title, 'meal_moment', r.meal_moment,
         'fuel_profile', r.fuel_profile, 'diet_tags', to_jsonb(r.diet_tags), 'servings', r.servings,
         'prep_minutes', r.prep_minutes, 'steps_md', r.steps_md, 'is_standard', r.is_standard, 'owner_id', r.owner_id,
         'source_name', r.source_name, 'source_url', r.source_url, 'share_status', r.share_status, 'contributor', null,
         'ingredients', (
           select jsonb_agg(jsonb_build_object('id', i.id, 'sort_order', i.sort_order, 'grams', i.grams::float8,
                    'role', i.role, 'food', to_jsonb(f)) order by i.sort_order)
             from nutrition_recipe_ingredients i join nutrition_foods f on f.id = i.food_id
            where i.recipe_id = r.id)
       ) as recipe
       from nutrition_recipes r where r.is_standard`,
    );
    const recipes = rows.map((row) => row.recipe);
    expect(recipes).toHaveLength(120);

    const misses: string[] = [];
    for (const weightKg of [55, 70, 90]) {
      for (const dayType of FUEL_DAY_TYPES) {
        for (const moment of MEAL_MOMENTS) {
          const rider = { weightKg, energyFactor: weightKg / 70, dayType, rideMinutes: dayType === "lang" ? 240 : 90 };
          const [best] = rankRecipes(recipes, moment, {
            rider,
            dayType,
            tomorrowType: "rust",
            today: "2026-10-05",
            prefs: new Map(),
            diet: null,
          });
          const fit = portionFit(best.recipe, best.portion, rider);
          if (fit < 0.85) misses.push(`${weightKg} kg ${dayType} ${moment}: ${best.recipe.slug} ${fit.toFixed(2)}`);
        }
      }
    }
    expect(misses).toEqual([]);
  });
});

describe("recepten delen met alle leden (0264)", () => {
  async function ownRecipe(slug: string, owner: string) {
    const food = (await db.query<{ id: string }>("select id from nutrition_foods order by nevo_code limit 1")).rows[0].id;
    await as(owner, async () => {
      await db.query(
        "insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,owner_id,is_standard) values($1,'Van een link','diner','gemengd',$2,false)",
        [slug, owner],
      );
      await db.query(
        "insert into nutrition_recipe_ingredients(recipe_id, food_id, sort_order, grams, role) select id, $2, 0, 100, 'vast' from nutrition_recipes where slug = $1",
        [slug, food],
      );
    });
    return (await db.query<{ id: string }>("select id from nutrition_recipes where slug = $1", [slug])).rows[0].id;
  }
  const sees = (user: string, slug: string) =>
    as(user, () => count("select count(*) from nutrition_recipes where slug = $1", [slug]));
  const seesIngredients = (user: string, slug: string) =>
    as(user, () =>
      count(
        "select count(*) from nutrition_recipe_ingredients i join nutrition_recipes r on r.id = i.recipe_id where r.slug = $1",
        [slug],
      ),
    );

  it("is standaard privé en bestaande recepten blijven privé", async () => {
    expect(await count("select count(*) from nutrition_recipes where visibility <> 'prive' or show_owner")).toBe(0);
    await ownRecipe("link-prive", APPROVED);
    expect(await sees(OTHER, "link-prive")).toBe(0);
    expect(await seesIngredients(OTHER, "link-prive")).toBe(0);
  });

  it("laat goedgekeurde leden een gedeeld recept met ingrediënten zien, en wie wacht niet", async () => {
    await ownRecipe("link-leden", APPROVED);
    await as(APPROVED, () =>
      db.query(
        "update nutrition_recipes set visibility = 'leden', show_owner = true, image_url = 'https://site.nl/foto.jpg', source_name = 'Site', source_url = 'https://site.nl/r' where slug = 'link-leden'",
      ),
    );
    expect(await sees(OTHER, "link-leden")).toBe(1);
    expect(await seesIngredients(OTHER, "link-leden")).toBe(1);
    expect(await sees(PENDING, "link-leden")).toBe(0);
    expect(await seesIngredients(PENDING, "link-leden")).toBe(0);

    // Een ander lid kan het niet wijzigen of verwijderen.
    await as(OTHER, async () => {
      await db.query("update nutrition_recipes set title = 'Gekaapt', visibility = 'prive' where slug = 'link-leden'");
      await db.query(
        "delete from nutrition_recipe_ingredients i using nutrition_recipes r where r.id = i.recipe_id and r.slug = 'link-leden'",
      );
      await db.query("delete from nutrition_recipes where slug = 'link-leden'");
    });
    expect(
      await count(
        "select count(*) from nutrition_recipes where slug = 'link-leden' and title = 'Van een link' and visibility = 'leden'",
      ),
    ).toBe(1);
    expect(await seesIngredients(APPROVED, "link-leden")).toBe(1);

    // Terug naar privé: weg voor de anderen.
    await as(APPROVED, () =>
      db.query("update nutrition_recipes set visibility = 'prive', show_owner = false where slug = 'link-leden'"),
    );
    expect(await sees(OTHER, "link-leden")).toBe(0);
  });

  it("laat een ander lid een gedeeld recept in zijn menu zetten en als favoriet markeren", async () => {
    const id = await ownRecipe("link-menu", APPROVED);
    const choose =
      "insert into nutrition_menu_choices(profile_id, day, meal_moment, recipe_id) values($1, '2026-10-23', 'diner', $2)";
    await expect(as(OTHER, () => db.query(choose, [OTHER, id]))).rejects.toThrow(/row-level security/);
    await as(APPROVED, () => db.query("update nutrition_recipes set visibility = 'leden' where slug = 'link-menu'"));
    await as(OTHER, async () => {
      await db.query(choose, [OTHER, id]);
      await db.query("insert into nutrition_recipe_prefs(profile_id, recipe_id, pref) values($1, $2, 'favoriet')", [
        OTHER,
        id,
      ]);
    });
    expect(await as(OTHER, () => count("select count(*) from nutrition_menu_choices where recipe_id = $1", [id]))).toBe(1);
    // De maker ziet de keuze en voorkeur van een ander niet.
    expect(await as(APPROVED, () => count("select count(*) from nutrition_menu_choices where recipe_id = $1", [id]))).toBe(0);
    expect(await as(APPROVED, () => count("select count(*) from nutrition_recipe_prefs where recipe_id = $1", [id]))).toBe(0);
  });

  it("houdt onmogelijke combinaties tegen", async () => {
    await expect(db.query("update nutrition_recipes set show_owner = true where slug = 'link-prive'")).rejects.toThrow(
      /nutrition_recipes_show_owner_check/,
    );
    await expect(
      db.query("update nutrition_recipes set image_url = 'http://site.nl/foto.jpg' where slug = 'link-prive'"),
    ).rejects.toThrow(/nutrition_recipes_image_check/);
    await expect(
      db.query("update nutrition_recipes set visibility = 'iedereen' where slug = 'link-prive'"),
    ).rejects.toThrow(/nutrition_recipes_visibility_check/);
    await expect(
      db.query("update nutrition_recipes set visibility = 'leden' where slug = 'havermout-banaan-kwark'"),
    ).rejects.toThrow(/nutrition_recipes_visibility_check/);
  });

  it("maakt van een goedgekeurd, gedeeld voorstel een gewoon clubrecept", async () => {
    const id = await ownRecipe("link-club", OTHER);
    await as(OTHER, () =>
      db.query(
        "update nutrition_recipes set visibility = 'leden', show_owner = true, share_status = 'voorgesteld' where slug = 'link-club'",
      ),
    );
    await as(REVIEWER, () => db.query("select review_shared_nutrition_recipe($1, true, 'link-club-recept')", [id]));
    expect(
      await count(
        "select count(*) from nutrition_recipes where id = $1 and is_standard and visibility = 'prive' and not show_owner and contributed_by = $2",
        [id, OTHER],
      ),
    ).toBe(1);
    expect(await sees(APPROVED, "link-club-recept")).toBe(1);
    await db.query("delete from nutrition_recipes where id = $1", [id]);
  });
});
