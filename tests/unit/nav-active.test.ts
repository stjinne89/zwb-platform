import { describe, expect, it } from "vitest";
import {
  AVATAR_NAV,
  NAV_GROUPS,
  TRAINER_SECTIONS,
  KRACHT_SECTIONS,
  VOEDING_SECTIONS,
  activeHrefIn,
  isActiveGroup,
  navHrefs,
  type NavGroup,
} from "@/app/(app)/_components/nav-config";

// Melding 4 (plannenboek, 4 september): in het mobiele menu stonden meerdere
// opties tegelijk geselecteerd, omdat elke link ook op zijn subroutes matchte.
const menuHrefs = [...navHrefs(NAV_GROUPS), ...AVATAR_NAV.map((item) => item.href)];

function activeLinks(pathname: string, hrefs: string[]) {
  const active = activeHrefIn(pathname, hrefs);
  return hrefs.filter((href) => href === active);
}

describe("activeHrefIn", () => {
  it("houdt ZWBieb en Leden uit elkaar", () => {
    expect(activeLinks("/zwbieb/gesprekken", menuHrefs)).toEqual(["/zwbieb"]);
    expect(activeLinks("/leden/11111111-1111-1111-1111-111111111111", menuHrefs)).toEqual(["/leden"]);
  });

  it("markeert op een ZWBeter Worden-subpagina alleen die subpagina", () => {
    expect(activeLinks("/zwbeter-worden/schema", menuHrefs)).toEqual(["/zwbeter-worden/schema"]);
    expect(activeLinks("/zwbeter-worden", menuHrefs)).toEqual(["/zwbeter-worden"]);
  });

  it("kiest bij geneste trainerpagina's het diepste menu-item", () => {
    expect(activeLinks("/zwbeter-worden/trainer/beoordelen", menuHrefs)).toEqual([
      "/zwbeter-worden/trainer",
    ]);
    const trainer = TRAINER_SECTIONS.map((item) => item.href);
    expect(activeLinks("/zwbeter-worden/trainer/schema", trainer)).toEqual([
      "/zwbeter-worden/trainer/schema",
    ]);
  });

  it("houdt bij een recept of artikel de eigen voedingstab actief", () => {
    const voeding = VOEDING_SECTIONS.map((item) => item.href);
    expect(activeLinks("/zwbeter-worden/voeding/recepten/havermout", voeding)).toEqual([
      "/zwbeter-worden/voeding/recepten",
    ]);
    expect(activeLinks("/zwbeter-worden/voeding/kennis/koolhydraten", voeding)).toEqual([
      "/zwbeter-worden/voeding/kennis",
    ]);
    expect(activeLinks("/zwbeter-worden/voeding/recepten", menuHrefs)).toEqual(["/zwbeter-worden/voeding"]);
    expect(activeLinks("/zwbeter-worden/voeding/protocollen/cafeine", voeding)).toEqual([
      "/zwbeter-worden/voeding/protocollen",
    ]);
  });

  it("houdt protocollen en kennisbank van trainen en voeden uit elkaar", () => {
    expect(activeLinks("/zwbeter-worden/protocollen/hitte-kort", menuHrefs)).toEqual([
      "/zwbeter-worden/protocollen",
    ]);
    expect(activeLinks("/zwbeter-worden/kennis/taper", menuHrefs)).toEqual(["/zwbeter-worden/kennis"]);
    expect(activeLinks("/zwbeter-worden/voeding/protocollen/cafeine", menuHrefs)).toEqual([
      "/zwbeter-worden/voeding",
    ]);
  });

  it("houdt bij een serie of artikel de eigen krachttab actief", () => {
    const kracht = KRACHT_SECTIONS.map((item) => item.href);
    expect(activeLinks("/zwbeter-worden/core/series/fundament", kracht)).toEqual([
      "/zwbeter-worden/core/series",
    ]);
    expect(activeLinks("/zwbeter-worden/core/kennis/het-gymprogramma", kracht)).toEqual([
      "/zwbeter-worden/core/kennis",
    ]);
    expect(activeLinks("/zwbeter-worden/core/oefeningen", kracht)).toEqual([
      "/zwbeter-worden/core/oefeningen",
    ]);
    expect(activeLinks("/zwbeter-worden/core/series", menuHrefs)).toEqual(["/zwbeter-worden/core"]);
  });

  it("markeert op profiel/segments niet ook het profiel", () => {
    expect(activeLinks("/profiel/segments/collecties", menuHrefs)).toEqual(["/profiel/segments/collecties"]);
    expect(activeLinks("/profiel", menuHrefs)).toEqual(["/profiel"]);
  });

  it("valt bij een onbekende subroute terug op de dichtstbijzijnde link", () => {
    expect(activeHrefIn("/zwbeter-worden/schema/iets-nieuws", menuHrefs)).toBe(
      "/zwbeter-worden/schema",
    );
    expect(activeHrefIn("/kalender/123", menuHrefs)).toBe("/kalender");
  });

  it("matcht geen prefix zonder slash en geen externe links", () => {
    expect(activeHrefIn("/profielen", menuHrefs)).toBeNull();
    expect(activeHrefIn("/voorzpwelbokaal", ["https://voorzpwelbokaal.netlify.app/"])).toBeNull();
    expect(activeHrefIn("/onbekend", menuHrefs)).toBeNull();
  });
});

describe("isActiveGroup", () => {
  const zwbeter = NAV_GROUPS.find(
    (node): node is NavGroup => node.type === "group" && node.label === "ZWBeter Worden",
  )!;
  const club = NAV_GROUPS.find(
    (node): node is NavGroup => node.type === "group" && node.label === "Club",
  )!;

  it("licht alleen de groep van de actieve link op", () => {
    const active = activeHrefIn("/zwbeter-worden/jaarplan", menuHrefs);
    expect(isActiveGroup(active, zwbeter)).toBe(true);
    expect(isActiveGroup(active, club)).toBe(false);
    expect(isActiveGroup(null, zwbeter)).toBe(false);
  });

  it("zet ZWB Segments in Club, direct boven ZWBlokken, en niet meer in het avatarmenu", () => {
    const hrefs = club.items.map((item) => item.href);
    expect(hrefs.indexOf("/profiel/segments/collecties")).toBe(hrefs.indexOf("/zwblokken") - 1);
    expect(AVATAR_NAV.map((item) => item.href)).not.toContain("/profiel/segments/collecties");
    expect(isActiveGroup(activeHrefIn("/profiel/segments/collecties", menuHrefs), club)).toBe(true);
  });
});
