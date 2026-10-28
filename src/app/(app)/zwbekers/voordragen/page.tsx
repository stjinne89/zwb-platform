import { EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { loadBeker, loadFormOptions, requireBekerMember } from "@/lib/zwbekers/server";
import { NominationForm, type FormInitial } from "../_components/nomination-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBeker voordragen" };

/**
 * Een nieuwe voordracht, leeg of als kopie van een beker die je mag zien
 * (`?van=<id>`, wens eigenaar 2026-10-28). Een kopie neemt soort, titel,
 * verhaal, team, winnaars en ontwerp over; datum, event of ronde, uitslag en
 * foto horen bij die ene prestatie en beginnen leeg.
 */
export default async function VoordragenPage({ searchParams }: { searchParams: Promise<{ van?: string | string[] }> }) {
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Voordragen kan nu niet."}</EmptyState>;
  }
  const today = amsterdamDayKey();
  const { van } = await searchParams;
  const source = typeof van === "string" && /^[0-9a-f-]{36}$/i.test(van) ? await loadBeker(guard.client, van) : null;
  const options = await loadFormOptions(guard.client, today);
  const initial: FormInitial | undefined = source
    ? {
        id: null,
        kind: source.kind,
        title: source.title,
        story: source.story,
        achievedOn: today,
        winners: source.winners.map((winner) => winner.id),
        teamId: source.teamId,
        eventId: null,
        zrlRound: null,
        resultUrl: null,
        design: source.design,
        photoUrl: null,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="ZWBekers" title="Voordragen" />
      <NominationForm options={options} today={today} initial={initial} />
    </div>
  );
}
