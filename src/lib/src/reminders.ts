// Herinneringen voor de Sunday Race Club (migr. 0203). Draait mee in de cron van
// /api/events/reminders, die elke 15 minuten loopt.
//
//   Inschrijven  om 20:00 Nederlandse tijd op de avond voordat de inschrijving
//                bij MyWhoosh sluit (die sluit donderdag 03:00 GMT, dus 05:00 in
//                de zomer en 04:00 in de winter). Voor wie deze maand meedoet en
//                niet heeft gezegd dat hij die zondag niet kan. Of iemand al
//                ingeschreven staat, zien we niet.
//   Weigh-in     tien minuten voor het venster opengaat, voor wie ja of
//                misschien zei op de race en in een categorie met weigh-in rijdt
//                (opgegeven, anders de hoogste van de afgelopen vijf weken).

import type { SupabaseClient } from "@supabase/supabase-js";
import { amsterdamDateKey, amsterdamWallTimeToIso } from "@/lib/birthdays";
import { sendNotificationToMembers } from "@/lib/push/send";
import { srcMonthKey } from "@/lib/src/month";

export const SRC_REGISTRATION_REMINDER_TIME = "20:00";
export const SRC_WEIGHIN_LEAD_MS = 10 * 60_000;

/** 20:00 Nederlandse tijd op de dag vóór de sluiting (in Nederlandse tijd). */
export function srcRegistrationReminderAt(closesAt: string): string | null {
  const closingDay = amsterdamDateKey(new Date(closesAt));
  const day = new Date(`${closingDay}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return amsterdamWallTimeToIso(day.toISOString().slice(0, 10), SRC_REGISTRATION_REMINDER_TIME);
}

/** Tussen het moment van versturen en het einde van wat het aankondigt. */
export function srcReminderDue(now: Date, sendAt: string | null, until: string | null) {
  if (!sendAt || !until) return false;
  const t = now.getTime();
  return t >= new Date(sendAt).getTime() && t < new Date(until).getTime();
}

type Status = "available" | "maybe" | "unavailable";

/** Wie deze maand meedoet en niet "niet" zei voor deze zondag. */
export function srcRegistrationRecipients(
  entries: Array<{ profile_id: string; team_id: string }>,
  availability: Array<{ profile_id: string; team_id: string; status: Status }>,
): string[] {
  const out = new Set(
    availability
      .filter((row) => row.status === "unavailable")
      .map((row) => `${row.profile_id}|${row.team_id}`),
  );
  return [
    ...new Set(
      entries
        .filter((entry) => !out.has(`${entry.profile_id}|${entry.team_id}`))
        .map((entry) => entry.profile_id),
    ),
  ];
}

/** Wie ja of misschien zei en in een categorie met weigh-in rijdt. */
export function srcWeighInRecipients(
  rsvps: Array<{ profile_id: string; status: string }>,
  categoryOf: (profileId: string) => number | null,
  categories: number[],
): string[] {
  const wanted = new Set(categories);
  return [
    ...new Set(
      rsvps
        .filter((row) => row.status === "yes" || row.status === "maybe")
        .map((row) => row.profile_id)
        .filter((profileId) => {
          const category = categoryOf(profileId);
          return category !== null && wanted.has(category);
        }),
    ),
  ];
}

function moment(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

/**
 * Laatst gereden categorie per lid, uit de races van de afgelopen vijf weken.
 * Reed iemand in die tijd in meer categorieën, dan telt de hoogste: liever een
 * bericht te veel dan een gemist weigh-in.
 */
async function recentCategories(admin: SupabaseClient, now: Date) {
  const since = new Date(now.getTime() - 35 * 86400_000).toISOString().slice(0, 10);
  const { data: races } = await admin.from("src_races").select("event_id").gte("sunday", since);
  const ids = ((races ?? []) as Array<{ event_id: string }>).map((row) => row.event_id);
  const ridden = new Map<string, number>();
  if (ids.length === 0) return ridden;
  const { data } = await admin
    .from("src_results")
    .select("profile_id, category")
    .in("race_event_id", ids)
    .not("profile_id", "is", null);
  for (const row of (data ?? []) as Array<{ profile_id: string; category: number | null }>) {
    if (row.category === null) continue;
    const known = ridden.get(row.profile_id);
    if (known === undefined || row.category < known) ridden.set(row.profile_id, row.category);
  }
  return ridden;
}

/** Stuurt wie nog geen bericht van deze soort voor dit event kreeg, en logt dat. */
async function sendOnce(
  admin: SupabaseClient,
  eventId: string,
  kind: "src_registration" | "src_weighin",
  profileIds: string[],
  payload: { title: string; body: string; url: string; tag: string },
) {
  if (profileIds.length === 0) return 0;
  const { data: sent } = await admin
    .from("event_reminder_sends")
    .select("profile_id")
    .eq("event_id", eventId)
    .eq("reminder_kind", kind);
  const already = new Set(((sent ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id));
  const targets = profileIds.filter((id) => !already.has(id));
  if (targets.length === 0) return 0;
  const result = await sendNotificationToMembers("on_event_reminder", payload, {
    profileIds: targets,
  });
  // Ook loggen voor wie geen apparaat had, zodat een volgende tick het niet opnieuw probeert.
  await admin.from("event_reminder_sends").insert(
    targets.map((profile_id) => ({ event_id: eventId, profile_id, reminder_kind: kind })),
  );
  return result.sent;
}

type RaceRow = {
  event_id: string;
  sunday: string;
  gender: string;
  registration_closes_at: string | null;
  pre_weight_categories: number[] | null;
  pre_weight_opens_at: string | null;
  pre_weight_closes_at: string | null;
  events: { parent_event_id: string | null } | { parent_event_id: string | null }[] | null;
};

export async function processSrcReminders(admin: SupabaseClient, now: Date) {
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 8 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("src_races")
    .select(
      "event_id, sunday, gender, registration_closes_at, pre_weight_categories, pre_weight_opens_at, pre_weight_closes_at, events(parent_event_id)",
    )
    .gte("sunday", today)
    .lte("sunday", soon);
  if (error) throw new Error(error.message);
  const races = (data ?? []) as unknown as RaceRow[];
  let registration = 0;
  let weighIn = 0;

  // Inschrijven: één bericht per zondag, op het hoofdevent.
  const bySunday = new Map<string, { parentId: string; closesAt: string }>();
  for (const race of races) {
    const event = Array.isArray(race.events) ? race.events[0] : race.events;
    if (!event?.parent_event_id || !race.registration_closes_at) continue;
    const known = bySunday.get(race.sunday);
    if (!known || race.registration_closes_at < known.closesAt) {
      bySunday.set(race.sunday, {
        parentId: event.parent_event_id,
        closesAt: race.registration_closes_at,
      });
    }
  }
  for (const [sunday, { parentId, closesAt }] of bySunday) {
    if (!srcReminderDue(now, srcRegistrationReminderAt(closesAt), closesAt)) continue;
    const [{ data: entries }, { data: availability }] = await Promise.all([
      admin.from("src_month_entries").select("profile_id, team_id").eq("month", srcMonthKey(sunday)),
      admin
        .from("team_event_availability")
        .select("profile_id, team_id, status")
        .eq("event_id", parentId),
    ]);
    registration += await sendOnce(
      admin,
      parentId,
      "src_registration",
      srcRegistrationRecipients(
        (entries ?? []) as Array<{ profile_id: string; team_id: string }>,
        (availability ?? []) as Array<{ profile_id: string; team_id: string; status: Status }>,
      ),
      {
        title: "Sunday Race Club: inschrijven",
        body: `De inschrijving bij MyWhoosh sluit ${moment(closesAt)}.`,
        url: `/events/${parentId}`,
        tag: `src-registration-${parentId}`,
      },
    );
  }

  // Weigh-in: per race, voor de categorieën met weigh-in.
  let ridden: Map<string, number> | null = null;
  for (const race of races) {
    const categories = race.pre_weight_categories ?? [];
    if (categories.length === 0 || !race.pre_weight_opens_at || !race.pre_weight_closes_at) continue;
    const sendAt = new Date(new Date(race.pre_weight_opens_at).getTime() - SRC_WEIGHIN_LEAD_MS);
    if (!srcReminderDue(now, sendAt.toISOString(), race.pre_weight_closes_at)) continue;

    ridden ??= await recentCategories(admin, now);
    const [{ data: rsvps }, { data: entries }] = await Promise.all([
      admin.from("event_rsvps").select("profile_id, status").eq("event_id", race.event_id),
      admin
        .from("src_month_entries")
        .select("profile_id, category")
        .eq("month", srcMonthKey(race.sunday)),
    ]);
    const declared = new Map(
      ((entries ?? []) as Array<{ profile_id: string; category: number | null }>).map((row) => [
        row.profile_id,
        row.category,
      ]),
    );
    const lastRidden = ridden;
    weighIn += await sendOnce(
      admin,
      race.event_id,
      "src_weighin",
      srcWeighInRecipients(
        (rsvps ?? []) as Array<{ profile_id: string; status: string }>,
        (profileId) => declared.get(profileId) ?? lastRidden.get(profileId) ?? null,
        categories,
      ),
      {
        title: "Weigh-in Sunday Race Club",
        body: `Weigh-in voor cat ${categories.join(" en ")}: van ${clock(
          race.pre_weight_opens_at,
        )} tot ${clock(race.pre_weight_closes_at)}.`,
        url: `/events/${race.event_id}`,
        tag: `src-weighin-${race.event_id}`,
      },
    );
  }

  return { registration, weighIn };
}
