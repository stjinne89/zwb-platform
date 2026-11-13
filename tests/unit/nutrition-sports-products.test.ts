import { describe, expect, it } from "vitest";
import { matchesProduct, productAsFood, productFromRow } from "@/lib/nutrition/products";

const ROW = {
  barcode: "8714411000512",
  name: "Turbo Gel",
  brand: "Amacx",
  quantity_unit: "g",
  carbs_g: "50",
  protein_g: 0,
  serving_g: 60,
  carb_mix: "2:1",
  scoop_g: null,
  sodium_mg: "250",
};

describe("sportvoedingslijst (0330)", () => {
  it("leest een rij met de soort, de schep en natrium", () => {
    const product = productFromRow(ROW)!;
    expect(product).toMatchObject({ carbs_g: 50, protein_g: 0, serving_g: 60, carb_mix: "2:1", scoop_g: null, sodium_mg: 250 });
    expect(productAsFood(product).sodium_mg).toBe(250);
  });

  it("zonder de kolommen van 0330 blijven die velden weg, en een onbekende soort wordt null", () => {
    const old: Record<string, unknown> = { ...ROW };
    delete old.carb_mix;
    delete old.scoop_g;
    delete old.sodium_mg;
    const product = productFromRow(old)!;
    expect("carb_mix" in product).toBe(false);
    expect(productFromRow({ ...ROW, carb_mix: "3:1" })!.carb_mix).toBeNull();
  });

  it("zonder koolhydraten of eiwit is het geen product", () => {
    expect(productFromRow({ ...ROW, protein_g: null })).toBeNull();
    expect(productFromRow({ ...ROW, carbs_g: null })).toBeNull();
  });

  it("zoekt op merk en naam, elk woord", () => {
    expect(matchesProduct(ROW, "amacx")).toBe(true);
    expect(matchesProduct(ROW, "turbo AMACX")).toBe(true);
    expect(matchesProduct(ROW, "maurten")).toBe(false);
    expect(matchesProduct(ROW, "  ")).toBe(false);
  });
});
