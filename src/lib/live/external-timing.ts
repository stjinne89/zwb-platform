import { unstable_cache } from "next/cache";
import {
  scrapeEventLiveTiming,
  type LiveTimingOutcome,
} from "@/lib/event-results/scrape";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClub } from "@/lib/club";

const fetchCachedTiming = unstable_cache(
  async (timingUrl: string, teamTag: string): Promise<LiveTimingOutcome> =>
    scrapeEventLiveTiming(createAdminClient(), timingUrl, teamTag),
  ["external-event-live-timing"],
  { revalidate: 20 },
);

export async function fetchExternalLiveTiming(timingUrl: string) {
  return fetchCachedTiming(timingUrl, (await getClub()).recognition.teamTag);
}
