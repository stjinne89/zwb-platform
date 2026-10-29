"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, PenLine, Trophy } from "lucide-react";
import type { Scene, SceneSpec } from "@/lib/clubverhaal/scenes";
import { bodyParagraphs } from "@/lib/clubverhaal/story";
import { SceneStage } from "../scene-stage";
import { StoryBar } from "../story-bar";
import styles from "../verhaal.module.css";

export type ReaderPhoto = { id: string; url: string; caption: string | null };

/**
 * Eén verhaal, hoofdstuk voor hoofdstuk: de 3D-scène staat vast op de
 * achtergrond en wisselt naar de scène van het hoofdstuk dat midden in beeld
 * staat. Foto's staan tussen de hoofdstukken; wat overblijft, komt onderaan.
 */
export function StoryReader({
  title,
  eyebrow,
  author,
  scenes,
  photos,
  beker,
  back,
}: {
  title: string;
  eyebrow: string;
  author: string;
  scenes: Scene[];
  photos: ReaderPhoto[];
  beker: { id: string; title: string } | null;
  back: { href: string; label: string };
}) {
  const [active, setActive] = useState<SceneSpec>(scenes[0]);

  useEffect(() => {
    const parts = [...document.querySelectorAll<HTMLElement>("[data-scene-index]")];
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(scenes[Number(entry.target.getAttribute("data-scene-index"))] ?? scenes[0]);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    parts.forEach((part) => watcher.observe(part));
    return () => watcher.disconnect();
  }, [scenes]);

  // Na elk hoofdstuk (behalve het laatste) een foto; de rest samen onderaan.
  const between = photos.slice(0, Math.max(0, scenes.length - 1));
  const rest = photos.slice(between.length);

  return (
    <main className={styles.page}>
      <StoryBar />
      <div className={styles.stage}>
        <SceneStage spec={active} />
        <div className={styles.shade} />
      </div>

      <div className={styles.flow}>
        <header className={styles.intro} data-scene-index={0}>
          <Link href={back.href} className={styles.back}>
            <ArrowLeft className="size-4" aria-hidden />
            Het verhaal
          </Link>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.storyTitle}>{title}</h1>
          <p>Door {author}</p>
        </header>

        {scenes.map((scene, index) => (
          <section key={index} className={styles.scene} data-scene-index={index} aria-label={`Hoofdstuk ${index + 1}`}>
            <div className={styles.scenePanel}>
              {scenes.length > 1 && (
                <span className={styles.chapterIndex}>
                  <b>
                    {String(index + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
                  </b>
                </span>
              )}
              {bodyParagraphs(scene.text).map((paragraph, at) => (
                <p key={at}>{paragraph}</p>
              ))}
            </div>
            {between[index] && <Photo photo={between[index]} title={title} />}
          </section>
        ))}

        <section className={styles.outro} data-scene-index={scenes.length - 1}>
          {rest.length > 0 && (
            <div className={styles.gallery}>
              {rest.map((photo) => (
                <Photo key={photo.id} photo={photo} title={title} />
              ))}
            </div>
          )}
          <div className={styles.actions}>
            {beker && (
              <Link href={`/zwbekers/${beker.id}`} className={styles.ghost}>
                <Trophy className="size-4" aria-hidden />
                {beker.title}
              </Link>
            )}
            <Link href={back.href} className={styles.ghost}>
              <ArrowLeft className="size-4" aria-hidden />
              {back.label}
            </Link>
            <Link href="/clubverhaal/insturen" className={styles.cta}>
              <PenLine className="size-4" aria-hidden />
              Vertel jouw verhaal
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Photo({ photo, title }: { photo: ReaderPhoto; title: string }) {
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
