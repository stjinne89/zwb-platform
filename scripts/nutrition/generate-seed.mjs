#!/usr/bin/env node
// Genereert de seed-migratie voor voeding uit het NEVO-bestand en de
// clubrecepten in standard-recipes.json.
//
// Gebruik:
//   node scripts/nutrition/generate-seed.mjs <pad/naar/NEVO2025_v9.0.csv> [uitvoer.sql]
//
// Zonder tweede argument schrijft het script 0214_nutrition_seed_v2.sql. De
// eerste seed (0169) is toegepast en blijft zoals hij is: die kent de kolommen
// uit 0213 niet.
//
// Het NEVO-bestand zelf staat niet in de repo. Je haalt het op via
// https://www.rivm.nl/nederlands-voedingsstoffenbestand (akkoord op de
// voorwaarden, gratis). Die voorwaarden staan geen wijzigingen van de waarden
// toe: dit script kopieert ze letterlijk, zet alleen de decimale komma om, en
// laat een lege waarde leeg.
//
// Bij een nieuwe NEVO-versie of nieuwe recepten: pas NEVO_VERSION aan, draai het
// script met een nieuw uitvoerpad en maak er zo een nieuwe migratie van (een
// toegepaste migratie wijzig je niet).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NEVO_VERSION = "NEVO-online 2025/9.0";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const DEFAULT_OUTPUT = path.join(root, "supabase", "migrations", "0214_nutrition_seed_v2.sql");

const COLUMNS = {
  code: "NEVO-code",
  name: "Voedingsmiddelnaam/Dutch food name",
  quantity: "Hoeveelheid/Quantity",
  kcal: "ENERCC (kcal)",
  carbs: "CHO (g)",
  sugars: "SUGAR (g)",
  protein: "PROT (g)",
  fat: "FAT (g)",
  fiber: "FIBT (g)",
  sodium: "NA (mg)",
  group: "Voedingsmiddelgroep",
  calcium: "CA (mg)",
  iron: "FE (mg)",
  magnesium: "MG (mg)",
  zinc: "ZN (mg)",
  vitaminD: "VITD (µg)",
  vitaminC: "VITC (mg)",
  epa: "F20:5CN3 (g)",
  dha: "F22:6CN3 (g)",
};

// Kolom in nutrition_foods → veld hierboven, in de volgorde van de insert.
const FOOD_NUMBERS = [
  ["kcal", "kcal"],
  ["carbs_g", "carbs"],
  ["sugars_g", "sugars"],
  ["protein_g", "protein"],
  ["fat_g", "fat"],
  ["fiber_g", "fiber"],
  ["sodium_mg", "sodium"],
  ["calcium_mg", "calcium"],
  ["iron_mg", "iron"],
  ["magnesium_mg", "magnesium"],
  ["zinc_mg", "zinc"],
  ["vitamin_d_ug", "vitaminD"],
  ["vitamin_c_mg", "vitaminC"],
  ["epa_g", "epa"],
  ["dha_g", "dha"],
];

/** NEVO-csv: pipe-gescheiden, velden tussen dubbele aanhalingstekens. */
export function parseNevoCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  const split = (line) => line.split("|").map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"'));
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""]));
  });
}

function number(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`Geen getal: "${value}"`);
  return parsed;
}

function sqlText(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value == null ? "null" : String(value);
}

function unitOf(quantity) {
  if (quantity === "per 100g") return "g";
  if (quantity === "per 100ml") return "ml";
  throw new Error(`Onbekende NEVO-hoeveelheid: "${quantity}"`);
}

export function buildSeed(nevoRows, recipes) {
  for (const column of Object.values(COLUMNS)) {
    if (nevoRows.length > 0 && !(column in nevoRows[0])) {
      throw new Error(`NEVO-kolom ontbreekt: "${column}"`);
    }
  }
  const foods = nevoRows.map((row) => ({
    code: Number(row[COLUMNS.code]),
    name: row[COLUMNS.name].trim(),
    unit: unitOf(row[COLUMNS.quantity]),
    group: row[COLUMNS.group].trim(),
    ...Object.fromEntries(FOOD_NUMBERS.map(([, field]) => [field, number(row[COLUMNS[field]])])),
  }));
  const byCode = new Map(foods.map((food) => [food.code, food]));

  for (const recipe of recipes) {
    recipe.ingredients.forEach((item) => {
      if (!byCode.has(item.nevo)) {
        throw new Error(`Recept ${recipe.slug}: NEVO-code ${item.nevo} bestaat niet.`);
      }
    });
  }

  const out = [];
  out.push(
    "-- GEGENEREERD door scripts/nutrition/generate-seed.mjs; niet met de hand wijzigen.",
    "--",
    `-- Voedingswaarden: ${NEVO_VERSION}, RIVM, Bilthoven. Ongewijzigd overgenomen,`,
    "-- zoals de gebruiksvoorwaarden vragen. Clubrecepten: scripts/nutrition/standard-recipes.json.",
    "--",
    "-- Idempotent: voedingsmiddelen worden bijgewerkt op nevo_code, clubrecepten op",
    "-- slug, en de ingrediënten van clubrecepten worden opnieuw opgebouwd. Eigen",
    "-- recepten van leden blijven onaangeroerd.",
    "",
    "insert into public.nutrition_foods",
    `  (nevo_code, name_nl, quantity_unit, food_group, ${FOOD_NUMBERS.map(([column]) => column).join(", ")}, nevo_version)`,
    "values",
  );
  out.push(
    foods
      .map(
        (food) =>
          `  (${food.code}, ${sqlText(food.name)}, '${food.unit}', ${sqlText(food.group)}, ${FOOD_NUMBERS.map(([, field]) => sqlNumber(food[field])).join(", ")}, ${sqlText(NEVO_VERSION)})`,
      )
      .join(",\n"),
  );
  out.push(
    "on conflict (nevo_code) do update set",
    "  name_nl = excluded.name_nl,",
    "  quantity_unit = excluded.quantity_unit,",
    "  food_group = excluded.food_group,",
    ...FOOD_NUMBERS.map(([column]) => `  ${column} = excluded.${column},`),
    "  nevo_version = excluded.nevo_version;",
    "",
    "insert into public.nutrition_recipes",
    "  (slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, source_name, source_url, is_standard, owner_id)",
    "values",
  );
  out.push(
    recipes
      .map((recipe) => {
        const steps = recipe.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
        const tags = `array[${recipe.diet_tags.map(sqlText).join(", ")}]::text[]`;
        return `  (${sqlText(recipe.slug)}, ${sqlText(recipe.title)}, ${sqlText(recipe.meal_moment)}, ${sqlText(recipe.fuel_profile)}, ${tags}, ${recipe.servings}, ${sqlNumber(recipe.prep_minutes)}, ${sqlText(steps)}, ${recipe.source_name ? sqlText(recipe.source_name) : "null"}, ${recipe.source_url ? sqlText(recipe.source_url) : "null"}, true, null)`;
      })
      .join(",\n"),
  );
  out.push(
    "on conflict (slug) do update set",
    "  title = excluded.title,",
    "  meal_moment = excluded.meal_moment,",
    "  fuel_profile = excluded.fuel_profile,",
    "  diet_tags = excluded.diet_tags,",
    "  servings = excluded.servings,",
    "  prep_minutes = excluded.prep_minutes,",
    "  steps_md = excluded.steps_md,",
    "  source_name = excluded.source_name,",
    "  source_url = excluded.source_url",
    "where public.nutrition_recipes.is_standard;",
    "",
    "delete from public.nutrition_recipe_ingredients i",
    "using public.nutrition_recipes r",
    "where i.recipe_id = r.id",
    "  and r.is_standard",
    `  and r.slug in (${recipes.map((recipe) => sqlText(recipe.slug)).join(", ")});`,
    "",
    "insert into public.nutrition_recipe_ingredients (recipe_id, food_id, sort_order, grams, role)",
    "select r.id, f.id, v.sort_order, v.grams, v.role",
    "from (values",
  );
  out.push(
    recipes
      .flatMap((recipe) =>
        recipe.ingredients.map(
          (item, index) =>
            `  (${sqlText(recipe.slug)}, ${item.nevo}, ${index}, ${item.grams}, ${sqlText(item.role)})`,
        ),
      )
      .join(",\n"),
  );
  out.push(
    ") as v(slug, nevo_code, sort_order, grams, role)",
    "join public.nutrition_recipes r on r.slug = v.slug and r.is_standard",
    "join public.nutrition_foods f on f.nevo_code = v.nevo_code;",
    "",
    "notify pgrst, 'reload schema';",
    "",
    "-- Controle na toepassen:",
    `-- select count(*) from public.nutrition_foods;                                  -- ${foods.length}`,
    `-- select count(*) from public.nutrition_recipes where is_standard;              -- ${recipes.length}`,
    `-- select count(*) from public.nutrition_recipe_ingredients;                     -- ${recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0)} (plus eigen recepten)`,
    "",
  );
  return out.join("\n");
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Gebruik: node scripts/nutrition/generate-seed.mjs <pad/naar/NEVO2025_v9.0.csv> [uitvoer.sql]");
    process.exit(1);
  }
  const [csv, recipesJson] = await Promise.all([
    readFile(csvPath, "utf8"),
    readFile(path.join(here, "standard-recipes.json"), "utf8"),
  ]);
  const sql = buildSeed(parseNevoCsv(csv), JSON.parse(recipesJson));
  const output = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT;
  await writeFile(output, sql, "utf8");
  console.log(`Geschreven: ${path.relative(root, output)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
