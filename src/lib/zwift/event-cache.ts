// De Zwift-kalender spiegelen, zodat een geplande training er een passend event
// naast kan krijgen.
//
// De beperking die het ontwerp bepaalt: `/api/public/events/upcoming` geeft
// maximaal 200 rijen terug zonder paginering. Bij Zwifts eventvolume is dat
// grofweg de eerstvolgende twee à drie uur, en vaker pollen helpt niet — elke
// call begint weer bij "nu". Zonder datumvenster weet je dus nooit iets over
// morgen.
//
// De `eventStartsAfter`/`eventStartsBefore`-parameters (ms sinds 1970) omzeilen
// dat: per venster van een paar uur opnieuw 200 rijen. Of Zwift ze op deze
// endpoint honoreert is niet uit documentatie te halen — Zwift publiceert die
// niet — dus `probeEventWindow()` stelt het op productie vast en de sync valt
// terug op de kale upcoming-lijst zodra een venster niets oplevert. Zie
// docs/zwift-mywhoosh-kalender-spike.md.

import { safeFetch } from "@/lib/net/safe-fetch";
import {
  mapZwiftEventRow,
  parseZwiftDate,
  zwiftSignupCount,
  type ZwiftEventApiRow,
} from "@/lib/events/external-scan";
import { fetchFeedEvents, zwiftClubConfigured } from "@/lib/events/zwift-club";
import { parseWkgRange } from "@/lib/training/zwift-match";

const UPCOMING_URL = "https://us-or-rly101.zwift.com/api/public/events/upcoming";

/** Hoe ver vooruit we willen kijken; drie dagen dekt "vandaag en morgen" ruim. */
export const DEFAULT_HORIZON_DAYS = 3;
/** Venstergrootte. Kleiner betekent meer calls, groter betekent kans op afkappen bij 200. */
const WINDOW_HOURS = 6;
/**
 * Wandklokbudget. Een server action of cron-route draait op Netlify in een
 * functie van ~10 s; zelfde aanpak als syncZwiftRoutes en followZwbMembers.
 */
export const DEFAULT_BUDGET_MS = 7000;
const PAUSE_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type ZwiftEventRow = {
  event_id: number;
  name: string;
  event_start: string;
  event_type: string | null;
  sport: string | null;
  route_id: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  laps: number | null;
  subgroups: Array<{
    label: string | null;
    minWkg: number | null;
    maxWkg: number | null;
    startAt: string | null;
    distanceM: number | null;
    signups: number | null;
  }>;
  series_name: string | null;
  description: string | null;
  total_signups: number | null;
  zwb_signups: number | null;
  external_url: string;
};

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Eén API-rij naar een cacherij. Puur, zodat hij op een vastgelegde JSON te
 * testen is — net als mapZwiftEvent in lib/events/zwift-route.ts.
 *
 * `null` bij een rij die we niet willen bewaren: zonder id, naam of starttijd is
 * er niets te matchen, een besloten event hoort nergens als voorstel op te duiken,
 * en hardloopevents horen hier niet.
 *
 * Dat laatste was eerst andersom. Het argument was "de spiegel blijft een
 * spiegel, zodat een latere hardloopfunctie niet om een nieuwe sync vraagt" — een
 * functie die niemand gevraagd heeft, terwijl de trainingsmodule expliciet alleen
 * op-de-fiets werk plant (zie defaultTrainingPrompt). Wat het wél kostte, bleek op
 * de eerste echte sync: ruim 40% van de rijen was hardlopen, en die kunnen nooit
 * voorgesteld worden. Erger was het stille gevolg: buildPopularityIndex vergelijkt
 * inschrijvingen per uur van de dag, en deed dat dus tegen een verdeling waar
 * hardloopevents in zaten. Mocht er ooit een hardloopfunctie komen, dan is dit één
 * regel terug en staat de kalender binnen een uur weer vol.
 */
export function mapZwiftEventToRow(row: ZwiftEventApiRow): ZwiftEventRow | null {
  if (row.invisibleToNonParticipants) return null;

  // Ontbrekende sport telt niet als "niet fietsen": onbekend mag hier niet als
  // nee gelden, net als in fit.ts en zwift-match.ts.
  const sport = (row.sport ?? "").trim().toUpperCase();
  if (sport && sport !== "CYCLING") return null;

  // Hergebruik van de bestaande mapper: die doet de id-, naam- en datumcontrole
  // en de afstandsterugval op de subgroepen al, en blijft zo de enige plek waar
  // die regels staan.
  const candidate = mapZwiftEventRow(row);
  if (!candidate) return null;

  const eventId = Number(candidate.externalId);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) return null;

  const subgroups = (row.eventSubgroups ?? []).map((subgroup) => {
    const label = subgroup.subgroupLabel ?? subgroup.label ?? null;
    const band = parseWkgRange(subgroup.rangeAccessLabel) ?? { minWkg: null, maxWkg: null };
    return {
      label,
      minWkg: band.minWkg,
      maxWkg: band.maxWkg,
      startAt: parseZwiftDate(subgroup.eventSubgroupStart ?? undefined),
      distanceM: positiveInt(subgroup.distanceInMeters),
      signups: zwiftSignupCount(subgroup),
    };
  });

  return {
    event_id: eventId,
    name: candidate.title,
    event_start: candidate.startAt,
    event_type: row.eventType ?? row.type ?? null,
    sport: row.sport ?? null,
    route_id: positiveInt(row.routeId),
    duration_seconds: positiveInt(row.durationInSeconds),
    distance_m: candidate.distanceKm === null ? null : Math.round(candidate.distanceKm * 1000),
    laps: positiveInt(row.laps),
    subgroups,
    series_name: row.eventSeries?.name ?? null,
    // De omschrijving is de enige aanwijzing voor de intensiteit van een group
    // workout; ingekort omdat organisatoren er halve nieuwsbrieven in zetten.
    description: (row.description ?? "").trim().slice(0, 600) || null,
    total_signups: zwiftSignupCount(row),
    zwb_signups: null,
    external_url: candidate.externalUrl,
  };
}

async function fetchRows(url: string): Promise<ZwiftEventApiRow[]> {
  const response = await safeFetch(url, {
    cache: "no-store",
    // Zonder deze header geeft Zwift protobuf terug; zie zwift-route.ts.
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Zwift gaf status ${response.status}.`);
  const payload = await response.json();
  return Array.isArray(payload) ? (payload as ZwiftEventApiRow[]) : [];
}

function windowUrl(fromMs: number, toMs: number) {
  const url = new URL(UPCOMING_URL);
  url.searchParams.set("eventStartsAfter", String(Math.round(fromMs)));
  url.searchParams.set("eventStartsBefore", String(Math.round(toMs)));
  url.searchParams.set("limit", "200");
  return url.toString();
}

export type WindowProbe = {
  requestedFrom: string;
  requestedTo: string;
  rows: number;
  earliestStart: string | null;
  latestStart: string | null;
  /** Rijen die buiten het gevraagde venster vielen: dan negeert Zwift de parameters. */
  outsideWindow: number;
  windowHonoured: boolean;
  fieldsPresent: Record<string, number>;
};

/**
 * Beheerdiagnose: vraagt één venster op en rapporteert wat eruit kwam. Bedoeld
 * om op productie te draaien, omdat zwift.com vanuit een ontwikkelomgeving niet
 * altijd bereikbaar is. Leest alleen; schrijft niets.
 */
export async function probeEventWindow(
  fromHoursAhead = 24,
  toHoursAhead = 30,
  now: Date = new Date(),
): Promise<WindowProbe> {
  const from = now.getTime() + fromHoursAhead * 3600_000;
  const to = now.getTime() + toHoursAhead * 3600_000;
  const rows = await fetchRows(windowUrl(from, to));

  const starts = rows
    .map((row) => parseZwiftDate(row.eventStart))
    .filter((value): value is string => Boolean(value))
    .sort();

  const outsideWindow = starts.filter((start) => {
    const ms = new Date(start).getTime();
    return ms < from - 60_000 || ms > to + 60_000;
  }).length;

  const fieldsPresent: Record<string, number> = {
    routeId: 0,
    durationInSeconds: 0,
    rangeAccessLabel: 0,
    signups: 0,
    description: 0,
  };
  for (const row of rows) {
    if (row.routeId != null) fieldsPresent.routeId += 1;
    if (row.durationInSeconds) fieldsPresent.durationInSeconds += 1;
    if ((row.eventSubgroups ?? []).some((group) => group.rangeAccessLabel)) {
      fieldsPresent.rangeAccessLabel += 1;
    }
    if (zwiftSignupCount(row) !== null) fieldsPresent.signups += 1;
    if ((row.description ?? "").trim()) fieldsPresent.description += 1;
  }

  return {
    requestedFrom: new Date(from).toISOString(),
    requestedTo: new Date(to).toISOString(),
    rows: rows.length,
    earliestStart: starts[0] ?? null,
    latestStart: starts.at(-1) ?? null,
    outsideWindow,
    // Rijen binnen het venster én niets erbuiten: dan deed Zwift wat we vroegen.
    windowHonoured: rows.length > 0 && outsideWindow === 0,
    fieldsPresent,
  };
}

export type EventSyncResult = {
  /** Vensters die deze ronde zijn opgehaald. */
  windows: number;
  /** Unieke events die zijn weggeschreven. */
  events: number;
  /** Events waaraan een ZWB-inschrijving hing. */
  zwbEvents: number;
  /** Afgelopen events die zijn opgeruimd. */
  pruned: number;
  /** Gestopt omdat het tijdbudget op was, niet omdat het werk klaar is. */
  budgetSpent: boolean;
  /** Geen enkel venster leverde iets op; de kale upcoming-lijst was de terugval. */
  windowsIgnored: boolean;
  notes: string[];
};

/**
 * Haalt de kalender op tot de horizon en schrijft hem weg. Idempotent: dezelfde
 * run mag altijd opnieuw, en een event dat verdwijnt bij Zwift verdwijnt hier
 * pas als het voorbij is.
 */
export async function syncZwiftEventCache(
  supabase: SupabaseClient,
  options: { horizonDays?: number; budgetMs?: number; now?: Date } = {},
): Promise<EventSyncResult> {
  const now = options.now ?? new Date();
  const horizonDays = Math.max(1, options.horizonDays ?? DEFAULT_HORIZON_DAYS);
  const deadline = Date.now() + Math.max(1000, options.budgetMs ?? DEFAULT_BUDGET_MS);

  const result: EventSyncResult = {
    windows: 0,
    events: 0,
    zwbEvents: 0,
    pruned: 0,
    budgetSpent: false,
    windowsIgnored: false,
    notes: [],
  };

  const byId = new Map<number, ZwiftEventRow>();
  const windowCount = Math.ceil((horizonDays * 24) / WINDOW_HOURS);
  let firstWindowIds: string | null = null;

  for (let index = 0; index < windowCount; index += 1) {
    if (Date.now() >= deadline) {
      result.budgetSpent = true;
      break;
    }
    const from = now.getTime() + index * WINDOW_HOURS * 3600_000;
    const to = from + WINDOW_HOURS * 3600_000;
    try {
      const rows = await fetchRows(windowUrl(from, to));
      result.windows += 1;
      for (const row of rows) {
        const mapped = mapZwiftEventToRow(row);
        if (mapped) byId.set(mapped.event_id, mapped);
      }

      // Een leeg eerste venster betekent dat Zwift de parameters negeert of dat
      // er niets staat; in beide gevallen heeft doorgaan geen zin.
      if (index === 0 && rows.length === 0) {
        result.windowsIgnored = true;
        break;
      }

      // Negeert Zwift de datumparameters, dan geeft élk venster dezelfde
      // eerstvolgende 200 events terug. Dat is aan de tweede ronde te zien, en
      // dan is doorgaan tot de horizon puur verspilde tijd en verspilde calls.
      const ids = rows.map((row) => String(row.id)).join(",");
      if (index === 0) {
        firstWindowIds = ids;
      } else if (ids === firstWindowIds) {
        result.windowsIgnored = true;
        result.notes.push(
          "Zwift negeert het datumvenster: elk venster geeft dezelfde events. De spiegel reikt daarom maar enkele uren vooruit.",
        );
        break;
      }
    } catch (error) {
      result.notes.push(
        error instanceof Error ? `Venster ${index}: ${error.message}` : `Venster ${index} mislukt.`,
      );
      break;
    }
    await sleep(PAUSE_MS);
  }

  // Terugval: zonder bruikbaar venster is de kale upcoming-lijst nog altijd de
  // eerstvolgende paar uur, en dat is precies het moment waarop iemand beslist
  // wat hij nú gaat rijden. Alleen als de vensters écht niets gaven -- een
  // genegeerd venster leverde wél events op en heeft deze call niet nodig.
  if (byId.size === 0) {
    result.windowsIgnored = true;
    try {
      for (const row of await fetchRows(UPCOMING_URL)) {
        const mapped = mapZwiftEventToRow(row);
        if (mapped) byId.set(mapped.event_id, mapped);
      }
      result.notes.push(`Terugval op upcoming: ${byId.size} events.`);
    } catch (error) {
      result.notes.push(
        error instanceof Error ? `Upcoming mislukt: ${error.message}` : "Upcoming mislukt.",
      );
    }
  }

  // ZWB-inschrijvingen uit de geautoriseerde member-feed. Het serviceaccount
  // volgt alle leden met een zwift_id (zie scan-runner.ts), dus een event waar
  // een ZWB'er op staat heeft followeeSignedUpCount > 0. Faalt stil: zonder
  // clubkoppeling blijft zwb_signups null, en null is "onbekend", niet "nul".
  if (zwiftClubConfigured()) {
    try {
      for (const feedEvent of await fetchFeedEvents()) {
        const id = Number(feedEvent.candidate.externalId);
        const row = byId.get(id);
        if (!row) continue;
        row.zwb_signups = feedEvent.followeeSignups;
        if (feedEvent.followeeSignups > 0) result.zwbEvents += 1;
      }
    } catch (error) {
      result.notes.push(
        error instanceof Error
          ? `ZWB-inschrijvingen ophalen mislukt: ${error.message}`
          : "ZWB-inschrijvingen ophalen mislukt.",
      );
    }
  }

  const rows = [...byId.values()];
  if (rows.length > 0) {
    const stamped = rows.map((row) => ({
      ...row,
      last_seen_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));
    // In brokken, want een upsert van duizenden rijen in één statement loopt
    // tegen de PostgREST-payloadgrens aan.
    for (let index = 0; index < stamped.length; index += 250) {
      const { error } = await supabase
        .from("zwift_events")
        .upsert(stamped.slice(index, index + 250), { onConflict: "event_id" });
      if (error) throw new Error(error.message);
    }
    result.events = rows.length;
  }

  // Opruimen: wat voorbij is kan niemand meer rijden. Een dag marge, zodat een
  // lopend event zijn kaart niet halverwege kwijtraakt.
  const cutoff = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data: pruned, error: pruneError } = await supabase
    .from("zwift_events")
    .delete()
    .lt("event_start", cutoff)
    .select("event_id");
  if (pruneError) {
    result.notes.push(`Opruimen mislukt: ${pruneError.message}`);
  } else {
    result.pruned = (pruned ?? []).length;
  }

  return result;
}
