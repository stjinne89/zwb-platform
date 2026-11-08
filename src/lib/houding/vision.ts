// MediaPipe laden voor de houdingmeting. Versie 0.10.35 staat bewust vast:
// vanaf 1.0 stuurt de bibliotheek elke minuut gebruiksgegevens naar Google
// (odml.pa.googleapis.com), 0.10.35 niet. Het beeld zelf verlaat het toestel
// nooit.
//
// WASM en modellen komen van ZWB zelf (2026-11-08), niet van jsDelivr en
// Google Storage. De WASM zet scripts/kopieer-mediapipe.mjs bij elke build uit
// node_modules in public/mediapipe/<versie>; de modellen staan in git onder
// public/mediapipe/modellen.

import type { ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";

/** Moet gelijk zijn aan de versie in package.json (er is een test voor). */
export const MEDIAPIPE_VERSIE = "0.10.35";
const WASM = `/mediapipe/${MEDIAPIPE_VERSIE}`;
const POSE_MODEL = "/mediapipe/modellen/pose_landmarker_lite.task";
const SELFIE_MODEL = "/mediapipe/modellen/selfie_segmenter.tflite";

export type Rekenaar = "GPU" | "CPU";

async function fileset() {
  const { FilesetResolver } = await import("@mediapipe/tasks-vision");
  return FilesetResolver.forVisionTasks(WASM);
}

/** Eerst op de GPU (WebGL2); lukt dat niet, dan op de CPU. */
async function metTerugval<T>(maak: (delegate: Rekenaar) => Promise<T>) {
  try {
    return { model: await maak("GPU"), rekenaar: "GPU" as Rekenaar };
  } catch {
    return { model: await maak("CPU"), rekenaar: "CPU" as Rekenaar };
  }
}

export async function laadPose(): Promise<{ model: PoseLandmarker; rekenaar: Rekenaar }> {
  const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await fileset();
  return metTerugval((delegate) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: true,
    }),
  );
}

export async function laadSelfie(): Promise<{ model: ImageSegmenter; rekenaar: Rekenaar }> {
  const { ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const vision = await fileset();
  return metTerugval((delegate) =>
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: SELFIE_MODEL, delegate },
      runningMode: "VIDEO",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
  );
}

/** Lichaamspunten van MediaPipe Pose (33 punten), per kant. */
export const POSE_PUNTEN = {
  links: { schouder: 11, elleboog: 13, pols: 15, heup: 23, knie: 25, enkel: 27, hiel: 29, voet: 31 },
  rechts: { schouder: 12, elleboog: 14, pols: 16, heup: 24, knie: 26, enkel: 28, hiel: 30, voet: 32 },
} as const;

export type Kant = keyof typeof POSE_PUNTEN;
