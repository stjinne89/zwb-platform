// Kerntemperatuur van een CORE-sensor ophalen uit intervals.icu en bij de
// hittesessies zetten. Serverside: de intervals-client ontsleutelt de API-key.
// Draait na het antwoord van de pagina (loadIntervalsSnapshot), naast de
// gemeten zonetijden. De rekenregels staan in core-temperature.ts.
//
// Alleen voor runs die onder de toestemmingstekst met de CORE-sensor zijn
// gestart (PROTOCOL_CONSENT_VERSION, 0238). Bewaard wordt per rit alleen de
// samenvatting; een rit zonder CORE-data krijgt een lege rij, zodat hij niet
// opnieuw wordt opgevraagd.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchIntervalsActivities, fetchIntervalsActivityStreams } from "@/lib/intervals/client";
import { PROTOCOL_CONSENT_VERSION } from "./consent";
import {
  CORE_WINDOW_DAYS,
  analyzeHeatSession,
  coreCandidates,
  coreTemperatureStream,
  protocolUsesCore,
  summarizeCoreTemperature,
} from "./core-temperature";
import { protocolBySlug, tasksForDay } from "./index";
import type { ProtocolCheck, ProtocolRun } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Ritten per keer. Meestal zegt de lijst welke streams er zijn en vragen we
 * alleen tijd en kerntemperatuur op; anders alles, een paar honderd kB per uur.
 */
const FETCH_LIMIT = 3;

export async function fillCoreSessions(
  admin: Admin,
  profileId: string,
  conn: { api_key: string; athlete_id: string },
  today: string,
): Promise<{ measured: number; empty: number; checked: number }> {
  const result = { measured: 0, empty: 0, checked: 0 };

  const { data: runRows } = await admin
    .from("member_protocols")
    .select("id, protocol_slug, start_date, race_date, status")
    .eq("profile_id", profileId)
    .eq("status", "actief")
    .eq("consent_version", PROTOCOL_CONSENT_VERSION);
  const runs: ProtocolRun[] = ((runRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: row.id as string,
      protocolSlug: row.protocol_slug as string,
      startDate: String(row.start_date).slice(0, 10),
      raceDate: row.race_date ? String(row.race_date).slice(0, 10) : null,
      status: "actief" as const,
    }))
    .filter((run) => {
      const protocol = protocolBySlug(run.protocolSlug);
      return protocol && protocolUsesCore(protocol) && run.startDate <= today;
    });
  if (runs.length === 0) return result;

  const runIds = runs.map((run) => run.id);
  const [activities, { data: seenRows }, { data: checkRows }] = await Promise.all([
    // Rechtstreeks bij intervals.icu en niet uit intervals_activities: die tabel
    // loopt tot zes uur achter, en de rit van vandaag moet er meteen in staan.
    fetchIntervalsActivities(conn.api_key, conn.athlete_id, CORE_WINDOW_DAYS),
    admin.from("member_protocol_core_sessions").select("protocol_id, intervals_id").in("protocol_id", runIds),
    admin.from("member_protocol_checks").select("protocol_id, day, task_key").in("protocol_id", runIds),
  ]);
  const seen = new Set(
    ((seenRows ?? []) as Array<{ protocol_id: string; intervals_id: string }>).map(
      (row) => `${row.protocol_id}|${row.intervals_id}`,
    ),
  );
  const checks: ProtocolCheck[] = ((checkRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    protocolId: row.protocol_id as string,
    day: String(row.day).slice(0, 10),
    taskKey: row.task_key as string,
  }));

  const candidates = coreCandidates(runs, activities, seen, today);
  // Dezelfde rit kan bij twee lopende hitteprotocollen horen; één keer ophalen.
  const streamsById = new Map<string, Awaited<ReturnType<typeof fetchIntervalsActivityStreams>> | null>();
  for (const candidate of candidates) {
    if (!streamsById.has(candidate.intervalsId)) {
      if (streamsById.size >= FETCH_LIMIT) continue;
      streamsById.set(
        candidate.intervalsId,
        await fetchIntervalsActivityStreams(conn.api_key, candidate.intervalsId, candidate.streamTypes).catch(
          () => null,
        ),
      );
    }
    const streams = streamsById.get(candidate.intervalsId);
    // Ophalen mislukt: niets vastleggen, de volgende keer opnieuw.
    if (!streams) continue;

    const core = coreTemperatureStream(streams);
    const time = streams.find((stream) => stream.type === "time")?.data ?? null;
    const summary = core ? summarizeCoreTemperature(core, time) : null;

    let autoChecked = false;
    if (summary) {
      const { run, protocol, day } = candidate;
      const task = tasksForDay(protocol, run, day, null, checks)?.tasks.find(
        (item) => item.coreMinutes && !item.done,
      );
      // Alleen afvinken als de rit aan alle eisen van de sessie voldoet; anders
      // legt de app bij het tonen uit waarom niet.
      const verdict = task ? analyzeHeatSession(task, { ...summary, rideMinutes: candidate.rideMinutes }) : null;
      if (task && verdict?.met) {
        const { error } = await admin
          .from("member_protocol_checks")
          .upsert(
            { protocol_id: run.id, day, task_key: task.key },
            { onConflict: "protocol_id,day,task_key", ignoreDuplicates: true },
          );
        if (!error) {
          checks.push({ protocolId: run.id, day, taskKey: task.key });
          autoChecked = true;
          result.checked++;
        }
      }
    }

    const { error } = await admin.from("member_protocol_core_sessions").upsert(
      {
        protocol_id: candidate.run.id,
        intervals_id: candidate.intervalsId,
        day: candidate.day,
        max_core_c: summary?.maxC ?? null,
        minutes_above: summary?.minutesAbove ?? null,
        ride_minutes: candidate.rideMinutes,
        minutes_to_threshold: summary?.minutesToThreshold ?? null,
        coverage_pct: summary?.coveragePct ?? null,
        auto_checked: autoChecked,
      },
      { onConflict: "protocol_id,intervals_id", ignoreDuplicates: true },
    );
    if (error) continue;
    if (summary) result.measured++;
    else result.empty++;
  }
  return result;
}
