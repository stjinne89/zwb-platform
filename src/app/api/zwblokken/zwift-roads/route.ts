// Routelijnen van één Zwift-wereld, als ondergrond voor de Zwift-blokkenkaart.
// Per wereld opgevraagd: alle werelden tegelijk is een paar honderd kilobyte
// voor iets wat je één wereld tegelijk bekijkt.

import { createClient } from "@/lib/supabase/server";
import { zwiftWorldBySlug } from "@/lib/zwblokken/zwift";
import { fetchRouteLines } from "@/lib/zwblokken/zwift-query";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const world = zwiftWorldBySlug(new URL(request.url).searchParams.get("world") ?? "");
  if (!world) {
    return Response.json({ error: "Onbekende wereld." }, { status: 400 });
  }

  const lines = await fetchRouteLines(supabase, world.slug);
  return Response.json(
    { world: world.slug, lines },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
