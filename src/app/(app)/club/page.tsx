import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { TegelsLinkGrid, type PlaceLink } from "@/components/tegels/link-grid";
import { NAV_GROUPS, filterNavForPermissions, type NavLeaf } from "../_components/nav-config";

// De plek "Club" van het design "tegels": alles van de club als tegels. In het
// huidige design staat dit in het menu en linkt er niets naar deze pagina.

// In het huidige design is Samen fietsen een eigen menu-item; hier staat het
// naast Leden, want het gaat om met clubgenoten rijden (besluit eigenaar,
// 2026-10-16).
const SAMEN_FIETSEN: NavLeaf = { type: "link", href: "/samen-fietsen", label: "Samen fietsen" };

// Kleur volgt het kleurbeleid (zie globals.css): de soort inhoud bepaalt de
// kleur, het formaat het belang.
const TILE_STYLE: Record<string, Pick<PlaceLink, "tone" | "size">> = {
  // petrol: wedstrijden en events
  "/teams": { tone: "kalender", size: "big" },
  "/omnium": { tone: "kalender" },
  "/src": { tone: "kalender" },
  // sage: de club en de mensen
  "/leden": { tone: "club", size: "wide" },
  "/samen-fietsen": { tone: "club", size: "wide" },
  "/polls": { tone: "club" },
  // teal: prestaties en cijfers
  "/achievements": { tone: "zwbeter" },
  "/stats": { tone: "zwbeter" },
  // donker petrol: spel en ontdekken
  "/zwblokken": { tone: "meer" },
  "/profiel/segments/collecties": { tone: "meer" },
  "/zwbgame": { tone: "meer" },
};

export default async function ClubPage() {
  const [supabase, user, access] = await Promise.all([
    createClient(),
    getRequestUser(),
    getRequestAccess(),
  ]);
  const { data: profile } = user
    ? await supabase.from("profiles").select("sex").eq("id", user.id).single()
    : { data: null };

  const nodes = filterNavForPermissions(
    NAV_GROUPS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  );
  const club = nodes.find((node) => node.type === "group" && node.label === "Club");
  const links: PlaceLink[] = [
    ...(club?.type === "group" ? club.items : [])
      .flatMap((item) => (item.href === "/leden" ? [item, SAMEN_FIETSEN] : [item]))
      .map(
      (item): PlaceLink => ({
        href: item.href,
        label: item.label,
        external: item.external,
        // De link naar buiten (voorZpWelBokaal) is een competitie, dus petrol, en
        // breed: de naam past niet op een smalle tegel op de telefoon.
        ...(item.external ? { tone: "kalender", size: "wide" } : {}),
        ...TILE_STYLE[item.href],
      }),
    ),
    { href: "/polls", label: "Polls", ...TILE_STYLE["/polls"] },
  ];

  return (
    <div className="space-y-5">
      <h1 className="tg-display">Club</h1>
      <TegelsLinkGrid place="club" links={links} />
    </div>
  );
}
