"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  DEFAULT_OMNIUM_PARTS,
  generateEdition,
  validateEditionSpec,
  type OmniumEditionSpec,
  type OmniumPartSpec,
} from "@/lib/omnium/edition";
import {
  planOmniumSeason,
  validateSeasonPlanSpec,
  type OmniumSeasonPlanSpec,
} from "@/lib/omnium/season-plan";
import type { Discipline } from "@/lib/omnium/scoring";

type Fail = { ok: false; error: string };
type Access = Awaited<ReturnType<typeof getCurrentUserAccess>>;

/**
 * Omnium-tabellen hebben geen write-policy (huisregel: schrijven alleen via de
 * service-role), dus elke mutatie loopt hierlangs: eerst het recht checken op
 * de RLS-client, daarna schrijven met de admin-client.
 */
async function requireOmniumAccess(): Promise<
  { ok: true; access: Access; admin: ReturnType<typeof createAdminClient> } | Fail
> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("omnium.manage")) {
    return { ok: false, error: "Geen recht om het Omnium te beheren." };
  }
  return { ok: true, access, admin: createAdminClient() };
}

function revalidateOmnium(editionSlug?: string | null) {
  revalidatePath("/beheer/omnium");
  revalidatePath("/kalender");
  revalidatePath("/omnium");
  revalidatePath("/omnium/standings");
  revalidatePath("/omnium", "layout");
  if (editionSlug) revalidatePath(`/omnium/${editionSlug}`);
}

export type SeasonInput = {
  slug: string;
  name: string;
  startsOn?: string | null;
  endsOn?: string | null;
};

export async function saveSeasonRules(seasonId: string, rules: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;
  if (typeof rules !== "string" || rules.length > 100_000) return { ok: false as const, error: "Reglement te lang." };
  const { error } = await guard.admin.from("omnium_seasons").update({ rules_md: rules.trim() || null }).eq("id", seasonId);
  if (error) return { ok: false as const, error: error.message };
  revalidateOmnium();
  return { ok: true as const };
}

export async function createOmniumSeason(input: SeasonInput) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false as const, error: "Gebruik alleen letters, cijfers en streepjes in de slug." };
  }
  if (!input.name.trim()) {
    return { ok: false as const, error: "Vul een naam in." };
  }

  const findExisting = () =>
    guard.admin
      .from("omnium_seasons")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

  // Het formulier start met de slug van het lopende seizoen. Een tweede klik
  // hoort daarom dat seizoen te openen en geen databasefout te tonen.
  const existing = await findExisting();
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data) {
    return {
      ok: true as const,
      seasonId: existing.data.id as string,
      seasonSlug: existing.data.slug as string,
    };
  }

  const { data, error } = await guard.admin
    .from("omnium_seasons")
    .insert({
      slug,
      name: input.name.trim(),
      starts_on: input.startsOn || null,
      ends_on: input.endsOn || null,
    })
    .select("id, slug")
    .single();
  if (error) {
    // Twee beheerders kunnen dezelfde slug tegelijk aanmaken. Degene die de
    // unieke index verliest, gebruikt de inmiddels bestaande rij.
    if (error.code === "23505") {
      const concurrent = await findExisting();
      if (concurrent.error) {
        return { ok: false as const, error: concurrent.error.message };
      }
      if (concurrent.data) {
        return {
          ok: true as const,
          seasonId: concurrent.data.id as string,
          seasonSlug: concurrent.data.slug as string,
        };
      }
    }
    return { ok: false as const, error: error.message };
  }

  revalidateOmnium();
  return {
    ok: true as const,
    seasonId: data.id as string,
    seasonSlug: data.slug as string,
  };
}

/** Publiceren van het seizoen zet de GC-pagina publiek; de edities apart. */
export async function setSeasonPublished(seasonId: string, published: boolean) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const { error } = await guard.admin
    .from("omnium_seasons")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", seasonId);
  if (error) return { ok: false as const, error: error.message };

  revalidateOmnium();
  return { ok: true as const };
}

export async function setSeasonCurrent(seasonId: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  // Er is een partiële unieke index op is_current, dus eerst het oude seizoen
  // vrijgeven en daarna pas het nieuwe zetten.
  const clear = await guard.admin
    .from("omnium_seasons")
    .update({ is_current: false })
    .eq("is_current", true);
  if (clear.error) return { ok: false as const, error: clear.error.message };

  const { error } = await guard.admin
    .from("omnium_seasons")
    .update({ is_current: true })
    .eq("id", seasonId);
  if (error) return { ok: false as const, error: error.message };

  revalidateOmnium();
  return { ok: true as const };
}

export type PlanSeasonInput = OmniumSeasonPlanSpec & { seasonId: string };

/**
 * Zet een heel seizoen in één keer als concept-edities neer.
 *
 * Idempotent, maar bewust niet met een blinde upsert: bestaande edities houden
 * hun titel, slug en routes, en krijgen alleen een nieuwe starttijd als de
 * planning verschuift. Anders zou een tweede klik het handwerk van de
 * beheerder overschrijven.
 */
export async function planSeasonEditions(input: PlanSeasonInput) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const errors = validateSeasonPlanSpec(input);
  if (errors.length > 0) return { ok: false as const, error: errors.join(" ") };

  const planned = planOmniumSeason(input);
  if (planned.length === 0) {
    return { ok: false as const, error: "Deze opgave levert geen edities op." };
  }

  const { data: existingRows, error: readError } = await guard.admin
    .from("omnium_editions")
    .select("id, number, slug, starts_at")
    .eq("season_id", input.seasonId);
  if (readError) return { ok: false as const, error: readError.message };

  const existing = new Map(
    (existingRows ?? []).map((row) => [row.number as number, row]),
  );

  let created = 0;
  let updated = 0;

  for (const edition of planned) {
    const known = existing.get(edition.number);
    if (known) {
      if (new Date(known.starts_at as string).toISOString() !== edition.startAtIso) {
        const { error } = await guard.admin
          .from("omnium_editions")
          .update({
            starts_at: edition.startAtIso,
            preshow_at: edition.preshowAtIso,
          })
          .eq("id", known.id as string);
        if (error) return { ok: false as const, error: error.message };
        updated += 1;
      }
      const shifted = await syncEditionParts(
        guard.admin,
        known.id as string,
        edition.startAtIso,
        null,
      );
      if (!shifted.ok) return shifted;
      continue;
    }

    const { data: inserted, error } = await guard.admin
      .from("omnium_editions")
      .insert({
        season_id: input.seasonId,
        number: edition.number,
        slug: `editie-${edition.number}`,
        title: `Editie ${edition.number}`,
        starts_at: edition.startAtIso,
        preshow_at: edition.preshowAtIso,
        status: "concept",
        created_by: guard.access.user!.id,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };

    const parts = await syncEditionParts(
      guard.admin,
      inserted.id as string,
      edition.startAtIso,
      DEFAULT_OMNIUM_PARTS,
    );
    if (!parts.ok) return parts;
    created += 1;
  }

  revalidateOmnium();
  return { ok: true as const, created, updated, planned: planned.length };
}

/**
 * Herberekent de starttijden van de vier onderdelen vanaf de start van de
 * editie. `defaults` vult ontbrekende onderdelen aan; bestaande onderdelen
 * houden hun route en duur en schuiven alleen mee.
 */
async function syncEditionParts(
  admin: ReturnType<typeof createAdminClient>,
  editionId: string,
  startAtIso: string,
  defaults: OmniumPartSpec[] | null,
): Promise<{ ok: true } | Fail> {
  const { data: rows, error } = await admin
    .from("omnium_edition_events")
    .select("id, discipline, order_index, title, duration_minutes, break_minutes")
    .eq("edition_id", editionId)
    .neq("discipline", "recon")
    .order("order_index");
  if (error) return { ok: false, error: error.message };

  const known = new Map(
    (rows ?? []).map((row) => [row.discipline as Discipline, row]),
  );

  const specs: OmniumPartSpec[] = DEFAULT_OMNIUM_PARTS.map((fallback) => {
    const row = known.get(fallback.discipline);
    if (!row) return fallback;
    return {
      ...fallback,
      title: (row.title as string) ?? fallback.title,
      durationMinutes: (row.duration_minutes as number) ?? fallback.durationMinutes,
      breakMinutes: (row.break_minutes as number) ?? fallback.breakMinutes,
    };
  });

  if (!defaults && known.size === 0) return { ok: true };

  let cursor = new Date(startAtIso).getTime();
  for (const [index, spec] of specs.entries()) {
    const partStart = new Date(cursor).toISOString();
    cursor += (spec.durationMinutes + spec.breakMinutes) * 60_000;

    const row = known.get(spec.discipline);
    if (row) {
      const { error: updateError } = await admin
        .from("omnium_edition_events")
        .update({ starts_at: partStart, order_index: index + 1 })
        .eq("id", row.id as string);
      if (updateError) return { ok: false, error: updateError.message };
      continue;
    }
    if (!defaults) continue;

    const { error: insertError } = await admin
      .from("omnium_edition_events")
      .insert({
        edition_id: editionId,
        discipline: spec.discipline,
        order_index: index + 1,
        title: spec.title,
        starts_at: partStart,
        duration_minutes: spec.durationMinutes,
        break_minutes: spec.breakMinutes,
        drafting: spec.drafting ?? null,
        sprint_count: spec.sprintCount ?? 0,
      });
    if (insertError) return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

export type EditionDetailInput = {
  editionId: string;
  title: string;
  subtitle?: string;
  slug: string;
  introMd?: string;
  youtubeUrl?: string;
  reconDateKey?: string;
  reconTimeLocal?: string;
  reconZwiftEventId?: string;
  parts: Array<
    OmniumPartSpec & {
      routeName?: string;
      routeUrl?: string;
      world?: string;
      distanceKm?: number;
      laps?: number;
      zwiftEventId?: string;
    }
  >;
};

/** Slaat één editie op, inclusief de vier onderdelen en hun starttijden. */
export async function updateOmniumEdition(input: EditionDetailInput) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const { data: edition, error: readError } = await guard.admin
    .from("omnium_editions")
    .select("id, season_id, number, starts_at, preshow_at, slug")
    .eq("id", input.editionId)
    .maybeSingle();
  if (readError) return { ok: false as const, error: readError.message };
  if (!edition) return { ok: false as const, error: "Editie niet gevonden." };

  const startAt = new Date(edition.starts_at as string);
  const dateKey = startAt.toISOString().slice(0, 10);
  const spec: OmniumEditionSpec = {
    seasonSlug: String(edition.season_id),
    number: edition.number as number,
    slug: input.slug.trim(),
    title: input.title.trim(),
    subtitle: input.subtitle,
    dateKey,
    firstStartLocal: amsterdamHhmm(startAt),
    reconDateKey: input.reconDateKey || undefined,
    reconTimeLocal: input.reconTimeLocal || undefined,
    parts: input.parts,
  };

  const errors = validateEditionSpec(spec);
  if (errors.length > 0) return { ok: false as const, error: errors.join(" ") };

  const generated = generateEdition(spec);
  if (!generated) return { ok: false as const, error: "Kon de editie niet berekenen." };

  const { error: editionError } = await guard.admin
    .from("omnium_editions")
    .update({
      title: spec.title,
      subtitle: input.subtitle?.trim() || null,
      slug: spec.slug,
      intro_md: input.introMd?.trim() || null,
      youtube_url: input.youtubeUrl?.trim() || null,
      preshow_at: generated.preshowAtIso ?? edition.preshow_at,
    })
    .eq("id", input.editionId);
  if (editionError) return { ok: false as const, error: editionError.message };

  for (const part of generated.parts) {
    const source = input.parts.find((row) => row.discipline === part.discipline);
    const { error } = await guard.admin
      .from("omnium_edition_events")
      .upsert(
        {
          edition_id: input.editionId,
          discipline: part.discipline,
          order_index: part.orderIndex,
          title: part.title,
          starts_at: part.startAtIso,
          duration_minutes: part.durationMinutes,
          break_minutes: part.breakMinutes,
          route_name: source?.routeName?.trim() || null,
          route_url: source?.routeUrl?.trim() || null,
          world: source?.world?.trim() || null,
          distance_km: source?.distanceKm ?? null,
          laps: source?.laps ?? null,
          zwift_event_id: source?.zwiftEventId?.trim() || null,
          sprint_count: source?.sprintCount ?? 0,
          drafting: source?.drafting ?? null,
        },
        { onConflict: "edition_id,discipline" },
      );
    if (error) return { ok: false as const, error: error.message };
  }

  revalidateOmnium(spec.slug);
  return { ok: true as const };
}

function amsterdamHhmm(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Publiceren doet twee dingen: de editie publiek maken en het kalenderitem
 * aanmaken. Dat kalenderitem loopt van de voorbeschouwing tot het einde van de
 * Crit Royale, zodat leden in `/kalender` de hele uitzending zien staan.
 */
export async function publishOmniumEdition(editionId: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const { data: edition, error: readError } = await guard.admin
    .from("omnium_editions")
    .select("id, slug, title, number, starts_at, preshow_at, event_id, published_at")
    .eq("id", editionId)
    .maybeSingle();
  if (readError) return { ok: false as const, error: readError.message };
  if (!edition) return { ok: false as const, error: "Editie niet gevonden." };

  const { data: parts, error: partsError } = await guard.admin
    .from("omnium_edition_events")
    .select("starts_at, duration_minutes, discipline")
    .eq("edition_id", editionId)
    .neq("discipline", "recon")
    .order("order_index");
  if (partsError) return { ok: false as const, error: partsError.message };
  if (!parts || parts.length === 0) {
    return { ok: false as const, error: "Deze editie heeft nog geen onderdelen." };
  }

  const last = parts[parts.length - 1];
  const endAt = new Date(
    new Date(last.starts_at as string).getTime() +
      ((last.duration_minutes as number) ?? 20) * 60_000,
  ).toISOString();
  const calendarStart =
    (edition.preshow_at as string | null) ?? (edition.starts_at as string);

  const eventRow = {
    type: "omnium" as const,
    title: `${edition.title as string} — ZWB Omnium ${edition.number as number}`,
    start_at: calendarStart,
    end_at: endAt,
    created_by: guard.access.user!.id,
  };

  let eventId = edition.event_id as string | null;
  if (eventId) {
    const { error } = await guard.admin
      .from("events")
      .update({ title: eventRow.title, start_at: eventRow.start_at, end_at: eventRow.end_at })
      .eq("id", eventId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data: inserted, error } = await guard.admin
      .from("events")
      .insert(eventRow)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    eventId = inserted.id as string;
  }

  const { error: publishError } = await guard.admin
    .from("omnium_editions")
    .update({
      published_at: (edition.published_at as string | null) ?? new Date().toISOString(),
      status: "published",
      event_id: eventId,
    })
    .eq("id", editionId);
  if (publishError) return { ok: false as const, error: publishError.message };

  revalidateOmnium(edition.slug as string);
  return { ok: true as const };
}

/**
 * Depubliceren haalt de editie van de publieke pagina's af, maar laat het
 * kalenderitem staan: daar kunnen al RSVP's en chatberichten aan hangen en die
 * mag een zichtbaarheidsknop niet weggooien.
 */
export async function unpublishOmniumEdition(editionId: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const { data: edition } = await guard.admin
    .from("omnium_editions")
    .select("slug")
    .eq("id", editionId)
    .maybeSingle();

  const { error } = await guard.admin
    .from("omnium_editions")
    .update({ published_at: null, status: "concept" })
    .eq("id", editionId);
  if (error) return { ok: false as const, error: error.message };

  revalidateOmnium((edition?.slug as string | undefined) ?? null);
  return { ok: true as const };
}
