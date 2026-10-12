import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { TegelsLinkGrid, type PlaceLink } from "@/components/tegels/link-grid";
import { NAV_GROUPS, filterNavForPermissions } from "../_components/nav-config";

// De plek "Club" van het design "tegels": alles van de club als tegels. In het
// huidige design staat dit in het menu en linkt er niets naar deze pagina.

// Kleur en formaat per onderdeel, zodat het veld geen egaal rooster is. Wat hier
// niet staat, krijgt de kleur van de plek en het gewone formaat.
const TILE_STYLE: Record<string, Pick<PlaceLink, "tone" | "size">> = {
  "/teams": { tone: "kalender", size: "big" },
  "/leden": { tone: "club", size: "wide" },
  "/achievements": { tone: "vandaag" },
  "/stats": { tone: "zwbeter" },
  "/zwblokken": { tone: "zwbeter" },
  "/profiel/segments/collecties": { tone: "meer" },
  "/zwbgame": { tone: "vandaag" },
  "/omnium": { tone: "kalender" },
  "/src": { tone: "club" },
  "/polls": { tone: "zwbeter" },
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
    ...(club?.type === "group" ? club.items : []).map(
      (item): PlaceLink => ({
        href: item.href,
        label: item.label,
        external: item.external,
        // De link naar buiten (voorZpWelBokaal) is de donkerste tegel, en breed:
        // de naam past niet op een smalle tegel op de telefoon.
        ...(item.external ? { tone: "meer", size: "wide" } : {}),
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
