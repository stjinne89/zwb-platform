import { redirect } from "next/navigation";
import { getRequestAccess } from "@/lib/auth/request";
import { getClub } from "@/lib/club";
import { beheerCategoriesFor } from "../_components/nav-config";

// Het beheer. De categorieën als tegels toont de layout (BeheerFrame); deze
// pagina heeft verder geen inhoud.

export default async function BeheerPage() {
  const [access, club] = await Promise.all([getRequestAccess(), getClub()]);
  const allowed =
    beheerCategoriesFor((permission) => access.has(permission), club.allowsPath).length > 0;
  if (!allowed) redirect("/dashboard");
  return null;
}
