import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

export async function requireOmniumAccess() {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user || !access.has("omnium.manage")) throw new Error("Geen recht om het Omnium te beheren.");
  return { admin: createAdminClient(), userId: access.user.id };
}
