import { cache } from "react";
import { cookies } from "next/headers";
import { getRequestAccess } from "@/lib/auth/request";
import type { CommunityPermission } from "@/lib/permissions";

// Het nieuwe design ("tegels") staat achter een schakelaar: een cookie per
// browser, en alleen voor wie het recht hieronder heeft. Een lid dat het cookie
// zelf zet, krijgt dus nog steeds het huidige design. Zo kan het bestuur het met
// eigen data bekijken zonder dat het voor de club live staat.

export const DESIGN_COOKIE = "zwb-design";
export const DESIGN_PREVIEW_PERMISSION: CommunityPermission = "roles.manage_permissions";

export type Design = "klassiek" | "tegels";

/**
 * Het design van de schermen vóór het inloggen (inloggen, wachten op
 * goedkeuring, nieuw wachtwoord). Daar is nog geen lid om het recht van na te
 * gaan, dus telt alleen het cookie. Het cookie zet alleen de schakelaar, en die
 * vraagt het recht; wie het met de hand zet ziet alleen deze schermen anders,
 * geen data (besluit 2026-10-17).
 */
export async function getAuthDesign(): Promise<Design> {
  const store = await cookies();
  return store.get(DESIGN_COOKIE)?.value === "tegels" ? "tegels" : "klassiek";
}

export const getDesign = cache(async (): Promise<Design> => {
  const store = await cookies();
  if (store.get(DESIGN_COOKIE)?.value !== "tegels") return "klassiek";
  const access = await getRequestAccess();
  return access.has(DESIGN_PREVIEW_PERMISSION) ? "tegels" : "klassiek";
});
