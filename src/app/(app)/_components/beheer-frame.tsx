import type { ReactNode } from "react";
import { getRequestAccess } from "@/lib/auth/request";
import { getDesign } from "@/lib/design";
import { BeheerNav } from "./beheer-nav";
import { beheerCategoriesFor } from "./nav-config";

/** Zet in het design "tegels" de beheernavigatie boven een beheerscherm. Ook
 * voor de schermen buiten /beheer (ZWBgame, WhatsApp-groepen, Media); wie daar
 * geen beheerrecht voor heeft, ziet de navigatie niet. Het huidige design blijft
 * zoals het is. */
export async function BeheerFrame({ children }: { children: ReactNode }) {
  if ((await getDesign()) !== "tegels") return children;
  const access = await getRequestAccess();
  const categories = beheerCategoriesFor((permission) => access.has(permission)).map(
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
