// Verpakte producten via de barcode, uit Open Food Facts. Puur: het ophalen en
// bewaren staat in de server-actie.
//
// Alleen koolhydraten en eiwit worden overgenomen, net als in log.ts. Een
// product zonder een van beide waarden is voor de naleving niet bruikbaar en
// valt af; een onbekende waarde aanvullen met een schatting doen we niet.

import type { NutritionFood } from "./scale";
import { isStoredCarbMix, type StoredCarbMix } from "./event-fuel";

export type NutritionProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  quantity_unit: "g" | "ml";
  /** Per 100 g of ml. */
  carbs_g: number;
  protein_g: number;
  /** Eén stuk of portie; null als de verpakking het niet vermeldt. */
  serving_g: number | null;
  /**
   * Alleen bij de sportvoedingslijst van ZWB (0330, bron "zwb"): de soort
   * koolhydraten zoals de fabrikant die noemt, de schep bij poeder en natrium
   * per 100 g of ml. Open Food Facts levert ze niet.
   */
  carb_mix?: StoredCarbMix | null;
  scoop_g?: number | null;
  sodium_mg?: number | null;
  /** Poeder voor de bidon (0331): in gram, maar het telt als drank. */
  drink_mix?: boolean;
};

/** EAN-8, UPC-A, EAN-13 of ITF-14, zonder spaties of streepjes. Null als het geen barcode is. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, max: number): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Het antwoord van Open Food Facts (api/v2/product) naar wat wij bewaren. */
export function parseOffProduct(barcode: string, body: unknown): NutritionProduct | null {
  const record = body as { status?: number; product?: Record<string, unknown> } | null;
  const product = record?.product;
  if (!product || record?.status === 0) return null;

  const name = text(product.product_name_nl, 160) ?? text(product.product_name, 160);
  if (!name) return null;

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const carbs = number(nutriments.carbohydrates_100g);
  const protein = number(nutriments.proteins_100g);
  if (carbs == null || protein == null) return null;
  if (carbs < 0 || carbs > 100 || protein < 0 || protein > 100) return null;

  const serving = number(product.serving_quantity);
  const unit = String(product.serving_quantity_unit ?? "").toLowerCase() === "ml" ? "ml" : "g";

  return {
    barcode,
    name,
    // Open Food Facts geeft merken als "Merk A, Merk B"; het eerste volstaat.
    brand: text(String(product.brands ?? "").split(",")[0], 120),
    quantity_unit: unit,
    carbs_g: carbs,
    protein_g: protein,
    serving_g: serving != null && serving > 0 && serving <= 2000 ? serving : null,
  };
}

export function productLabel(product: Pick<NutritionProduct, "name" | "brand">): string {
  return product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
    ? `${product.name} (${product.brand})`
    : product.name;
}

/** De kolommen van nutrition_products die de app gebruikt. */
export const PRODUCT_COLUMNS = "barcode, name, brand, quantity_unit, carbs_g, protein_g, serving_g";
/** Met de velden van de sportvoedingslijst (0330); zonder 0330 geeft deze selectie een fout. */
export const SPORTS_PRODUCT_COLUMNS = `${PRODUCT_COLUMNS}, carb_mix, scoop_g, sodium_mg`;
/** Voor een product in een recept: ook of het een poeder voor de bidon is (0331). */
export const RECIPE_PRODUCT_COLUMNS = `${PRODUCT_COLUMNS}, drink_mix`;

/** Een rij uit nutrition_products als product; null zonder koolhydraten of eiwit. */
export function productFromRow(row: Record<string, unknown>): NutritionProduct | null {
  const carbs = number(row.carbs_g);
  const protein = number(row.protein_g);
  const barcode = typeof row.barcode === "string" ? row.barcode : null;
  const name = text(row.name, 160);
  if (!barcode || !name || carbs == null || protein == null) return null;
  const positive = (value: unknown) => {
    const parsed = number(value);
    return parsed != null && parsed > 0 ? parsed : null;
  };
  const sodium = number(row.sodium_mg);
  return {
    barcode,
    name,
    brand: text(row.brand, 120),
    quantity_unit: row.quantity_unit === "ml" ? "ml" : "g",
    carbs_g: carbs,
    protein_g: protein,
    serving_g: positive(row.serving_g),
    ...("carb_mix" in row ? { carb_mix: isStoredCarbMix(row.carb_mix) ? row.carb_mix : null } : {}),
    ...("scoop_g" in row ? { scoop_g: positive(row.scoop_g) } : {}),
    ...("sodium_mg" in row ? { sodium_mg: sodium != null && sodium >= 0 ? sodium : null } : {}),
  };
}

/** Zoeken in de sportvoedingslijst: elk woord moet in het merk of de naam staan. */
export function matchesProduct(product: Pick<NutritionProduct, "name" | "brand">, query: string): boolean {
  const haystack = `${product.brand ?? ""} ${product.name}`.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

/** Dezelfde NEVO-groep als de dranken, zodat het ritplan er een bidon van maakt (ride-plan.ts). */
export const DRINK_GROUP = "Niet-alcoholische dranken";

export type ProductRow = Omit<NutritionProduct, "carbs_g" | "protein_g"> & {
  carbs_g: number | null;
  protein_g: number | null;
};

/**
 * Een barcodeproduct als ingrediënt van een recept. Open Food Facts levert hier
 * alleen koolhydraten en eiwit; vet en vezels blijven onbekend, zodat het
 * recept die als ondergrens toont. Wat in ml komt, is een drank.
 */
export function productAsFood(product: ProductRow): NutritionFood & { quantity_unit: "g" | "ml" } {
  const unit = product.quantity_unit === "ml" ? "ml" : "g";
  return {
    id: product.barcode,
    barcode: product.barcode,
    nevo_code: 0,
    name_nl: productLabel(product),
    quantity_unit: unit,
    kcal: null,
    carbs_g: product.carbs_g == null ? null : Number(product.carbs_g),
    sugars_g: null,
    protein_g: product.protein_g == null ? null : Number(product.protein_g),
    fat_g: null,
    fiber_g: null,
    sodium_mg: product.sodium_mg == null ? null : Number(product.sodium_mg),
    food_group: unit === "ml" || product.drink_mix === true ? DRINK_GROUP : null,
    serving_g: product.serving_g == null ? null : Number(product.serving_g),
  };
}

/** Een regel voor het eetdagboek: een NEVO-product of een barcodeproduct. */
export function logItemFor(
  food: Pick<NutritionFood, "id" | "barcode">,
  grams: number,
): { food_id: string; grams: number } | { barcode: string; grams: number } {
  return food.barcode ? { barcode: food.barcode, grams } : { food_id: food.id, grams };
}
