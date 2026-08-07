// Blokken van één lid, voor als je op /zwblokken van lid wisselt.
// De pagina levert de eerste set als prop mee; deze route is er voor de rest.

import { createClient } from "@/lib/supabase/server";
import { countNewThisYear, fetchOwnBlocks } from "@/lib/zwblokken/query";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = new URL(request.url).searchParams.get("profile");
  if (!profileId) {
    return Response.json({ error: "Geen lid opgegeven." }, { status: 400 });
  }

  // RLS op profile_blocks bepaalt wat een lid mag zien; hier geen extra check.
  const [{ packed, regions, total }, newThisYear] = await Promise.all([
    fetchOwnBlocks(supabase, profileId),
    countNewThisYear(supabase, profileId),
  ]);

  return Response.json(
    {
      blocks: packed,
      regions: Object.fromEntries(regions),
      total,
      newThisYear,
    },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
