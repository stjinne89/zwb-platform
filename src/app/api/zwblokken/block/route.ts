// Wie heeft dit blok gereden? Gevoed door een klik op de kaart.
//
// Bewust per blok opgevraagd in plaats van vooraf meegeleverd: de koppeling
// blok → leden is een veelvoud van de 22.000 blokken en zou de pagina
// onnodig zwaar maken voor iets wat je per keer één blok tegelijk bekijkt.

import { createClient } from "@/lib/supabase/server";
import { BLOCK_ZOOM } from "@/lib/zwblokken/grid";
import { ZWIFT_BLOCK_ZOOM, zwiftWorldBySlug } from "@/lib/zwblokken/zwift";

type Row = {
  profile_id: string;
  first_seen_at: string;
  profiles:
    | { display_name: string | null; avatar_url: string | null }
    | { display_name: string | null; avatar_url: string | null }[]
    | null;
};

function profileOf(rel: Row["profiles"]) {
  if (!rel) return { display_name: null, avatar_url: null };
  return Array.isArray(rel) ? (rel[0] ?? { display_name: null, avatar_url: null }) : rel;
}

function intParam(value: string | null, zoom: number): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 2 ** zoom) {
    return null;
  }
  return parsed;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  // Met ?world= een blok in een Zwift-wereld: eigen tabel, fijner raster.
  const worldParam = params.get("world");
  const world = worldParam ? zwiftWorldBySlug(worldParam) : null;
  if (worldParam && !world) {
    return Response.json({ error: "Onbekende wereld." }, { status: 400 });
  }
  const zoom = world ? ZWIFT_BLOCK_ZOOM : BLOCK_ZOOM;
  const x = intParam(params.get("x"), zoom);
  const y = intParam(params.get("y"), zoom);
  if (x === null || y === null) {
    return Response.json({ error: "Ongeldig blok." }, { status: 400 });
  }

  // RLS op profile_blocks en profile_zwift_blocks bepaalt wat een lid mag zien.
  let query = supabase
    .from(world ? "profile_zwift_blocks" : "profile_blocks")
    .select("profile_id, first_seen_at, profiles(display_name, avatar_url)")
    .eq("z", zoom)
    .eq("x", x)
    .eq("y", y);
  if (world) query = query.eq("world", world.slug);
  const { data, error } = await query.order("first_seen_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const riders = ((data ?? []) as Row[]).map((row) => {
    const profile = profileOf(row.profiles);
    return {
      id: row.profile_id,
      name: profile.display_name ?? "Naamloos lid",
      avatar: profile.avatar_url,
      since: row.first_seen_at,
    };
  });

  return Response.json(
    { x, y, riders },
    { headers: { "Cache-Control": "private, max-age=120" } },
  );
}
