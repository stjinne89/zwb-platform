import { unstable_cache } from "next/cache";
import {
  scrapeEventLiveTiming,
  type LiveTimingOutcome,
} from "@/lib/event-results/scrape";
import { createAdminClient } from "@/lib/supabase/admin";

const fetchCachedTiming = unstable_cache(
  async (timingUrl: string): Promise<LiveTimingOutcome> =>
    scrapeEventLiveTiming(createAdminClient(), timingUrl),
  ["external-event-live-timing"],
  { revalidate: 20 },
);

export function fetchExternalLiveTiming(timingUrl: string) {
  return fetchCachedTiming(timingUrl);
}
