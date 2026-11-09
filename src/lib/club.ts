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
import { resolveFont, resolvePalette, type ClubFont, type ClubPalette } from "@/lib/club-theme";
import { buildClubTexts, type ClubTexts } from "@/lib/club-texts";

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
  /** Eigen kleuren (0314), of null: dan de standaard huisstijl. */
  palette: ClubPalette | null;
  /** Eigen letter (0315), of null: Barlow Semi Condensed. */
  font: ClubFont | null;
  /** Logo en beeldmerk (0315) als publieke URL, of null: de vaste ZWB-bestanden. */
  logoUrl: string | null;
  markUrl: string | null;
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
  palette: null,
  font: null,
  logoUrl: null,
  markUrl: null,
};

const loadClubRows = unstable_cache(
  async (): Promise<ClubRow> => {
    const supabase = createPublicClient();
    const [settings, modules] = await Promise.all([
      supabase
        .from("club_settings")
        // Alle kolommen: zo werkt dit vóór en na een migratie die er kolommen
        // bij zet (0314), en valt de app niet terug op "Club" als de code eerder
        // live staat dan de migratie.
        .select("*")
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
            palette: resolvePalette({
              primary: s.color_primary as string | null | undefined,
              secondary: s.color_secondary as string | null | undefined,
              neutral: s.color_neutral as string | null | undefined,
              accent: s.color_accent as string | null | undefined,
              ink: s.color_ink as string | null | undefined,
            }),
            font: resolveFont(s.font as string | null | undefined),
            logoUrl: (s.logo_url as string | null) ?? null,
            markUrl: (s.mark_url as string | null) ?? null,
          }
        : null,
      modules: (modules.data ?? []).map((m) => ({
        key: m.module_key as string,
        enabled: Boolean(m.enabled),
        label: (m.label as string | null) ?? null,
      })),
    };
  },
  ["club-settings", "v3"],
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
  /** Clubnaam en modulenamen in één, ook voor client components (fase 3). */
  texts: ClubTexts;
};

export function buildClub(row: ClubRow | null): Club {
  const switchedOffKeys = (row?.modules ?? []).filter((m) => !m.enabled).map((m) => m.key);
  const disabled = resolveDisabled(switchedOffKeys);
  const switchedOff = new Set(MODULES.map((m) => m.key).filter((k) => switchedOffKeys.includes(k)));
  const labels = new Map((row?.modules ?? []).map((m) => [m.key, m.label]));
  const settings = row?.settings ?? EMPTY_CLUB_SETTINGS;
  const moduleLabel = (key: ModuleKey) => labels.get(key)?.trim() || moduleDef(key).label;
  return {
    settings,
    disabled,
    switchedOff,
    isEnabled: (key) => !disabled.has(key),
    allowsPath: (pathname) => pathAllowed(pathname, disabled),
    moduleLabel,
    texts: buildClubTexts(settings.name, settings.shortName, moduleLabel),
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

/** De naam van een module bij deze club, voor server components en metadata. */
export async function moduleName(key: ModuleKey): Promise<string> {
  return (await getClub()).moduleLabel(key);
}
