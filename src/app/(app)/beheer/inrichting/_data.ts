import "server-only";

import { createClient } from "@/lib/supabase/server";
import { WORD_FIELDS, type SetupSnapshot } from "@/lib/club-setup";
import { resolveDisabled, type ModuleKey } from "@/lib/modules";

// Vers uit de database, niet uit de gedeelde cache van getClub(): wie in de
// inrichting opslaat, moet meteen de nieuwe stand zien. Alle kolommen, zodat de
// schermen ook laden als een latere migratie er kolommen bij zet.

export type ClubSetupRow = {
  settings: Record<string, unknown>;
  modules: { key: string; enabled: boolean; label: string | null }[];
};

export async function loadClubSetupRow(): Promise<ClubSetupRow | null> {
  const supabase = await createClient();
  const [settings, modules] = await Promise.all([
    supabase.from("club_settings").select("*").maybeSingle(),
    supabase.from("club_modules").select("module_key, enabled, label"),
  ]);
  if (settings.error || modules.error) return null;
  return {
    settings: (settings.data ?? {}) as Record<string, unknown>,
    modules: (modules.data ?? []).map((m) => ({
      key: m.module_key as string,
      enabled: Boolean(m.enabled),
      label: (m.label as string | null)?.trim() || null,
    })),
  };
}

export function text(row: ClubSetupRow, column: string): string {
  const value = row.settings[column];
  return typeof value === "string" ? value : "";
}

/** De stand van de inrichting, voor het overzicht en de afrondknop. */
export function setupSnapshot(row: ClubSetupRow): SetupSnapshot {
  const s = row.settings;
  const str = (column: string) => (typeof s[column] === "string" && (s[column] as string).trim()) || null;
  const markers = Array.isArray(s.event_markers) ? (s.event_markers as string[]).filter(Boolean) : null;
  return {
    name: str("name") ?? "Club",
    shortName: str("short_name") ?? "Club",
    memberNoun: str("member_noun"),
    contactEmail: str("contact_email"),
    hasBrand: ["color_primary", "font", "logo_url", "mark_url"].some((column) => str(column)),
    switchedOff: resolveDisabled(row.modules.filter((m) => !m.enabled).map((m) => m.key as ModuleKey)).size,
    labels: row.modules.filter((m) => m.label).length,
    words: WORD_FIELDS.filter((field) => str(field.column)).length,
    eventMarkers: markers?.length ? markers : null,
    teamTag: str("team_tag"),
    instagramHandle: str("instagram_handle"),
    youtubeHandle: str("youtube_handle"),
  };
}

export async function loadSetupSnapshot(): Promise<SetupSnapshot | null> {
  const row = await loadClubSetupRow();
  return row ? setupSnapshot(row) : null;
}
