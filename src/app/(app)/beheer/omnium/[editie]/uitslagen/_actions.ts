"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  prepareResultInput,
  checkResultRows,
  eligibleResultRows,
  resultKeyResolver,
} from "@/lib/omnium/result-input";
import { fetchOmniumResults } from "@/lib/omnium/zwift-results";
import { leagueMapSchema } from "@/lib/omnium/zwift-mapping";
import { nameKeyOf, scoreParsedRows } from "@/lib/omnium/import";
import {
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
  parsedRows?: ParsedResultRow[];
  expectedSync?: string | null;
  final?: boolean;
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
  guest: boolean;
};

export type PreviewOutcome =
  | { ok: true; rows: PreviewRow[]; issues: ParseIssue[]; newRiders: number; syncedAt: string | null; warnings: string[] }
  | Fail;

type RiderLookup = {
  byZwift: Map<string, { id: string; display_name: string }>;
  byName: Map<string, { id: string; display_name: string }>;
};

type EditionEvent = {
  id: string;
  edition_id: string;
  discipline: Discipline;
  entrants_synced_at: string | null;
  zwift_event_id: string | null;
  subgroup_leagues: unknown;
  omnium_editions: { season_id: string } | null;
};

async function loadEditionEvent(
  admin: Admin,
  editionEventId: string,
): Promise<EditionEvent | null> {
  const { data } = await admin
    .from("omnium_edition_events")
    .select("id, edition_id, discipline, entrants_synced_at, zwift_event_id, subgroup_leagues, omnium_editions!inner(season_id)")
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
    return null;
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

  let prepared;
  try { prepared = prepareResultInput(input, editionEvent.discipline); checkResultRows(prepared.rows); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Ongeldige uitslag." }; }
  const { rows, issues } = prepared;
  const lookup = await lookupRiders(guard.admin, rows);
  const batchKeyOf = resultKeyResolver(rows);
  const registration = await registeredRiders(guard.admin, editionEvent);
  if (!registration.ok) return registration;
  const identityOf = (row: ParsedResultRow) =>
    matchOf(row, lookup)?.rider.id ?? batchKeyOf(row);
  const { eligible, guests } = eligibleResultRows(
    rows,
    registration.ids,
    identityOf,
  );
  const guestLines = new Set(guests.map((r) => r.lineNumber));

  const { data: season } = await guard.admin
    .from("omnium_seasons")
    .select("scoring")
    .eq("id", editionEvent.omnium_editions?.season_id ?? "")
    .maybeSingle();
  const scoring = resolveScoring(season?.scoring);

  const scored = scoreParsedRows(eligible, {
    discipline: editionEvent.discipline,
    mode: input.parsedRows ? (editionEvent.discipline === "crit" ? "crit_detailed" : "finish") : input.mode,
    scoring,
    idOf: identityOf,
  });
  const pointsByKey = new Map(
    scored.map((result) => [result.riderId, result]),
  );

  let newRiders = 0;

  const preview: PreviewRow[] = rows.map((row) => {
    const key = identityOf(row);
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
      guest: guestLines.has(row.lineNumber),
    };
  });

  return { ok: true, rows: preview, issues, newRiders, syncedAt: editionEvent.entrants_synced_at, warnings: registration.ids === null ? ["Geen startlijst beschikbaar: iedereen telt mee."] : [] };
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

  if (input.expectedSync !== undefined && input.expectedSync !== editionEvent.entrants_synced_at) return { ok: false as const, error: "Startlijst gewijzigd; maak opnieuw een voorbeeld." };
  let prepared;
  try { prepared = prepareResultInput(input, editionEvent.discipline); checkResultRows(prepared.rows); }
  catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Ongeldige uitslag." }; }
  if (prepared.issues.length) return { ok: false as const, error: "Corrigeer eerst de overgeslagen regels." };
  const lookup = await lookupRiders(guard.admin, prepared.rows);
  const batchKeyOf = resultKeyResolver(prepared.rows);
  const registration = await registeredRiders(guard.admin, editionEvent);
  if (!registration.ok) return registration;
  const { eligible: rows } = eligibleResultRows(prepared.rows, registration.ids, (r) => matchOf(r, lookup)?.rider.id ?? "");
  if (!rows.length) return { ok: false as const, error: "Geen meetellende uitslagen." };

  // Renners die we nog niet kennen aanmaken, gededupliceerd op naamsleutel.
  const toCreate = new Map<
    string,
    { name_key: string; display_name: string; zwift_id: string | null; team_name: string | null; last_league: string | null }
  >();
  for (const row of rows) {
    if (matchOf(row, lookup)) continue;
    const key = batchKeyOf(row);
    if (toCreate.has(key)) continue;
    toCreate.set(key, {
      name_key: nameKeyOf(row.name),
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
    mode: input.parsedRows ? (editionEvent.discipline === "crit" ? "crit_detailed" : "finish") : input.mode,
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

  const { error: insertError } = await guard.admin.rpc("omnium_replace_results", {
    p_event_id: editionEvent.id, p_expected_sync: editionEvent.entrants_synced_at,
    p_state: input.final === false || (input.parsedRows && !input.final) ? "partial" : "final",
    p_rows:     scored.map((result) => ({
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
      source: input.parsedRows ? "zwift" : input.mode === "sheet_csv" ? "import" : "paste",
      entered_by: guard.userId,
    })),
  });
  if (insertError) return { ok: false as const, error: insertError.message };

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

  const { data, error } = await guard.admin.rpc("omnium_merge_riders", {
    p_from_rider_id: input.fromRiderId,
    p_into_rider_id: input.intoRiderId,
  });
  if (error) return { ok: false as const, error: error.message };

  const affected = Array.isArray(data) ? data : [];
  for (const editionId of affected) {
    const result = await recomputeEditionStandings(guard.admin, String(editionId));
    if (!result.ok) return { ok: false as const, error: result.error };
    revalidateAfterResults(String(editionId));
  }

  revalidatePath("/beheer/omnium/renners");
  return { ok: true as const, editions: affected.length };
}

function revalidateAfterResults(editionId: string) {
  revalidatePath('/beheer/omnium/' + editionId);
  revalidatePath('/beheer/omnium/' + editionId + '/uitslagen');
  revalidatePath('/beheer/omnium');
  revalidatePath('/omnium', 'layout');
}

async function registeredRiders(admin: Admin, part: EditionEvent): Promise<{ ok: true; ids: Set<string> | null } | Fail> {
  if (!part.entrants_synced_at) return { ok: true, ids: null };
  const { data, error } = await admin.from("omnium_entrants").select("rider_id").eq("edition_event_id", part.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, ids: new Set((data ?? []).map((r) => r.rider_id as string)) };
}

export async function fetchZwiftResultsAction(partId: string) {
  const guard = await requireOmniumAccess();
  if (!guard.ok) return guard;
  const part = await loadEditionEvent(guard.admin, partId);
  if (!part?.zwift_event_id) return { ok: false as const, error: "Geen Zwift-event-ID ingesteld." };
  if (part.discipline === "sprint") return { ok: false as const, error: "Sprint Quali blijft handwerk." };
  try {
    const result = await fetchOmniumResults(
      part.zwift_event_id,
      leagueMapSchema.parse(part.subgroup_leagues),
    );
    return { ok: true as const, ...result };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Zwift ophalen mislukt." }; }
}
