// Per lid: wat is er gekoppeld, en loopt het? Voor /beheer/koppelingen, zodat
// wie leden helpt in één oogopslag ziet waar een vraag vandaan kan komen.
//
// Puur: geen database, geen fetch. De pagina laadt de rijen (zonder tokens of
// sleutels) en geeft ze hier in. Elke regel leest alleen kolommen die de app
// zelf bijhoudt; wat de externe dienst vindt, weten we niet, en dat beweren we
// dus ook niet.

import { rideSourceFor, type RideSource } from "@/lib/intervals/rides";
import { hasActivityScope, hasActivityWriteScope } from "@/lib/strava/scope";

export type IntegrationKey =
  | "strava"
  | "intervals"
  | "zwift"
  | "telegram"
  | "push"
  | "agenda"
  | "live";

/** Van ernstig naar niets: de volgorde telt voor sorteren en de lidstatus. */
export type IntegrationState = "problem" | "attention" | "ok" | "off";

export type IntegrationFact =
  | { label: string; at: string | null }
  | { label: string; text: string };

export type IntegrationStatus = {
  key: IntegrationKey;
  label: string;
  state: IntegrationState;
  /** Eén korte regel: de toestand, of wat er mis is. */
  summary: string;
  facts: IntegrationFact[];
  /**
   * Niet gekoppeld, terwijl het lid er wel iets aan heeft. Niet bij Strava als
   * de ritten via intervals.icu komen, en niet bij Zwift als het lid zei niet te
   * zwiften.
   */
  missing: boolean;
};

export const INTEGRATION_LABELS: Record<IntegrationKey, string> = {
  strava: "Strava",
  intervals: "intervals.icu",
  zwift: "Zwift",
  telegram: "Telegram",
  push: "Meldingen",
  agenda: "Agenda",
  live: "Live",
};

export const INTEGRATION_ORDER: IntegrationKey[] = [
  "strava",
  "intervals",
  "zwift",
  "telegram",
  "push",
  "agenda",
  "live",
];

const STATE_RANK: Record<IntegrationState, number> = {
  problem: 0,
  attention: 1,
  ok: 2,
  off: 3,
};

const DAY_MS = 86_400_000;

/** Een gratis intervals.icu-account slaapt in na 90 dagen zonder bezoek. */
export const INTERVALS_DORMANT_DAYS = 90;
/** De ritten-sync van intervals.icu draait elk uur; een dag stil is achterstand. */
export const INTERVALS_SYNC_STALE_DAYS = 1;
/** Agenda-apps halen een abonnement minstens dagelijks op. */
export const AGENDA_STALE_DAYS = 3;
/** Vanaf zoveel mislukte Strava-runs op rij is het geen toevalstreffer meer. */
export const STRAVA_FAILURES_PROBLEM = 3;

export type StravaInput = {
  connected_at: string | null;
  last_synced_at: string | null;
  scope: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  inactivity_warned_at: string | null;
  consecutive_failures: number | null;
  last_error: string | null;
  last_error_at: string | null;
};

export type IntervalsInput = {
  athlete_id: string | null;
  created_at: string | null;
  last_synced_at: string | null;
  last_ride_sync_error: string | null;
  visit_confirmed_at: string | null;
  wellness_opt_in: boolean | null;
  rides_via_intervals: boolean | null;
};

export type TelegramInput = {
  linked: boolean;
  linked_at: string | null;
  link_token_expires_at: string | null;
};

export type PushInput = {
  user_agent: string | null;
  created_at: string | null;
  last_used_at: string | null;
};

export type AgendaInput = {
  created_at: string | null;
  last_fetched_at: string | null;
};

export type LiveInput = {
  provider: string;
  enabled: boolean;
  last_seen_at: string | null;
  last_checked_at: string | null;
};

export type MemberIntegrationInput = {
  zwiftId: string | null;
  /** Het lid zei bij de Zwift-ID-vraag niet te zwiften (profiles.zwift_opt_out). */
  zwiftOptOut?: boolean;
  /** Zwift gaf 401/403/404 op de activiteitenlijst (zwift_race_score_sync.refused). */
  zwiftRefused: boolean;
  strava: StravaInput | null;
  intervals: IntervalsInput | null;
  telegram: TelegramInput | null;
  push: PushInput[];
  agenda: AgendaInput | null;
  live: LiveInput[];
  /** Nieuwste rit in de app, uit welke bron ook. */
  lastRideAt: string | null;
};

function time(value: string | null | undefined): number | null {
  const t = Date.parse(value ?? "");
  return Number.isFinite(t) ? t : null;
}

function daysSince(value: string | null | undefined, now: Date): number | null {
  const t = time(value);
  return t == null ? null : (now.getTime() - t) / DAY_MS;
}

function status(
  key: IntegrationKey,
  state: IntegrationState,
  summary: string,
  facts: IntegrationFact[] = [],
): IntegrationStatus {
  return { key, label: INTEGRATION_LABELS[key], state, summary, facts, missing: false };
}

/** Waar de ritten van dit lid vandaan komen; dezelfde regel als de sync. */
export function memberRideSource(input: MemberIntegrationInput): RideSource {
  return rideSourceFor({
    hasStravaConnection: Boolean(input.strava),
    hasIntervals: Boolean(input.intervals?.athlete_id),
    ridesViaIntervals: Boolean(input.intervals?.rides_via_intervals),
  });
}

const REVOKED: Record<string, { state: IntegrationState; summary: string }> = {
  member: { state: "off", summary: "Zelf ontkoppeld" },
  member_keep_data: { state: "off", summary: "Zelf ontkoppeld, ritten bewaard" },
  account_deleted: { state: "off", summary: "Account verwijderd" },
  admin: { state: "off", summary: "Door beheer opgeheven" },
  switched_to_intervals: { state: "off", summary: "Overgestapt op intervals.icu" },
  inactive: { state: "attention", summary: "Opgeheven: 90 dagen niet in de app" },
  strava: { state: "problem", summary: "Ingetrokken op strava.com" },
  invalid_grant: { state: "problem", summary: "Strava accepteert de koppeling niet meer" },
};

export function stravaStatus(
  input: MemberIntegrationInput,
  now = new Date(),
): IntegrationStatus {
  const row = input.strava;
  if (!row) return status("strava", "off", "Niet gekoppeld");

  const facts: IntegrationFact[] = [
    { label: "Gekoppeld", at: row.connected_at },
    { label: "Laatste sync", at: row.last_synced_at },
  ];

  if (row.revoked_at) {
    const revoked = REVOKED[row.revoked_reason ?? ""] ?? {
      state: "attention" as const,
      summary: "Opgeheven",
    };
    return status("strava", revoked.state, revoked.summary, [
      { label: "Opgeheven", at: row.revoked_at },
    ]);
  }

  const viaIntervals = memberRideSource(input) === "intervals";
  if (viaIntervals) facts.push({ label: "Ritten", text: "via intervals.icu" });
  if (row.last_error) {
    facts.push({ label: "Fout", text: row.last_error });
    facts.push({ label: "Fout sinds", at: row.last_error_at });
  }
  if (row.inactivity_warned_at) facts.push({ label: "Gewaarschuwd", at: row.inactivity_warned_at });

  if (!hasActivityScope(row.scope)) {
    return status("strava", "problem", "Geen recht op activiteiten: opnieuw koppelen", facts);
  }
  const failures = row.consecutive_failures ?? 0;
  if (row.last_error && failures >= STRAVA_FAILURES_PROBLEM) {
    return status("strava", "problem", `Sync faalt (${failures}× op rij)`, facts);
  }
  if (row.inactivity_warned_at) {
    return status("strava", "attention", "Wordt opgeheven wegens inactiviteit", facts);
  }
  if (row.last_error) {
    return status("strava", "attention", "Laatste run gaf een fout", facts);
  }
  if (!row.last_synced_at && !viaIntervals && (daysSince(row.connected_at, now) ?? 0) >= 1) {
    return status("strava", "attention", "Nog nooit gesynchroniseerd", facts);
  }
  if (!hasActivityWriteScope(row.scope)) {
    return status("strava", "attention", "Geen schrijfrecht: samenvatting blijft weg", facts);
  }
  return status("strava", "ok", viaIntervals ? "Gekoppeld, ritten via intervals.icu" : "Gekoppeld", facts);
}

export function intervalsStatus(
  input: MemberIntegrationInput,
  now = new Date(),
): IntegrationStatus {
  const row = input.intervals;
  if (!row) return status("intervals", "off", "Niet gekoppeld");
  if (!row.athlete_id) {
    return status("intervals", "problem", "Koppeling zonder atleet-ID", [
      { label: "Aangemaakt", at: row.created_at },
    ]);
  }

  const ridesHere = memberRideSource(input) === "intervals";
  const visitBase = row.visit_confirmed_at ?? row.created_at;
  const facts: IntegrationFact[] = [
    { label: "Gekoppeld", at: row.created_at },
    { label: "Ritten", text: ridesHere ? "via intervals.icu" : "niet via intervals.icu" },
    { label: "Hersteldata", text: row.wellness_opt_in ? "gedeeld" : "niet gedeeld" },
  ];
  if (ridesHere) {
    facts.push({ label: "Laatste sync", at: row.last_synced_at });
    facts.push({ label: "Bezoek bevestigd", at: row.visit_confirmed_at });
  }
  if (row.last_ride_sync_error) facts.push({ label: "Fout", text: row.last_ride_sync_error });

  // Alleen de ritten-sync schrijft last_synced_at en de fout; zonder ritten via
  // intervals.icu zeggen die kolommen niets over deze koppeling.
  if (!ridesHere) return status("intervals", "ok", "Gekoppeld", facts);

  if (row.last_ride_sync_error) return status("intervals", "problem", "Ritten ophalen faalt", facts);
  const sinceVisit = daysSince(visitBase, now);
  if (sinceVisit != null && sinceVisit >= INTERVALS_DORMANT_DAYS) {
    return status("intervals", "problem", "Account mogelijk ingeslapen: bezoek niet bevestigd", facts);
  }
  const sinceSync = daysSince(row.last_synced_at, now);
  if (row.last_synced_at == null) {
    if ((daysSince(row.created_at, now) ?? 0) >= INTERVALS_SYNC_STALE_DAYS) {
      return status("intervals", "attention", "Nog nooit gesynchroniseerd", facts);
    }
  } else if (sinceSync != null && sinceSync >= INTERVALS_SYNC_STALE_DAYS) {
    return status("intervals", "attention", "Sync loopt achter", facts);
  }
  return status("intervals", "ok", "Gekoppeld, ritten via intervals.icu", facts);
}

export function zwiftStatus(input: MemberIntegrationInput): IntegrationStatus {
  const id = input.zwiftId?.trim();
  if (!id) {
    return input.zwiftOptOut
      ? status("zwift", "off", "Rijdt niet op Zwift")
      : status("zwift", "off", "Geen Zwift-ID");
  }
  const facts: IntegrationFact[] = [{ label: "Zwift-ID", text: id }];
  if (!/^\d+$/.test(id)) return status("zwift", "problem", "Zwift-ID is geen getal", facts);
  if (input.zwiftRefused) {
    return status("zwift", "attention", "Zwift weigert de activiteitenlijst", facts);
  }
  return status("zwift", "ok", "Zwift-ID ingevuld", facts);
}

export function telegramStatus(
  input: MemberIntegrationInput,
  now = new Date(),
): IntegrationStatus {
  const row = input.telegram;
  if (!row) return status("telegram", "off", "Niet gekoppeld");
  if (row.linked) return status("telegram", "ok", "Gekoppeld", [{ label: "Gekoppeld", at: row.linked_at }]);
  const expires = time(row.link_token_expires_at);
  if (expires != null && expires > now.getTime()) {
    return status("telegram", "attention", "Koppelen bezig", [
      { label: "Link geldig tot", at: row.link_token_expires_at },
    ]);
  }
  return status("telegram", "attention", "Koppellink niet gebruikt", [
    { label: "Link verlopen", at: row.link_token_expires_at },
  ]);
}

/** Grof toesteltype uit de user-agent; meer dan dit tonen we niet. */
export function deviceKind(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (/iPhone|iPod/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux|CrOS/i.test(ua)) return "Linux";
  return "Onbekend toestel";
}

export function pushStatus(input: MemberIntegrationInput): IntegrationStatus {
  const subs = input.push;
  if (subs.length === 0) return status("push", "off", "Geen toestel aangemeld");
  const facts: IntegrationFact[] = subs
    .slice()
    .sort((a, b) => (time(b.last_used_at ?? b.created_at) ?? 0) - (time(a.last_used_at ?? a.created_at) ?? 0))
    .map((sub) => ({
      label: deviceKind(sub.user_agent),
      at: sub.last_used_at ?? sub.created_at,
    }));
  const summary = subs.length === 1 ? "1 toestel" : `${subs.length} toestellen`;
  return status("push", "ok", summary, facts);
}

export function agendaStatus(
  input: MemberIntegrationInput,
  now = new Date(),
): IntegrationStatus {
  const row = input.agenda;
  if (!row) return status("agenda", "off", "Geen agendalink");
  const facts: IntegrationFact[] = [
    { label: "Aangemaakt", at: row.created_at },
    { label: "Laatst opgehaald", at: row.last_fetched_at },
  ];
  if (!row.last_fetched_at) {
    return (daysSince(row.created_at, now) ?? 0) >= 1
      ? status("agenda", "attention", "Link nooit opgehaald", facts)
      : status("agenda", "ok", "Link net aangemaakt", facts);
  }
  if ((daysSince(row.last_fetched_at, now) ?? 0) >= AGENDA_STALE_DAYS) {
    return status("agenda", "attention", "Agenda-app haalt niet meer op", facts);
  }
  return status("agenda", "ok", "Wordt opgehaald", facts);
}

const LIVE_LABELS: Record<string, string> = {
  owntracks: "OwnTracks",
  mail: "Garmin",
  wahoo_link: "Wahoo",
};

export function liveStatus(input: MemberIntegrationInput): IntegrationStatus {
  const active = input.live.filter((row) => row.enabled);
  if (active.length === 0) {
    return input.live.length > 0
      ? status("live", "off", "Uitgezet")
      : status("live", "off", "Niet gekoppeld");
  }
  const names = [...new Set(active.map((row) => LIVE_LABELS[row.provider] ?? row.provider))];
  const facts: IntegrationFact[] = active.map((row) => {
    const seen = [row.last_seen_at, row.last_checked_at]
      .filter((value): value is string => time(value) != null)
      .sort()
      .at(-1);
    return { label: LIVE_LABELS[row.provider] ?? row.provider, at: seen ?? null };
  });
  return status("live", "ok", names.join(", "), facts);
}

/** Of een koppeling die uit staat, dit lid iets zou opleveren. */
function wanted(key: IntegrationKey, input: MemberIntegrationInput): boolean {
  if (key === "strava") return memberRideSource(input) === "none";
  if (key === "zwift") return !input.zwiftOptOut;
  return true;
}

export function memberIntegrations(
  input: MemberIntegrationInput,
  now = new Date(),
): IntegrationStatus[] {
  return [
    stravaStatus(input, now),
    intervalsStatus(input, now),
    zwiftStatus(input),
    telegramStatus(input, now),
    pushStatus(input),
    agendaStatus(input, now),
    liveStatus(input),
  ].map((item) => ({ ...item, missing: item.state === "off" && wanted(item.key, input) }));
}

/** Probleem, aandacht of niet gekoppeld: wat bij het filter per koppeling hoort. */
export function needsHelp(item: IntegrationStatus): boolean {
  return item.state === "problem" || item.state === "attention" || item.missing;
}

/** De ernstigste toestand onder de koppelingen; "off" als er niets is. */
export function worstState(statuses: IntegrationStatus[]): IntegrationState {
  let worst: IntegrationState = "off";
  for (const item of statuses) {
    if (STATE_RANK[item.state] < STATE_RANK[worst]) worst = item.state;
  }
  return worst;
}

export function compareStates(a: IntegrationState, b: IntegrationState): number {
  return STATE_RANK[a] - STATE_RANK[b];
}
