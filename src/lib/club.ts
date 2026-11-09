import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  MODULES,
  moduleDef,
  pathAllowed,
  resolveDisabled,
  type ModuleKey,
} from "@/lib/modules";

// De instellingen van deze installatie (0313): naam, contact en welke modules
// aan staan. Fase 1 van de generieke versie (docs/multi-club-ontwerp.md).
//
// Gedeeld gecachet tussen alle bezoekers, zoals de sponsorbalk: de layout vraagt
// dit op elke pagina, en de rijen veranderen zelden. /beheer/modules leegt de
// cache meteen met updateTag(CLUB_TAG). De tabellen zijn voor anon leesbaar,
// dus de publieke client zonder cookies volstaat en blijft cachebaar.

export const CLUB_TAG = "club-settings";

export type ClubSettings = {
  name: string;
  shortName: string;
  memberNoun: string | null;
  memberNounPlural: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  setupCompletedAt: string | null;
};

type ClubRow = {
  settings: ClubSettings | null;
  modules: { key: string; enabled: boolean; label: string | null }[];
};

/**
 * Wat een installatie zonder rij ziet. Neutraal, want een nieuwe club heeft nog
 * niets ingevuld. Ook de terugval als de tabel nog niet bestaat (code vóór de
 * migratie live): dan staat alles aan, en verandert er voor de leden niets.
 */
export const EMPTY_CLUB_SETTINGS: ClubSettings = {
  name: "Club",
  shortName: "Club",
  memberNoun: null,
  memberNounPlural: null,
  contactEmail: null,
  websiteUrl: null,
  instagramHandle: null,
  youtubeHandle: null,
  setupCompletedAt: null,
};

const loadClubRows = unstable_cache(
  async (): Promise<ClubRow> => {
    const supabase = createPublicClient();
    const [settings, modules] = await Promise.all([
      supabase
        .from("club_settings")
        .select(
          "name, short_name, member_noun, member_noun_plural, contact_email, website_url, instagram_handle, youtube_handle, setup_completed_at",
        )
        .maybeSingle(),
      supabase.from("club_modules").select("module_key, enabled, label"),
    ]);
    // Een fout (bijv. de tabel bestaat nog niet) gooit, zodat die niet een uur
    // in de cache blijft staan; getClub() valt dan terug op "alles aan".
    if (settings.error) throw settings.error;
    if (modules.error) throw modules.error;
    const s = settings.data;
    return {
      settings: s
        ? {
            name: s.name as string,
            shortName: s.short_name as string,
            memberNoun: (s.member_noun as string | null) ?? null,
            memberNounPlural: (s.member_noun_plural as string | null) ?? null,
            contactEmail: (s.contact_email as string | null) ?? null,
            websiteUrl: (s.website_url as string | null) ?? null,
            instagramHandle: (s.instagram_handle as string | null) ?? null,
            youtubeHandle: (s.youtube_handle as string | null) ?? null,
            setupCompletedAt: (s.setup_completed_at as string | null) ?? null,
          }
        : null,
      modules: (modules.data ?? []).map((m) => ({
        key: m.module_key as string,
        enabled: Boolean(m.enabled),
        label: (m.label as string | null) ?? null,
      })),
    };
  },
  ["club-settings", "v1"],
  { revalidate: 60 * 60, tags: [CLUB_TAG] },
);

export type Club = {
  settings: ClubSettings;
  /** Modules die uit staan, ook die uit staan omdat een vereiste module uit is. */
  disabled: ReadonlySet<ModuleKey>;
  /** Modules die de club zelf heeft uitgezet. */
  switchedOff: ReadonlySet<ModuleKey>;
  isEnabled: (key: ModuleKey) => boolean;
  /** Mag dit pad getoond worden? Kernpaden altijd. */
  allowsPath: (pathname: string) => boolean;
  /** De naam van de module bij deze club. */
  moduleLabel: (key: ModuleKey) => string;
};

export function buildClub(row: ClubRow | null): Club {
  const switchedOffKeys = (row?.modules ?? []).filter((m) => !m.enabled).map((m) => m.key);
  const disabled = resolveDisabled(switchedOffKeys);
  const switchedOff = new Set(MODULES.map((m) => m.key).filter((k) => switchedOffKeys.includes(k)));
  const labels = new Map((row?.modules ?? []).map((m) => [m.key, m.label]));
  return {
    settings: row?.settings ?? EMPTY_CLUB_SETTINGS,
    disabled,
    switchedOff,
    isEnabled: (key) => !disabled.has(key),
    allowsPath: (pathname) => pathAllowed(pathname, disabled),
    moduleLabel: (key) => labels.get(key)?.trim() || moduleDef(key).label,
  };
}

/** De clubinstellingen voor deze request. Faalt het lezen, dan staat alles aan. */
export const getClub = cache(async (): Promise<Club> => {
  try {
    return buildClub(await loadClubRows());
  } catch {
    return buildClub(null);
  }
});
