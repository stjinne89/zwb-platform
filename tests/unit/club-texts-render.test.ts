import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {} }),
  usePathname: () => "/hulp",
  useSearchParams: () => new URLSearchParams(),
  notFound() {},
}));

const { ClubTextsProvider } = await import("@/components/club-texts-provider");
const { buildClubTexts, fillClubText, neutralModuleNames } = await import("@/lib/club-texts");
const { helpHrefModule } = await import("@/lib/help-categories");
const { HELP_SECTIONS } = await import("@/app/(app)/hulp/_sections");
const PrivacyPage = (await import("@/app/privacy/page")).default;
const VoorwaardenPage = (await import("@/app/voorwaarden/page")).default;
const HelpPage = (await import("@/app/(app)/hulp/page")).default;

const neutral = buildClubTexts(
  { name: "Testclub", shortName: "TC", contactEmail: "bestuur@test.example" },
  (key) => neutralModuleNames()[key],
);

const render = (texts: typeof neutral, el: ReactElement) =>
  renderToStaticMarkup(createElement(ClubTextsProvider, { texts }, el));

const pages: [string, ReactElement][] = [
  ["privacy", createElement(PrivacyPage)],
  ["voorwaarden", createElement(VoorwaardenPage)],
  ["hulp", createElement(HelpPage)],
  ...Object.entries(HELP_SECTIONS).map(([id, Section]): [string, ReactElement] => [id, createElement(Section)]),
];

// Woordspelingen, het enkelvoud van ZWBekers en het voorbeeld van de
// Strava-samenvatting hebben nog geen instelling; die volgen in fase 3 deel 3
// (PLAN.md).
const NOT_YET = /ZWBeter(?:Worden)?|ZWBallen|ZWBal\b|ZWBeker\b|💎 ZWBriljant/g;

describe("fillClubText", () => {
  it("vult de clubwoorden in", () => {
    const texts = { ...neutral, memberNoun: "Kringer", memberNounPlural: "Kringers" };
    expect(fillClubText("{club}, {kort}, {lid}, {leden}, {m:bibliotheek}", texts)).toBe(
      "Testclub, TC, Kringer, Kringers, Bibliotheek",
    );
    expect(fillClubText("{m:onbekend} en {iets}", texts)).toBe("{m:onbekend} en {iets}");
  });

  it("valt terug op lid en leden", () => {
    expect(neutral.memberNoun).toBe("lid");
    expect(neutral.memberNounPlural).toBe("leden");
  });
});

describe("helpHrefModule", () => {
  it("vindt de module van een hulplink", () => {
    expect(helpHrefModule("/hulp/wedstrijden#zwbgame")).toBe("managerspel");
    expect(helpHrefModule("/hulp/schema#ftp-test")).toBe("training");
    expect(helpHrefModule("/hulp/wedstrijden#events")).toBeNull();
    expect(helpHrefModule("/zwbieb")).toBe("bibliotheek");
    expect(helpHrefModule("/kalender")).toBeNull();
  });
});

describe("privacy, voorwaarden en hulp bij een andere club", () => {
  it.each(pages)("%s noemt ZWB niet", (_name, el) => {
    const html = render(neutral, el).replace(NOT_YET, "");
    expect(html).not.toMatch(/ZWB|zwbcycling|voorZpWel/);
  });

  it("noemt het contactadres van de club", () => {
    const html = render(neutral, createElement(PrivacyPage));
    expect(html).toContain('href="mailto:bestuur@test.example"');
    const without = render({ ...neutral, contactEmail: null }, createElement(PrivacyPage));
    expect(without).toContain("Mail naar het bestuur");
  });

  it("laat de hulp van een uitgezette module weg", () => {
    const Wedstrijden = HELP_SECTIONS.wedstrijden;
    expect(render(neutral, createElement(Wedstrijden))).toContain('id="zwbgame"');
    const off = { ...neutral, off: ["managerspel" as const] };
    expect(render(off, createElement(Wedstrijden))).not.toContain('id="zwbgame"');
    const noTraining = render({ ...neutral, off: ["training" as const] }, createElement(HelpPage));
    expect(noTraining).not.toContain('href="/hulp/schema"');
    expect(noTraining).toContain('href="/hulp/wedstrijden"');
  });
});
