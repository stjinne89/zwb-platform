import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser, type SessionUser } from "@/lib/auth/session-user";
import { normalizeCommunityRoles } from "@/lib/community-roles";
import {
  COMMUNITY_PERMISSION_IDS,
  normalizePermissions,
  type CommunityPermission,
} from "@/lib/permissions";
import { roleBlockedModules } from "@/lib/module-access";
import type { ModuleKey } from "@/lib/modules";

type ProfileAccessRow = {
  is_admin: boolean | null;
  community_roles: string[] | null;
};

type RolePermissionRow = {
  role: string;
  permissions: string[] | null;
  /** Sinds 0336; ontbreekt zolang die migratie er niet is. */
  blocked_modules?: string[] | null;
};

export type CurrentUserAccess = {
  user: SessionUser | null;
  isAdmin: boolean;
  permissions: Set<CommunityPermission>;
  has: (permission: CommunityPermission) => boolean;
  hasAny: (permissions: readonly CommunityPermission[]) => boolean;
  /** Modules die de groepen van dit lid dicht hebben (0336, lib/module-access.ts). */
  blockedModules: ReadonlySet<ModuleKey>;
};

export async function getCurrentUserAccess(
  supabase: SupabaseClient,
): Promise<CurrentUserAccess> {
  return accessForUser(supabase, await getSessionUser(supabase));
}

/** Rechten van een al opgehaalde gebruiker; zie ook getRequestAccess. */
export async function accessForUser(
  supabase: SupabaseClient,
  user: SessionUser | null,
): Promise<CurrentUserAccess> {
  if (!user) {
    const empty = new Set<CommunityPermission>();
    return {
      user: null,
      isAdmin: false,
      permissions: empty,
      has: () => false,
      hasAny: () => false,
      blockedModules: new Set(),
    };
  }

  const [{ data: profile }, { data: permissionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin, community_roles")
      .eq("id", user.id)
      .single<ProfileAccessRow>(),
    // Alle kolommen, zodat blocked_modules meekomt zonder dat het lezen faalt
    // zolang 0336 er niet is.
    supabase
      .from("community_role_permissions")
      .select("*")
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
    blockedModules: roleBlockedModules(permissionRows, profile?.community_roles, isAdmin),
  };
}

/**
 * Alle profielen die een bepaald recht hebben — beheerders plus iedereen met
 * een rol waar het recht in zit. Nodig om een pushbericht aan de juiste groep
 * te sturen; `is_admin` alleen mist bijvoorbeeld de community-managers.
 *
 * Vraagt een client met leesrecht op alle profielen (admin-client bij
 * server-side triggers).
 */
export async function profileIdsWithPermission(
  supabase: SupabaseClient,
  permission: CommunityPermission,
): Promise<string[]> {
  const [{ data: profiles }, { data: permissionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, is_admin, community_roles")
      .returns<(ProfileAccessRow & { id: string })[]>(),
    supabase
      .from("community_role_permissions")
      .select("role, permissions")
      .returns<RolePermissionRow[]>(),
  ]);

  const rolesWithPermission = new Set(
    (permissionRows ?? [])
      .filter((row) => normalizePermissions(row.permissions).includes(permission))
      .map((row) => row.role),
  );

  return (profiles ?? [])
    .filter(
      (row) =>
        row.is_admin === true ||
        normalizeCommunityRoles(row.community_roles).some((role) =>
          rolesWithPermission.has(role),
        ),
    )
    .map((row) => row.id);
}

/**
 * De profielen die deze module door hun groepen niet mogen gebruiken (0336),
 * voor meldingen en achtergrondtaken. Heeft geen enkele groep de module dicht,
 * dan kost dat één kleine vraag en geen profielen. Faalt het lezen, dan is
 * niemand buitengesloten: net als de poort is dit inrichting, geen beveiliging.
 *
 * Vraagt een client met leesrecht op alle profielen (admin-client).
 */
export async function profileIdsBlockedFrom(
  supabase: SupabaseClient,
  module: ModuleKey,
  profileIds?: readonly string[],
): Promise<Set<string>> {
  try {
    const { data: rows, error } = await supabase
      .from("community_role_permissions")
      .select("*")
      .returns<RolePermissionRow[]>();
    if (error || !rows) return new Set();
    const anyRoleBlocks = rows.some((row) =>
      roleBlockedModules(rows, [row.role], false).has(module),
    );
    if (!anyRoleBlocks) return new Set();

    if (profileIds && profileIds.length === 0) return new Set();
    // Alle profielen in één keer (een club is klein); een lange id-lijst in de
    // URL zou bij een melding aan iedereen te lang worden.
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_admin, community_roles")
      .returns<(ProfileAccessRow & { id: string })[]>();
    if (profileError) return new Set();
    const wanted = profileIds ? new Set(profileIds) : null;
    return new Set(
      (profiles ?? [])
        .filter((p) => !wanted || wanted.has(p.id))
        .filter((p) => roleBlockedModules(rows, p.community_roles, p.is_admin === true).has(module))
        .map((p) => p.id),
    );
  } catch {
    return new Set();
  }
}
