// Tips na een ZRL-race (ZWBeter racen): voor de renner zelf en voor de captain.
// Puur: geen I/O. Elke tip volgt uit een vaste regel op de data die er is, en
// noemt het getal waar hij op steunt. Geen tip als de data hem niet draagt.
//
// Wat de app niet weet, zegt hij niet: het plan uit ZwiftGopher en de
// kopbeurten uit het botlogboek staan niet in het platform (docs/zrl-analyse.md).

import type { RaceAnalysis, RiderAnalysis } from "@/lib/zrl-analysis/race";
import type { RideAnalysis } from "@/lib/zrl-analysis/ride";
import { durationLabel } from "@/lib/zrl-analysis/format";

export type Advice = {
  /** Wat de data laat zien. */
  finding: string;
  /** Wat je volgende keer kunt doen. */
  tip: string;
};

/** Zo veel seconden langer dan de ploeg over een klim: daar loste de renner. */
export const DROP_ON_CLIMB_S = 15;
/** W′ op of onder dit percentage na een klim: leeg. */
export const EMPTY_WBAL = 10;
/** Beste lange inspanning in de race tegenover de 90-dagencurve. */
export const AT_LIMIT_SHARE = 95;
export const RESERVE_SHARE = 85;
/** Watt per hartslag zoveel procent lager aan het eind: duidelijke drift. */
export const DRIFT_PERCENT = -10;
/** Deel van de seconden boven de FTP onder 70 rpm. */
export const LOW_CADENCE_SHARE = 25;
/** Zo laat mag het hardste blok van 10 minuten beginnen om als "de start" te tellen. */
const START_WINDOW_S = 120;
/** Zoveel tips per lijst. */
const MAX_TIPS = 4;

const nl1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sec = (ms: number) => `${nl1.format(Math.abs(ms) / 1000)} s`;
const wkgText = (v: number) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

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
function dropClimb(analysis: RaceAnalysis, rider: RiderAnalysis) {
  for (const climb of climbs(analysis)) {
    const own = rider.segments.find((x) => x.index === climb.index);
    if (own && climb.teamElapsed !== null && own.elapsed > climb.teamElapsed + DROP_ON_CLIMB_S) return climb.name;
  }
  return null;
}

/** In een ploegentijdrit: op welke klim deze renner het meeste vermogen van de ploeg nodig had. */
function heaviestOnClimb(analysis: RaceAnalysis, rider: RiderAnalysis) {
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
    const best = [...rider.segments].filter((s) => s.kind !== "segment").sort((a, b) => a.rank / a.of - b.rank / b.of)[0];
    if (best && best.rank <= 10) {
      advice.push({
        finding: `Je beste segment was ${best.name}: ${best.rank}e van ${best.of}${best.wkg !== null ? ` op ${wkgText(best.wkg)} W/kg` : ""}.`,
        tip: `Daar liggen je punten: spaar je voor ${best.kind === "klim" ? "de klimmen" : "de sprints"} en schuif daar vooraan.`,
      });
    }
  }
  if (rider.powerType && rider.powerType !== "POWER_METER") {
    advice.push({
      finding: "Zwift rekende met geschat vermogen.",
      tip: "Rij met een vermogensmeter of smart trainer, anders kloppen je wattages en die van het plan niet.",
    });
  }
  return advice;
}

/** Tips uit het eigen bestand per seconde; alleen voor de renner zelf. */
export function rideAdvice(ride: RideAnalysis, ftp: number | null): Advice[] {
  const advice: Advice[] = [];

  const tenMin = ride.best.find((b) => b.seconds === 600);
  if (ftp && tenMin && tenMin.at <= ride.missingStart + START_WINDOW_S && tenMin.watts >= ftp) {
    advice.push({
      finding: `Je hardste 10 minuten waren de eerste 10: ${tenMin.watts} W, ${Math.round((100 * tenMin.watts) / ftp)}% van je FTP.`,
      tip: "Rij de start op het tempo van de ploeg en niet erboven; dat spaart je voor de eerste klim.",
    });
  }

  // Leeg boven op een klim waarna nog vlak volgt: dan komt de eerste beurt te vroeg.
  const empty = ride.phases.filter(
    (phase, i) => phase.climb && phase.wbalEnd !== null && phase.wbalEnd <= EMPTY_WBAL && ride.phases[i + 1] && !ride.phases[i + 1].climb,
  );
  if (empty.length > 0) {
    advice.push({
      finding: `Boven op ${empty.map((p) => `${p.name} (${p.wbalEnd}%)`).join(" en ")} was je W′ op.`,
      tip: "Neem na de klim niet als eerste over; laat je zakken tot je weer kunt.",
    });
  }

  const long = ride.best.find((b) => b.seconds === 2400 && b.share !== null) ?? ride.best.find((b) => b.seconds === 1200 && b.share !== null);
  if (long?.share != null) {
    if (long.share >= AT_LIMIT_SHARE) {
      advice.push({
        finding: `Je reed op je maximum: je beste ${durationLabel(long.seconds)} was ${long.share}% van je beste in 90 dagen.`,
        tip: "Een zwaarder plan zit er nu niet in. Laat je kopbeurten op dit niveau plannen, niet hoger.",
      });
    } else if (long.share <= RESERVE_SHARE) {
      advice.push({
        finding: `Je beste ${durationLabel(long.seconds)} was ${long.share}% van je beste in 90 dagen.`,
        tip: "Er bleef reserve over: je kunt langere of hardere beurten aan.",
      });
    }
  }

  if (ride.drift && ride.drift.change <= DRIFT_PERCENT) {
    advice.push({
      finding: `Je hartslag liep op: aan het eind ${Math.abs(ride.drift.change)}% minder watt per slag dan aan het begin.`,
      tip: "Zorg voor koeling en drink tijdens de race.",
    });
  }

  const above = ride.cadenceAboveFtp.reduce((s, c) => s + c.seconds, 0);
  const low = ride.cadenceAboveFtp.filter((c) => c.from < 70).reduce((s, c) => s + c.seconds, 0);
  if (above >= 120 && (100 * low) / above >= LOW_CADENCE_SHARE) {
    advice.push({
      finding: `Boven je FTP trapte je ${Math.round((100 * low) / above)}% van de tijd onder 70 rpm.`,
      tip: "Probeer op de klim een lichter verzet; train het met blokken op hogere cadans.",
    });
  }

  return advice;
}

/** Tips voor de renner zelf: eerst uit het eigen bestand, dan uit de race. */
export function ownAdvice(analysis: RaceAnalysis, rider: RiderAnalysis | null, ride: RideAnalysis | null, ftp: number | null): Advice[] {
  const fromRide = ride ? rideAdvice(ride, ftp) : [];
  const fromRace = rider ? riderRaceAdvice(analysis, rider) : [];
  return [...fromRide, ...fromRace].slice(0, MAX_TIPS);
}

/** Tips voor de captain over de ploeg als geheel. */
export function teamAdvice(analysis: RaceAnalysis): Advice[] {
  const advice: Advice[] = [];
  const rival = analysis.rival?.label;
  if (analysis.format === "ttt" && rival && analysis.sections.length > 1) {
    const worst = [...analysis.sections].sort((a, b) => a.versusRival - b.versusRival)[0];
    const best = [...analysis.sections].sort((a, b) => b.versusRival - a.versusRival)[0];
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
    if (best.versusRival >= 2000) {
      advice.push({
        finding: `Op het stuk naar ${to(best.name)} won de ploeg ${sec(best.versusRival)} op ${rival}.`,
        tip: "Houd die aanpak vast voor de volgende race.",
      });
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
