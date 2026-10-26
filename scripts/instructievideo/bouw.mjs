// Plakt de clips uit opname.mjs aan elkaar tot één staande video (1080x1920)
// met ondertitels in een balk onderin. Geen geluid, tenzij er in audio/ een
// opname per scène staat.
//
//   node scripts/instructievideo/bouw.mjs              (alleen bouwen)
//   node scripts/instructievideo/bouw.mjs --publiceer  (en de hulpclips naar public/)
//
// Uitvoer in scripts/instructievideo/out/: de mp4 en een losse .srt voor
// YouTube of WhatsApp, plus in out/hulp/ een korte, lichtere clip per onderdeel
// van /hulp (zie CLIPS in scenes.mjs).

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CLIPS, HULP_SCENES, SCENES, VIDEO } from "./scenes.mjs";
import { HERE, OUT, LEAD_IN, audioFor, runFfmpeg, subtitleChunks } from "./lib.mjs";

const WIDTH = 1080;
const HEIGHT = 1920;
const SCREEN_HEIGHT = 1634; // 390x590 opgeschaald naar 1080 breed
const BAND = "0x0a2b34"; // zwb-petrol-dark
const FPS = 30;

const manifest = JSON.parse(readFileSync(path.join(OUT, "manifest.json"), "utf8"));
const clipsDir = path.join(OUT, "clips");
mkdirSync(clipsDir, { recursive: true });

const missing = SCENES.filter((scene) => !manifest[scene.id]);
if (missing.length) {
  console.warn(`let op, nog niet opgenomen en overgeslagen: ${missing.map((scene) => scene.id).join(", ")}`);
}
// De hoofdvideo uit SCENES; de losse clips mogen ook scènes uit HULP_SCENES gebruiken.
const mainScenes = SCENES.filter((scene) => manifest[scene.id]);
const allScenes = [...SCENES, ...HULP_SCENES];
const scenes = allScenes.filter((scene) => manifest[scene.id]);

function assTime(seconds) {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

/**
 * De vastgelegde beelden van één scène als concat-lijst voor ffmpeg: elk beeld
 * staat in beeld tot het volgende kwam, vanaf het startpunt tot het einde.
 */
function frameList(sceneId, meta) {
  const dir = path.join(OUT, "frames", sceneId);
  const frames = JSON.parse(readFileSync(path.join(dir, "frames.json"), "utf8"));
  if (!frames.length) throw new Error(`geen beelden voor ${sceneId}`);
  const end = meta.trimStart + meta.duration;
  let first = 0;
  frames.forEach((frame, i) => {
    if (frame.t <= meta.trimStart) first = i;
  });
  const lines = [];
  for (let i = first; i < frames.length; i++) {
    const start = Math.max(frames[i].t, meta.trimStart);
    const next = i + 1 < frames.length && frames[i + 1].t < end ? frames[i + 1].t : end;
    lines.push(`file '${frames[i].name}'`, `duration ${(next - start).toFixed(4)}`);
    if (next >= end) {
      // De concat-demuxer negeert de duur van het laatste item zonder herhaling.
      lines.push(`file '${frames[i].name}'`);
      break;
    }
  }
  writeFileSync(path.join(dir, "lijst.txt"), lines.join("\n"));
  return dir;
}

// 1. Per scène: beelden tot een clip, opschalen, balk eronder, audio of stilte.
const list = [];
for (const scene of scenes) {
  const meta = manifest[scene.id];
  const frameDir = frameList(scene.id, meta);
  const clip = path.join(clipsDir, `${scene.id}.mp4`);
  const audio = audioFor(scene.id);
  const delayMs = Math.round(LEAD_IN * 1000);
  const audioInput = audio
    ? ["-i", audio]
    : ["-f", "lavfi", "-t", String(meta.duration), "-i", "anullsrc=r=48000:cl=stereo"];
  const audioFilter = audio
    ? `[1:a]aresample=48000,adelay=${delayMs}|${delayMs},apad[a]`
    : `[1:a]anull[a]`;
  runFfmpeg(
    [
      "-f", "concat", "-safe", "0", "-i", "lijst.txt",
      ...audioInput,
      "-filter_complex",
      `[0:v]fps=${FPS},scale=${WIDTH}:${SCREEN_HEIGHT}:flags=lanczos,` +
        `pad=${WIDTH}:${HEIGHT}:0:0:color=${BAND},setsar=1[v];${audioFilter}`,
      "-map", "[v]", "-map", "[a]",
      "-t", String(meta.duration),
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
      clip,
    ],
    frameDir,
  );
  list.push(`file '${clip.replace(/\\/g, "/")}'`);
}
const clipFiles = new Map(scenes.map((scene, i) => [scene.id, list[i]]));

/**
 * Een reeks scènes tot één video: aan elkaar, ondertitels en een label erin
 * gebrand, en een losse .srt ernaast. `label(scene)` is de tekst boven de
 * ondertitels; `small` maakt een lichtere 720x1280-versie voor de hulppagina.
 */
function render({ name, sceneList, label, small = false }) {
  const base = path.join(OUT, name);
  mkdirSync(path.dirname(base), { recursive: true });
  const rel = (file) => path.relative(OUT, file).replace(/\\/g, "/");
  writeFileSync(`${base}.lijst.txt`, sceneList.map((scene) => clipFiles.get(scene.id)).join("\n"));

  const ass = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${WIDTH}`,
    `PlayResY: ${HEIGHT}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // ASS-kleuren zijn &HAABBGGRR.
    "Style: Tekst,Segoe UI Semibold,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,70,70,64,1",
    "Style: Stap,Segoe UI Semibold,30,&H003D87B8,&H003D87B8,&H00000000,&H00000000,0,0,0,0,100,100,1.5,0,1,0,0,8,70,70,1664,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const srt = [];
  let offset = 0;
  for (const scene of sceneList) {
    const meta = manifest[scene.id];
    ass.push(`Dialogue: 0,${assTime(offset)},${assTime(offset + meta.duration)},Stap,,0,0,0,,${label(scene)}`);
    for (const chunk of subtitleChunks(scene, meta.speech)) {
      const start = offset + chunk.start;
      const end = offset + chunk.end;
      ass.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Tekst,,0,0,0,,${chunk.text}`);
      srt.push(`${srt.length + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${chunk.text}\n`);
    }
    offset += meta.duration;
  }
  writeFileSync(`${base}.ass`, ass.join("\n"));
  writeFileSync(`${base}.srt`, srt.join("\n"));

  // Relatieve paden, want het ass-filter struikelt over de dubbele punt in een
  // Windows-pad.
  runFfmpeg(["-f", "concat", "-safe", "0", "-i", rel(`${base}.lijst.txt`), "-c", "copy", rel(`${base}.samen.mp4`)], OUT);
  const scale = small ? ",scale=720:1280:flags=lanczos" : "";
  runFfmpeg(
    [
      "-i", rel(`${base}.samen.mp4`),
      "-vf", `ass=${rel(`${base}.ass`)}${scale}`,
      "-c:v", "libx264", "-preset", "medium", "-crf", small ? "26" : "20", "-pix_fmt", "yuv420p",
      // Zonder ingesproken scène is het geluid alleen stilte: dan geen geluidsspoor.
      ...(!sceneList.some((scene) => audioFor(scene.id))
        ? ["-an"]
        : small
          ? ["-c:a", "aac", "-b:a", "96k"]
          : ["-c:a", "copy"]),
      "-movflags", "+faststart",
      rel(`${base}.mp4`),
    ],
    OUT,
  );
  for (const tmp of [`${base}.lijst.txt`, `${base}.samen.mp4`, `${base}.ass`]) rmSync(tmp, { force: true });
  return offset;
}

// 2. De hele video, met "Stap 3 van 15" boven de ondertitels (als er scènes van zijn).
const total = mainScenes.length
  ? render({
      name: VIDEO.id,
      sceneList: mainScenes,
      label: (scene) => `STAP ${SCENES.indexOf(scene) + 1} VAN ${SCENES.length}  ·  ${scene.titel.toUpperCase()}`,
    })
  : 0;

// 3. Losse clips per onderdeel van /hulp, alleen als al hun scènes er zijn.
const built = [];
for (const clip of CLIPS) {
  const sceneList = clip.scenes.map((id) => allScenes.find((scene) => scene.id === id));
  if (sceneList.some((scene) => !scene || !manifest[scene.id])) continue;
  const seconds = render({
    name: `hulp/${clip.id}`,
    sceneList,
    label: () => `ZWBASIS  ·  ${clip.titel.toUpperCase()}`,
    small: true,
  });
  built.push({ ...clip, seconds: Math.round(seconds) });
}
writeFileSync(path.join(OUT, "hulp", "clips.json"), JSON.stringify(built, null, 2));

const withAudio = mainScenes.filter((scene) => audioFor(scene.id)).length;
if (mainScenes.length) {
  console.log(`${VIDEO.id}.mp4: ${total.toFixed(1)} s${withAudio ? `, ${withAudio} van ${SCENES.length} scènes met geluid` : ""}`);
}
for (const clip of built) console.log(`hulp/${clip.id}.mp4: ${clip.seconds} s → /hulp#${clip.hulp}`);
if (mainScenes.length && !existsSync(path.join(OUT, `${VIDEO.id}.mp4`))) process.exit(1);

// 4. Met --publiceer: de hulpclips naar public/hulp-video/, waar /hulp naar linkt.
if (process.argv.includes("--publiceer")) {
  const target = path.join(HERE, "../../public/hulp-video");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const clip of built) {
    copyFileSync(path.join(OUT, "hulp", `${clip.id}.mp4`), path.join(target, `${clip.id}.mp4`));
  }
  console.log(`${built.length} clips gepubliceerd in public/hulp-video/`);
}
