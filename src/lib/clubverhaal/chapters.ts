// De vaste hoofdstukken van het clubverhaal op /verhaal. Een ingestuurd verhaal
// hoort bij één ervan (club_stories.chapter, 0288); de check-constraint daar
// noemt dezelfde ids.

export const CHAPTER_IDS = ["basis", "anders", "team", "nu"] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

/**
 * Het tenue in de 3D-scène. Rug: het patroon op de jersey-textuur; mouw en helm
 * als kleur. `riders` groeit per hoofdstuk mee met de club.
 */
export type ChapterKit = {
  name: string;
  back: "blanco" | "z" | "banden" | "club";
  sleeve: string;
  helmet: string;
  /** De kleur die het shirt in een keuzelijst of label vertegenwoordigt. */
  swatch: string;
};

export type Chapter = {
  id: ChapterId;
  era: string;
  title: string;
  body: string;
  stat: string;
  riders: number;
  kit: ChapterKit;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "basis",
    era: "Het begin",
    title: "Eerst gewoon rijden",
    body:
      "De basis is simpel: een renner, een fiets en zin om samen harder te rijden. Nog geen uitgesproken shirt, wel al het begin van herkenning.",
    stat: "1 renner, 1 idee",
    riders: 1,
    kit: { name: "Blanco", back: "blanco", sleeve: "#f4f2ec", helmet: "#d7dcd8", swatch: "#f4f2ec" },
  },
  {
    id: "anders",
    era: "Indoor jaren",
    title: "Net effe anders",
    body:
      "Daarna kwam het eerste echte clubgevoel: felblauw, roze en de grote Z. Niet subtiel, wel precies herkenbaar genoeg om elkaar in het peloton te vinden.",
    stat: "Zwift, Discord, koersdrang",
    riders: 2,
    kit: { name: "Net effe anders", back: "z", sleeve: "#1d4ed8", helmet: "#f05a8b", swatch: "#2563eb" },
  },
  {
    id: "team",
    era: "Teamfase",
    title: "Van losse rijders naar ploeg",
    body:
      "De stijl werd strakker, de groep serieuzer. Het VBTM/Tactic-shirt markeert de periode waarin ZWB meer team, meer competitie en meer structuur kreeg.",
    stat: "ZRL, teams, afspraken",
    riders: 4,
    kit: { name: "VBTM", back: "banden", sleeve: "#2e7780", helmet: "#0f5963", swatch: "#0f5963" },
  },
  {
    id: "nu",
    era: "ZWB nu",
    title: "Een club met eigen ritme",
    body:
      "Het huidige shirt voelt volwassen: sponsorstructuur, vaste lijnen en een herkenbare identiteit. Daaromheen groeit het platform mee met trainingen, badges, live tracking, events en teams.",
    stat: "Platform, community, toekomst",
    riders: 7,
    kit: { name: "Hage", back: "club", sleeve: "#ffffff", helmet: "#004653", swatch: "#004653" },
  },
];

export function chapterById(id: string): Chapter {
  return CHAPTERS.find((chapter) => chapter.id === id) ?? CHAPTERS[0];
}

export function isChapterId(value: string): value is ChapterId {
  return (CHAPTER_IDS as readonly string[]).includes(value);
}
