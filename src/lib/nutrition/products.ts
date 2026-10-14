// Verpakte producten via de barcode, uit Open Food Facts. Puur: het ophalen en
// bewaren staat in de server-actie.
//
// Alleen koolhydraten en eiwit worden overgenomen, net als in log.ts. Een
// product zonder een van beide waarden is voor de naleving niet bruikbaar en
// valt af; een onbekende waarde aanvullen met een schatting doen we niet.

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
