import { getRequestAccess } from "@/lib/auth/request";
import { TegelsLinkGrid, type PlaceLink } from "@/components/tegels/link-grid";
import { LogoutButton } from "../_components/logout-button";
import { ADMIN_NAV, AVATAR_NAV } from "../_components/nav-config";

// De plek "Meer" van het design "tegels": je eigen zaken en, voor wie het mag,
// beheer. WhatsApp-groepen en Media staan hier onder beheer (besluit eigenaar,
// 2026-10-12); Vraag en Aanbod en Ritverslagen staan er bewust niet.

export default async function MeerPage() {
  const access = await getRequestAccess();

  const own: PlaceLink[] = [
    ...AVATAR_NAV.map((item) => ({ href: item.href, label: item.label })),
    { href: "/sponsors", label: "Sponsors" },
  ];
  const admin: PlaceLink[] = [
    ...ADMIN_NAV.filter((item) => access.has(item.permission)).map((item) => ({
      href: item.href,
      label: item.label,
    })),
    ...(access.has("community.manage")
      ? [{ href: "/community", label: "WhatsApp-groepen" }]
      : []),
    ...(access.has("media.manage") ? [{ href: "/media", label: "Media" }] : []),
  ];

  return (
    <div className="space-y-6">
      <h1 className="tg-display">Meer</h1>
      <TegelsLinkGrid place="meer" links={own} />
      <TegelsLinkGrid place="meer" links={admin} label="Beheer" />
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
