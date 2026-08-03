"use client";

// De enige poort naar beeld bij een oefening. Pagina's raken het figuurregister
// nooit rechtstreeks aan, zodat later beeld toevoegen puur additief is:
//
//   gevulde media_json  →  de getekende figuur  →  alleen de tekst
//
// media_json is bij oplevering leeg. Vullen we die later met foto's, video of
// ingekochte animaties, dan verandert er aan de pagina's niets.

import { useEffect, useState } from "react";
import { Figure, figurePoses } from "@/components/mobility/figures";
import type { MobilityExercise } from "@/lib/training/mobility";

const FRAME_MS = 1200;

type VisualExercise = Pick<
  MobilityExercise,
  "title" | "illustration_slug" | "media_json"
>;

/** Wisselt automatisch door de frames, tenzij het systeem minder beweging
 * vraagt. Tikken werkt altijd — dat is ook de toegankelijke bediening. */
function useFrameLoop(count: number) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      FRAME_MS,
    );
    return () => window.clearInterval(timer);
  }, [count, paused]);

  function next() {
    // Handmatig wisselen zet de lus stil: wie zelf bladert, wil niet dat het
    // beeld onder zijn vinger vandaan schuift.
    setPaused(true);
    setIndex((current) => (current + 1) % Math.max(1, count));
  }

  return { index: Math.min(index, Math.max(0, count - 1)), next };
}

export function ExerciseVisual({
  exercise,
  className,
}: {
  exercise: VisualExercise;
  className?: string;
}) {
  const media = [...(exercise.media_json ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const poses = media.length > 0 ? null : figurePoses(exercise.illustration_slug);
  const frameCount = media.length > 0 ? media.length : (poses?.length ?? 0);
  const { index, next } = useFrameLoop(frameCount);

  if (frameCount === 0) return null;

  const label =
    frameCount > 1
      ? `${exercise.title}, beeld ${index + 1} van ${frameCount}. Tik voor het volgende.`
      : exercise.title;

  return (
    <button
      type="button"
      onClick={next}
      aria-label={label}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-md bg-muted/40 p-2 ${className ?? ""}`}
    >
      {media.length > 0 ? (
        <MediaFrame media={media[index]} />
      ) : (
        <Figure pose={poses![index]} />
      )}
    </button>
  );
}

function MediaFrame({ media }: { media: NonNullable<MobilityExercise["media_json"]>[number] }) {
  if (media.kind === "video") {
    return (
      // Stille loop zonder audio, dus geen ondertiteling nodig.
      <video
        src={media.src}
        muted
        loop
        playsInline
        autoPlay
        aria-label={media.alt}
        className="h-auto w-full rounded"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bron staat pas bij het vullen van media_json vast
    <img src={media.src} alt={media.alt} className="h-auto w-full rounded" />
  );
}
