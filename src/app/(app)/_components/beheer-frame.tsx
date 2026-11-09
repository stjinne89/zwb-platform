import type { ReactNode } from "react";
import { getRequestAccess } from "@/lib/auth/request";
import { getClub } from "@/lib/club";
import { BeheerNav } from "./beheer-nav";
import { beheerCategoriesFor } from "./nav-config";

/** Zet de beheernavigatie boven een beheerscherm. Ook voor de schermen buiten
 * /beheer (ZWBgame, WhatsApp-groepen, Media); wie daar geen beheerrecht voor
 * heeft, ziet de navigatie niet. */
export async function BeheerFrame({ children }: { children: ReactNode }) {
  const [access, club] = await Promise.all([getRequestAccess(), getClub()]);
  const categories = beheerCategoriesFor(
    (permission) => access.has(permission),
    club.allowsPath,
  ).map(
    (category) => ({
      label: category.label,
      tone: category.tone,
      items: category.items.map(({ href, label }) => ({ href, label })),
    }),
  );
  if (categories.length === 0) return children;
  return (
    <div className="space-y-5">
      <BeheerNav categories={categories} />
      {children}
    </div>
  );
}
