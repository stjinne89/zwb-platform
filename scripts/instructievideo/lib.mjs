// Gedeeld door opname.mjs en bouw.mjs: paden, ffmpeg, en de timing van een
// scène (hoe lang hij duurt en wanneer een woord uit de tekst valt).

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, "out");
export const AUDIO_DIR = path.join(HERE, "audio");

/** Stilte voor de eerste zin en na de laatste, in seconden. */
export const LEAD_IN = 0.5;
export const TAIL = 1.0;
/** Leestempo voor de ondertitels, en zonder audio de geschatte duur van een scène. */
const WORDS_PER_SECOND = 2.4;

let ffmpegPath;
export function ffmpeg() {
  if (ffmpegPath) return ffmpegPath;
  if (process.env.FFMPEG) return (ffmpegPath = process.env.FFMPEG);
  // Meegeleverd door het Python-pakket imageio-ffmpeg (pip install imageio-ffmpeg).
  ffmpegPath = execFileSync("python", ["-c", "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())"])
    .toString()
    .trim();
  return ffmpegPath;
}

export function runFfmpeg(args, cwd) {
  const result = spawnSync(ffmpeg(), ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg faalde: ${result.stderr}`);
  }
}

/** Duur van een mediabestand in seconden, uit de kop die ffmpeg print. */
export function mediaDuration(file) {
  const result = spawnSync(ffmpeg(), ["-hide_banner", "-i", file], { encoding: "utf8" });
  const match = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(result.stderr);
  if (!match) throw new Error(`geen duur gevonden voor ${file}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

const AUDIO_EXT = [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".webm", ".flac"];

/** Een ingesproken bestand voor deze scène, als dat er is (nu niet: geen stem). */
export function audioFor(sceneId) {
  if (!existsSync(AUDIO_DIR)) return null;
  const file = readdirSync(AUDIO_DIR).find(
    (name) => AUDIO_EXT.includes(path.extname(name).toLowerCase()) && name.startsWith(sceneId),
  );
  return file ? path.join(AUDIO_DIR, file) : null;
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Hoe lang de gesproken tekst duurt: echt gemeten of geschat. */
export function speechSeconds(scene) {
  const audio = audioFor(scene.id);
  if (audio) return { seconds: mediaDuration(audio), audio };
  return { seconds: wordCount(scene.tekst) / WORDS_PER_SECOND, audio: null };
}

export function sceneSeconds(scene) {
  return LEAD_IN + speechSeconds(scene).seconds + TAIL;
}

/**
 * Een klok voor één scène. `cue("woord")` geeft het moment (in seconden vanaf
 * de start van de scène) waarop dat woord ongeveer klinkt: evenredig met de
 * plaats in de tekst. Elke cue zoekt verder vanaf de vorige, zodat een woord
 * dat twee keer voorkomt de tweede keer ook klopt.
 */
export function makeCues(scene, speech) {
  const text = scene.tekst;
  let from = 0;
  return (word) => {
    if (typeof word === "number") return LEAD_IN + word * speech;
    const index = text.toLowerCase().indexOf(word.toLowerCase(), from);
    if (index === -1) throw new Error(`cue "${word}" niet gevonden in de tekst van ${scene.id}`);
    from = index + word.length;
    return LEAD_IN + (index / text.length) * speech;
  };
}

/**
 * De tekst in ondertitelregels: per zin, en lange zinnen nog eens op een komma.
 * Elk stuk krijgt een tijd naar rato van het aantal tekens.
 */
export function subtitleChunks(scene, speech) {
  // Alleen een punt gevolgd door een spatie sluit een zin af, dus my.zwift.com blijft heel.
  const sentences = scene.tekst.split(/(?<=[.!?])\s+/).filter(Boolean);
  const pieces = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length <= 84) {
      pieces.push(sentence);
      continue;
    }
    const parts = sentence.split(/(?<=,)\s+/);
    let current = "";
    for (const part of parts) {
      if (current && (current + " " + part).length > 84) {
        pieces.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) pieces.push(current);
  }
  const total = pieces.reduce((sum, piece) => sum + piece.length, 0);
  let t = LEAD_IN;
  return pieces.map((text) => {
    const length = (text.length / total) * speech;
    const chunk = { start: t, end: t + length, text };
    t += length;
    return chunk;
  });
}
