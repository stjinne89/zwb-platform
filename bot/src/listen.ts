// Luisteren naar de captain en verstaan met whisper, lokaal op deze pc. Alleen
// de stem van wie /ttt start gaf met spraak aan wordt ontvangen; geluid van de
// anderen pakt @discordjs/voice niet eens uit. Een opname gaat na het verstaan
// meteen weg en verlaat de pc niet.

import { EndBehaviorType, type AudioReceiveStream, type VoiceConnection } from "@discordjs/voice";
import OpusScript from "opusscript";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CACHE_DIR } from "./tts.ts";

const RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_MS = (RATE * CHANNELS * 2) / 1000;
/** Zo lang stil en de zin is af. */
const END_SILENCE_MS = 700;
/** Korter is een kuch of een klik. */
const MIN_MS = 400;
/**
 * Langer is geen commando maar praat met de ploeg. Ruim genomen: in de race
 * zei de captain soms "Coach" en dan na een adem het commando, en de stem van
 * de bot liep mee in zijn microfoon. Whisper vult elke zin aan tot 30 seconden,
 * dus een langere zin kost niet meer rekenwerk.
 */
const MAX_MS = 8_000;
const WHISPER_TIMEOUT_MS = 15_000;

export type Whisper = { path: string; model: string; threads: number };

/** Wat whisper in een wav-bestand verstaat, als één regel. */
export function transcribe(whisper: Whisper, file: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      whisper.path,
      ["-m", whisper.model, "-l", "nl", "-t", String(whisper.threads), "-nt", "-np", "--prompt", prompt, "-f", file],
      { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
    );
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    const timer = setTimeout(() => child.kill(), WHISPER_TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.replace(/\s+/g, " ").trim());
      else reject(new Error(`whisper stopte met code ${code}.`));
    });
  });
}

/** 48 kHz stereo naar 16 kHz mono, wat whisper verwacht: per drie frames het gemiddelde. */
export function toWhisperPcm(pcm: Buffer): Buffer {
  const frames = Math.floor(pcm.length / 4);
  const out = Buffer.alloc(Math.floor(frames / 3) * 2);
  for (let o = 0; o < out.length / 2; o++) {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const at = (o * 3 + k) * 4;
      sum += pcm.readInt16LE(at) + pcm.readInt16LE(at + 2);
    }
    out.writeInt16LE(Math.round(sum / 6), o * 2);
  }
  return out;
}

/**
 * Hoe luid een opname is: het gemiddelde vermogen in dB onder vol bereik (16
 * bit), afgerond. Stilte is -96 dB. Alleen voor het logboek, om later een
 * drempel voor ruis te kunnen kiezen.
 */
export function levelDb(pcm: Buffer): number {
  const samples = Math.floor(pcm.length / 2);
  if (samples === 0) return -96;
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const value = pcm.readInt16LE(i * 2) / 32_768;
    sum += value * value;
  }
  const rms = Math.sqrt(sum / samples);
  return rms > 0 ? Math.max(-96, Math.round(20 * Math.log10(rms))) : -96;
}

/** Een wav-bestand om 16 kHz mono 16-bit pcm heen. */
export function wav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16_000, 24);
  header.writeUInt32LE(32_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export class VoiceListener {
  private stream: AudioReceiveStream | null = null;
  private busy = false;
  /** De zin die binnenkwam terwijl whisper nog bezig was; een nieuwere vervangt hem. */
  private waiting: Buffer | null = null;
  private stopped = false;

  constructor(
    private readonly connection: VoiceConnection,
    private readonly userId: string,
    private readonly whisper: Whisper,
    /** De hint voor whisper, met de namen uit het plan dat nu geldt. */
    private readonly prompt: () => string,
    private readonly heard: (text: string, ms: number, db: number) => void,
    private readonly log: (line: string) => void,
  ) {
    mkdirSync(CACHE_DIR, { recursive: true });
    connection.receiver.speaking.on("start", this.onStart);
  }

  stop() {
    this.stopped = true;
    this.connection.receiver.speaking.off("start", this.onStart);
    this.stream?.destroy();
    this.stream = null;
    this.waiting = null;
  }

  private onStart = (userId: string) => {
    if (this.stopped || userId !== this.userId || this.stream) return;
    const stream = this.connection.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: END_SILENCE_MS },
    });
    this.stream = stream;
    const decoder = new OpusScript(RATE, CHANNELS, OpusScript.Application.VOIP);
    const chunks: Buffer[] = [];
    let bytes = 0;
    let tooLong = false;

    stream.on("data", (packet: Buffer) => {
      if (tooLong) return;
      try {
        const pcm = decoder.decode(packet);
        chunks.push(pcm);
        bytes += pcm.length;
      } catch {
        // Een kapot pakketje: de rest van de zin telt nog.
      }
      if (bytes / BYTES_PER_MS > MAX_MS) {
        tooLong = true;
        chunks.length = 0;
      }
    });
    const done = () => {
      if (this.stream !== stream) return;
      this.stream = null;
      decoder.delete();
      if (!tooLong && !this.stopped) void this.understand(Buffer.concat(chunks));
    };
    stream.once("end", done);
    stream.once("close", done);
    stream.once("error", (error) => {
      this.log(`spraak: ontvangen mislukte: ${error.message}`);
      done();
    });
  };

  private async understand(pcm: Buffer) {
    if (pcm.length / BYTES_PER_MS < MIN_MS) return;
    if (this.busy) {
      if (this.waiting) this.log("spraak: overgeslagen, er kwam een nieuwere zin");
      this.waiting = pcm;
      return;
    }
    this.busy = true;
    const file = join(CACHE_DIR, `spraak-${Date.now()}.wav`);
    try {
      const mono = toWhisperPcm(pcm);
      await writeFile(file, wav(mono));
      const started = Date.now();
      const text = await transcribe(this.whisper, file, this.prompt());
      if (!this.stopped) this.heard(text, Date.now() - started, levelDb(mono));
    } catch (error) {
      this.log(`spraak: verstaan mislukte: ${error instanceof Error ? error.message : error}`);
    } finally {
      await rm(file, { force: true }).catch(() => undefined);
      this.busy = false;
    }
    const next = this.waiting;
    this.waiting = null;
    if (next && !this.stopped) await this.understand(next);
  }
}
