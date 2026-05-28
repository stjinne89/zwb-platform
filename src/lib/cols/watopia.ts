// Zelf-kalibrerende coördinaten voor Watopia (Zwift) cols.
//
// We kennen per Watopia-klim de Strava-segment-ID (uit zwift-data), maar
// niet de virtuele GPS-coördinaten. De Strava segment-API geeft per segment
// een `end_latlng` (= top van de KOM) terug in Watopia/Teanu-coördinaten —
// precies de ruimte waarin VirtualRide-polylines liggen. Eén keer ophalen
// per segment volstaat (Watopia is voor iedereen gelijk), dus de eerste
// gebruiker die synct kalibreert de cols voor de hele club.

type UncalibratedCol = {
  slug: string;
  strava_segment_id: number;
};

export async function calibrateWatopiaCols(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  accessToken: string,
): Promise<{ calibrated: number }> {
  // Virtuele cols zonder coördinaten maar mét segment-ID.
  const { data: rows } = await supabase
    .from("cols")
    .select("slug, strava_segment_id")
    .eq("virtual", true)
    .is("summit_lat", null)
    .not("strava_segment_id", "is", null);

  const todo = (rows ?? []) as UncalibratedCol[];
  if (todo.length === 0) return { calibrated: 0 };

  let calibrated = 0;
  for (const col of todo) {
    try {
      const res = await fetch(
        `https://www.strava.com/api/v3/segments/${col.strava_segment_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      if (res.status === 429) {
        // Rate-limited: stop deze ronde, volgende sync pakt de rest.
        break;
      }
      if (!res.ok) continue;
      const seg = (await res.json()) as {
        end_latlng?: [number, number] | null;
        start_latlng?: [number, number] | null;
      };
      // end_latlng = top van de KOM. Fallback op start_latlng.
      const pt = seg.end_latlng ?? seg.start_latlng;
      if (!pt || pt.length !== 2) continue;

      const { error } = await supabase
        .from("cols")
        .update({ summit_lat: pt[0], summit_lon: pt[1] })
        .eq("slug", col.slug);
      if (!error) calibrated += 1;

      // Beleefde pauze tegen Strava rate-limit.
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      // negeer; volgende col / volgende sync
    }
  }

  return { calibrated };
}
