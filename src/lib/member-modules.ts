import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { getClub } from "@/lib/club";
import { parseDashboardHidden, type DashboardPartKey } from "@/lib/dashboard-parts";
import { hiddenByMember, parseMemberHidden, type MemberHidden } from "@/lib/member-view";
import { pathAllowed, type ModuleKey } from "@/lib/modules";

// Wat dit lid kan en wil zien, één keer per request (0336).
//
// Drie lagen boven elkaar: de club zet een module aan of uit (0313), de
// ledengroepen sluiten er een af (lib/module-access.ts), en het lid verbergt er
// zelf een (lib/member-view.ts). De eerste twee sluiten af, de derde verbergt.

export type MemberModules = {
  /** Mag het lid deze module gebruiken: aan bij de club en open voor een van zijn groepen? */
  canUse: (key: ModuleKey) => boolean;
  /** Mag het lid dit pad openen? Kernpaden altijd. */
  allowsPath: (pathname: string) => boolean;
  /** Mag het en heeft het lid de module niet verborgen? */
  shows: (key: ModuleKey) => boolean;
  /** Mag het en heeft het lid dit pad (module of ZWBeter-onderdeel) niet verborgen? */
  showsPath: (pathname: string) => boolean;
  hidden: MemberHidden;
  /** Wat het lid op het dashboard verborgen heeft (0318). */
  dashboardHidden: Set<DashboardPartKey>;
};

type TilesRow = { module_hidden?: unknown; dashboard_hidden?: unknown };

export const getMemberModules = cache(async (): Promise<MemberModules> => {
  // De gebruiker komt uit de sessie, zonder netwerk; de rest vertrekt samen.
  const [user, supabase] = await Promise.all([getRequestUser(), createClient()]);
  const [club, access, row] = await Promise.all([
    getClub(),
    getRequestAccess(),
    // Alle kolommen, zodat het lezen niet faalt zolang 0336 er niet is. Bij een
    // fout is niets verborgen.
    user
      ? Promise.resolve(
          supabase.from("profile_stats_tiles").select("*").eq("profile_id", user.id).maybeSingle(),
        ).then(
          ({ data }) => (data as TilesRow | null) ?? null,
          () => null,
        )
      : Promise.resolve(null),
  ]);

  const blocked = new Set<ModuleKey>([...club.disabled, ...access.blockedModules]);
  const hidden = parseMemberHidden(row?.module_hidden);
  const canUse = (key: ModuleKey) => !blocked.has(key);
  const allowsPath = (pathname: string) => pathAllowed(pathname, blocked);
  return {
    canUse,
    allowsPath,
    shows: (key) => canUse(key) && !hidden.modules.has(key),
    showsPath: (pathname) => allowsPath(pathname) && !hiddenByMember(pathname, hidden),
    hidden,
    dashboardHidden: parseDashboardHidden(row?.dashboard_hidden),
  };
});
