import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { TegelsLinkGrid, type PlaceLink } from "@/components/tegels/link-grid";
import { NAV_GROUPS, filterNavForPermissions } from "../_components/nav-config";

// De plek "Club" van het design "tegels": alles van de club als tegels. In het
// huidige design staat dit in het menu en linkt er niets naar deze pagina.

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
    ...(club?.type === "group" ? club.items : []).map((item) => ({
      href: item.href,
      label: item.label,
      external: item.external,
    })),
    { href: "/polls", label: "Polls" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="tg-display">Club</h1>
      <TegelsLinkGrid place="club" links={links} />
    </div>
  );
}
