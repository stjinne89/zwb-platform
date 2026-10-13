"use client";

// De enige poort naar beeld bij een oefening. Pagina's raken het figuurregister
// nooit rechtstreeks aan, zodat later beeld toevoegen puur additief is:
//
//   gevulde media_json  →  de getekende figuur  →  alleen de tekst
//
// media_json is bij oplevering leeg. Vullen we die later met foto's, video of
// ingekochte animaties, dan verandert er aan de pagina's niets.

import { useEffect, useRef, useState } from "react";
import {
  Figure,
  blendPose,
  figureIsVariants,
  figurePoses,
  type Pose,
} from "@/components/mobility/figures";
import type { MobilityExercise } from "@/lib/training/mobility";
import { exerciseMuscles } from "@/lib/training/muscles";

const FRAME_MS = 1800;
/** Rust op de uiteinden van de beweging, en de tijd van pose naar pose. */
const HOLD_MS = 650;
const MOVE_MS = 1000;

type VisualExercise = Pick<
  MobilityExercise,
  "slug" | "title" | "illustration_slug" | "media_json"
>;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Wisselt automatisch door losse beelden, tenzij het systeem minder beweging
 * vraagt. Tikken werkt altijd — dat is ook de toegankelijke bediening. */
function useFrameLoop(count: number, enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!enabled || count < 2 || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      FRAME_MS,
    );
    return () => window.clearInterval(timer);
  }, [count, paused, enabled]);

  function next() {
    // Handmatig wisselen zet de lus stil: wie zelf bladert, wil niet dat het
    // beeld onder zijn vinger vandaan schuift.
    setPaused(true);
    setIndex((current) => (current + 1) % Math.max(1, count));
  }

  return { index: Math.min(index, Math.max(0, count - 1)), next, paused };
}

/**
 * Plaats in de beweging op `elapsed` ms: 0 is de eerste pose, `count - 1` de
 * laatste. Heen en terug, met een rust op beide uiteinden en een zachte aanzet.
 */
function motionPosition(elapsed: number, count: number): number {
  const travel = (count - 1) * MOVE_MS;
  let time = elapsed % (2 * (HOLD_MS + travel));
  if (time < HOLD_MS) return 0;
  time -= HOLD_MS;
  if (time < travel) return eased(time / MOVE_MS);
  time -= travel;
  if (time < HOLD_MS) return count - 1;
  time -= HOLD_MS;
  return count - 1 - eased(time / MOVE_MS);
}

/** Zachte aanzet en uitloop per stap van pose naar pose. */
function eased(steps: number): number {
  const whole = Math.floor(steps);
  const part = steps - whole;
  return whole + part * part * (3 - 2 * part);
}

/**
 * Laat de figuur vloeiend tussen de poses bewegen zolang hij in beeld is. Op een
 * pagina met de hele bibliotheek staan tientallen figuren; wat buiten beeld
 * staat, rekent niet mee.
 */
function useMotion(count: number, enabled: boolean, target: React.RefObject<Element | null>) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const element = target.current;
    if (!enabled || count < 2 || !element || prefersReducedMotion()) return;

    let frame = 0;
    let start: number | null = null;
    let last = -1;

    const tick = (now: number) => {
      start ??= now;
      const next = motionPosition(now - start, count);
      if (next !== last) {
        last = next;
        setPosition(next);
      }
      frame = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      window.cancelAnimationFrame(frame);
      if (entry.isIntersecting) frame = window.requestAnimationFrame(tick);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [count, enabled, target]);

  return position;
}

function poseAt(poses: Pose[], position: number): Pose {
  const index = Math.min(poses.length - 1, Math.max(0, Math.floor(position)));
  const next = Math.min(poses.length - 1, index + 1);
  return blendPose(poses[index], poses[next], position - index);
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
  // Een beweging loopt vloeiend; losse beelden (media, of varianten van een
  // hold) wisselen per stuk.
  const moves = Boolean(poses) && !figureIsVariants(exercise.illustration_slug);

  const ref = useRef<HTMLButtonElement>(null);
  const { index, next, paused } = useFrameLoop(frameCount, !moves);
  const position = useMotion(frameCount, moves && !paused, ref);

  if (frameCount === 0) return null;

  const label =
    frameCount > 1
      ? `${exercise.title}, beeld ${index + 1} van ${frameCount}. Tik voor het volgende.`
      : exercise.title;

  return (
    <button
      ref={ref}
      type="button"
      onClick={next}
      aria-label={label}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-md bg-muted/40 p-2 ${className ?? ""}`}
    >
      {media.length > 0 ? (
        <MediaFrame media={media[index]} />
      ) : (
        <Figure
          pose={moves && !paused ? poseAt(poses!, position) : poses![index]}
          muscles={exerciseMuscles(exercise.slug) ?? undefined}
        />
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
