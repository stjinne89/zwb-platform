#!/usr/bin/env node
// Genereert supabase/migrations/0169_nutrition_seed.sql uit het NEVO-bestand en
// de clubrecepten in standard-recipes.json.
//
// Gebruik:
//   node scripts/nutrition/generate-seed.mjs <pad/naar/NEVO2025_v9.0.csv>
//
// Het NEVO-bestand zelf staat niet in de repo. Je haalt het op via
// https://www.rivm.nl/nederlands-voedingsstoffenbestand (akkoord op de
// voorwaarden, gratis). Die voorwaarden staan geen wijzigingen van de waarden
// toe: dit script kopieert ze letterlijk, zet alleen de decimale komma om, en
// laat een lege waarde leeg.
//
// Bij een nieuwe NEVO-versie: pas NEVO_VERSION aan, draai het script opnieuw en
// maak er een nieuwe migratie van (een toegepaste migratie wijzig je niet).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const NEVO_VERSION = "NEVO-online 2025/9.0";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const OUTPUT = path.join(root, "supabase", "migrations", "0169_nutrition_seed.sql");

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
};

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
  const foods = nevoRows.map((row) => ({
    code: Number(row[COLUMNS.code]),
    name: row[COLUMNS.name].trim(),
    unit: unitOf(row[COLUMNS.quantity]),
    kcal: number(row[COLUMNS.kcal]),
    carbs: number(row[COLUMNS.carbs]),
    sugars: number(row[COLUMNS.sugars]),
    protein: number(row[COLUMNS.protein]),
    fat: number(row[COLUMNS.fat]),
    fiber: number(row[COLUMNS.fiber]),
    sodium: number(row[COLUMNS.sodium]),
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
    "  (nevo_code, name_nl, quantity_unit, kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg, nevo_version)",
    "values",
  );
  out.push(
    foods
      .map(
        (food) =>
          `  (${food.code}, ${sqlText(food.name)}, '${food.unit}', ${sqlNumber(food.kcal)}, ${sqlNumber(food.carbs)}, ${sqlNumber(food.sugars)}, ${sqlNumber(food.protein)}, ${sqlNumber(food.fat)}, ${sqlNumber(food.fiber)}, ${sqlNumber(food.sodium)}, ${sqlText(NEVO_VERSION)})`,
      )
      .join(",\n"),
  );
  out.push(
    "on conflict (nevo_code) do update set",
    "  name_nl = excluded.name_nl,",
    "  quantity_unit = excluded.quantity_unit,",
    "  kcal = excluded.kcal,",
    "  carbs_g = excluded.carbs_g,",
    "  sugars_g = excluded.sugars_g,",
    "  protein_g = excluded.protein_g,",
    "  fat_g = excluded.fat_g,",
    "  fiber_g = excluded.fiber_g,",
    "  sodium_mg = excluded.sodium_mg,",
    "  nevo_version = excluded.nevo_version;",
    "",
    "insert into public.nutrition_recipes",
    "  (slug, title, meal_moment, fuel_profile, diet_tags, servings, prep_minutes, steps_md, is_standard, owner_id)",
    "values",
  );
  out.push(
    recipes
      .map((recipe) => {
        const steps = recipe.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
        const tags = `array[${recipe.diet_tags.map(sqlText).join(", ")}]::text[]`;
        return `  (${sqlText(recipe.slug)}, ${sqlText(recipe.title)}, ${sqlText(recipe.meal_moment)}, ${sqlText(recipe.fuel_profile)}, ${tags}, ${recipe.servings}, ${sqlNumber(recipe.prep_minutes)}, ${sqlText(steps)}, true, null)`;
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
    "  steps_md = excluded.steps_md",
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
    console.error("Gebruik: node scripts/nutrition/generate-seed.mjs <pad/naar/NEVO2025_v9.0.csv>");
    process.exit(1);
  }
  const [csv, recipesJson] = await Promise.all([
    readFile(csvPath, "utf8"),
    readFile(path.join(here, "standard-recipes.json"), "utf8"),
  ]);
  const sql = buildSeed(parseNevoCsv(csv), JSON.parse(recipesJson));
  await writeFile(OUTPUT, sql, "utf8");
  console.log(`Geschreven: ${path.relative(root, OUTPUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
