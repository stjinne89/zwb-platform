// ZRL-beschikbaarheid in het trainingsschema.
//
// Een lid meldt zich per raceweek beschikbaar (team_event_availability), maar
// de captain stelt pas vlak voor de race op: in de ronde van september en
// oktober 2026 mediaan tien uur vóór de start, een kwart minder dan twee uur
// ervoor. Beschikbaarheid kwam mediaan twee weken eerder binnen. Het schema
// kende de race tot de opstelling niet en plande op de ZRL-avond gewoon een
// sleutelsessie (Stijn: VO2max op vier raceavonden van R2).
//
// Daarom wordt "beschikbaar" een gereserveerd raceblok: een vast eventblok op
// het event waarvoor het lid zich beschikbaar meldde (bij een paraplu de
// raceweek, anders de teamrace zelf). Van de beschikbare renners in die ronde
// werd 82% ook opgesteld, dus als race plannen is de juiste standaard.
//
// - Opgesteld, of zelf ja op een race in die week: dan heeft die race een eigen
//   blok (syncEventWorkout) en vervalt de reservering.
// - Misschien of niet beschikbaar: geen reservering. Misschien is in de hele
//   app nog niet beslist, net als bij een RSVP.
// - Een nee of misschien op de teamrace zelf gaat vóór beschikbaarheid op die
//   race. Een nee op één teamrace onder een raceweek zegt niets over de week
//   (les uit de omzetting van 2026-09-22, Jeroen).
// - Niet opgesteld: drie uur na de start valt de reservering weg. Zo telt een
//   race die het lid niet mocht rijden niet als gemiste training.
// - Hooguit één reservering per lid per raceweek, ook als het lid zich bij twee
//   teams beschikbaar meldde.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Na de start blijft een reservering zonder opstelling nog zo lang staan. */
export const RESERVATION_GRACE_MS = 3 * 3600_000;

/** Zo ver terug kijkt de opruimronde; oudere blokken zijn geschiedenis. */
const CLEANUP_LOOKBACK_MS = 2 * 24 * 3600_000;

/** Zo ver vooruit reserveert de cron; ruim een ZRL-ronde plus de volgende. */
const RESERVATION_HORIZON_DAYS = 120;

export type ZrlAvailabilityRow = {
  profileId: string;
  eventId: string;
  weekId: string;
  status: string;
  startAt: string;
};

export type ZrlRsvpRow = {
  profileId: string;
  eventId: string;
  weekId: string;
  status: string;
};

export type ZrlBlockRow = {
  profileId: string;
  eventId: string;
  weekId: string;
  startAt: string;
  status: string;
};

export type ReservationKey = { profileId: string; eventId: string };

const key = (profileId: string, eventId: string) => `${profileId}|${eventId}`;

/**
 * Welke reserveringen er moeten bijkomen en welke weg moeten. Puur: de cron en
 * de serveracties lezen de rijen zelf en voeren het verschil uit.
 *
 * `blocks` zijn de lopende eventblokken (niet vervangen) op ZRL-events van dit
 * venster. Een blok met een ja op zijn eigen event is van de RSVP en blijft
 * altijd buiten beschouwing; elk ander blok op een ZRL-event is een
 * reservering, ook een die zijn beschikbaarheidsrij kwijt is.
 */
export function planZrlReservations(input: {
  availability: ZrlAvailabilityRow[];
  rsvps: ZrlRsvpRow[];
  blocks: ZrlBlockRow[];
  now: Date;
}): { add: ReservationKey[]; remove: ReservationKey[] } {
  const now = input.now.getTime();

  const rsvpOf = new Map<string, string>();
  const weeksWithYes = new Set<string>();
  for (const row of input.rsvps) {
    rsvpOf.set(key(row.profileId, row.eventId), row.status);
    if (row.status === "yes") weeksWithYes.add(key(row.profileId, row.weekId));
  }

  // Per lid en raceweek de events waarvoor het lid beschikbaar is en waar geen
  // eigen nee of misschien op staat.
  const candidates = new Map<string, ZrlAvailabilityRow[]>();
  for (const row of input.availability) {
    if (row.status !== "available") continue;
    const own = rsvpOf.get(key(row.profileId, row.eventId));
    if (own === "no" || own === "maybe") continue;
    const weekKey = key(row.profileId, row.weekId);
    if (weeksWithYes.has(weekKey)) continue;
    const list = candidates.get(weekKey) ?? [];
    if (!list.some((other) => other.eventId === row.eventId)) list.push(row);
    candidates.set(weekKey, list);
  }

  // Eén per raceweek: de raceweek zelf als het lid daar beschikbaar is (een
  // paraplu), anders het eerste event; op id gesorteerd zodat de keuze niet per
  // run wisselt.
  const wanted = new Map<string, ZrlAvailabilityRow>();
  for (const list of candidates.values()) {
    const pick =
      list.find((row) => row.eventId === row.weekId) ??
      [...list].sort((a, b) => a.eventId.localeCompare(b.eventId))[0];
    wanted.set(key(pick.profileId, pick.eventId), pick);
  }

  const existing = new Map<string, ZrlBlockRow>();
  for (const block of input.blocks) existing.set(key(block.profileId, block.eventId), block);

  const add: ReservationKey[] = [];
  for (const [k, row] of wanted) {
    if (existing.has(k)) continue;
    if (Date.parse(row.startAt) <= now) continue;
    add.push({ profileId: row.profileId, eventId: row.eventId });
  }

  const remove: ReservationKey[] = [];
  for (const [k, block] of existing) {
    if (rsvpOf.get(k) === "yes") continue;
    // Gereden (of als gereden gekoppeld): dat is geschiedenis, niet aankomen.
    if (block.status !== "planned") continue;
    const started = Date.parse(block.startAt);
    if (wanted.has(k) && !(Number.isFinite(started) && now > started + RESERVATION_GRACE_MS)) {
      continue;
    }
    remove.push({ profileId: block.profileId, eventId: block.eventId });
  }

  return { add, remove };
}

type EventRow = { id: string; parent_event_id: string | null; start_at: string; type: string };

/** De raceweek van een ZRL-event: het hoofdevent, of het event zelf. */
const weekOf = (event: Pick<EventRow, "id" | "parent_event_id">) => event.parent_event_id ?? event.id;

/**
 * Leest beschikbaarheid, antwoorden en eventblokken voor deze events en
 * (optioneel) dit lid, in de vorm die planZrlReservations verwacht.
 */
async function loadReservationState(admin: Admin, events: EventRow[], profileId?: string) {
  const ids = events.map((event) => event.id);
  const byId = new Map(events.map((event) => [event.id, event]));
  if (ids.length === 0) return { availability: [], rsvps: [], blocks: [] };

  let availabilityQuery = admin
    .from("team_event_availability")
    .select("profile_id, event_id, status")
    .in("event_id", ids);
  let rsvpQuery = admin.from("event_rsvps").select("profile_id, event_id, status").in("event_id", ids);
  let blockQuery = admin
    .from("training_workouts")
    .select("profile_id, event_id, status")
    .eq("origin", "event")
    .is("superseded_at", null)
    .in("event_id", ids);
  if (profileId) {
    availabilityQuery = availabilityQuery.eq("profile_id", profileId);
    rsvpQuery = rsvpQuery.eq("profile_id", profileId);
    blockQuery = blockQuery.eq("profile_id", profileId);
  }

  const [{ data: availability }, { data: rsvps }, { data: blocks }] = await Promise.all([
    availabilityQuery,
    rsvpQuery,
    blockQuery,
  ]);

  type Row = { profile_id: string; event_id: string; status: string };
  const withEvent = (rows: unknown) =>
    ((rows ?? []) as Row[]).flatMap((row) => {
      const event = byId.get(row.event_id);
      return event ? [{ row, event }] : [];
    });

  return {
    availability: withEvent(availability).map(({ row, event }) => ({
      profileId: row.profile_id,
      eventId: row.event_id,
      weekId: weekOf(event),
      status: row.status,
      startAt: event.start_at,
    })),
    rsvps: withEvent(rsvps).map(({ row, event }) => ({
      profileId: row.profile_id,
      eventId: row.event_id,
      weekId: weekOf(event),
      status: row.status,
    })),
    blocks: withEvent(blocks).map(({ row, event }) => ({
      profileId: row.profile_id,
      eventId: row.event_id,
      weekId: weekOf(event),
      startAt: event.start_at,
      status: row.status,
    })),
  };
}

/** Voert het verschil uit; geeft per lid terug of er iets veranderde. */
async function applyReservations(
  admin: Admin,
  plan: { add: ReservationKey[]; remove: ReservationKey[] },
  deadline?: number,
): Promise<{ added: number; removed: number; changedProfiles: Set<string> }> {
  // Dynamisch: events.ts roept deze module zelf aan na elke RSVP.
  const { applyEventBlock } = await import("@/lib/training/events");
  const result = { added: 0, removed: 0, changedProfiles: new Set<string>() };
  for (const item of plan.remove) {
    if (deadline != null && Date.now() > deadline) break;
    const { removed } = await applyEventBlock(admin, item.profileId, item.eventId, false).catch(() => ({
      removed: false,
    }));
    if (removed) {
      result.removed += 1;
      result.changedProfiles.add(item.profileId);
    }
  }
  for (const item of plan.add) {
    if (deadline != null && Date.now() > deadline) break;
    const { inserted } = await applyEventBlock(admin, item.profileId, item.eventId, true).catch(() => ({
      inserted: false,
    }));
    if (inserted) {
      result.added += 1;
      result.changedProfiles.add(item.profileId);
    }
  }
  return result;
}

const EVENT_FIELDS = "id, parent_event_id, start_at, type";

/** Het hoofdevent en de teamraces van de raceweek waar dit event bij hoort. */
async function zrlWeekEvents(admin: Admin, eventId: string): Promise<EventRow[]> {
  const { data: event } = await admin.from("events").select(EVENT_FIELDS).eq("id", eventId).maybeSingle();
  if (!event || event.type !== "zrl") return [];
  const weekId = weekOf(event as EventRow);
  const { data: rows } = await admin
    .from("events")
    .select(EVENT_FIELDS)
    .or(`id.eq.${weekId},parent_event_id.eq.${weekId}`);
  return ((rows ?? []) as EventRow[]).filter((row) => row.type === "zrl");
}

/**
 * Brengt de reservering van één lid in de raceweek van dit event op orde. Na
 * elke wijziging in beschikbaarheid, antwoord of opstelling. Geen ZRL-event:
 * niets te doen.
 */
export async function syncZrlReservation(
  admin: Admin,
  profileId: string,
  eventId: string,
): Promise<{ added: number; removed: number }> {
  const events = await zrlWeekEvents(admin, eventId);
  if (events.length === 0) return { added: 0, removed: 0 };
  const state = await loadReservationState(admin, events, profileId);
  const plan = planZrlReservations({ ...state, now: new Date() });
  const { added, removed } = await applyReservations(admin, plan);
  return { added, removed };
}

/**
 * Vangnet voor de dagelijkse cron (die elk uur draait): zet reserveringen neer
 * voor wie pas later een schema kreeg, haalt die van niet-opgestelde renners na
 * de race weg en ruimt reserveringen op waarvan de beschikbaarheid buiten de
 * app om verdween (de omzettingen in 0179/0184). Bij de eerste run na de
 * invoering zet hij de reserveringen van alle al gegeven beschikbaarheid neer.
 */
export async function reconcileZrlReservations(
  admin: Admin,
  options: { deadline?: number } = {},
): Promise<{ added: number; removed: number; changedProfiles: string[] }> {
  const now = new Date();
  const from = new Date(now.getTime() - CLEANUP_LOOKBACK_MS).toISOString();
  const to = new Date(now.getTime() + RESERVATION_HORIZON_DAYS * 24 * 3600_000).toISOString();
  const { data: rows } = await admin
    .from("events")
    .select(EVENT_FIELDS)
    .eq("type", "zrl")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at", { ascending: true })
    .limit(500);
  const events = (rows ?? []) as EventRow[];
  const state = await loadReservationState(admin, events);
  const plan = planZrlReservations({ ...state, now });
  const result = await applyReservations(admin, plan, options.deadline);
  return { added: result.added, removed: result.removed, changedProfiles: [...result.changedProfiles] };
}

/**
 * De gereserveerde ZRL-events van een lid tussen `from` en `to`, voor de
 * planner. Nodig voor een lid dat nog geen schema had toen het zich beschikbaar
 * meldde: dan bestaat het blok nog niet, en zonder dit plant een nieuw schema
 * dwars door de raceavond heen.
 */
export async function reservedZrlEventIds(
  admin: Admin,
  profileId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const { data: availability } = await admin
    .from("team_event_availability")
    .select("event_id, events!inner(id, parent_event_id, start_at, type)")
    .eq("profile_id", profileId)
    .eq("status", "available")
    .eq("events.type", "zrl")
    .gte("events.start_at", `${from}T00:00:00`)
    .lte("events.start_at", `${to}T23:59:59`);
  const availableEvents = ((availability ?? []) as Array<{ events: EventRow | EventRow[] | null }>).flatMap(
    (row) => (Array.isArray(row.events) ? row.events : row.events ? [row.events] : []),
  );
  if (availableEvents.length === 0) return [];

  const weekIds = [...new Set(availableEvents.map(weekOf))];
  const { data: weekRows } = await admin
    .from("events")
    .select(EVENT_FIELDS)
    .or(`id.in.(${weekIds.join(",")}),parent_event_id.in.(${weekIds.join(",")})`);
  const events = ((weekRows ?? []) as EventRow[]).filter((row) => row.type === "zrl");
  const state = await loadReservationState(admin, events, profileId);
  // Alle gewenste reserveringen, ook die al een blok hebben: een gewenst event
  // zonder blok komt in `add`, een met blok valt daar buiten. Daarom de
  // blokken hier weglaten.
  const plan = planZrlReservations({ ...state, blocks: [], now: new Date() });
  return plan.add.map((item) => item.eventId);
}
