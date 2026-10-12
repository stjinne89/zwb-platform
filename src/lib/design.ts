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

export const getDesign = cache(async (): Promise<Design> => {
  const store = await cookies();
  if (store.get(DESIGN_COOKIE)?.value !== "tegels") return "klassiek";
  const access = await getRequestAccess();
  return access.has(DESIGN_PREVIEW_PERMISSION) ? "tegels" : "klassiek";
});
