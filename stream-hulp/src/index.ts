// ZWB stream-hulp: zet OBS aan of uit als je in de app op Start of Stop tikt
// (livestreams, fase 3). Draait op de pc of Mac met OBS; laat het venster open.
//
// - Luistert op een eigen Supabase Realtime-kanaal naar ondertekende opdrachten.
// - Bedient OBS via de ingebouwde afstandsbediening (obs-websocket, OBS 28+).
// - Meldt de stand van OBS aan het platform: bij het starten, bij elke
//   verandering en elke tien minuten, zodat de app weet of de hulp aan staat.

import { createClient } from "@supabase/supabase-js";
import { OBSWebSocket } from "obs-websocket-js";
import {
  decodePairingCode,
  reportSignature,
  verifyCommand,
  type ObsState,
} from "./protocol.ts";

const HEARTBEAT_MS = 10 * 60 * 1000;
const RECONNECT_MS = 10_000;

const code = decodePairingCode(process.env.STREAM_HULP_CODE ?? "");
if (!code) {
  console.error(
    "Geen geldige koppelcode. Maak er een op je profiel (YouTube > Hulp-app koppelen) en zet hem in .env als STREAM_HULP_CODE.",
  );
  process.exit(1);
}
const pairing = code;
const obsUrl = process.env.OBS_URL?.trim() || "ws://127.0.0.1:4455";
const obsPassword = process.env.OBS_PASSWORD?.trim() || undefined;

const obs = new OBSWebSocket();
let obsConnected = false;
let streaming = false;
let lastReported: ObsState | null = null;

function state(): ObsState {
  if (!obsConnected) return "obs-offline";
  return streaming ? "streaming" : "idle";
}

async function report(force = false) {
  const current = state();
  if (!force && current === lastReported) return;
  const ts = Date.now();
  try {
    const res = await fetch(new URL("/api/youtube/hulp", pairing.site), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: pairing.channel, state: current, ts, sig: reportSignature(pairing.secret, current, ts) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) lastReported = current;
    else console.error(`Melden aan de app lukte niet (${res.status}).`);
  } catch {
    console.error("Melden aan de app lukte niet: geen verbinding.");
  }
}

async function connectObs() {
  try {
    await obs.connect(obsUrl, obsPassword);
    obsConnected = true;
    const status = await obs.call("GetStreamStatus");
    streaming = status.outputActive;
    console.log(`OBS verbonden${streaming ? ", stream loopt" : ""}.`);
  } catch (err) {
    obsConnected = false;
    const reden = err instanceof Error ? err.message : String(err);
    console.error(`OBS niet bereikbaar (${reden}). Staat OBS aan, met de WebSocket-server aan en het goede wachtwoord? Opnieuw over 10 s.`);
    setTimeout(connectObs, RECONNECT_MS);
  }
  await report();
}

obs.on("ConnectionClosed", () => {
  if (!obsConnected) return;
  obsConnected = false;
  console.error("Verbinding met OBS verbroken. Opnieuw over 10 s.");
  void report();
  setTimeout(connectObs, RECONNECT_MS);
});

obs.on("StreamStateChanged", (event) => {
  streaming = event.outputActive;
  console.log(streaming ? "Stream loopt." : "Stream gestopt.");
  void report();
});

const seen = new Map<string, number>();
const supabase = createClient(pairing.supabaseUrl, pairing.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

supabase
  .channel(pairing.channel, { config: { broadcast: { self: false } } })
  .on("broadcast", { event: "command" }, async ({ payload }) => {
    const check = verifyCommand(pairing.secret, payload, Date.now(), seen);
    if (!check.ok) {
      console.error(`Opdracht geweigerd: ${check.reason}.`);
      return;
    }
    const { action } = check.command;
    if (!obsConnected) {
      console.error(`Opdracht ${action}, maar OBS is niet verbonden.`);
      await report(true);
      return;
    }
    try {
      if (action === "start" && !streaming) await obs.call("StartStream");
      if (action === "stop" && streaming) await obs.call("StopStream");
      console.log(action === "start" ? "Start gevraagd vanuit de app." : "Stop gevraagd vanuit de app.");
    } catch (err) {
      console.error(`OBS weigerde: ${err instanceof Error ? err.message : String(err)}`);
    }
    await report(true);
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") console.log("Verbonden met de app. Laat dit venster open.");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error("De verbinding met de app hapert; hij probeert het vanzelf opnieuw.");
    }
  });

setInterval(() => void report(true), HEARTBEAT_MS);
console.log("ZWB stream-hulp gestart.");
void connectObs();
