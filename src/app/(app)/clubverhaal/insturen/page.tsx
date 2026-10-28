import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { loadBekerOptions, requireStoryMember } from "@/lib/clubverhaal/server";
import { StoryForm } from "../_components/story-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verhaal insturen" };

/** Een nieuw verhaal voor /verhaal; `?beker=<id>` kiest de ZWBeker al voor. */
export default async function InsturenPage({ searchParams }: { searchParams: Promise<{ beker?: string | string[] }> }) {
  let guard;
  try {
    guard = await requireStoryMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Insturen kan nu niet."}</EmptyState>;
  }
  const { beker } = await searchParams;
  const bekers = await loadBekerOptions(guard.client);
  const preset = typeof beker === "string" && bekers.some((item) => item.id === beker) ? beker : null;

  return (
    <div className="space-y-6">
      <BackLink href="/clubverhaal" label="Je verhalen" />
      <PageHeader eyebrow="Het verhaal van ZWB" title="Verhaal insturen" />
      <StoryForm bekers={bekers} year={Number(amsterdamDayKey().slice(0, 4))} presetBeker={preset} />
    </div>
  );
}
