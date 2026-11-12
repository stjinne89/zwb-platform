import "server-only";

// De eventpagina van ZwiftRacing vóór de race, gecachet. Voor het racebriefje
// van de ZRL en het event van een gewone Zwift-race: één verzoek geeft het hele
// veld. Een half uur in de cache van Next (over deploys heen, vandaar de versie
// in de sleutel); een ladderevent of een event dat ZwiftRacing niet kent, geeft
// null.

import { unstable_cache } from "next/cache";
import { parseEventPage, type ZrEvent } from "./event-page";
import { fetchZwiftRacingPage } from "./fetch-page";

/** Wachten op de pagina tijdens het renderen; anders zonder ZwiftRacing verder. */
const RENDER_TIMEOUT_MS = 6_000;

async function fetchEvent(zwiftEventId: number): Promise<ZrEvent | null> {
  const page = await fetchZwiftRacingPage(`/events/${zwiftEventId}`, undefined, RENDER_TIMEOUT_MS);
  if (page.kind !== "ok") return null;
  return parseEventPage(page.html, zwiftEventId);
}

const cachedEvent = unstable_cache(fetchEvent, ["zwiftracing-event", "v1"], { revalidate: 30 * 60 });

export async function loadZwiftRacingEvent(zwiftEventId: number | string | null | undefined): Promise<ZrEvent | null> {
  const id = Number(zwiftEventId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return cachedEvent(id).catch(() => null);
}
