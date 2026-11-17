// Onderdelen per ledengroep afsluiten (wens eigenaar, 2026-11-17; migratie 0336).
//
// Per groep staat in community_role_permissions.blocked_modules welke modules die
// groep niet mag gebruiken. Een lid zit in een of meer groepen; open wint: een
// module is alleen dicht als elke groep van het lid hem dicht heeft. Anders zou
// de basisrol Communitylid, die bijna iedereen heeft, alles bepalen. Een
// beheerder (is_admin) komt overal in.
//
// Een groep zonder rij, of zonder de kolom (0336 nog niet toegepast), heeft
// alles open. Een module die een dichte module vereist (zoals het managerspel de
// teams), is voor die groep ook dicht.
//
// Puur en zonder serverafhankelijkheden: middleware, rechten en tests lezen
// hieruit.

import { normalizeCommunityRoles } from "@/lib/community-roles";
import { isModuleKey, resolveDisabled, type ModuleKey } from "@/lib/modules";

export type RoleModuleRow = {
  role: string;
  blocked_modules?: unknown;
};

/** De bekende modulesleutels uit wat er opgeslagen staat. */
export function parseModuleKeys(value: unknown): ModuleKey[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is ModuleKey => typeof v === "string" && isModuleKey(v)))];
}

/** De modules die dit lid door zijn groepen niet mag gebruiken. */
export function roleBlockedModules(
  rows: readonly RoleModuleRow[] | null | undefined,
  roles: readonly string[] | null | undefined,
  isAdmin: boolean,
): Set<ModuleKey> {
  if (isAdmin) return new Set();
  const byRole = new Map((rows ?? []).map((row) => [row.role, row.blocked_modules]));
  let blocked: Set<ModuleKey> | undefined;
  for (const role of normalizeCommunityRoles(roles)) {
    const own = resolveDisabled(parseModuleKeys(byRole.get(role)));
    const next: Set<ModuleKey> = blocked ? new Set([...blocked].filter((key) => own.has(key))) : own;
    if (next.size === 0) return next;
    blocked = next;
  }
  return blocked ?? new Set<ModuleKey>();
}
