// Wie de Sunday Race Club mag beheren: het recht src.manage (migr. 0204). Tot
// 2026-10-01 telden ook events.manage_all en community.manage; die rollen hebben
// src.manage sindsdien zelf (0204), dus de terugval is weg.

import type { CommunityPermission } from "@/lib/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";

export const SRC_MANAGERS: CommunityPermission[] = [adminAreaPermission("src")];
