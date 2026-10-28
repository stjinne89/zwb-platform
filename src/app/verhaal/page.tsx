import type { Metadata } from "next";
import { loadPlacedStories } from "@/lib/clubverhaal/server";
import { StoryExperience, type StoryCard } from "./story-experience";

export const metadata: Metadata = {
  title: "Het verhaal van ZWB | ZWB Cycling",
  description:
    "Het verhaal van ZWB: van het eerste indoor-shirt naar de huidige club, met anekdotes en verhalen van leden.",
};

// Foto's hebben ondertekende links die na een uur verlopen; daarom elke keer vers.
export const dynamic = "force-dynamic";

export default async function VerhaalPage() {
  const stories = await loadPlacedStories();
  const cards: StoryCard[] = stories.map((story) => {
    const first = story.photos[0];
    return {
      id: story.id,
      chapter: story.chapter,
      title: story.title,
      body: story.body,
      happenedYear: story.happenedYear,
      author: story.author,
      beker: story.beker,
      photo: first?.url ? { url: first.url, caption: first.caption } : null,
      photoCount: story.photos.length,
      scene: story.scenes[0],
      sceneCount: story.scenes.length,
    };
  });
  return <StoryExperience stories={cards} />;
}
