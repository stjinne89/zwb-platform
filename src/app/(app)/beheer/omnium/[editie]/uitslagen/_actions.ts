"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { nameKeyOf, scoreParsedRows } from "@/lib/omnium/import";
import {
  parseOmniumResults,
  type ParseIssue,
  type ParseMode,
  type ParsedResultRow,
} from "@/lib/omnium/parse-results";
import { resolveScoring } from "@/lib/omnium/scales";
import { recomputeEditionStandings } from "@/lib/omnium/standings";
import type { Discipline } from "@/lib/omnium/scoring";

type Admin = ReturnType<typeof createAdminClient>;
type Fail = { ok: false; error: string };

async function requireOmniumAccess(): Promise<
  { ok: true; userId: string; admin: Admin } | Fail
> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has("omnium.manage")) {
    return { ok: false, error: "Geen recht om het Omnium te beheren." };
  }
  return { ok: true, userId: access.user.id, admin: createAdminClient() };
}

export type ImportInput = {
  editionEventId: string;
  raw: string;
  mode: ParseMode;
  defaultLeague?: string | null;
};

export type PreviewRow = {
  lineNumber: number;
  name: string;
  teamName: string | null;
  league: string;
  status: string;
  position: number | null;
  points: number;
  /** known = bestaande renner, new = wordt aangemaakt. */
  match: "known" | "new";
  matchedVia: "zwift_id" | "name" | null;
  knownName: string | null;
};

export type PreviewOutcome =
  | { ok: true; rows: PreviewRow[]; issues: ParseIssue[]; newRiders: number }
  | Fail;

type RiderLookup = {
  byZwift: Map<string, { id: string; display_name: string }>;
  byName: Map<string, { id: string; display_name: string }>;
};

type EditionEvent = {
  id: string;
  edition_id: string;
  discipline: Discipline;
  omnium_editions: { season_id: string } | null;
};

async function loadEditionEvent(
  admin: Admin,
  editionEventId: string,
): Promise<EditionEvent | null> {
  const { data } = await admin
    .from("omnium_edition_events")
    .select("id, edition_id, discipline, omnium_editions!inner(season_id)")
    .eq("id", editionEventId)
    .maybeSingle();
  return (data as unknown as EditionEvent | null) ?? null;
}

/**
 * Zoekt bestaande renners op bij de geparseerde regels. Eerst op Zwift-ID,
 * daarna op genormaliseerde naam — nooit fuzzy. Een verkeerde koppeling op een
 * publieke uitslag is erger dan geen koppeling; dezelfde terughoudendheid als
 * in zwb-detection.ts.
 */
async function lookupRiders(
  admin: Admin,
  rows: ParsedResultRow[],
): Promise<RiderLookup> {
  const zwiftIds = [
    ...new Set(rows.map((row) => row.zwiftId).filter((id): id is string => !!id)),
  ];
  const nameKeys = [...new Set(rows.map((row) => nameKeyOf(row.name)))];

  const byZwift = new Map<string, { id: string; display_name: string }>();
  const byName = new Map<string, { id: string; display_name: string }>();

  const collect = (
    data: Array<Record<string, unknown>> | null,
    target: "zwift" | "name",
  ) => {
    for (const row of data ?? []) {
      // Een samengevoegde renner wijst door naar de overgebleven rij.
      if (row.merged_into_id) continue;
      const entry = {
        id: row.id as string,
        display_name: row.display_name as string,
      };
      if (target === "zwift" && row.zwift_id) {
        byZwift.set(row.zwift_id as string, entry);
      }
      if (target === "name") byName.set(row.name_key as string, entry);
    }
  };

  if (zwiftIds.length > 0) {
    const { data } = await admin
      .from("omnium_riders")
      .select("id, display_name, zwift_id, name_key, merged_into_id")
      .in("zwift_id", zwiftIds);
    collect(data, "zwift");
  }
  if (nameKeys.length > 0) {
    const { data } = await admin
      .from("omnium_riders")
      .select("id, display_name, zwift_id, name_key, merged_into_id")
      .in("name_key", nameKeys);
    collect(data, "name");
  }

  return { byZwift, byName };
}

function matchOf(row: ParsedResultRow, lookup: RiderLookup) {
  if (row.zwiftId) {
    const known = lookup.byZwift.get(row.zwiftId);
    if (known) return { rider: known, via: "zwift_id" as const };
  }
  const known = lookup.byName.get(nameKeyOf(row.name));
  if (known) return { rider: known, via: "name" as const };
  return null;
}

/** Parseert en scoort zonder iets weg te schrijven. */
export async function previewOmniumResults(
  input: ImportInput,
): Promise<PreviewOutcome> {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const editionEvent = await loadEditionEvent(guard.admin, input.editionEventId);
  if (!editionEvent) return { ok: false, error: "Onderdeel niet gevonden." };

  const { rows, issues } = parseOmniumResults(input.raw, {
    mode: input.mode,
    defaultLeague: input.defaultLeague,
  });
  if (rows.length === 0) {
    return { ok: true, rows: [], issues, newRiders: 0 };
  }

  const { data: season } = await guard.admin
    .from("omnium_seasons")
    .select("scoring")
    .eq("id", editionEvent.omnium_editions?.season_id ?? "")
    .maybeSingle();
  const scoring = resolveScoring(season?.scoring);

  const scored = scoreParsedRows(rows, {
    discipline: editionEvent.discipline,
    mode: input.mode,
    scoring,
  });
  const pointsByKey = new Map(
    scored.map((result) => [result.riderId, result]),
  );

  const lookup = await lookupRiders(guard.admin, rows);
  let newRiders = 0;

  const preview: PreviewRow[] = rows.map((row) => {
    const key = nameKeyOf(row.name);
    const result = pointsByKey.get(key);
    const known = matchOf(row, lookup);
    if (!known) newRiders += 1;
    return {
      lineNumber: row.lineNumber,
      name: row.name,
      teamName: row.teamName,
      league: row.league ?? "",
      status: row.status,
      position: result?.position ?? row.position,
      points: result?.points ?? 0,
      match: known ? "known" : "new",
      matchedVia: known?.via ?? null,
      knownName: known?.rider.display_name ?? null,
    };
  });

  return { ok: true, rows: preview, issues, newRiders };
}

/**
 * Slaat de uitslag van één onderdeel op en herberekent daarna de stand.
 *
 * Opnieuw importeren vervangt: eerst de bestaande rijen van dit onderdeel weg,
 * dan de nieuwe erin. Een upsert zou renners laten staan die in de gecorrigeerde
 * uitslag niet meer voorkomen.
 */
export async function saveOmniumResults(input: ImportInput) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const editionEvent = await loadEditionEvent(guard.admin, input.editionEventId);
  if (!editionEvent) return { ok: false as const, error: "Onderdeel niet gevonden." };

  const { rows } = parseOmniumResults(input.raw, {
    mode: input.mode,
    defaultLeague: input.defaultLeague,
  });
  if (rows.length === 0) {
    return { ok: false as const, error: "Geen bruikbare regels gevonden." };
  }

  const lookup = await lookupRiders(guard.admin, rows);

  // Renners die we nog niet kennen aanmaken, gededupliceerd op naamsleutel.
  const toCreate = new Map<
    string,
    { name_key: string; display_name: string; zwift_id: string | null; team_name: string | null; last_league: string | null }
  >();
  for (const row of rows) {
    if (matchOf(row, lookup)) continue;
    const key = nameKeyOf(row.name);
    if (toCreate.has(key)) continue;
    toCreate.set(key, {
      name_key: key,
      display_name: row.name,
      zwift_id: row.zwiftId,
      team_name: row.teamName,
      last_league: row.league,
    });
  }

  if (toCreate.size > 0) {
    const { data: created, error } = await guard.admin
      .from("omnium_riders")
      .insert([...toCreate.values()])
      .select("id, display_name, name_key, zwift_id");
    if (error) return { ok: false as const, error: error.message };
    for (const rider of created ?? []) {
      const entry = {
        id: rider.id as string,
        display_name: rider.display_name as string,
      };
      lookup.byName.set(rider.name_key as string, entry);
      if (rider.zwift_id) lookup.byZwift.set(rider.zwift_id as string, entry);
    }
  }

  const { data: season } = await guard.admin
    .from("omnium_seasons")
    .select("scoring")
    .eq("id", editionEvent.omnium_editions?.season_id ?? "")
    .maybeSingle();
  const scoring = resolveScoring(season?.scoring);

  const riderIdFor = (row: ParsedResultRow) =>
    matchOf(row, lookup)?.rider.id ?? "";

  // Hoe elke renner gevonden is, bewaren we per resultaat: bij de historische
  // import is dat het onderscheid tussen een harde Zwift-ID-match en een
  // naam-match die nog gecontroleerd moet worden.
  const matchedViaByRider = new Map<string, "zwift_id" | "name">();
  for (const row of rows) {
    const match = matchOf(row, lookup);
    if (!match) continue;
    const current = matchedViaByRider.get(match.rider.id);
    if (current === "zwift_id") continue;
    matchedViaByRider.set(match.rider.id, match.via);
  }

  const scored = scoreParsedRows(rows, {
    discipline: editionEvent.discipline,
    mode: input.mode,
    scoring,
    idOf: riderIdFor,
  });

  const unresolved = scored.filter((result) => !result.riderId);
  if (unresolved.length > 0) {
    return {
      ok: false as const,
      error: `${unresolved.length} regels konden niet aan een renner worden gekoppeld.`,
    };
  }

  const { error: clearError } = await guard.admin
    .from("omnium_results")
    .delete()
    .eq("edition_event_id", editionEvent.id);
  if (clearError) return { ok: false as const, error: clearError.message };

  const { error: insertError } = await guard.admin.from("omnium_results").insert(
    scored.map((result) => ({
      edition_id: editionEvent.edition_id,
      edition_event_id: editionEvent.id,
      rider_id: result.riderId,
      league: result.league,
      status: result.status,
      position: result.position,
      overall_position: result.overallPosition,
      time_seconds: result.timeSeconds,
      time_text: result.timeText,
      segment_seconds: result.segmentSeconds,
      finish_points: result.finishPoints,
      sprint_points: result.sprintPoints,
      points: result.points,
      points_raw: result.pointsRaw,
      voided_reason: result.voidedReason,
      matched_via: matchedViaByRider.get(result.riderId) ?? "name",
      source: "paste",
      entered_by: guard.userId,
    })),
  );
  if (insertError) return { ok: false as const, error: insertError.message };

  const { error: stateError } = await guard.admin
    .from("omnium_edition_events")
    .update({ results_state: "final" })
    .eq("id", editionEvent.id);
  if (stateError) return { ok: false as const, error: stateError.message };

  const recomputed = await recomputeEditionStandings(
    guard.admin,
    editionEvent.edition_id,
  );
  if (!recomputed.ok) return { ok: false as const, error: recomputed.error };

  revalidateAfterResults(editionEvent.edition_id);
  return {
    ok: true as const,
    saved: scored.length,
    createdRiders: toCreate.size,
    riders: recomputed.riders,
  };
}

export async function recomputeStandingsAction(editionId: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;

  const result = await recomputeEditionStandings(guard.admin, editionId);
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidateAfterResults(editionId);
  return { ok: true as const, riders: result.riders };
}

/**
 * Voegt twee renners samen. Bij naam-gematchte historische data ontstaan
 * onvermijdelijk dubbelen — dezelfde persoon anders gespeld — en zonder deze
 * knop is het seizoensklassement niet te repareren.
 */
export async function mergeRidersAction(input: {
  fromRiderId: string;
  intoRiderId: string;
}) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;
  if (input.fromRiderId === input.intoRiderId) {
    return { ok: false as const, error: "Kies twee verschillende renners." };
  }

  // De uitslagen verhuizen. Bij een botsing op (edition_event_id, rider_id)
  // hebben beide rijen dezelfde uitslag; dan wint de bestaande en gooien we de
  // dubbele weg.
  const { data: moving } = await guard.admin
    .from("omnium_results")
    .select("id, edition_event_id")
    .eq("rider_id", input.fromRiderId);
  const { data: existing } = await guard.admin
    .from("omnium_results")
    .select("edition_event_id")
    .eq("rider_id", input.intoRiderId);

  const taken = new Set(
    (existing ?? []).map((row) => row.edition_event_id as string),
  );
  const editionEvents = new Set<string>();

  for (const row of moving ?? []) {
    const eventId = row.edition_event_id as string;
    editionEvents.add(eventId);
    if (taken.has(eventId)) {
      const { error } = await guard.admin
        .from("omnium_results")
        .delete()
        .eq("id", row.id as string);
      if (error) return { ok: false as const, error: error.message };
      continue;
    }
    const { error } = await guard.admin
      .from("omnium_results")
      .update({ rider_id: input.intoRiderId })
      .eq("id", row.id as string);
    if (error) return { ok: false as const, error: error.message };
  }

  const { error: markError } = await guard.admin
    .from("omnium_riders")
    .update({ merged_into_id: input.intoRiderId })
    .eq("id", input.fromRiderId);
  if (markError) return { ok: false as const, error: markError.message };

  // Elke editie die dit raakte opnieuw doorrekenen.
  if (editionEvents.size > 0) {
    const { data: affected } = await guard.admin
      .from("omnium_edition_events")
      .select("edition_id")
      .in("id", [...editionEvents]);
    for (const editionId of new Set(
      (affected ?? []).map((row) => row.edition_id as string),
    )) {
      const result = await recomputeEditionStandings(guard.admin, editionId);
      if (!result.ok) return { ok: false as const, error: result.error };
      revalidateAfterResults(editionId);
    }
  }

  return { ok: true as const, moved: moving?.length ?? 0 };
}

function revalidateAfterResults(editionId: string) {
  revalidatePath(`/beheer/omnium/${editionId}`);
  revalidatePath(`/beheer/omnium/${editionId}/uitslagen`);
  revalidatePath("/beheer/omnium");
  revalidatePath("/omnium");
  revalidatePath("/omnium/klassement");
}
