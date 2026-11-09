import { describe, expect, it } from "vitest";
import {
  ENV_GROUPS,
  SETUP_STEPS,
  canCompleteSetup,
  cleanHandle,
  envStatus,
  parseClubIdentity,
  parseClubNames,
  parseMarkers,
  parseRecognition,
  setupStatus,
  type SetupSnapshot,
} from "@/lib/club-setup";
import { ADMIN_AREAS } from "@/lib/admin-areas";
import { buildClub } from "@/lib/club";
import { helpHrefFor } from "@/lib/help-anchors";

const neutral: SetupSnapshot = {
  name: "Club",
  shortName: "Club",
  memberNoun: null,
  contactEmail: null,
  hasBrand: false,
  switchedOff: 0,
  labels: 0,
  words: 0,
  eventMarkers: null,
  teamTag: null,
  instagramHandle: null,
  youtubeHandle: null,
};

describe("clubgegevens", () => {
  it("vraagt naam en korte naam, en maakt lege velden null", () => {
    expect(parseClubIdentity({ name: " ", shortName: "TCU" })).toEqual({ ok: false, error: "Vul de naam in." });
    expect(parseClubIdentity({ name: "Testclub", shortName: "" })).toEqual({ ok: false, error: "Vul de korte naam in." });
    expect(parseClubIdentity({ name: "  Testclub   Utrecht ", shortName: "TCU", memberNoun: " " })).toEqual({
      ok: true,
      value: {
        name: "Testclub Utrecht",
        short_name: "TCU",
        member_noun: null,
        member_noun_plural: null,
        contact_email: null,
        website_url: null,
      },
    });
  });

  it("controleert e-mail en website", () => {
    expect(parseClubIdentity({ name: "A", shortName: "A", contactEmail: "geen-adres" }).ok).toBe(false);
    expect(parseClubIdentity({ name: "A", shortName: "A", websiteUrl: "localhost" }).ok).toBe(false);
    const ok = parseClubIdentity({ name: "A", shortName: "A", contactEmail: "Bestuur@Example.com", websiteUrl: "example.com/" });
    expect(ok.ok && ok.value).toMatchObject({ contact_email: "bestuur@example.com", website_url: "https://example.com" });
  });
});

describe("namen en woorden", () => {
  it("slaat een naam gelijk aan de neutrale op als leeg", () => {
    const parsed = parseClubNames({ labels: { training: "Training", stats: "Cijfers" }, words: { cupNoun: " Pokal " } });
    expect(parsed.ok && parsed.value.labels).toEqual([
      { module_key: "training", label: null },
      { module_key: "stats", label: "Cijfers" },
    ]);
    expect(parsed.ok && parsed.value.words).toMatchObject({ cup_noun: "Pokal", app_name: null, better_word: null });
  });

  it("weigert een onbekende module", () => {
    expect(parseClubNames({ labels: { bestaat_niet: "X" } }).ok).toBe(false);
  });
});

describe("herkenning", () => {
  it("splitst markers en laat dubbele weg", () => {
    expect(parseMarkers("tcu, TCU\nTestclub ,, ")).toEqual(["tcu", "Testclub"]);
    expect(parseMarkers(" , ")).toBeNull();
  });

  it("haalt de handle uit een link of met @", () => {
    expect(cleanHandle("@testclub", "instagram.com")).toBe("testclub");
    expect(cleanHandle("https://www.instagram.com/testclub/", "instagram.com")).toBe("testclub");
    expect(cleanHandle("https://www.youtube.com/@testclub", "youtube.com")).toBe("testclub");
    expect(cleanHandle("  ", "youtube.com")).toBeNull();
  });

  it("haalt de haken van de teamtag", () => {
    const parsed = parseRecognition({ teamTag: "[TCU]", eventMarkers: "" });
    expect(parsed.ok && parsed.value).toEqual({ event_markers: null, team_tag: "TCU", instagram_handle: null, youtube_handle: null });
    expect(parseRecognition({ instagramHandle: "met spatie" }).ok).toBe(false);
  });
});

describe("stand van de inrichting", () => {
  it("houdt een lege installatie open tot de clubnaam er is", () => {
    expect(setupStatus(neutral)).toEqual({
      club: "open",
      huisstijl: "standaard",
      modules: "standaard",
      namen: "standaard",
      herkenning: "standaard",
    });
    expect(canCompleteSetup(neutral)).toBe(false);
    const named = { ...neutral, name: "Testclub", shortName: "TCU", teamTag: "TCU", words: 1 };
    expect(setupStatus(named)).toMatchObject({ club: "eigen", namen: "eigen", herkenning: "eigen" });
    expect(canCompleteSetup(named)).toBe(true);
  });

  it("toont de balk alleen als er een clubrij is zonder afgeronde inrichting", () => {
    expect(buildClub(null).setupPending).toBe(false);
    const row = (setupCompletedAt: string | null) =>
      buildClub({
        settings: { ...buildClub(null).settings, name: "Testclub", shortName: "TCU", setupCompletedAt },
        modules: [],
      });
    expect(row(null).setupPending).toBe(true);
    expect(row("2026-11-09T12:00:00Z").setupPending).toBe(false);
  });

  it("heeft voor elke stap een bestaande pagina en hulp", () => {
    expect(SETUP_STEPS.map((step) => step.key)).toEqual(["club", "huisstijl", "modules", "namen", "herkenning"]);
    for (const step of SETUP_STEPS) expect(helpHrefFor(step.href)).toMatch(/^\/hulp\/inrichten#inrichten-/);
    expect(ADMIN_AREAS.inrichting.href).toBe("/beheer/inrichting");
  });
});

describe("env-sleutels", () => {
  it("meldt per groep of de sleutels gezet zijn, zonder waarden", () => {
    const status = envStatus({ ZWIFT_USERNAME: "x", ZWIFT_PASSWORD: " ", OPENAI_API_KEY: "x", WTRL_COOKIE: "x" });
    const byLabel = Object.fromEntries(status.map((group) => [group.label, group]));
    expect(byLabel["Zwift-club"]).toEqual({ label: "Zwift-club", state: "niet ingesteld", missing: ["ZWIFT_CLUB_ID"] });
    expect(byLabel["Zwift-account"]).toEqual({ label: "Zwift-account", state: "deels", missing: ["ZWIFT_PASSWORD"] });
    expect(byLabel.AI).toEqual({ label: "AI", state: "ingesteld", missing: [] });
    expect(byLabel.WTRL.state).toBe("ingesteld");
    expect(JSON.stringify(status)).not.toContain('"x"');
  });

  it("laat groepen van uitgezette modules weg", () => {
    const labels = envStatus({}, (key) => key !== "teams").map((group) => group.label);
    expect(labels).not.toContain("WTRL");
    expect(labels).toContain("Zwift-club");
    expect(labels.length).toBe(ENV_GROUPS.length - 2);
  });
});
