import "server-only";

// ZWBeter racen: per lid de eigen Zwift-races, ook buiten de kalender (0317).
//
// Vraag van de eigenaar (2026-11-09): "Jouw races" kende alleen races met een
// bewaarde uitslag, en buiten de ZRL werd die pas bewaard als iemand de race
// opende. Deze job leest per lid de activiteitenlijst van Zwift (dezelfde lijst
// en cursor als de ZRS-historie, zrs-history.ts) en zoekt bij elke race van de
// laatste LIST_DAYS dagen het Zwift-event op. De lijst toont de race dan zonder
// de uitslag op te halen; die komt pas bij het openen, zoals bij een geplakte
// link.
//
// Zwift geeft de activiteiten alleen van renners die het serviceaccount volgt.
// Wie niet gevolgd wordt, krijgt `refused` en wordt niet opnieuw geprobeerd.
//
// Zuinig: een lid is pas weer aan de beurt na RECHECK_MS. Daarna kost het één
// pagina van de lijst, plus één detail per nieuwe race.

import { fetchActivityEvent } from "@/lib/events/zwift-club";
import {
  eventColumns,
  LIST_RESERVE_MS,
  listMore,
  loadState,
  pause,
  refused,
  saveSync,
  SPACING_MS,
  topUp,
  type Admin,
  type RiderState,
  type StoredRace,
} from "@/lib/briljant/zrs-history";

/** Zo ver terug toont "Jouw races" races; gelijk aan LIST_DAYS in zrl-analysis/load.ts. */
export const RACE_LIST_DAYS = 120;
/** Zo lang na de vorige keer is een lid weer aan de beurt. */
export const RECHECK_MS = 3 * 60 * 60 * 1000;
/** Minstens zoveel tijd over voor het detail van één race. */
const EVENT_RESERVE_MS = 1_500;
/** Minder tijd dan dit: aan geen nieuw lid meer beginnen. */
const RIDER_MIN_MS = 2_500;

const raceWindowStart = (now: number) => now - RACE_LIST_DAYS * 24 * 60 * 60 * 1000;

/** Of de lijst ver genoeg terug gelezen is voor het venster van de racelijst. */
export function listCoversWindow(state: RiderState, since: number): boolean {
  if (state.sync.list_complete) return true;
  return state.sync.listed_until != null && Date.parse(state.sync.listed_until) <= since;
}

/** Races in het venster waarvan het Zwift-event nog niet is opgezocht, nieuwste eerst. */
export function racesToResolve(races: StoredRace[], since: number): StoredRace[] {
  return races.filter((race) => !race.eventLookedUp && Date.parse(race.racedAt) >= since);
}

async function resolveEvent(admin: Admin, state: RiderState, race: StoredRace): Promise<void> {
  let event = null;
  try {
    event = await fetchActivityEvent(race.activityId);
  } catch (error) {
    // Activiteit weg of privé: bewaren als "geen event", niet blijven vragen.
    if (!refused(error)) throw error;
  }
  const { error } = await admin
    .from("zwift_race_scores")
    .update(eventColumns(event))
    .eq("zwift_id", state.zwiftId)
    .eq("activity_id", race.activityId);
  if (error) throw new Error(error.message);
  race.eventLookedUp = true;
  await pause(SPACING_MS);
}

export type RiderRaceResult = { events: number; done: boolean; stop: boolean };

/**
 * Eén lid bijwerken tot het budget op is: nieuwe activiteiten bovenaan, de lijst
 * verder lezen tot het venster binnen is, en de events van de races erin.
 * `done`: alles binnen, `races_checked_at` gezet. `stop`: Zwift gaf 429 of 5xx,
 * of de tabel ontbreekt; dan stopt de hele run.
 */
export async function refreshRiderRaces(
  admin: Admin,
  zwiftId: string,
  options: { budgetMs: number; now?: number },
): Promise<RiderRaceResult> {
  const started = Date.now();
  const left = () => options.budgetMs - (Date.now() - started);
  const since = raceWindowStart(options.now ?? Date.now());
  const state = await loadState(admin, zwiftId);
  if (!state) return { events: 0, done: false, stop: true };
  let events = 0;
  try {
    if (!state.sync.refused) {
      // Een lege lijst (nog niet gevolgd, of nog nooit gereden) kent geen nieuwste
      // activiteit, en dan kijkt topUp nooit meer bovenaan: opnieuw vanaf het begin.
      if (!state.sync.newest_at && state.sync.next_start === 0) state.sync.list_complete = false;
      await topUp(admin, state, left);
      while (!state.sync.refused && !listCoversWindow(state, since)) {
        if (left() < LIST_RESERVE_MS) return { events, done: false, stop: false };
        await listMore(admin, state);
      }
      for (const race of racesToResolve(state.races, since)) {
        if (left() < EVENT_RESERVE_MS) return { events, done: false, stop: false };
        await resolveEvent(admin, state, race);
        events += 1;
      }
    }
    state.sync.races_checked_at = new Date().toISOString();
    await saveSync(admin, state);
    return { events, done: true, stop: false };
  } catch {
    // 429 of 5xx bij Zwift, of een schrijffout: de volgende run gaat hier verder.
    return { events, done: false, stop: true };
  }
}

/**
 * Wie aan de beurt is: leden met een Zwift-ID die de racejob nooit of langer dan
 * RECHECK_MS geleden bijwerkte, wie het langst wacht eerst. Geweigerde lijsten
 * (niet gevolgd) slaan we over.
 */
export async function ridersDueForRaces(admin: Admin, now = Date.now()): Promise<string[]> {
  const { data: profiles, error } = await admin.from("profiles").select("zwift_id").not("zwift_id", "is", null);
  if (error) return [];
  const ids = [
    ...new Set(
      ((profiles ?? []) as Array<{ zwift_id: string | number | null }>)
        .map((row) => String(row.zwift_id ?? "").trim())
        .filter((id) => /^\d+$/.test(id)),
    ),
  ];
  if (ids.length === 0) return [];
  const { data: syncs, error: syncError } = await admin
    .from("zwift_race_score_sync")
    .select("zwift_id, refused, races_checked_at")
    .in("zwift_id", ids.map(Number));
  if (syncError) return [];
  const syncOf = new Map(
    ((syncs ?? []) as Array<{ zwift_id: number | string; refused: boolean; races_checked_at: string | null }>).map((row) => [
      String(row.zwift_id),
      row,
    ]),
  );
  const checkedAt = (id: string) => {
    const at = syncOf.get(id)?.races_checked_at;
    return at ? Date.parse(at) : 0;
  };
  return ids
    .filter((id) => !syncOf.get(id)?.refused && checkedAt(id) <= now - RECHECK_MS)
    .sort((a, b) => checkedAt(a) - checkedAt(b));
}

/** Zoveel leden als er tot `deadline` (epoch-ms) passen; stopt bij 429/5xx. */
export async function runRiderRaces(
  admin: Admin,
  deadline: number,
): Promise<{ riders: number; events: number; stopped: boolean }> {
  let riders = 0;
  let events = 0;
  for (const zwiftId of await ridersDueForRaces(admin)) {
    const budgetMs = deadline - Date.now();
    if (budgetMs < RIDER_MIN_MS) break;
    const result = await refreshRiderRaces(admin, zwiftId, { budgetMs });
    riders += 1;
    events += result.events;
    if (result.stop) return { riders, events, stopped: true };
  }
  return { riders, events, stopped: false };
}
