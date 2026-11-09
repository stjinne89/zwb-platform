import { getClub } from "@/lib/club";
import { ZwbMark } from "@/components/zwb-logo";

/**
 * Het beeldmerk van de club naast een titel. Bij ZWB zonder eigen beeldmerk het
 * vaste ZWB-merk (0322); bij een andere club zonder beeldmerk niets.
 */
export async function ClubMark({ className }: { className?: string }) {
  const { settings } = await getClub();
  if (settings.markUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={settings.markUrl} alt="" className={`${className ?? ""} object-contain`} />;
  }
  return settings.staticBrand ? <ZwbMark className={className} /> : null;
}
