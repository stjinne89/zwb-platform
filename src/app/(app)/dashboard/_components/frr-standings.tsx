import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import { FrrZwbStandingsList } from "@/components/frr-zwb-standings-list";
import { isActiveTour } from "@/lib/frr/sync";
import { loadZwbFrrStandings } from "@/lib/frr/zwb-standings";

type TourRow = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
};

/** De ZWB'ers in het klassement van de lopende FRR-tour (migr. 0195). */
export async function FrrStandings({ userId }: { userId: string | null }) {
  const supabase = await createClient();
  const { data: tourRows } = await supabase
    .from("frr_tours")
    .select("id, name, starts_on, ends_on")
    .not("gc_after_stage", "is", null)
    .order("starts_on", { ascending: false });
  const now = new Date();
  const tour = ((tourRows ?? []) as TourRow[]).find((row) => isActiveTour(row, now));
  if (!tour) return null;

  const [{ zwbNames, members, standings }, { data: tourEvent }] = await Promise.all([
    loadZwbFrrStandings(supabase, tour.id),
    supabase
      .from("events")
      .select("id")
      .eq("frr_tour_id", tour.id)
      .is("frr_stage", null)
      .is("parent_event_id", null)
      .maybeSingle(),
  ]);
  if (standings.length === 0) return null;
  const afterStage = standings[0].after_stage;

  return (
    <section>
      <SectionHeader
        icon={Trophy}
        title={`FRR-klassement · na etappe ${afterStage}`}
        action={
          tourEvent ? <InlineMoreLink href={`/events/${tourEvent.id}`}>Tour</InlineMoreLink> : null
        }
      />
      <FrrZwbStandingsList
        standings={standings}
        zwbNames={zwbNames}
        myZwiftId={members.find((row) => row.id === userId)?.zwiftId ?? null}
      />
    </section>
  );
}
