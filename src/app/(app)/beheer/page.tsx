import { redirect } from "next/navigation";
import { getRequestAccess } from "@/lib/auth/request";
import { getDesign } from "@/lib/design";
import { beheerCategoriesFor } from "../_components/nav-config";

// Het beheer van het design "tegels". De categorieën als tegels toont de layout
// (BeheerFrame); deze pagina heeft verder geen inhoud. In het oude design
// staan de beheerschermen in het persoonlijke menu en linkt er niets hierheen.

export default async function BeheerPage() {
  const access = await getRequestAccess();
  const allowed = beheerCategoriesFor((permission) => access.has(permission)).length > 0;
  if (!allowed || (await getDesign()) !== "tegels") redirect("/dashboard");
  return null;
}
