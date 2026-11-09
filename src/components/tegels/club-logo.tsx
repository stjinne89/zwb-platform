import { getClub } from "@/lib/club";
import { clubLogoUrl } from "@/lib/club-icons";

/**
 * Het logo van de club in een `.tg-logo`. Zonder eigen logo (en buiten ZWB, 0322)
 * de clubnaam als tekst: geen logo van een andere club.
 */
export async function ClubLogo({ alt = "", large = false }: { alt?: string; large?: boolean }) {
  const { settings, texts } = await getClub();
  const logo = clubLogoUrl(settings);
  if (!logo) return <span className="tg-logo-text">{large ? texts.name : texts.shortName}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logo} alt={alt} />;
}
