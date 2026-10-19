import { describe, expect, it } from "vitest";
import { buildBoard, duelChance, pickDuels, probabilities, seedFor, type FieldRider } from "@/lib/bokaal/odds";
import { boardName, formatBalls, formatOdd, seasonOf, toLadder } from "@/lib/bokaal/rules";
import { bonusAnswer, bonusQuestion, settleBet, type OpenBet, type ResultRow } from "@/lib/bokaal/settle";
import { parseChampionships, parseSeries, planSeries } from "@/lib/bokaal/calendar";
import {
  brusselsToIso, eventSlugFrom, parseEvent, parseEventDate, parseGap, parseRanking, parseResult, parseStartlist,
} from "@/lib/bokaal/cyclingflash";

// Een dameselite zoals in Meulebeke (17 okt 2026), met de CyclingFlash-ratings van 19 okt.
const DAMES: FieldRider[] = [
  ["lucinda-brand", "Lucinda Brand", 1044], ["ceylin-del-carmen-alvarado", "Ceylin del Carmen Alvarado", 996],
  ["fem-van-empel", "Fem van Empel", 982], ["marie-schreiber", "Marie Schreiber", 955],
  ["aniek-van-alphen", "Aniek van Alphen", 949], ["inge-van-der-heijden", "Inge van der Heijden", 935],
  ["leonie-bentveld", "Leonie Bentveld", 903], ["denise-betsema", "Denise Betsema", 903],
  ["amandine-fouquenet", "Amandine Fouquenet", 903], ["annemarie-worst", "Annemarie Worst", 865],
  ["helene-clauzel", "Hélène Clauzel", 849], ["julie-brouwers", "Julie Brouwers", 838],
  ["emily-shields", "Emily Shields", null],
].map(([slug, name, rating]) => ({ slug: slug as string, name: name as string, rating: rating as number | null }));

describe("regels", () => {
  it("rondt naar beneden af op de ladder en haalt zekerheidjes van het bord", () => {
    expect(toLadder(4.7)).toBe(4.5);
    expect(toLadder(21.3)).toBe(20);
    expect(toLadder(1.04)).toBeNull();
    expect(toLadder(1.06)).toBe(1.05);
    expect(toLadder(80)).toBe(50);
    expect(toLadder(Infinity)).toBe(50);
  });
  it("schrijft quoteringen en saldi zoals op het bord", () => {
    expect(formatOdd(4.5)).toBe("4,50");
    expect(formatOdd(20)).toBe("20");
    expect(formatOdd(null)).toBe("–");
    expect(formatBalls(43)).toBe("43");
    expect(formatBalls(6.75)).toBe("6,75");
    expect(formatBalls(6.5)).toBe("6,5");
  });
  it("kent het seizoen van augustus tot juli", () => {
    expect(seasonOf(new Date("2026-10-19T12:00:00Z"))).toBe("2026-2027");
    expect(seasonOf(new Date("2027-02-01T12:00:00Z"))).toBe("2026-2027");
    expect(seasonOf(new Date("2027-08-01T12:00:00Z"))).toBe("2027-2028");
  });
  it("korte namen voor het krijtbord", () => {
    expect(boardName("Ceylin del Carmen Alvarado")).toBe("Alvarado");
    expect(boardName("Aniek van Alphen")).toBe("van Alphen");
    expect(boardName("Victor Van De Putte")).toBe("Van De Putte");
  });
});

describe("quoteringen", () => {
  const options = { seed: seedFor("hg-cross-meulebeke-we-2026"), simulations: 8000 };

  it("geeft kansen die optellen tot 1, 3 en 10", () => {
    const p = probabilities(DAMES, options);
    const sum = (key: "win" | "pod" | "top") => p.reduce((a, x) => a + x[key], 0);
    expect(sum("win")).toBeCloseTo(1, 6);
    expect(sum("pod")).toBeCloseTo(3, 6);
    expect(sum("top")).toBeCloseTo(10, 6);
  });

  it("zet de favoriet bovenaan met de laagste quotering en is herhaalbaar", () => {
    const board = buildBoard(DAMES, options);
    expect(board.riders[0].slug).toBe("lucinda-brand");
    const wins = board.riders.map((r) => r.win ?? 0);
    expect(wins[0]).toBeLessThan(wins[3]);
    expect(buildBoard(DAMES, options)).toEqual(board);
    // Zonder rating: onderaan, met de hoogste quotering.
    expect(board.riders.at(-1)?.slug).toBe("emily-shields");
    expect(board.riders.at(-1)?.win).toBe(50);
  });

  it("geeft de winnaarskans exact uit de rating", () => {
    const p = probabilities(DAMES, options);
    const strength = DAMES.map((r) => Math.exp((r.rating ?? 600) / 35));
    const total = strength.reduce((a, s) => a + s, 0);
    expect(p[0].win).toBeCloseTo(strength[0] / total, 10);
  });

  it("kiest duels tussen buren in de top 10 zonder renner dubbel", () => {
    const sorted = buildBoard(DAMES, options).riders;
    const duels = pickDuels(sorted);
    expect(duels).toHaveLength(2);
    const slugs = duels.flat().map((r) => r.slug);
    expect(new Set(slugs).size).toBe(4);
    expect(duelChance(DAMES[3], DAMES[4]) + duelChance(DAMES[4], DAMES[3])).toBeCloseTo(1, 10);
  });

  it("biedt nooit meer dan de eerlijke quotering", () => {
    const p = new Map(probabilities(DAMES, options).map((x) => [x.slug, x]));
    for (const r of buildBoard(DAMES, options).riders) {
      const fair = 1 / p.get(r.slug)!.win;
      if (r.win != null && r.win < 50) expect(r.win).toBeLessThanOrEqual(fair);
    }
  });
});

const UITSLAG: ResultRow[] = [
  { pos: 1, slug: "marie-schreiber", name: "Marie Schreiber", nat: "LU", age: 23, team: null, gap: 0 },
  { pos: 2, slug: "aniek-van-alphen", name: "Aniek van Alphen", nat: "NL", age: 27, team: null, gap: 15 },
  { pos: 3, slug: "lucinda-brand", name: "Lucinda Brand", nat: "NL", age: 37, team: null, gap: 30 },
  { pos: 4, slug: "fem-van-empel", name: "Fem van Empel", nat: "NL", age: 24, team: null, gap: 35 },
  { pos: 5, slug: "ceylin-del-carmen-alvarado", name: "Ceylin del Carmen Alvarado", nat: "NL", age: 28, team: null, gap: 36 },
  { pos: 6, slug: "inge-van-der-heijden", name: "Inge van der Heijden", nat: "NL", age: 27, team: null, gap: 72 },
  { pos: 7, slug: "leonie-bentveld", name: "Leonie Bentveld", nat: "NL", age: 22, team: null, gap: 78 },
  { pos: 8, slug: "annemarie-worst", name: "Annemarie Worst", nat: "NL", age: 30, team: null, gap: 81 },
  { pos: 9, slug: "denise-betsema", name: "Denise Betsema", nat: "NL", age: 33, team: null, gap: 84 },
  { pos: 10, slug: "julie-brouwers", name: "Julie Brouwers", nat: "BE", age: 23, team: null, gap: 91 },
  { pos: null, slug: "helene-clauzel", name: "Hélène Clauzel", nat: "FR", age: 28, team: null, gap: null },
];
const STARTERS = new Set(UITSLAG.map((r) => r.slug).concat("amandine-fouquenet"));
const bet = (market: OpenBet["market"], rider: string, vs: string | null = null, stake = 2, odds = 4): OpenBet =>
  ({ id: `${market}-${rider}`, market, rider_slug: rider, vs_slug: vs, stake, odds });

describe("afrekenen", () => {
  it("betaalt inzet × quotering bij raak", () => {
    expect(settleBet(bet("win", "marie-schreiber", null, 2, 20), UITSLAG, STARTERS)).toMatchObject({ outcome: "raak", payout: 40 });
    expect(settleBet(bet("pod", "lucinda-brand", null, 3, 2.25), UITSLAG, STARTERS)).toMatchObject({ outcome: "raak", payout: 6.75 });
    expect(settleBet(bet("top", "julie-brouwers"), UITSLAG, STARTERS).outcome).toBe("raak");
    expect(settleBet(bet("pod", "fem-van-empel"), UITSLAG, STARTERS)).toMatchObject({ outcome: "mis", payout: 0 });
  });
  it("telt een opgave als niet gefinisht en niet gestart als inzet terug", () => {
    expect(settleBet(bet("top", "helene-clauzel"), UITSLAG, STARTERS).outcome).toBe("mis");
    expect(settleBet(bet("top", "amandine-fouquenet"), UITSLAG, STARTERS).outcome).toBe("mis");
    expect(settleBet(bet("win", "puck-pieterse", null, 3), UITSLAG, STARTERS)).toMatchObject({ outcome: "terug", payout: 3 });
  });
  it("rekent duels af op wie hoger eindigt", () => {
    expect(settleBet(bet("duel", "fem-van-empel", "ceylin-del-carmen-alvarado"), UITSLAG, STARTERS).outcome).toBe("raak");
    expect(settleBet(bet("duel", "helene-clauzel", "julie-brouwers"), UITSLAG, STARTERS).outcome).toBe("mis");
    expect(settleBet(bet("duel", "helene-clauzel", "amandine-fouquenet"), UITSLAG, STARTERS).outcome).toBe("terug");
    expect(settleBet(bet("duel", "marie-schreiber", "puck-pieterse"), UITSLAG, STARTERS).outcome).toBe("terug");
  });
});

describe("bonusvragen", () => {
  it("kijkt na uit de uitslag", () => {
    expect(bonusAnswer("marge", UITSLAG)).toBe(1);
    expect(bonusAnswer("jong", UITSLAG)).toBe(1); // Schreiber, Van Empel, Bentveld, Brouwers
    expect(bonusAnswer("belgen-podium", UITSLAG)).toBe(0);
    expect(bonusAnswer("be-nl", UITSLAG)).toBe(1);
  });
  it("laat een vraag open als de uitslag het niet zegt", () => {
    expect(bonusAnswer("marge", UITSLAG.slice(0, 1))).toBeNull();
    expect(bonusAnswer("onbekend", UITSLAG)).toBeNull();
  });
  it("past de vraag aan de categorie aan", () => {
    expect(bonusQuestion("marge", "w")?.question).toBe("Voorsprong van de winnares?");
    expect(bonusQuestion("marge", "m")?.question).toBe("Voorsprong van de winnaar?");
  });
});

// Zelfgemaakte HTML in de structuur van CyclingFlash (gezien op 19 okt 2026).
const flag = (code: string) => `<span><img src="/svg/flags/${code}.svg" alt="${code} flag" loading="lazy"></span>`;

describe("CyclingFlash lezen", () => {
  it("leest de ranking", () => {
    const html = `<table><tbody>
      <tr><td>1</td><td><span>-</span></td><td><a href="/profile/lucinda-brand">${flag("NL")}<span>Lucinda Brand</span></a></td><td>1044</td></tr>
      <tr><td>51</td><td><span><span>(<!-- -->3<!-- -->)</span></span></td><td><a href="/profile/sanne-laurijssen">${flag("BE")}<span>Sanne Laurijssen</span></a></td><td>724</td></tr>
    </tbody></table>`;
    expect(parseRanking(html)).toEqual([
      { slug: "lucinda-brand", name: "Lucinda Brand", rating: 1044 },
      { slug: "sanne-laurijssen", name: "Sanne Laurijssen", rating: 724 },
    ]);
  });

  it("leest de startlijst zonder dubbelen", () => {
    const row = (slug: string, name: string) =>
      `<tr><td><span><span>1</span></span></td><td><span><a href="/profile/${slug}"><span>${flag("NL")}<span itemprop="name">${name}</span></span></a></span></td><td><span>${flag("BE")}<a href="/team/x-2026">X</a></span></td></tr>`;
    const html = `<main><table><tbody>${row("lucinda-brand", "Lucinda Brand")}${row("fem-van-empel", "Fem van Empel")}${row("lucinda-brand", "Lucinda Brand")}</tbody></table>
      <a href="/profile/iemand-anders">Nieuws</a></main>`;
    expect(parseStartlist(html).map((r) => r.slug)).toEqual(["lucinda-brand", "fem-van-empel"]);
  });

  it("leest de uitslag met nationaliteit van de renner, leeftijd en achterstand", () => {
    const row = (pos: string, slug: string, name: string, nat: string, age: string, time: string) =>
      `<tr><td>${pos}</td><td><a href="/profile/${slug}">${flag(nat)}<span>${name}</span></a><span><a href="/team/t-2026">Ploeg</a></span></td>
       <td><a href="/cyclingflash-ranking/cyclocross/women-elite"><span><span>#3</span></span></a></td><td>${age}</td>
       <td><a href="/team/t-2026">${flag("FR")}<span>Ploeg</span></a></td><td>${time}</td></tr>`;
    const html = `<table><tbody>
      ${row("1", "marie-schreiber", "Marie Schreiber", "LU", "23", "46:32")}
      ${row("2", "aniek-van-alphen", "Aniek van Alphen", "NL", "27", "+ 15")}
      ${row("3", "lucinda-brand", "Lucinda Brand", "NL", "37", "\"")}
      ${row("4", "inge-van-der-heijden", "Inge van der Heijden", "NL", "27", "+ 01:12")}
      ${row("DNF", "helene-clauzel", "Hélène Clauzel", "FR", "28", "")}
    </tbody></table>`;
    const result = parseResult(html);
    expect(result.map((r) => [r.pos, r.nat, r.age, r.gap])).toEqual([
      [1, "LU", 23, 0], [2, "NL", 27, 15], [3, "NL", 37, 15], [4, "NL", 27, 72], [null, "FR", 28, null],
    ]);
    expect(result[0].team).toBe("Ploeg");
  });

  it("leest achterstanden", () => {
    expect(parseGap("+ 05")).toBe(5);
    expect(parseGap("+ 01:06")).toBe(66);
    expect(parseGap("+ 1:02:03")).toBe(3723);
    expect(parseGap("-")).toBeNull();
  });

  it("leest een event met de elitewedstrijden, datum en starttijd", () => {
    const block = (time: string, slug: string, label: string) =>
      `<div><div><time>${time}</time><a href="/race/${slug}/startlist">Individual · ${label}</a>
       <span><a href="/race/${slug}/startlist"><span>Startlist</span></a></span></div></div>`;
    const html = `<main><span>Belgium · Tielt</span><h1>HG Cross - Meulebeke</h1>
      <h2>Sat 17 October 2026</h2>
      ${block("12:10", "x-mj-2026", "Men Juniors")}${block("13:45", "x-we-2026", "Women Elite")}${block("15:00", "x-2026", "Men Elite")}</main>`;
    expect(parseEvent(html, "x")).toEqual({
      slug: "x", name: "HG Cross - Meulebeke", location: "Tielt",
      races: [
        { slug: "x-we-2026", category: "w", date: "2026-10-17", time: "13:45" },
        { slug: "x-2026", category: "m", date: "2026-10-17", time: "15:00" },
      ],
    });
  });

  it("herkent eventlinks en datums", () => {
    expect(eventSlugFrom("https://cyclingflash.com/event/hg-cross-meulebeke-2026")).toBe("hg-cross-meulebeke-2026");
    expect(eventSlugFrom("hg-cross-meulebeke-2026")).toBe("hg-cross-meulebeke-2026");
    expect(eventSlugFrom("https://example.com/event/x")).toBeNull();
    expect(parseEventDate("Sun 11 October 2026")).toBe("2026-10-11");
  });

  it("rekent Belgische tijd om, ook over de wintertijd heen", () => {
    expect(brusselsToIso("2026-10-17", "13:45")).toBe("2026-10-17T11:45:00.000Z");
    expect(brusselsToIso("2026-12-20", "15:00")).toBe("2026-12-20T14:00:00.000Z");
  });
});

describe("seizoenskalender", () => {
  const row = (slug: string, name: string, date: string) =>
    `<tr><td>1</td><td><a href="/race/${slug}"><span><img src="/svg/flags/BE.svg" alt="BE flag"></span><span>${name}</span></a><span>${date}</span></td><td><span>–</span></td></tr>`;

  it("leest een reekspagina met datums", () => {
    const html = `<table><tbody>${row("hg-cross-meulebeke-we-2026", "HG Cross - Meulebeke", "17-10-2026")}${row("hg-cross-heerde-we-2026", "HG Cross - Heerde", "24-10-2026")}</tbody></table>`;
    expect(parseSeries(html)).toEqual([
      { slug: "hg-cross-meulebeke-we-2026", name: "HG Cross - Meulebeke", date: "2026-10-17" },
      { slug: "hg-cross-heerde-we-2026", name: "HG Cross - Heerde", date: "2026-10-24" },
    ]);
  });

  it("koppelt dames aan het event van de heren en laat het verleden weg", () => {
    const men = [
      { slug: "hg-cross-meulebeke-2026", name: "HG Cross - Meulebeke", date: "2026-10-17" },
      { slug: "telenet-superprestige-middelkerke-2026-2", name: "Telenet Superprestige - Middelkerke", date: "2026-11-05" },
    ];
    const women = [
      { slug: "hg-cross-meulebeke-we-2026", name: "HG Cross - Meulebeke", date: "2026-10-17" },
      { slug: "telenet-superprestige-middelkerke-we-2026-2", name: "Telenet Superprestige - Middelkerke", date: "2026-11-05" },
      { slug: "x-cross-we-2026", name: "X Cross", date: "2026-11-08" },
    ];
    expect(planSeries(men, women, "2026-10-19").map((r) => [r.slug, r.category, r.eventSlug])).toEqual([
      ["telenet-superprestige-middelkerke-2026-2", "m", "telenet-superprestige-middelkerke-2026-2"],
      ["telenet-superprestige-middelkerke-we-2026-2", "w", "telenet-superprestige-middelkerke-2026-2"],
      ["x-cross-we-2026", "w", "x-cross-2026"],
    ]);
  });

  it("kiest alleen BK, NK, EK en WK uit de maandkalender", () => {
    const html = ["belgian-national-championships-cx-2027", "dutch-national-championships-cx-2027", "french-national-championships-cx-2027",
      "uec-cyclo-cross-european-championships-2026", "uci-cyclo-cross-world-championships-oostende-2027", "pan-american-cyclo-cross-championships-2026"]
      .map((s) => `<a href="/event/${s}">x</a>`).join("") + `<a href="/race/belgian-national-championships-cx-2027/startlist">Startlist</a>`;
    expect(parseChampionships(html)).toEqual([
      "belgian-national-championships-cx-2027", "dutch-national-championships-cx-2027",
      "uec-cyclo-cross-european-championships-2026", "uci-cyclo-cross-world-championships-oostende-2027",
    ]);
  });
});
