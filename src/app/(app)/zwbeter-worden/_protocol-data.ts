// Dataophaal voor de protocollen (trainen en voeden). De inhoud van een
// protocol staat in code (src/lib/protocols); hier alleen wie welk protocol
// volgt, wat er is afgevinkt en het gewicht om doses mee om te rekenen.

import { ageFromBirthDate } from "@/lib/nutrition/targets";
import type { ProtocolCheck, ProtocolCoreSession, ProtocolRun } from "@/lib/protocols";
import { loadSeasonTargets } from "@/lib/training/season-data";
import { shiftDays } from "@/lib/training/season";
import type { Viewer, ViewerIdentity } from "./_data";

type Supabase = ViewerIdentity["supabase"];

const RUN_COLUMNS = "id, protocol_slug, start_date, race_date, status";

function toRun(row: Record<string, unknown>): ProtocolRun {
  return {
    id: row.id as string,
    protocolSlug: row.protocol_slug as string,
    startDate: String(row.start_date).slice(0, 10),
    raceDate: row.race_date ? String(row.race_date).slice(0, 10) : null,
    status: row.status as ProtocolRun["status"],
  };
}

/** Lopende protocollen van een lid. RLS laat het lid en zijn eigen trainer door. */
export async function loadActiveRuns(supabase: Supabase, profileId: string): Promise<ProtocolRun[]> {
  const { data } = await supabase
    .from("member_protocols")
    .select(RUN_COLUMNS)
    .eq("profile_id", profileId)
    .eq("status", "actief")
    .order("start_date", { ascending: true });
  return (data ?? []).map(toRun);
}

/** Alle runs van één protocol, nieuwste eerst: de lopende en de eerdere. */
export async function loadRunsForProtocol(
  supabase: Supabase,
  profileId: string,
  slug: string,
): Promise<ProtocolRun[]> {
  const { data } = await supabase
    .from("member_protocols")
    .select(RUN_COLUMNS)
    .eq("profile_id", profileId)
    .eq("protocol_slug", slug)
    .order("start_date", { ascending: false })
    .limit(10);
  return (data ?? []).map(toRun);
}

export async function loadChecks(supabase: Supabase, runIds: string[]): Promise<ProtocolCheck[]> {
  if (runIds.length === 0) return [];
  const { data } = await supabase
    .from("member_protocol_checks")
    .select("protocol_id, day, task_key")
    .in("protocol_id", runIds);
  return (data ?? []).map((row) => ({
    protocolId: row.protocol_id as string,
    day: String(row.day).slice(0, 10),
    taskKey: row.task_key as string,
  }));
}

/** Ritten met kerntemperatuur van een CORE-sensor (0238); ritten zonder meting niet. */
export async function loadCoreSessions(supabase: Supabase, runIds: string[]): Promise<ProtocolCoreSession[]> {
  if (runIds.length === 0) return [];
  const { data } = await supabase
    .from("member_protocol_core_sessions")
    .select("protocol_id, intervals_id, day, max_core_c, minutes_above")
    .in("protocol_id", runIds)
    .not("max_core_c", "is", null)
    .order("day", { ascending: true });
  return (data ?? []).map((row) => ({
    protocolId: row.protocol_id as string,
    intervalsId: row.intervals_id as string,
    day: String(row.day).slice(0, 10),
    maxC: Number(row.max_core_c),
    minutesAbove: Number(row.minutes_above),
  }));
}

/** Gewicht voor de dosis en leeftijd voor de grens bij supplementen. */
export async function loadProtocolProfile(
  supabase: Supabase,
  profileId: string,
  today: string,
): Promise<{ weightKg: number | null; ageYears: number | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("weight_kg, birth_date")
    .eq("id", profileId)
    .single();
  const weight = data?.weight_kg == null ? null : Number(data.weight_kg);
  return {
    weightKg: weight && weight > 0 ? weight : null,
    ageYears: ageFromBirthDate((data?.birth_date as string | null) ?? null, today),
  };
}

/** Mikpunten uit de jaarplanning in het komende jaar, als keuze voor een wedstrijdprotocol. */
export async function loadRaceOptions(
  viewer: Viewer,
  today: string,
): Promise<{ date: string; title: string }[]> {
  const targets = await loadSeasonTargets(viewer.admin, viewer.user.id, today, shiftDays(today, 365));
  return targets.map((target) => ({ date: target.targetDate, title: target.title }));
}
