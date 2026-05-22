import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeCommunityRoles } from "@/lib/community-roles";
import {
  COMMUNITY_PERMISSION_IDS,
  normalizePermissions,
  type CommunityPermission,
} from "@/lib/permissions";

type ProfileAccessRow = {
  is_admin: boolean | null;
  community_roles: string[] | null;
};

type RolePermissionRow = {
  role: string;
  permissions: string[] | null;
};

export type CurrentUserAccess = {
  user: User | null;
  isAdmin: boolean;
  permissions: Set<CommunityPermission>;
  has: (permission: CommunityPermission) => boolean;
  hasAny: (permissions: readonly CommunityPermission[]) => boolean;
};

export async function getCurrentUserAccess(
  supabase: SupabaseClient,
): Promise<CurrentUserAccess> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const empty = new Set<CommunityPermission>();
    return {
      user: null,
      isAdmin: false,
      permissions: empty,
      has: () => false,
      hasAny: () => false,
    };
  }

  const [{ data: profile }, { data: permissionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin, community_roles")
      .eq("id", user.id)
      .single<ProfileAccessRow>(),
    supabase
      .from("community_role_permissions")
      .select("role, permissions")
      .returns<RolePermissionRow[]>(),
  ]);

  const isAdmin = profile?.is_admin ?? false;
  const permissionSet = new Set<CommunityPermission>();

  if (isAdmin) {
    for (const permission of COMMUNITY_PERMISSION_IDS) {
      permissionSet.add(permission);
    }
  } else {
    const roles = normalizeCommunityRoles(profile?.community_roles);
    const rowsByRole = new Map(
      (permissionRows ?? []).map((row) => [row.role, row.permissions]),
    );

    for (const role of roles) {
      for (const permission of normalizePermissions(rowsByRole.get(role))) {
        permissionSet.add(permission);
      }
    }
  }

  return {
    user,
    isAdmin,
    permissions: permissionSet,
    has: (permission) => permissionSet.has(permission),
    hasAny: (permissions) =>
      permissions.some((permission) => permissionSet.has(permission)),
  };
}
