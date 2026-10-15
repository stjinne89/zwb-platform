// Tips na een ZRL-race (ZWBeter racen): voor de renner zelf en voor de captain.
// Puur: geen I/O. Elke tip volgt uit een vaste regel op de data die er is, en
// noemt het getal waar hij op steunt. Geen tip als de data hem niet draagt.
//
// Wat de tips niet gebruiken, zeggen ze niet: het plan (sinds 2026-10-15 te
// importeren in de TTT Planner, maar hier nog niet gelezen) en de kopbeurten
// uit het botlogboek, dat niet in het platform staat (docs/zrl-analyse.md).

import type { RaceAnalysis, RiderAnalysis } from "@/lib/zrl-analysis/race";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import type { PersonalRace, RaceKind } from "@/lib/zrl-analysis/personal";
import { durationLabel, raceClock as clock } from "@/lib/zrl-analysis/format";

export type Advice = {
  /** Wat de data laat zien. */
  finding: string;
  /** Wat je volgende keer kunt doen. */
  tip: string;
  /** Welke regel; om twee tips over hetzelfde samen te voegen. Niet getoond. */
  rule?: "start" | "fade";
};

/** Zo veel seconden langer dan de ploeg over een klim: daar loste de renner. */
export const DROP_ON_CLIMB_S = 15;
/** Beste lange inspanning in een (ploegen)tijdrit tegenover de 90-dagencurve: zo laag is reserve. */
export const RESERVE_SHARE = 85;
/** Zoveel procent lager in de tweede helft van een tijdrit: te hard begonnen. */
export const FADE_PERCENT = 5;
/** Een klim van minstens zo lang (s) kan te hard begonnen zijn. */
export const CLIMB_MIN_S = 90;
/** De tweede helft van een klim zoveel lager dan de eerste: te hard begonnen. */
export const FRONT_LOADED_SHARE = 0.12;
/** ...en zo ver voor de top (s) al leeg. */
export const EMPTY_BEFORE_TOP_S = 20;
/** Ploegentijdrit: zo lang (s) na een klim onder 25% W′ kost beurten. */
export const TTT_RECOVERY_S = 120;
/** Met zo weinig W′ (%) aan de voet van de eerste klim kostte de start iets. */
export const START_FOOT_WBAL = 60;
/** Tijdrit: een klim onder dit deel van je beste over die duur liet vermogen liggen. */
export const TT_CLIMB_SHARE = 90;
/** ...mits er boven op die klim nog zoveel W′ (%) over was. */
export const TT_CLIMB_WBAL_LEFT = 25;
/** Zo laat mag het hardste blok van 10 minuten beginnen om als "de start" te tellen. */
const START_WINDOW_S = 120;
/**
 * Puntenrace: een segment telt als "hard gereden" vanaf dit deel van het eigen
 * beste vijfminutenvermogen (W/kg), en als "zonder punten" bij een plek boven
 * de tien snelste (FTS) en in de achterste helft over de streep (FAL).
 */
export const HARD_SEGMENT_SHARE = 1;
export const WASTED_SEGMENTS = 3;
/** Zoveel W/kg meer dan de renners die vlak voor je finishten: winst in positie en draft. */
export const EFFICIENCY_GAP_WKG = 0.25;
/** Ploegentijdrit: zo ver (s) lag de vierde renner over een klim achter de eerste. */
export const CLIMB_SPLIT_S = 8;
/** Plan: FTP zoveel onder het teamgemiddelde: weinig beurten (Zwift Insider: 15%) of alleen wiel (20%). */
export const WEAK_FTP_SHARE = 0.85;
export const DRAFT_ONLY_FTP_SHARE = 0.8;
/** Plan: kopvermogen tegenover de gemiddelde FTP; topploegen zitten op 120 tot 130%. */
export const PULL_LOW_SHARE = 1.15;
export const PULL_HIGH_SHARE = 1.4;
/** Plan: gemiddeld vermogen in de race tegenover de eigen FTP, voor een renner die loste. */
export const OVERLOADED_SHARE = 0.98;

/** Zoveel tips per lijst. */
const MAX_TIPS = 4;

const nl1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sec = (ms: number) => `${nl1.format(Math.abs(ms) / 1000)} s`;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/** Klimmen van de route, met de tijd van de ploeg (de renners die niet losten) erover. */
function climbs(analysis: RaceAnalysis) {
  return analysis.route
    .filter((s) => s.kind === "klim")
    .map((s) => {
      const together = analysis.riders.filter((r) => !r.dropped);
      const elapsed = median(together.flatMap((r) => r.segments.filter((x) => x.index === s.index).map((x) => x.elapsed)));
      return { ...s, teamElapsed: elapsed };
    });
}

/** Reed deze renner de klim met de ploeg (niet ver achter de mediaan)? */
function withTeamOn(rider: RiderAnalysis, climb: ReturnType<typeof climbs>[number]) {
  const seg = rider.segments.find((x) => x.index === climb.index);
  return Boolean(seg && climb.teamElapsed !== null && seg.elapsed <= climb.teamElapsed + DROP_ON_CLIMB_S);
}

/** Waar een geloste renner in een ploegentijdrit de ploeg kwijtraakte. */
export function dropClimb(analysis: RaceAnalysis, rider: RiderAnalysis) {
  for (const climb of climbs(analysis)) {
    const own = rider.segments.find((x) => x.index === climb.index);
    if (own && climb.teamElapsed !== null && own.elapsed > climb.teamElapsed + DROP_ON_CLIMB_S) return climb.name;
  }
  return null;
}

/** In een ploegentijdrit: op welke klim deze renner het meeste vermogen van de ploeg nodig had. */
export function heaviestOnClimb(analysis: RaceAnalysis, rider: RiderAnalysis) {
  if (analysis.format !== "ttt") return null;
  for (const climb of climbs(analysis)) {
    // Alleen wie de klim met de ploeg reed: ook een renner die later loste, telt hier mee.
    const watts = analysis.riders
      .filter((r) => withTeamOn(r, climb))
      .flatMap((r) => {
        const seg = r.segments.find((x) => x.index === climb.index);
        return seg?.watts ? [{ id: r.athleteId, watts: seg.watts }] : [];
      })
      .sort((a, b) => b.watts - a.watts);
    if (watts.length >= 3 && watts[0].id === rider.athleteId) return { climb: climb.name, watts: watts[0].watts };
  }
  return null;
}

/** Tips uit de Zwift-data van één renner: wat ook de captain ziet. */
export function riderRaceAdvice(analysis: RaceAnalysis, rider: RiderAnalysis): Advice[] {
  const advice: Advice[] = [];
  if (rider.dropped) {
    const climb = dropClimb(analysis, rider);
    advice.push(
      climb
        ? {
            finding: `Op ${climb} kwam je los van de ploeg.`,
            tip: `Vraag om kortere beurten in het halfuur voor ${climb}, zodat je de klim met de ploeg kunt rijden.`,
          }
        : {
            finding: "Je finishte niet bij de ploeg.",
            tip: "Bespreek met de captain waar het misging en of je beurten korter kunnen.",
          },
    );
  }
  const heavy = heaviestOnClimb(analysis, rider);
  if (heavy) {
    advice.push({
      finding: `Op ${heavy.climb} had je ${heavy.watts} W nodig om bij te blijven, het meeste van de ploeg.`,
      tip: "Rij voor een klim geen lange beurt en laat een lichtere renner het tempo maken; zit zelf in het wiel.",
    });
  }
  if (analysis.format !== "ttt") {
    advice.push(...segmentChoiceAdvice(rider));
    // Zonder draft (Race of Truth) zegt meer vermogen dan je voorgangers niets over positie.
    if (!analysis.noDraft) advice.push(...efficiencyAdvice(rider));
  }
  if (rider.powerType && rider.powerType !== "POWER_METER") {
    advice.push({
      finding: "Zwift rekende met geschat vermogen.",
      tip: "Rij met een vermogensmeter of smart trainer, anders kloppen je wattages en die van het plan niet.",
    });
  }
  return advice;
}

/**
 * Puntenrace: veel segmenten hard gereden zonder er iets mee te scoren. In
 * Zwift-puntenraces kiezen de meeste renners één soort segment ("rust, sprint,
 * herhaal"); wie alles meedoet, betaalt dat zonder punten.
 */
function segmentChoiceAdvice(rider: RiderAnalysis): Advice[] {
  const best5 = rider.criticalPower?.m5 && rider.wkg && rider.avgWatts ? rider.criticalPower.m5 * (rider.wkg / rider.avgWatts) : null;
  if (!best5) return [];
  const hard = rider.segments.filter((s) => s.kind !== "segment" && s.wkg !== null && s.wkg >= best5 * HARD_SEGMENT_SHARE);
  const wasted = hard.filter((s) => s.rank > 10 && s.falRank > s.of / 2);
  if (wasted.length < WASTED_SEGMENTS) return [];
  const scored = rider.segments.filter((s) => s.kind !== "segment" && (s.rank <= 10 || s.falRank <= s.of / 2));
  return [
    {
      finding: `Je reed ${wasted.length} segmenten boven je beste vijfminutenvermogen zonder er voorin te komen.`,
      tip: scored.length
        ? `Kies je segmenten: ${scored[0].name} lag je beter (${scored[0].falRank}e over de streep). Rij de andere in het wiel en spaar je daarvoor.`
        : "Kies één soort segment dat bij je past en rij de rest in het wiel; zo heb je de kracht als het telt.",
    },
  ];
}

/**
 * Meer vermogen dan de renners die net voor je finishten: zij reden zuiniger,
 * meestal door beter in het wiel te zitten. In Zwift scheelt dat 25 tot 35%.
 */
function efficiencyAdvice(rider: RiderAnalysis): Advice[] {
  if (rider.wkg === null || rider.aheadWkg === null || rider.wkg - rider.aheadWkg < EFFICIENCY_GAP_WKG) return [];
  const nl2 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    {
      finding: `Je reed gemiddeld ${nl2.format(rider.wkg)} W/kg; de renners die vlak voor je finishten ${nl2.format(rider.aheadWkg)} W/kg.`,
      tip: "Zij reden zuiniger: zit dichter in het wiel, schuif niet in de wind op en spaar je voor de stukken die tellen.",
    },
  ];
}

/**
 * Tips uit het eigen bestand per seconde; alleen voor de renner zelf.
 *
 * Een lege W′ op een klim is in een race normaal: daar maak je het verschil of
 * blijf je erbij (eigenaar, 2026-10-15). Een tip komt er pas als de data een
 * gevolg of een afwijking laat zien die bij dit soort race past: te hard aan
 * een klim begonnen en ver voor de top stilgevallen, een start die je W′ kostte
 * voor de eerste klim, lang herstel na een klim in een ploegentijdrit, of in een
 * tijdrit vermogen dat je liet liggen.
 */
export function rideAdvice(ride: RideAnalysis, ftp: number | null, kind: RaceKind): Advice[] {
  const advice: Advice[] = [];
  const climbs = ride.phases.filter((p) => p.climb && p.to - p.from >= CLIMB_MIN_S);
  const firstClimb = ride.phases.find((p) => p.climb);

  // De start, alleen als die je iets kostte: weinig W′ aan de voet van de eerste klim.
  const tenMin = ride.best.find((b) => b.seconds === 600);
  if (
    ftp &&
    tenMin &&
    tenMin.at <= ride.missingStart + START_WINDOW_S &&
    tenMin.watts >= ftp &&
    firstClimb?.wbalStart != null &&
    firstClimb.wbalStart <= START_FOOT_WBAL
  ) {
    const pct = Math.round((100 * tenMin.watts) / ftp);
    advice.push({
      rule: "start",
      finding: `Je begon op ${pct}% van je FTP (${tenMin.watts} W over de eerste 10 minuten) en kwam met ${firstClimb.wbalStart}% W′ aan de voet van ${firstClimb.name}.`,
      tip:
        kind === "race"
          ? `Rij de start in het wiel en zo zuinig als kan; aan de voet van ${firstClimb.name} wil je je W′ vol hebben.`
          : kind === "tt"
            ? `Begin een paar procent rustiger; dan heb je je W′ voor ${firstClimb.name}.`
            : `Rij de start op het tempo van de ploeg en niet erboven; dan heb je je W′ voor ${firstClimb.name}.`,
    });
  }

  // Een klim te hard begonnen: de tweede helft duidelijk lager, en ver voor de top leeg.
  const paced = new Set<string>();
  for (const climb of climbs) {
    if (!climb.halves || climb.emptyBeforeEnd === null || climb.emptyBeforeEnd < EMPTY_BEFORE_TOP_S) continue;
    const { first, second } = climb.halves;
    if (second > first * (1 - FRONT_LOADED_SHARE)) continue;
    paced.add(climb.name);
    const even = Math.round((first + second) / 2);
    advice.push({
      finding: `Op ${climb.name} ging je er te hard in: eerste helft ${first} W, tweede helft ${second} W, en ${climb.emptyBeforeEnd} s voor de top was je W′ op.`,
      tip:
        kind === "race"
          ? `Begin de klim rond ${even} W en zet pas aan op het laatste stuk; zo ben je boven nog bij de groep.`
          : kind === "tt"
            ? `Rij de klim gelijkmatig, rond ${even} W: dat is sneller dan hard beginnen en boven stilvallen.`
            : `Rij de klim op het tempo van de ploeg, rond ${even} W, en niet erboven in het begin.`,
    });
  }

  // Ploegentijdrit: lang herstel na een klim betekent beurten die je niet kunt rijden.
  if (kind === "ttt") {
    ride.phases.forEach((climb, i) => {
      const next = ride.phases[i + 1];
      if (!climb.climb || !next || next.climb || climb.recoveryAfter === null || climb.recoveryAfter < TTT_RECOVERY_S) return;
      advice.push({
        finding: `Na ${climb.name} duurde het ${clock(climb.recoveryAfter)} voor je W′ weer boven 25% stond.`,
        tip: `Spreek af dat je na ${climb.name} één beurt overslaat en dat hardop meldt; een halve beurt kost de ploeg meer.`,
      });
    });
  }

  // Tijdrit: op een klim win je per watt de meeste tijd; liet je daar vermogen liggen?
  if (kind === "tt") {
    for (const climb of climbs) {
      // Alleen als er boven nog W′ over was: wie al leeg was, kon er niet harder.
      if (paced.has(climb.name) || !climb.seasonBest || climb.emptyBeforeEnd !== null || (climb.wbalEnd ?? 0) < TT_CLIMB_WBAL_LEFT) continue;
      const share = Math.round((100 * climb.np) / climb.seasonBest);
      if (share >= TT_CLIMB_SHARE) continue;
      advice.push({
        finding: `Op ${climb.name} reed je ${climb.np} W, ${share}% van je beste ${durationLabel(Math.round(climb.to - climb.from))} (${climb.seasonBest} W).`,
        tip: `In een tijdrit win je op de klim de meeste tijd per watt: zet daar harder aan, richting ${Math.round(climb.seasonBest * 0.95)} W, en herstel op het stuk erna.`,
      });
    }
  }

  // Reserve telt alleen in een tijdrit of ploegentijdrit; in een race kan wachten tactiek zijn.
  if (kind !== "race") {
    const long = ride.best.find((b) => b.seconds === 2400 && b.share !== null) ?? ride.best.find((b) => b.seconds === 1200 && b.share !== null);
    if (long?.share != null && long.season && long.share <= RESERVE_SHARE) {
      const target = Math.round(long.season * 0.95);
      advice.push({
        finding: `Je beste ${durationLabel(long.seconds)} was ${long.watts} W, ${long.share}% van je beste in 90 dagen (${long.season} W).`,
        tip:
          kind === "tt"
            ? `Er zat meer in: mik op rond ${target} W gemiddeld.`
            : `Er zat meer in: je kunt langere of hardere beurten aan, richting ${target} W over de race.`,
      });
    }
  }

  return advice;
}

/**
 * Tips voor een individuele race (FRR-etappe, andere Zwift-race): verdeling in
 * een tijdrit, waar de meeste tijd verloren ging, het eigen bestand.
 */
export function personalAdvice(race: PersonalRace, ride: RideAnalysis | null, ftp: number | null): Advice[] {
  const advice: Advice[] = [];
  const fromRide = ride ? rideAdvice(ride, ftp, race.kind) : [];
  if (race.kind === "tt" && ride?.halves) {
    const { first, second } = ride.halves;
    const change = Math.round((100 * (second - first)) / first);
    const start = fromRide.find((a) => a.rule === "start");
    // Renners beginnen een tijdrit uit zichzelf zo'n 14% boven hun gemiddelde;
    // hooguit 5% erboven is sneller (Atkinson e.a., Thomas e.a.).
    const opening = ride.startShare !== null && ride.startShare >= 105 ? ` Het eerste tiende reed je ${ride.startShare - 100}% boven je gemiddelde.` : "";
    if (change <= -FADE_PERCENT && start) {
      start.finding += ` In de tweede helft zakte je ${Math.abs(change)}% weg (${first} → ${second} W).${opening}`;
    } else if (change <= -FADE_PERCENT) {
      advice.push({
        rule: "fade",
        finding: `Eerste helft ${first} W, tweede helft ${second} W: je zakte ${Math.abs(change)}% weg.${opening}`,
        tip: "Begin hooguit 5% boven je doelvermogen; in een tijdrit is een gelijkmatig tempo, met wat meer op de klimmen, het snelst.",
      });
    } else if (change >= FADE_PERCENT) {
      advice.push({
        finding: `Tweede helft ${second} W tegen ${first} W in de eerste: je eindigde ${change}% sterker.`,
        tip: "Er zat meer in de eerste helft; begin iets harder.",
      });
    }
  }
  if (race.rider.powerType && race.rider.powerType !== "POWER_METER") {
    advice.push({
      finding: "Zwift rekende met geschat vermogen.",
      tip: "Rij met een vermogensmeter of smart trainer, anders kloppen je wattages niet.",
    });
  }
  return [...fromRide, ...advice].slice(0, MAX_TIPS);
}

/** Tips voor de renner zelf: eerst uit het eigen bestand, dan uit de race. */
export function ownAdvice(analysis: RaceAnalysis, rider: RiderAnalysis | null, ride: RideAnalysis | null, ftp: number | null): Advice[] {
  const fromRide = ride ? rideAdvice(ride, ftp, analysis.format === "ttt" ? "ttt" : "race") : [];
  const fromRace = rider ? riderRaceAdvice(analysis, rider) : [];
  return [...fromRide, ...fromRace].slice(0, MAX_TIPS);
}

/** Tips voor de captain over de ploeg als geheel. */
export function teamAdvice(analysis: RaceAnalysis): Advice[] {
  const advice: Advice[] = [];
  const rival = analysis.rival?.label;
  if (analysis.format === "ttt" && rival && analysis.sections.length > 1) {
    const worst = [...analysis.sections].sort((a, b) => a.versusRival - b.versusRival)[0];
    const to = (name: string) => name.replace(/^.*→ /, "");
    if (worst.versusRival <= -2000) {
      advice.push(
        worst.kind === "klim"
          ? {
              finding: `Op het stuk naar ${to(worst.name)} verloor de ploeg ${sec(worst.versusRival)} op ${rival}.`,
              tip: "Spreek voor de klim een vast tempo in W/kg af, op het niveau van de zwakste klimmer.",
            }
          : {
              finding: `Op het vlakke stuk naar ${to(worst.name)} verloor de ploeg ${sec(worst.versusRival)} op ${rival}.`,
              tip: "Daar zit winst in de rotatie: snellere overnames en kopbeurten die iedereen volhoudt.",
            },
      );
    }
  }
  if (analysis.format === "ttt") {
    for (const climb of climbs(analysis)) {
      const together = analysis.riders
        .filter((r) => !r.dropped)
        .flatMap((r) => r.segments.filter((x) => x.index === climb.index).map((x) => x.elapsed))
        .sort((a, b) => a - b);
      if (together.length < 4) continue;
      const split = together[3] - together[0];
      if (split < CLIMB_SPLIT_S) continue;
      advice.push({
        finding: `Op ${climb.name} lag de vierde renner ${nl1.format(split)} s achter de eerste.`,
        tip: "Rij klimmen op een vast W/kg-doel dat de zwakste klimmer volhoudt, en wacht boven niet: bijblijven kost minder dan terugkomen.",
      });
      break;
    }
  }
  for (const rider of analysis.riders.filter((r) => r.dropped)) {
    const climb = dropClimb(analysis, rider);
    const finishers = analysis.riders.filter((r) => !r.dropped).length;
    advice.push({
      finding: `${rider.name} kwam ${climb ? `op ${climb} ` : ""}los van de ploeg${finishers === 4 ? "; daarna mocht niemand meer lossen" : ""}.`,
      tip: climb
        ? `Geef ${rider.name} kortere beurten in het halfuur voor ${climb}.`
        : `Bespreek met ${rider.name} waar het misging.`,
    });
  }
  if (analysis.format !== "ttt" && analysis.team && analysis.riders.length > 1) {
    const total = analysis.riders.reduce((s, r) => s + r.points, 0);
    const top = [...analysis.riders].sort((a, b) => b.points - a.points)[0];
    if (total > 0 && top.points / total >= 0.4) {
      advice.push({
        finding: `${top.name} pakte ${Math.round((100 * top.points) / total)}% van de punten van de ploeg.`,
        tip: `Zet de ploeg in om ${top.name} op de sprints en klimmen vooraan te brengen.`,
      });
    }
  }
  return advice.slice(0, MAX_TIPS);
}

/** Een renner uit het geïmporteerde plan (TTT Planner). */
export type PlanRider = { zwiftId: number | null; name: string; ftp: number | null; pullWatts: number | null; pullSeconds: number | null };

/**
 * Plan tegenover uitvoering in een ploegentijdrit, voor de captain. Alleen als
 * er een plan met FTP's is (TTT Planner). Regels uit de analyse van de beste
 * ploegen in WTRL-ploegentijdritten (Zwift Insider, 2021): kopbeurten op 120
 * tot 130% van de gemiddelde FTP, renners ruim onder het gemiddelde weinig of
 * geen beurten, en een race rond 95% van de FTP.
 */
export function tttPlanAdvice(analysis: RaceAnalysis, plan: PlanRider[]): Advice[] {
  if (analysis.format !== "ttt") return [];
  const raced = new Set(analysis.riders.map((r) => r.athleteId));
  const riders = plan.filter((p) => p.ftp && p.zwiftId !== null && raced.has(p.zwiftId));
  if (riders.length < 4) return [];
  const advice: Advice[] = planCompositionAdvice(riders);

  for (const rider of analysis.riders.filter((r) => r.dropped)) {
    const p = riders.find((x) => x.zwiftId === rider.athleteId);
    if (!p?.ftp || !rider.avgWatts) continue;
    const share = rider.avgWatts / p.ftp;
    if (share < OVERLOADED_SHARE) continue;
    advice.push({
      finding: `${p.name} reed gemiddeld ${Math.round(100 * share)}% van de eigen FTP en loste toch.`,
      tip: `Het plan vroeg meer dan ${p.name} kon: kortere of minder kopbeurten, of vaker overslaan.`,
    });
  }
  return advice.slice(0, MAX_TIPS);
}

/**
 * Een plan tegen de vuistregels van de beste WTRL-ploegen, ook vóór de race: een
 * renner ver onder de gemiddelde FTP met kopbeurten, en kopvermogen buiten 115 tot
 * 140% van de gemiddelde FTP. Telt alleen renners met een FTP; met minder dan vier
 * zegt het niets.
 */
export function planCompositionAdvice(plan: PlanRider[]): Advice[] {
  const riders = plan.filter((p) => p.ftp);
  if (riders.length < 4) return [];
  const avgFtp = riders.reduce((s, p) => s + (p.ftp as number), 0) / riders.length;
  const advice: Advice[] = [];
  for (const p of riders) {
    const share = (p.ftp as number) / avgFtp;
    if (share > WEAK_FTP_SHARE || !p.pullSeconds) continue;
    const pct = Math.round(100 * (1 - share));
    advice.push({
      finding: `${p.name} heeft een FTP ${pct}% onder het teamgemiddelde, maar kreeg kopbeurten van ${p.pullSeconds} s.`,
      tip:
        share <= DRAFT_ONLY_FTP_SHARE
          ? `Laat ${p.name} in het wiel: zo ver onder het gemiddelde kost een kopbeurt meer dan die de ploeg oplevert.`
          : `Geef ${p.name} korte en weinig kopbeurten, en meer rust in het wiel.`,
    });
  }
  const pulls = riders.flatMap((p) => (p.pullWatts && p.pullSeconds ? [p.pullWatts] : [])).sort((a, b) => a - b);
  if (pulls.length >= 3) {
    const share = pulls[pulls.length >> 1] / avgFtp;
    const pct = Math.round(100 * share);
    if (share < PULL_LOW_SHARE) {
      advice.push({
        finding: `De kopbeurten in het plan lagen op ${pct}% van de gemiddelde FTP.`,
        tip: "Snelle ploegen trekken korter en harder, op 120 tot 130% van de gemiddelde FTP, en rusten daarna in het wiel.",
      });
    } else if (share > PULL_HIGH_SHARE) {
      advice.push({
        finding: `De kopbeurten in het plan lagen op ${pct}% van de gemiddelde FTP.`,
        tip: "Dat houden alleen heel sterke ploegen vol; 120 tot 130% is een veiliger doel.",
      });
    }
  }
  return advice;
}
