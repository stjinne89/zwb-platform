// Spraak, lokaal op deze pc: namen van renners gaan nergens heen. Twee stemmen:
// de Nederlandse stem van Windows (niets te installeren) of Piper. Elke zin wordt
// één keer gemaakt en daarna uit .cache/ gelezen.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

const PREPARE_WORKERS = 4;

export const CACHE_DIR = join(import.meta.dirname, "..", ".cache");

/** Maakt van een zin een wav-bestand op `path`. */
type Engine = { id: string; render(text: string, path: string): Promise<void> };

export function piperEngine(piperPath: string, modelPath: string): Engine {
  return {
    id: `piper:${basename(modelPath)}`,
    render: (text, path) =>
      new Promise((resolve, reject) => {
        const piper = spawn(piperPath, ["--model", modelPath, "--output_file", path], {
          stdio: ["pipe", "ignore", "ignore"],
          windowsHide: true,
        });
        piper.on("error", reject);
        piper.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`Piper stopte met code ${code}.`)),
        );
        piper.stdin.end(`${text}\n`);
      }),
  };
}

/** De stem van Windows, via één PowerShell-proces dat blijft draaien. */
export function windowsEngine(language: string): Engine {
  let shell: ChildProcessWithoutNullStreams | null = null;
  const waiting: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  function start() {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(import.meta.dirname, "windows-voice.ps1"),
        "-Language",
        language,
      ],
      { windowsHide: true },
    );
    createInterface({ input: child.stdout }).on("line", (line) => {
      const job = waiting.shift();
      if (line === "ok") job?.resolve();
      else job?.reject(new Error(line));
    });
    child.stderr.on("data", (data) => console.warn(String(data).trim()));
    const fail = () => {
      if (shell === child) shell = null;
      for (const job of waiting.splice(0)) job.reject(new Error("De Windows-stem is gestopt."));
    };
    child.on("error", fail);
    child.on("close", fail);
    return child;
  }

  return {
    id: `windows:${language}`,
    render: (text, path) =>
      new Promise((resolve, reject) => {
        shell ??= start();
        waiting.push({ resolve, reject });
        shell.stdin.write(`${path}\t${text.replace(/\s+/g, " ")}\n`);
      }),
  };
}

export class Tts {
  private readonly pending = new Map<string, Promise<string>>();

  constructor(private readonly engine: Engine) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  /** Pad naar een wav-bestand met deze zin. */
  file(text: string): Promise<string> {
    const key = createHash("sha1").update(`${this.engine.id}\n${text}`).digest("hex");
    const path = join(CACHE_DIR, `${key}.wav`);
    if (existsSync(path)) return Promise.resolve(path);
    let job = this.pending.get(key);
    if (!job) {
      const draft = join(CACHE_DIR, `${key}.tmp.wav`);
      job = this.engine
        .render(text, draft)
        .then(() => rename(draft, path))
        .then(
          () => path,
          async (error) => {
            await rm(draft, { force: true });
            throw error;
          },
        )
        .finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return job;
  }

  /**
   * Zet zinnen vooraf klaar, zodat aftellen niet op de stem wacht. In de
   * opgegeven volgorde, een paar tegelijk: Piper laadt per zin zijn hele stem.
   */
  async prepare(texts: string[]) {
    const queue = [...texts];
    const worker = async () => {
      for (let text = queue.shift(); text !== undefined; text = queue.shift()) {
        await this.file(text).catch(() => undefined);
      }
    };
    await Promise.all(Array.from({ length: PREPARE_WORKERS }, worker));
  }
}
