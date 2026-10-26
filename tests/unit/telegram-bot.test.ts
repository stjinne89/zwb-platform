import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatRideMessage,
  hashLinkToken,
  isStopCommand,
  newLinkToken,
  normalizeRideMessage,
  RIDE_MESSAGE_MAX,
  sendTelegramMessage,
  startTokenFromText,
  telegramConfig,
  telegramStartUrl,
  verifyWebhookSecret,
} from "@/lib/telegram/bot";

describe("koppeltoken", () => {
  it("past in de start-parameter van Telegram en komt terug uit /start", () => {
    const token = newLinkToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{20,64}$/);
    expect(telegramStartUrl("ZwbBot", token)).toBe(`https://t.me/ZwbBot?start=${token}`);
    expect(startTokenFromText(`/start ${token}`)).toBe(token);
    expect(startTokenFromText(`/start@ZwbBot ${token}`)).toBe(token);
  });

  it("negeert /start zonder of met een ongeldig token", () => {
    expect(startTokenFromText("/start")).toBeNull();
    expect(startTokenFromText("/start kort")).toBeNull();
    expect(startTokenFromText("/start a b")).toBeNull();
    expect(startTokenFromText("hallo")).toBeNull();
    expect(startTokenFromText(undefined)).toBeNull();
  });

  it("slaat alleen een hash op", () => {
    expect(hashLinkToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashLinkToken("abc")).not.toBe(hashLinkToken("abd"));
  });
});

describe("isStopCommand", () => {
  it("herkent /stop, ook met botnaam", () => {
    expect(isStopCommand("/stop")).toBe(true);
    expect(isStopCommand(" /stop@ZwbBot ")).toBe(true);
    expect(isStopCommand("/stoppen")).toBe(false);
  });
});

describe("verifyWebhookSecret", () => {
  it("vraagt een exact gelijk geheim", () => {
    expect(verifyWebhookSecret("geheim", "geheim")).toBe(true);
    expect(verifyWebhookSecret("geheim", " geheim ")).toBe(true);
    expect(verifyWebhookSecret("Geheim", "geheim")).toBe(false);
    expect(verifyWebhookSecret("geheimpje", "geheim")).toBe(false);
    expect(verifyWebhookSecret(null, "geheim")).toBe(false);
    expect(verifyWebhookSecret("geheim", undefined)).toBe(false);
  });
});

describe("telegramConfig", () => {
  it("vraagt token en gebruikersnaam en haalt de @ weg", () => {
    expect(telegramConfig({ TELEGRAM_BOT_TOKEN: "t" })).toBeNull();
    expect(
      telegramConfig({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_BOT_USERNAME: "@ZwbBot" }),
    ).toEqual({ token: "t", username: "ZwbBot" });
  });
});

describe("ritbericht", () => {
  it("maakt er één korte regel van met de afzender ervoor", () => {
    expect(normalizeRideMessage("  Hergroeperen\n bij  de kerk ")).toBe("Hergroeperen bij de kerk");
    expect(normalizeRideMessage("x".repeat(300))).toHaveLength(RIDE_MESSAGE_MAX);
    expect(formatRideMessage("Stijn", "Koffie in\nHattem")).toBe("Stijn: Koffie in Hattem");
  });
});

describe("sendTelegramMessage", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: unknown = {}) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );

  it("meldt verzonden, verdwenen of mislukt", async () => {
    respond(200, { ok: true });
    expect(await sendTelegramMessage("t", 1, "hoi")).toBe("sent");
    respond(403, { description: "Forbidden: bot was blocked by the user" });
    expect(await sendTelegramMessage("t", 1, "hoi")).toBe("gone");
    respond(400, { description: "Bad Request: chat not found" });
    expect(await sendTelegramMessage("t", 1, "hoi")).toBe("gone");
    respond(400, { description: "Bad Request: message text is empty" });
    expect(await sendTelegramMessage("t", 1, "hoi")).toBe("failed");
    respond(429, { description: "Too Many Requests" });
    expect(await sendTelegramMessage("t", 1, "hoi")).toBe("failed");
  });

  it("stuurt naar de bot-API zonder linkvoorbeeld", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendTelegramMessage("TOKEN", 42, "Stijn: hoi");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/botTOKEN/sendMessage");
    expect(JSON.parse(init.body as string)).toEqual({
      chat_id: 42,
      text: "Stijn: hoi",
      link_preview_options: { is_disabled: true },
    });
  });
});
