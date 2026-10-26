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
  rideFueling,
  type LoggedMeal,
} from "@/lib/nutrition/log";
import { normalizeBarcode, parseOffProduct, productLabel } from "@/lib/nutrition/products";

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
      { kind: "nevo", food: rice, grams: 250 },
      { kind: "nevo", food: chicken, grams: 120 },
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
    const totals = dayTotals([meal(), meal({ id: "m2", items: [{ kind: "nevo", food: unknown, grams: 100 }] })]);
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
      meal({ id: "anders", items: [{ kind: "nevo", food: rice, grams: 300 }] }),
      meal({ id: "leeg", title: "Leeg", items: [] }),
    ]);
    expect(repeats.map((item) => item.id)).toEqual(["nieuw", "anders"]);
  });
});

describe("eetdagboek, rond de rit", () => {
  const gel = { id: "8710000000001", name_nl: "Gel", quantity_unit: "g" as const, carbs_g: 50, protein_g: 0 };

  it("rekent wat onderweg is gegeten om naar gram per uur", () => {
    const fueling = rideFueling(
      [meal({ moment: "tijdens_rit", items: [{ kind: "product", food: gel, grams: 360 }] })],
      180,
    );
    expect(fueling).toEqual({ perHourG: 60, floorPerHourG: 60, reached: true, recoveryLogged: false });
  });

  it("ziet een herstelmaaltijd, en telt gewone maaltijden niet als onderweg", () => {
    const fueling = rideFueling([meal(), meal({ id: "m2", moment: "na_rit" })], 90);
    expect(fueling).toEqual({ perHourG: 0, floorPerHourG: 30, reached: false, recoveryLogged: true });
  });

  it("heeft geen doel per uur onder het uur", () => {
    expect(rideFueling([meal()], 45)).toBeNull();
    expect(rideFueling([meal()], null)).toBeNull();
  });
});

describe("barcodeproducten", () => {
  it("herkent een barcode met of zonder spaties", () => {
    expect(normalizeBarcode("8 710400 -000017")).toBe("8710400000017");
    expect(normalizeBarcode("1234567")).toBeNull();
    expect(normalizeBarcode("abc12345678")).toBeNull();
  });

  it("neemt alleen naam, merk, koolhydraten, eiwit en portie over", () => {
    const product = parseOffProduct("8710400000017", {
      status: 1,
      product: {
        product_name: "Energy gel",
        product_name_nl: "Energiegel citroen",
        brands: "Merk, Ander merk",
        nutriments: { carbohydrates_100g: 62.5, proteins_100g: "0", fat_100g: 0, "energy-kcal_100g": 250 },
        serving_quantity: "40",
        serving_quantity_unit: "g",
      },
    });
    expect(product).toEqual({
      barcode: "8710400000017",
      name: "Energiegel citroen",
      brand: "Merk",
      quantity_unit: "g",
      carbs_g: 62.5,
      protein_g: 0,
      serving_g: 40,
    });
    expect(productLabel(product!)).toBe("Energiegel citroen (Merk)");
  });

  it("slaat een product zonder koolhydraten of eiwit over in plaats van te schatten", () => {
    const body = { status: 1, product: { product_name: "Reep", nutriments: { carbohydrates_100g: 60 } } };
    expect(parseOffProduct("87100000", body)).toBeNull();
    expect(parseOffProduct("87100000", { status: 0 })).toBeNull();
    expect(parseOffProduct("87100000", null)).toBeNull();
  });

  it("neemt een drank in ml over", () => {
    const product = parseOffProduct("87100000", {
      product: {
        product_name: "Sportdrank",
        nutriments: { carbohydrates_100g: 6, proteins_100g: 0 },
        serving_quantity: 500,
        serving_quantity_unit: "ml",
      },
    });
    expect(product?.quantity_unit).toBe("ml");
    expect(product?.serving_g).toBe(500);
  });
});

// 0231 en 0233 tot en met 0235 tegen een geïsoleerde PostgreSQL, zonder de NEVO-seed: één
// product is genoeg. Zegt niets over de productiedatabase; daar gaat de migratie met de hand.
describe("eetdagboek, migratie 0231", () => {
  let db: PGlite;
  const migration = (file: string) => readFile(`supabase/migrations/${file}`, "utf8");

  const MEMBER = "00000000-0000-0000-0000-000000000001";
  const OTHER = "00000000-0000-0000-0000-000000000002";
  // De actieve trainer van MEMBER, en een trainer van iemand anders.
  const TRAINER = "00000000-0000-0000-0000-000000000003";
  const STRANGER = "00000000-0000-0000-0000-000000000004";
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
        `insert into profiles values ('${MEMBER}', true), ('${OTHER}', true), ('${TRAINER}', true), ('${STRANGER}', true);`,
        "create table training_coach_assignments(athlete_id uuid, trainer_id uuid, status text);",
        `insert into training_coach_assignments values ('${MEMBER}', '${TRAINER}', 'active'), ('${OTHER}', '${STRANGER}', 'active'), ('${MEMBER}', '${STRANGER}', 'ended');`,
        "create table notification_preferences(profile_id uuid primary key);",
      ].join("\n"),
    );
    await db.exec(await migration("0168_nutrition.sql"));
    await db.exec(await migration("0213_nutrition_expansion.sql"));
    await db.exec(await migration("0231_nutrition_log.sql"));
    await db.exec(await migration("0233_nutrition_log_products.sql"));
    await db.exec(await migration("0234_nutrition_log_recognition.sql"));
    await db.exec(await migration("0235_nutrition_log_trainer_reminders.sql"));
    await db.exec(await migration("0275_nutrition_recipe_products.sql"));
    await db.exec(
      `insert into nutrition_products(barcode, name, carbs_g, protein_g) values ('8710400000017', 'Gel', 62.5, 0);`,
    );
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
        `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${MEMBER}', '2026-10-14', 'diner', 'gok', 'X')`,
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

  it("neemt een barcodeproduct op, maar nooit een regel met twee of geen bronnen", async () => {
    const { rows } = await as(MEMBER, () => insertMeal(MEMBER));
    const meal = rows[0].id;
    await as(MEMBER, () =>
      db.query(
        "insert into nutrition_log_items(meal_id, product_barcode, sort_order, grams) values($1, '8710400000017', 0, 40)",
        [meal],
      ),
    );
    await expect(
      db.query("insert into nutrition_log_items(meal_id, sort_order, grams) values($1, 1, 40)", [meal]),
    ).rejects.toThrow(/one_source_check/);
    await expect(
      db.query(
        `insert into nutrition_log_items(meal_id, food_id, product_barcode, sort_order, grams) values($1, '${FOOD}', '8710400000017', 2, 40)`,
        [meal],
      ),
    ).rejects.toThrow(/one_source_check/);
  });

  it("neemt een barcodeproduct op in een eigen recept, met één bron per ingrediënt (0275)", async () => {
    await db.query("insert into nutrition_products(barcode, name, quantity_unit, carbs_g, protein_g) values ('5000000000017', 'Sportdrank', 'ml', 6, 0)");
    const recipe = await as(MEMBER, async () => {
      const { rows } = await db.query<{ id: string }>(
        `insert into nutrition_recipes(slug,title,meal_moment,fuel_profile,owner_id,is_standard) values('eigen-gel','Gel','tijdens_rit','hoog_kh','${MEMBER}',false) returning id`,
      );
      await db.query(
        "insert into nutrition_recipe_ingredients(recipe_id, product_barcode, sort_order, grams, role) values($1, '5000000000017', 0, 40, 'kh_bron')",
        [rows[0].id],
      );
      return rows[0].id;
    });
    expect(
      await as(MEMBER, () =>
        count("select count(*) from nutrition_recipe_ingredients where food_id is null and product_barcode is not null"),
      ),
    ).toBe(1);
    await expect(
      db.query("insert into nutrition_recipe_ingredients(recipe_id, sort_order, grams, role) values($1, 1, 40, 'vast')", [
        recipe,
      ]),
    ).rejects.toThrow(/nutrition_recipe_ingredients_one_source_check/);
    await expect(
      db.query(
        `insert into nutrition_recipe_ingredients(recipe_id, food_id, product_barcode, sort_order, grams, role) values($1, '${FOOD}', '5000000000017', 2, 40, 'vast')`,
        [recipe],
      ),
    ).rejects.toThrow(/nutrition_recipe_ingredients_one_source_check/);
    // Een product dat in een recept staat, verdwijnt niet onder het recept uit.
    await expect(db.query("delete from nutrition_products where barcode = '5000000000017'")).rejects.toThrow(
      /foreign key/,
    );
    await db.query("delete from nutrition_recipes where id = $1", [recipe]);
    await db.query("delete from nutrition_products where barcode = '5000000000017'");
  });

  it("laat leden producten lezen maar niet zelf toevoegen", async () => {
    expect(await as(OTHER, () => count("select count(*) from nutrition_products"))).toBe(1);
    await expect(
      as(OTHER, () =>
        db.query("insert into nutrition_products(barcode, name, carbs_g, protein_g) values ('87100000', 'Nep', 1, 1)"),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("houdt het gebruik van herkennen bij zonder dat een lid het kan wijzigen", async () => {
    await db.query(
      `insert into nutrition_log_ai_usage(profile_id, kind, response_id) values('${MEMBER}', 'foto', 'resp_1')`,
    );
    expect(await as(MEMBER, () => count("select count(*) from nutrition_log_ai_usage"))).toBe(1);
    expect(await as(OTHER, () => count("select count(*) from nutrition_log_ai_usage"))).toBe(0);
    await expect(
      as(MEMBER, () =>
        db.query(`insert into nutrition_log_ai_usage(profile_id, kind, response_id) values('${MEMBER}', 'foto', 'resp_2')`),
      ),
    ).rejects.toThrow(/row-level security/);
    // Weghalen om de daglimiet te omzeilen kan niet: er is geen delete-policy.
    await as(MEMBER, () => db.query("delete from nutrition_log_ai_usage"));
    expect(await count("select count(*) from nutrition_log_ai_usage")).toBe(1);
  });

  it("neemt een herkende maaltijd aan als foto of tekst", async () => {
    await as(MEMBER, () =>
      db.query(
        `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${MEMBER}', '2026-10-14', 'lunch', 'foto', 'Bord')`,
      ),
    );
    await as(MEMBER, () => db.query("update nutrition_log_settings set ai_consent_at = now()"));
    expect(await count("select count(*) from nutrition_log_settings where ai_consent_at is not null")).toBe(1);
  });

  it("laat alleen de actieve trainer meelezen, en pas als het lid dat aanzet", async () => {
    const visible = (user: string, table: string) => as(user, () => count(`select count(*) from ${table}`));
    expect(await visible(TRAINER, "nutrition_log_meals")).toBe(0);

    // Aanzetten kan niet zonder toestemmingsdatum.
    await expect(
      as(MEMBER, () => db.query("update nutrition_log_settings set trainer_visible = true")),
    ).rejects.toThrow(/trainer_consent_check/);
    await as(MEMBER, () =>
      db.query("update nutrition_log_settings set trainer_visible = true, trainer_consent_at = now()"),
    );

    expect(await visible(TRAINER, "nutrition_log_settings")).toBe(1);
    expect(await visible(TRAINER, "nutrition_log_meals")).toBeGreaterThan(0);
    expect(await visible(TRAINER, "nutrition_log_items")).toBeGreaterThan(0);
    // Een beëindigde koppeling of een ander lid telt niet.
    expect(await visible(STRANGER, "nutrition_log_meals")).toBe(0);
    expect(await visible(OTHER, "nutrition_log_meals")).toBe(0);

    // Meelezen, niet schrijven.
    await expect(
      as(TRAINER, () =>
        db.query(
          `insert into nutrition_log_meals(profile_id, eaten_on, meal_moment, source, title) values('${MEMBER}', '2026-10-14', 'diner', 'handmatig', 'X')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await as(TRAINER, () => db.query("delete from nutrition_log_meals"));
    await as(TRAINER, () => db.query("update nutrition_log_settings set paused = true"));
    expect(await count("select count(*) from nutrition_log_settings where paused")).toBe(0);
    expect(await count("select count(*) from nutrition_log_meals")).toBeGreaterThan(0);

    await as(MEMBER, () => db.query("update nutrition_log_settings set trainer_visible = false"));
    expect(await visible(TRAINER, "nutrition_log_meals")).toBe(0);
  });

  it("houdt verstuurde herinneringen voor de server", async () => {
    await db.query(`insert into nutrition_reminder_sends(profile_id, sent_on, kind) values('${MEMBER}', '2026-10-14', 'herstel')`);
    expect(await as(MEMBER, () => count("select count(*) from nutrition_reminder_sends"))).toBe(0);
    await expect(
      db.query(`insert into nutrition_reminder_sends(profile_id, sent_on, kind) values('${MEMBER}', '2026-10-14', 'herstel')`),
    ).rejects.toThrow(/duplicate key/);
  });

  it("wist alles als de toestemming wordt ingetrokken", async () => {
    await as(MEMBER, () => db.query("delete from nutrition_log_settings"));
    expect(await count("select count(*) from nutrition_log_settings")).toBe(0);
    expect(await count("select count(*) from nutrition_log_meals")).toBe(0);
    expect(await count("select count(*) from nutrition_log_items")).toBe(0);
    // Het gebruik blijft staan, anders reset wissen en opnieuw aanzetten de daglimiet.
    expect(await count("select count(*) from nutrition_log_ai_usage")).toBe(1);
  });

  it("is opnieuw te draaien", async () => {
    await db.exec(await migration("0231_nutrition_log.sql"));
    await db.exec(await migration("0233_nutrition_log_products.sql"));
    await db.exec(await migration("0234_nutrition_log_recognition.sql"));
    await db.exec(await migration("0235_nutrition_log_trainer_reminders.sql"));
    expect(await count("select count(*) from pg_policies where tablename like 'nutrition_log_%'")).toBe(9);
  });
});
