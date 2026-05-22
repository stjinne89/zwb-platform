"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { COMMUNITY_ROLES, type CommunityRole } from "@/lib/community-roles";
import {
  COMMUNITY_PERMISSION_IDS,
  normalizePermissions,
  type CommunityPermission,
} from "@/lib/permissions";

type PermissionMatrixInput = Partial<Record<CommunityRole, string[]>>;

export async function updateRolePermissions(input: PermissionMatrixInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false as const, error: "Geen recht om rechten te wijzigen." };
  }

  const validPermissions = new Set<string>(COMMUNITY_PERMISSION_IDS);
  const rows = COMMUNITY_ROLES.map((role) => {
    const permissions = normalizePermissions(input[role]).filter((permission) =>
      validPermissions.has(permission),
    ) as CommunityPermission[];

    return {
      role,
      permissions,
    };
  });

  const { error } = await supabase
    .from("community_role_permissions")
    .upsert(rows, { onConflict: "role" });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/beheer/rechten");
  return { ok: true as const };
}
