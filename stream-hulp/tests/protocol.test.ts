import { describe, expect, it } from "vitest";
import {
  commandSignature,
  decodePairingCode,
  encodePairingCode,
  reportSignature,
  verifyCommand,
  type PairingCode,
} from "../src/protocol.ts";

const CODE: PairingCode = {
  v: 1,
  site: "https://app.example",
  supabaseUrl: "https://abc.supabase.co",
  anonKey: "publiek",
  channel: "hulp-0123456789abcdefghij",
  secret: "s".repeat(43),
};

function command(action: "start" | "stop", ts: number, nonce = "n1", secret = CODE.secret) {
  return { action, ts, nonce, sig: commandSignature(secret, action, ts, nonce) };
}

describe("koppelcode", () => {
  it("leest terug wat erin ging", () => {
    expect(decodePairingCode(encodePairingCode(CODE))).toEqual(CODE);
    expect(decodePairingCode(`  ${encodePairingCode(CODE)}\n`)).toEqual(CODE);
  });

  it("weigert rommel en te korte geheimen", () => {
    expect(decodePairingCode("")).toBeNull();
    expect(decodePairingCode("zwb1.bm9vaXQ")).toBeNull();
    expect(decodePairingCode(encodePairingCode({ ...CODE, secret: "kort" }))).toBeNull();
    expect(decodePairingCode(encodePairingCode({ ...CODE, site: "javascript:alert(1)" }))).toBeNull();
  });
});

describe("opdrachten", () => {
  it("voert een ondertekende opdracht één keer uit", () => {
    const seen = new Map<string, number>();
    const now = 1_800_000_000_000;
    expect(verifyCommand(CODE.secret, command("start", now), now + 500, seen)).toMatchObject({ ok: true });
    expect(verifyCommand(CODE.secret, command("start", now), now + 900, seen)).toEqual({ ok: false, reason: "al uitgevoerd" });
  });

  it("weigert een verkeerde handtekening, een oude opdracht en onbekende acties", () => {
    const now = 1_800_000_000_000;
    expect(verifyCommand(CODE.secret, command("stop", now, "n2", "ander-geheim"), now, new Map())).toEqual({
      ok: false,
      reason: "handtekening klopt niet",
    });
    expect(verifyCommand(CODE.secret, command("stop", now - 61_000, "n3"), now, new Map())).toEqual({
      ok: false,
      reason: "te oud",
    });
    expect(verifyCommand(CODE.secret, { ...command("stop", now), action: "wis" }, now, new Map())).toMatchObject({ ok: false });
    expect(verifyCommand(CODE.secret, null, now, new Map())).toMatchObject({ ok: false });
  });

  it("ondertekent een terugmelding anders dan een opdracht", () => {
    expect(reportSignature(CODE.secret, "streaming", 1)).not.toBe(commandSignature(CODE.secret, "streaming", 1, ""));
  });
});
