import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PenLine, Trophy } from "lucide-react";
import { CHAPTERS, chapterById } from "@/lib/clubverhaal/chapters";
import { bodyParagraphs, excerpt } from "@/lib/clubverhaal/story";
import { loadPlacedStory, type StoryPhoto } from "@/lib/clubverhaal/server";
import { SceneStage } from "../scene-stage";
import { StoryBar } from "../story-bar";
import styles from "../verhaal.module.css";

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
 * Eén geplaatst verhaal met de ruimte die het nodig heeft: de scène van zijn
 * hoofdstuk als kop, daaronder de tekst met de foto's tussen de alinea's.
 */
export default async function VerhaalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const story = await loadPlacedStory(id);
  if (!story) notFound();

  const chapter = chapterById(story.chapter);
  const index = CHAPTERS.indexOf(chapter);
  const paragraphs = bodyParagraphs(story.body);
  const photos = story.photos.filter((photo): photo is StoryPhoto & { url: string } => Boolean(photo.url));
  // Na elke alinea (behalve de laatste) een foto; wat overblijft, komt samen onderaan.
  const between = photos.slice(0, Math.max(0, paragraphs.length - 1));
  const rest = photos.slice(between.length);

  return (
    <main className={styles.page}>
      <StoryBar />
      <div className={styles.hero}>
        <SceneStage chapter={story.chapter} frame="hero" />
        <div className={styles.heroShade} />
        <div className={styles.heroText}>
          <Link href={`/verhaal#${chapter.id}`} className={styles.back}>
            <ArrowLeft className="size-4" aria-hidden />
            Het verhaal
          </Link>
          <span className={styles.eyebrow}>
            {String(index + 1).padStart(2, "0")} · {chapter.era}
            {story.happenedYear ? ` · ${story.happenedYear}` : ""}
          </span>
          <h1>{story.title}</h1>
          <p className={styles.byline}>Door {story.author}</p>
        </div>
      </div>

      <article className={styles.article}>
        <div className={styles.text}>
          {paragraphs.map((paragraph, at) => (
            <div key={at}>
              <p>{paragraph}</p>
              {between[at] && <Photo photo={between[at]} title={story.title} />}
            </div>
          ))}
        </div>
        {rest.length === 1 && <Photo photo={rest[0]} title={story.title} />}
        {rest.length > 1 && (
          <div className={styles.gallery}>
            {rest.map((photo) => (
              <Photo key={photo.id} photo={photo} title={story.title} />
            ))}
          </div>
        )}

        <div className={styles.footerLinks}>
          {story.beker && (
            <Link href={`/zwbekers/${story.beker.id}`} className={styles.ghost}>
              <Trophy className="size-4" aria-hidden />
              {story.beker.title}
            </Link>
          )}
          <Link href={`/verhaal#${chapter.id}`} className={styles.ghost}>
            <ArrowLeft className="size-4" aria-hidden />
            {chapter.title}
          </Link>
          <Link href="/clubverhaal/insturen" className={styles.cta}>
            <PenLine className="size-4" aria-hidden />
            Vertel jouw verhaal
          </Link>
        </div>
      </article>
    </main>
  );
}

function Photo({ photo, title }: { photo: StoryPhoto & { url: string }; title: string }) {
  return (
    <figure className={styles.figure}>
      <a href={photo.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- ondertekende url uit een besloten bucket */}
        <img src={photo.url} alt={photo.caption ?? `Foto bij ${title}`} loading="lazy" decoding="async" />
      </a>
      {photo.caption && <figcaption>{photo.caption}</figcaption>}
    </figure>
  );
}
