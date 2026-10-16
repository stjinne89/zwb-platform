import { redirect } from "next/navigation";
import { getRequestAccess } from "@/lib/auth/request";
import { TegelsLinkGrid } from "@/components/tegels/link-grid";
import { beheerCategoriesFor } from "../_components/nav-config";

// Het beheer van het design "tegels": alle beheerschermen als tegels, per
// soort. In het huidige design staan ze in het persoonlijke menu en linkt er
// niets naar deze pagina.

export default async function BeheerPage() {
  const access = await getRequestAccess();
  const categories = beheerCategoriesFor((permission) => access.has(permission));
  if (categories.length === 0) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <h1 className="tg-display">Beheer</h1>
      {categories.map((category) => (
        <TegelsLinkGrid
          key={category.label}
          place={category.tone}
          label={category.label}
          links={category.items.map((item) => ({ href: item.href, label: item.label }))}
        />
      ))}
    </div>
  );
}
