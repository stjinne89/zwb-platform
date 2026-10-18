import { PageHeader } from "@/components/app-ui";
import { getDesign } from "@/lib/design";
import { HelpCategoriesGrid } from "./help-categories-grid";
import { HelpHashRedirect } from "./help-hash-redirect";
import { HelpSearch } from "./help-search";

// De hulp als tegels: elke categorie is een eigen pagina (/hulp/<categorie>,
// zie lib/help-categories.ts). Tot 2026-10-18 stond alles hier onder elkaar.

export default async function HelpPage() {
  const tegels = (await getDesign()) === "tegels";
  return (
    <div className="space-y-6">
      <HelpHashRedirect />
      <PageHeader
        eyebrow="ZWB gids"
        title="Hulp voor leden"
        description="Wat elke pagina doet, hoe je koppelt en live tracking instelt, en wat te doen als iets niet werkt."
      />
      <HelpSearch />
      <HelpCategoriesGrid tegels={tegels} />
    </div>
  );
}
