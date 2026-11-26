import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getClub } from "@/lib/club";
import { createAdminClient } from "@/lib/supabase/admin";
import { TV_KEY_COOKIE, tvNight } from "@/lib/tv/pairing";
import { tvMember } from "@/lib/tv/store";
import { loadDayStreams } from "@/lib/youtube-live/day-streams";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { TvPairing } from "./_components/tv-pairing";
import { TvScreen } from "./_components/tv-screen";

// De tv (0374, 2026-11-26): openbaar, want de browser van een tv logt niet in.
// Zonder sleutel een code om te koppelen; met de sleutel van een gekoppelde tv
// het streamcenter van vanavond, altijd in TV. Dezelfde races en streams als
// een goedgekeurd lid ziet, via de service-rol. Zie docs/streamcenter-tv-onderzoek.md.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "TV", robots: { index: false, follow: false } };

export default async function TvPage() {
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) notFound();
  const admin = createAdminClient();
  const key = (await cookies()).get(TV_KEY_COOKIE)?.value;
  const member = key ? await tvMember(admin, key) : null;
  if (!member) return <TvPairing />;

  const now = new Date();
  const night = tvNight(now);
  const { tiles } = await loadDayStreams(admin, night, now);
  return <TvScreen tiles={tiles} night={night} />;
}
