import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAPTERS, chapterById } from "@/lib/clubverhaal/chapters";
import { excerpt } from "@/lib/clubverhaal/story";
import { loadPlacedStory } from "@/lib/clubverhaal/server";
import { StoryReader, type ReaderPhoto } from "./story-reader";

// Foto's hebben ondertekende links die na een uur verlopen; daarom elke keer vers.
export const dynamic = "force-dynamic";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const story = isId(id) ? await loadPlacedStory(id) : null;
  if (!story) return { title: "Het verhaal van ZWB | ZWB Cycling" };
  return { title: `${story.title} | Het verhaal van ZWB`, description: excerpt(story.body, 160) };
}

/**
 * Eén geplaatst verhaal met de ruimte die het nodig heeft: per hoofdstuk van
 * het verhaal de scène die het lid koos, met de foto's ertussen.
 */
export default async function VerhaalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const story = await loadPlacedStory(id);
  if (!story) notFound();

  const chapter = chapterById(story.chapter);
  const index = CHAPTERS.indexOf(chapter);
  const photos: ReaderPhoto[] = story.photos.flatMap((photo) => (photo.url ? [{ id: photo.id, url: photo.url, caption: photo.caption }] : []));

  return (
    <StoryReader
      title={story.title}
      eyebrow={`${String(index + 1).padStart(2, "0")} · ${chapter.era}${story.happenedYear ? ` · ${story.happenedYear}` : ""}`}
      author={story.author}
      scenes={story.scenes}
      photos={photos}
      beker={story.beker}
      back={{ href: `/verhaal#${chapter.id}`, label: chapter.title }}
    />
  );
}
