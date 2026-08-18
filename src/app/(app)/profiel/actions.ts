"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { amsterdamDateKey, parseDateKey } from "@/lib/birthdays";
import { intervalsId, stravaHandle, zwiftId } from "@/lib/profile/ids";
import { WELLNESS_DEVICES } from "@/lib/training/wellness";

const ZRL_CATS = ["A", "B", "C", "D", "E"] as const;
const ZRL_DIVISIONS = ["open", "women"] as const;
const VISIBILITY_FIELDS = [
  "avatar",
  "region",
  "zwift_id",
  "strava_id",
  "intervals_id",
  "zrl_category",
  "ftp_watts",
  "weight_kg",
  "bio",
  "roles",
  "badges",
] as const;

function optionalNumber(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function optionalString(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

/**
 * Leeg mag, onzin niet. Zonder deze controle belandde "weet ik niet" gewoon in
 * zwift_id en bleef de koppeling stil kapot: de chip verscheen niet en niemand
 * zag waarom.
 */
function parsedId(
  v: FormDataEntryValue | null,
  parse: (raw: string | null) => string | null,
  error: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const raw = optionalString(v);
  if (!raw) return { ok: true, value: null };
  const parsed = parse(raw);
  return parsed ? { ok: true, value: parsed } : { ok: false, error };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const display_name = String(formData.get("display_name") ?? "").trim();
  if (!display_name) return { ok: false as const, error: "Naam is verplicht." };

  const zwift = parsedId(
    formData.get("zwift_id"),
    zwiftId,
    "Zwift-ID moet een nummer zijn, of plak de link naar je ZwiftPower-profiel.",
  );
  if (!zwift.ok) return { ok: false as const, error: zwift.error };
  const strava = parsedId(
    formData.get("strava_id"),
    stravaHandle,
    "Strava-ID klopt niet. Gebruik je atletennummer, je gebruikersnaam of de link naar je profiel.",
  );
  if (!strava.ok) return { ok: false as const, error: strava.error };
  const intervals = parsedId(
    formData.get("intervals_id"),
    intervalsId,
    "intervals.icu-ID heeft de vorm i141441, of plak de link naar je profiel.",
  );
  if (!intervals.ok) return { ok: false as const, error: intervals.error };

  const zrlRaw = optionalString(formData.get("zrl_category"));
  const zrl_category =
    zrlRaw && (ZRL_CATS as readonly string[]).includes(zrlRaw) ? zrlRaw : null;
  const zrlDivisionRaw = optionalString(formData.get("zrl_division"));
  const zrl_division =
    zrlDivisionRaw && (ZRL_DIVISIONS as readonly string[]).includes(zrlDivisionRaw)
      ? zrlDivisionRaw
      : "open";

  const wellnessDeviceRaw = optionalString(formData.get("wellness_device"));
  const wellness_device =
    wellnessDeviceRaw && (WELLNESS_DEVICES as readonly string[]).includes(wellnessDeviceRaw)
      ? wellnessDeviceRaw
      : null;

  const ftp = optionalNumber(formData.get("ftp_watts"));
  const weight = optionalNumber(formData.get("weight_kg"));
  const autoSyncPhysique = formData.get("auto_sync_physique") === "on";
  const birthDateRaw = optionalString(formData.get("birth_date"));
  const birthDate = birthDateRaw ? parseDateKey(birthDateRaw) : null;
  if (birthDateRaw && !birthDate) {
    return { ok: false as const, error: "Vul een geldige geboortedatum in." };
  }
  const todayKey = amsterdamDateKey();
  if (birthDate && (birthDate.dateKey < "1900-01-01" || birthDate.dateKey > todayKey)) {
    return {
      ok: false as const,
      error: "De geboortedatum moet tussen 1900 en vandaag liggen.",
    };
  }
  const shareBirthday = formData.get("share_birthday") === "on";
  if (shareBirthday && !birthDate) {
    return {
      ok: false as const,
      error: "Vul eerst je geboortedatum in om je verjaardag te delen.",
    };
  }
  const profile_visibility = Object.fromEntries(
    VISIBILITY_FIELDS.map((field) => [
      field,
      formData.get(`visible_${field}`) === "on",
    ]),
  );

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      region: optionalString(formData.get("region")),
      zwift_id: zwift.value,
      mywhoosh_id: optionalString(formData.get("mywhoosh_id")),
      strava_id: strava.value,
      intervals_id: intervals.value,
      zrl_category,
      zrl_division,
      wellness_device,
      auto_sync_physique: autoSyncPhysique,
      // Bij auto-sync blijven de bestaande waarden staan; de intervals-sync
      // schrijft ze bij (de velden staan in het formulier op alleen-lezen).
      ...(autoSyncPhysique
        ? {}
        : {
            ftp_watts: ftp !== null && ftp > 0 && ftp < 800 ? Math.round(ftp) : null,
            weight_kg: weight !== null && weight > 0 && weight < 300 ? weight : null,
          }),
      bio: optionalString(formData.get("bio")),
      birth_date: birthDate?.dateKey ?? null,
      share_birthday: shareBirthday,
      public_profile_enabled: formData.get("public_profile_enabled") === "on",
      profile_visibility,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profiel");
  revalidatePath("/leden");
  revalidatePath("/kalender");
  revalidatePath("/teams");
  revalidatePath(`/leden/${user.id}`);
  revalidatePath(`/profielen/${user.id}`);
  return { ok: true as const };
}
