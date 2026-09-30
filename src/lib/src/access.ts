// Wie de Sunday Race Club mag beheren (migr. 0204): het eigen recht src.manage,
// en daarnaast wie al alle events of de community beheert.

import type { CommunityPermission } from "@/lib/permissions";

export const SRC_MANAGERS: CommunityPermission[] = [
  "src.manage",
  "events.manage_all",
  "community.manage",
];
