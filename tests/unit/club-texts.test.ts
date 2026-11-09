import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const { buildClub, EMPTY_CLUB_SETTINGS } = await import("@/lib/club");
const { buildClubTexts, clubDescription, neutralModuleNames } = await import("@/lib/club-texts");
const { NAV_GROUPS, beheerCategoriesFor, filterNavForPermissions } = await import(
  "@/app/(app)/_components/nav-config"
);

// De ZWB-namen zoals 0313 ze zet. Met deze namen moet het menu er precies zo
// uitzien als vóór fase 3: dat is de belofte dat de leden niets merken.
const ZWB_LABELS = [
  ["training", "ZWBeter Worden"],
  ["bibliotheek", "ZWBieb"],
  ["bekers", "ZWBekers"],
  ["segmenten", "ZWB Segments"],
  ["blokkenjacht", "ZWBlokken"],
  ["rennersniveau", "ZWBriljant"],
  ["live_race", "ZWB DS"],
  ["omnium", "ZWB Omnium"],
  ["managerspel", "ZWBgame"],
  ["voorspelspel", "voorZpWelBokaal"],
] as const;

const zwb = buildClub({
  settings: { ...EMPTY_CLUB_SETTINGS, name: "ZWB Cycling", shortName: "ZWB" },
  modules: ZWB_LABELS.map(([key, label]) => ({ key, enabled: true, label })),
});

const labels = (nodes: ReturnType<typeof filterNavForPermissions>) =>
  nodes.flatMap((node) => (node.type === "link" ? [node.label] : [node.label, ...node.items.map((i) => i.label)]));

describe("clubteksten", () => {
  it("bouwt de namen uit de club", () => {
    expect(zwb.texts.name).toBe("ZWB Cycling");
    expect(zwb.texts.shortName).toBe("ZWB");
    expect(zwb.texts.modules.bibliotheek).toBe("ZWBieb");
    expect(zwb.texts.modules.teams).toBe("Teams en competities");
    expect(buildClub(null).texts.modules).toEqual(neutralModuleNames());
  });

  it("geeft een omschrijving met de clubnaam", () => {
    expect(clubDescription({ name: "ZWB Cycling" })).toBe(
      "Hub voor ZWB Cycling Community — events, training, teams en chat.",
    );
  });

  it("laat het menu van ZWB ongemoeid", () => {
    const all = () => true;
    const before = labels(filterNavForPermissions(NAV_GROUPS, all));
    const after = labels(filterNavForPermissions(NAV_GROUPS, all, null, () => true, zwb.texts.modules));
    expect(after).toEqual(before);
  });

  it("toont de neutrale namen bij een club zonder eigen namen", () => {
    const names = buildClubTexts("Testclub", "TC", (key) => neutralModuleNames()[key]).modules;
    const nav = labels(filterNavForPermissions(NAV_GROUPS, () => true, null, () => true, names));
    expect(nav).toContain("Training");
    expect(nav).toContain("Bibliotheek");
    expect(nav).toContain("Managerspel");
    expect(nav.join(" ")).not.toMatch(/ZWB|voorZpWel/);
  });

  it("noemt de modules in het beheer bij hun clubnaam", () => {
    const names = { ...neutralModuleNames(), bekers: "Prijzen", managerspel: "Koersspel" };
    const items = beheerCategoriesFor(() => true, () => true, names).flatMap((c) => c.items);
    expect(items.find((i) => i.href === "/beheer/zwbekers")?.label).toBe("Prijzen");
    expect(items.find((i) => i.href === "/zwbgame/beheer")?.label).toBe("Koersspel");
    // Zonder namen de vaste labels, zoals voorheen.
    const plain = beheerCategoriesFor(() => true).flatMap((c) => c.items);
    expect(plain.find((i) => i.href === "/beheer/zwbekers")?.label).toBe("ZWBekers");
    // Met de ZWB-namen ook precies de vaste labels.
    const withZwb = beheerCategoriesFor(() => true, () => true, zwb.texts.modules).flatMap((c) => c.items);
    expect(withZwb.map((i) => i.label)).toEqual(plain.map((i) => i.label));
  });
});
