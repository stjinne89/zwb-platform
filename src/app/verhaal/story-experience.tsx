"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Images, PenLine, Quote, Trophy } from "lucide-react";
import { CHAPTERS, type ChapterId } from "@/lib/clubverhaal/chapters";
import { SHORT_BODY, bodyParagraphs, excerpt } from "@/lib/clubverhaal/story";
import { SceneStage } from "./scene-stage";
import { StoryBar } from "./story-bar";
import styles from "./verhaal.module.css";

export type StoryCard = {
  id: string;
  chapter: ChapterId;
  title: string;
  body: string;
  happenedYear: number | null;
  author: string;
  beker: { id: string; title: string } | null;
  photo: { url: string; caption: string | null } | null;
  photoCount: number;
};

const KIT_SWATCH: Record<ChapterId, string> = { basis: "#f4f2ec", anders: "#2563eb", team: "#0f5963", nu: "#004653" };

/**
 * Het clubverhaal: de 3D-scène uit de ZWBgame staat vast op de achtergrond, de
 * hoofdstukken en de verhalen van leden scrollen eroverheen. Welk hoofdstuk
 * midden in beeld staat, bepaalt het tenue en de groep in de scène.
 */
export function StoryExperience({ stories }: { stories: StoryCard[] }) {
  const [active, setActive] = useState<ChapterId>("basis");
  const progress = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.getAttribute("data-chapter") as ChapterId);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((section) => watcher.observe(section));
    let frame = 0;
    const scrolled = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.current?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`);
      });
    };
    scrolled();
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      watcher.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scrolled);
    };
  }, []);

  return (
    <main className={styles.page}>
      <div ref={progress} className={styles.progress} style={{ transform: "scaleX(0)" }} aria-hidden />
      <StoryBar />

      <div className={styles.stage}>
        <SceneStage chapter={active} />
        <div className={styles.shade} />
      </div>

      <nav aria-label="Hoofdstukken">
        <ol className={styles.rail}>
          {CHAPTERS.map((chapter) => (
            <li key={chapter.id}>
              <a href={`#${chapter.id}`} aria-current={active === chapter.id}>
                <span>{chapter.title}</span>
                <i />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.flow}>
        <section className={styles.intro} data-chapter="basis">
          <span className={styles.eyebrow}>ZWB Cycling</span>
          <h1>
            Het verhaal van <em>ZWB</em>
          </h1>
          <p>Van één renner in een blanco shirt naar een club met eigen ritme.</p>
          <span className={styles.scrollCue}>
            <ChevronDown className="size-4" aria-hidden />
            Scroll
          </span>
        </section>

        {CHAPTERS.map((chapter, index) => {
          const own = stories.filter((story) => story.chapter === chapter.id);
          return (
            <section key={chapter.id} id={chapter.id} className={styles.chapter} data-chapter={chapter.id} aria-labelledby={`${chapter.id}-titel`}>
              <div className={styles.chapterHead}>
                <span className={styles.chapterIndex}>
                  <b>
                    {String(index + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
                  </b>
                  {chapter.era}
                </span>
                <h2 id={`${chapter.id}-titel`}>{chapter.title}</h2>
                <p>{chapter.body}</p>
                <div className={styles.chips}>
                  <span>
                    <i style={{ background: KIT_SWATCH[chapter.id] }} />
                    {chapter.kit.name}
                  </span>
                  <span>{chapter.stat}</span>
                </div>
              </div>
              {own.length > 0 && (
                <ul className={styles.stories}>
                  {own.map((story) => (
                    <li key={story.id}>
                      <StoryCardView story={story} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className={styles.outro} data-chapter="nu">
          <span className={styles.eyebrow}>Jouw hoofdstuk</span>
          <h2>Vertel jouw verhaal</h2>
          <div className={styles.actions}>
            <Link href="/clubverhaal/insturen" className={styles.cta}>
              <PenLine className="size-4" aria-hidden />
              Verhaal insturen
            </Link>
            <a href="#basis" className={styles.ghost}>
              Terug naar het begin
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function Meta({ story }: { story: StoryCard }) {
  return (
    <span className={styles.meta}>
      {story.happenedYear && <span>{story.happenedYear}</span>}
      <span>{story.author}</span>
    </span>
  );
}

/**
 * Een kort verhaal zonder foto staat er helemaal (een anekdote); een verhaal met
 * foto's of een lang verhaal opent een eigen pagina met meer ruimte.
 */
function StoryCardView({ story }: { story: StoryCard }) {
  const short = !story.photo && story.body.length <= SHORT_BODY;
  if (short) {
    return (
      <article className={`${styles.card} ${styles.anecdote}`}>
        <div className={styles.cardBody}>
          <Meta story={story} />
          <h3>
            <Quote className={`${styles.quote} size-5`} aria-hidden />
            {story.title}
          </h3>
          {bodyParagraphs(story.body).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {story.beker && (
            <Link href={`/zwbekers/${story.beker.id}`} className={styles.beker}>
              <Trophy className="size-3.5" aria-hidden />
              {story.beker.title}
            </Link>
          )}
        </div>
      </article>
    );
  }
  return (
    <Link href={`/verhaal/${story.id}`} className={styles.card}>
      {story.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- ondertekende url uit een besloten bucket
        <img src={story.photo.url} alt={story.photo.caption ?? ""} loading="lazy" decoding="async" />
      )}
      {story.photoCount > 1 && (
        <span className={styles.photoCount}>
          <Images className="size-3.5" aria-hidden />
          {story.photoCount}
        </span>
      )}
      <div className={styles.cardBody}>
        <Meta story={story} />
        <h3>{story.title}</h3>
        <p>{excerpt(story.body)}</p>
        <span className={styles.more}>
          Lees het verhaal
          {story.beker ? (
            <span>
              <Trophy className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
              {story.beker.title}
            </span>
          ) : (
            <ArrowRight className="size-4" aria-hidden />
          )}
        </span>
      </div>
    </Link>
  );
}
