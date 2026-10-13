// Spraak met Piper, lokaal op deze pc: namen van renners gaan nergens heen.
// Elke zin wordt één keer gemaakt en daarna uit .cache/ gelezen.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { basename, join } from "node:path";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache");

export class Tts {
  private readonly pending = new Map<string, Promise<string>>();

  constructor(
    private readonly piperPath: string,
    private readonly modelPath: string,
  ) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  /** Pad naar een wav-bestand met deze zin. */
  file(text: string): Promise<string> {
    const key = createHash("sha1").update(`${basename(this.modelPath)}\n${text}`).digest("hex");
    const path = join(CACHE_DIR, `${key}.wav`);
    if (existsSync(path)) return Promise.resolve(path);
    let job = this.pending.get(key);
    if (!job) {
      job = this.render(text, path).finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return job;
  }

  /** Zet zinnen vooraf klaar, zodat aftellen niet op Piper wacht. */
  async prepare(texts: string[]) {
    for (const text of texts) await this.file(text).catch(() => undefined);
  }

  private render(text: string, path: string): Promise<string> {
    const draft = `${path}.tmp`;
    return new Promise((resolve, reject) => {
      const piper = spawn(this.piperPath, ["--model", this.modelPath, "--output_file", draft], {
        stdio: ["pipe", "ignore", "ignore"],
        windowsHide: true,
      });
      piper.on("error", reject);
      piper.on("close", (code) => {
        if (code !== 0) {
          void rm(draft, { force: true });
          reject(new Error(`Piper stopte met code ${code}.`));
          return;
        }
        rename(draft, path).then(() => resolve(path), reject);
      });
      piper.stdin.end(`${text}\n`);
    });
  }
}
