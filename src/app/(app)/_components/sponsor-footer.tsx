import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { SponsorCarousel, type CarouselSponsor } from "./sponsor-carousel";

/** Tag waarmee de sponsoracties deze cache legen. */
export const SPONSOR_FOOTER_TAG = "sponsor-footer";

/**
 * De actieve sponsors met een logo, een uur gedeeld tussen alle leden. Deze
 * strip staat onder elke pagina, dus zonder cache kost elke weergave een extra
 * oversteek naar de database. Sponsors zijn publiek leesbaar (RLS), dus de
 * service-rol toont hier niets wat een lid niet zelf mag zien. Wijzigingen via
 * /sponsors legen de cache meteen.
 */
const loadFooterSponsors = unstable_cache(
  async (): Promise<CarouselSponsor[]> => {
    const { data } = await createAdminClient()
      .from("sponsors")
      .select("name, logo_url, website_url")
      .eq("active", true)
      .not("logo_url", "is", null)
      .order("tier")
      .order("display_order");
    return (data ?? [])
      .filter((s) => s.logo_url)
      .map((s) => ({
        name: s.name as string,
        logoUrl: s.logo_url as string,
        websiteUrl: (s.website_url as string | null) ?? null,
      }));
  },
  ["sponsor-footer", "v1"],
  { revalidate: 60 * 60, tags: [SPONSOR_FOOTER_TAG] },
);

/** "Met dank aan onze sponsors", onderaan elke pagina binnen de app. */
export async function SponsorFooter() {
  const sponsors = await loadFooterSponsors().catch(() => []);
  if (sponsors.length === 0) return null;
  return (
    <div className="mt-10">
      <SponsorCarousel sponsors={sponsors} />
    </div>
  );
}
