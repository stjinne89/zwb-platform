import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { calendarEventForZwift, loadZwiftLinkRace } from "@/lib/zrl-analysis/load";
import { PersonalRaceView } from "../../_components/personal-race";

type PageProps = { params: Promise<{ zwiftEventId: string }> };

export const dynamic = "force-dynamic";
// De eerste keer haalt de app de race bij Zwift: eerst event en uitslag, de
// segmenten pas als het lid meereed.
export const maxDuration = 30;

export const metadata: Metadata = { title: "ZWBeter racen" };

/** Een Zwift-race buiten de kalender, via een geplakte link. */
export default async function ZwiftRacePage({ params }: PageProps) {
  const { zwiftEventId } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  // Staat de race in de kalender, dan hoort de analyse daar (ZRL met de ploeg).
  const calendarId = await calendarEventForZwift(zwiftEventId);
  if (calendarId) redirect(`/zwbeter-worden/racen/${calendarId}`);
  const outcome = await loadZwiftLinkRace(zwiftEventId, user, await createClient());
  if (outcome.status === "not-found") notFound();
  return <PersonalRaceView outcome={outcome} />;
}
