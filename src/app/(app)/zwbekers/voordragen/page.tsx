import { EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { loadFormOptions, requireBekerMember } from "@/lib/zwbekers/server";
import { NominationForm } from "../_components/nomination-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBeker voordragen" };

export default async function VoordragenPage() {
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Voordragen kan nu niet."}</EmptyState>;
  }
  const today = amsterdamDayKey();
  const options = await loadFormOptions(guard.client, today);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="ZWBekers" title="Voordragen" />
      <NominationForm options={options} today={today} />
    </div>
  );
}
