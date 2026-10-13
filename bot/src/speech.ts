// Wachtrij voor spraak. Eén stem tegelijk; een wissel gaat voor op coaching, en
// een melding die te lang wacht vervalt in plaats van te laat te komen.

export type Priority = "clock" | "coach";

type Line = { text: string; priority: Priority; expiresAt: number };

/** Zo lang blijft een melding bruikbaar. */
const TTL_MS: Record<Priority, number> = { clock: 3_000, coach: 8_000 };

export class SpeechQueue {
  private readonly lines: Line[] = [];
  private busy = false;

  constructor(
    private readonly play: (text: string) => Promise<void>,
    private readonly now: () => number = Date.now,
  ) {}

  say(text: string, priority: Priority) {
    // Dezelfde zin die al klaarstaat, zegt niets extra.
    if (this.lines.some((line) => line.text === text)) return;
    const line = { text, priority, expiresAt: this.now() + TTL_MS[priority] };
    const at = priority === "clock" ? this.lines.findIndex((l) => l.priority === "coach") : -1;
    if (at === -1) this.lines.push(line);
    else this.lines.splice(at, 0, line);
    void this.drain();
  }

  clear() {
    this.lines.length = 0;
  }

  private async drain() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (let line = this.lines.shift(); line; line = this.lines.shift()) {
        if (this.now() > line.expiresAt) continue;
        await this.play(line.text).catch(() => undefined);
      }
    } finally {
      this.busy = false;
    }
  }
}
