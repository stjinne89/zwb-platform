// Live metingen uit Sauce for Zwift op deze pc. Sauce volgt de renner die Zwift
// in beeld heeft en geeft de renners in de buurt; in een ploegentijdrit zijn dat
// de ploeggenoten.
//
// Niet geverifieerd: het adres van de websocket, de vorm van het verzoek en de
// veldnamen hieronder zijn uit het hoofd overgenomen. Draai eerst
// scripts/sauce-ttt-probe.mjs (hoofdrepo) en pas `toSample` aan op wat die laat zien.

import type { RiderSample, Sample } from "./coach.ts";

const SUB_ID = "zwb-ttt-nearby";
const RECONNECT_MS = 5_000;

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Eén bericht van het `nearby`-kanaal naar een meting. */
export function toSample(data: unknown, at: number): Sample | null {
  if (!Array.isArray(data)) return null;
  const riders: RiderSample[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || !entry) continue;
    const row = entry as { athleteId?: unknown; gap?: unknown; state?: Record<string, unknown> };
    const gap = finite(row.gap);
    if (row.athleteId == null || gap === null) continue;
    riders.push({
      zwiftId: String(row.athleteId),
      power: finite(row.state?.power) ?? 0,
      speedKmh: finite(row.state?.speed) ?? 0,
      gap,
    });
  }
  return riders.length > 0 ? { at, riders } : null;
}

export class SauceClient {
  private socket: WebSocket | null = null;
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(
    private readonly baseUrl: string,
    private readonly onSample: (sample: Sample) => void,
  ) {}

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
  }

  private connect() {
    const url = new URL("/api/ws/events", this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "request",
          uid: `${SUB_ID}-request`,
          data: { method: "subscribe", arg: { event: "nearby", subId: SUB_ID } },
        }),
      );
    });
    socket.addEventListener("message", (message) => {
      try {
        const body = JSON.parse(String(message.data)) as { type?: string; uid?: string; data?: unknown };
        if (body.type !== "event" || body.uid !== SUB_ID) return;
        const sample = toSample(body.data, Date.now());
        if (sample) this.onSample(sample);
      } catch {
        // Een onleesbaar bericht slaan we over; het volgende komt binnen een seconde.
      }
    });
    socket.addEventListener("error", () => socket.close());
    socket.addEventListener("close", () => {
      if (this.stopped) return;
      this.timer = setTimeout(() => this.connect(), RECONNECT_MS);
    });
  }
}
