// De NEVO-zoekquery voor het receptformulier en voor een recept van een link.
// De regels voor woorden, knippen en volgorde staan puur in food-search.ts.

import type { createClient } from "@/lib/supabase/server";
import { collectPages, compoundSplits, foodSearchTokens, rankFoods } from "./food-search";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type FoodOption = {
  id: string;
  name_nl: string;
  quantity_unit: "g" | "ml";
  carbs_g: number | null;
  protein_g: number | null;
};

export async function queryFoods(supabase: Supabase, query: string): Promise<FoodOption[]> {
  const tokens = foodSearchTokens(query);
  if (tokens.length === 0) return [];
  // % en _ zijn jokers in ilike; letterlijk zoeken.
  const pattern = (part: string) => `%${part.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const columns = "id, name_nl, quantity_unit, carbs_g, protein_g";

  // Elk woord moet in de naam staan, in welke volgorde ook. Alle treffers
  // ophalen, per pagina: rankFoods kiest de beste twintig, en een afgekapte
  // voorraad op alfabet laat bij "rauw" alles na de P weg.
  let rows = await collectPages<FoodOption>(async (from, to) => {
    let search = supabase.from("nutrition_foods").select(columns);
    for (const token of tokens) search = search.ilike("name_nl", pattern(token));
    const { data } = await search
      .order("name_nl", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    return (data ?? []) as FoodOption[];
  });

  // Niets bij één woord: een samenstelling als "chocolademelk" staat in NEVO als
  // "Melk chocolade-". Probeer elke knip in twee stukken, in één query.
  if (rows.length === 0 && tokens.length === 1) {
    const splits = compoundSplits(tokens[0]);
    if (splits.length > 0) {
      const filter = splits
        .map(([head, tail]) => `and(name_nl.ilike.%${head}%,name_nl.ilike.%${tail}%)`)
        .join(",");
      rows = await collectPages<FoodOption>(async (from, to) => {
        const { data: split } = await supabase
          .from("nutrition_foods")
          .select(columns)
          .or(filter)
          .order("name_nl", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return (split ?? []) as FoodOption[];
      });
    }
  }
  return rankFoods(rows, tokens);
}
