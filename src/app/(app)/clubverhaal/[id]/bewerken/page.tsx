import { notFound } from "next/navigation";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { canEdit } from "@/lib/clubverhaal/story";
import { loadBekerOptions, loadStory, requireStoryMember } from "@/lib/clubverhaal/server";
import { StoryForm } from "../../_components/story-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verhaal aanpassen" };

/** Een eigen verhaal aanpassen zolang het niet geplaatst is; daarna gaat het opnieuw naar het bestuur. */
export default async function BewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let guard;
  try {
    guard = await requireStoryMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Aanpassen kan nu niet."}</EmptyState>;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const story = await loadStory(guard.client, id);
  if (!story) notFound();
  if (!canEdit({ status: story.status, profileId: story.authorId }, guard.member.id)) {
    return <EmptyState>Dit verhaal kun je niet meer aanpassen.</EmptyState>;
  }
  const bekers = await loadBekerOptions(guard.client);

  return (
    <div className="space-y-6">
      <BackLink href="/clubverhaal" label="Je verhalen" />
      <PageHeader eyebrow="Het verhaal van ZWB" title="Verhaal aanpassen" />
      <StoryForm
        bekers={bekers}
        year={Number(amsterdamDayKey().slice(0, 4))}
        initial={{
          id: story.id,
          title: story.title,
          scenes: story.scenes,
          happenedYear: story.happenedYear,
          bekerId: story.beker?.id ?? null,
          photos: story.photos.map((photo) => ({ id: photo.id, caption: photo.caption, url: photo.url })),
        }}
      />
    </div>
  );
}
