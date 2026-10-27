// Tips voor de racebriefing, uit de route, het format en het veld. Vaste regels,
// onderbouwd met de kennisbank racen (src/lib/racen/library.ts); de captain vult
// ze aan met een eigen plan. Puur: geen I/O.

import type { BriefingFormat, LimitCheck, Powerup } from "./rules";
import { cleanRiderName, type OwnRole, type Projection, type WatchReason } from "./field";
import { climbSeconds, overlaps, segmentLabel, type BriefingClimb, type BriefingSegment, type RouteKeyPoints } from "./route";

export type BriefingTip = {
  /** Waar het over gaat, met het getal uit de data. */
  finding: string;
  /** Wat je doet. */
  tip: string;
  /** Artikel in de kennisbank racen. */
  slug?: string;
};

const nl = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
export const km = (value: number) => `${nl.format(value)} km`;
const pct = (gradient: number) => `${nl.format(Math.round(gradient * 1000) / 10)} %`;

export function climbLabel(climb: BriefingClimb): string {
  return climb.name ?? `de klim op ${km(climb.startKm)}`;
}

export function durationLabel(seconds: number): string {
  if (seconds < 90) return `±${Math.round(seconds / 10) * 10} s`;
  return `±${nl.format(Math.round(seconds / 30) / 2)} min`;
}

export type OwnRiderForTips = {
  zwiftId: number;
  name: string;
  role: OwnRole;
  limits: LimitCheck;
};

export function briefingTips(input: {
  format: BriefingFormat;
  category: string | null;
  route: RouteKeyPoints | null;
  powerups: Array<{ powerup: Powerup; percent: number }>;
  projection: Projection;
  watch: Array<{ rider: { name: string }; place: number; reason: WatchReason }>;
  own: OwnRiderForTips[];
}): BriefingTip[] {
  const { format, category, route, own } = input;
  const tips: BriefingTip[] = [];
  const firstName = (name: string) => cleanRiderName(name).split(/\s+/)[0] ?? name;
  const names = (list: OwnRiderForTips[]) => list.map((r) => firstName(r.name)).join(" en ");

  if (format === "scratch") {
    const ownStarters = own.length;
    tips.push({
      finding: "Alleen de finish telt, en elke plek is één punt voor elke renner.",
      tip: `Houd ${ownStarters >= 4 ? `alle ${ownStarters}` : "al onze"} renners in de eerste groep: een renner van de 20e naar de 12e plek levert meer op dan de winnaar van 3 naar 1.`,
    });
  }
  if (format === "ttt") {
    tips.push({
      finding: "De tijd van de vierde renner telt.",
      tip: "Maak het plan in de TTT Planner. Een renner die niet meer kan, trekt nog één keer voluit en laat dan los.",
      slug: "ploegentijdrit",
    });
  }
  if (format === "rot") {
    tips.push({
      finding: "Race of Truth: geen slipstream.",
      tip: "Rijd je eigen tempo, ongeveer 5 % onder je gemiddelde beginnen en opbouwen. Een harde start kost je meer dan hij oplevert.",
    });
  }

  if (route && format !== "ttt" && format !== "rot") {
    if (route.earlyClimb) {
      tips.push({
        finding: `${climbLabel(route.earlyClimb)} ligt op ${km(route.earlyClimb.startKm)}, kort na de start.`,
        tip: "Zit vóór die klim in het voorste derde. De eerste selectie valt vaak in de eerste minuten.",
        slug: "positie-in-de-groep",
      });
    }
    const vulnerable = own.filter((r) => r.role === "positie");
    for (const { descent, climb } of route.descentsIntoClimbs) {
      tips.push({
        finding: `Op ${km(descent.startKm)} daalt de weg ${descent.dropM} m en direct daarna klimt hij ${climb.gainM} m (${pct(climb.avgGradient)}, steilste stuk ${pct(climb.maxGradient)}): ${climbLabel(climb)}, ${durationLabel(climbSeconds(climb, category))} voor de kop.`,
        tip: `In de afdaling gaat het veld op een lint en op de klim breekt het. Zit vóór ${km(descent.startKm)} op plek 3 tot 8${vulnerable.length ? `, vooral ${names(vulnerable)}` : ""}, dan valt het gat achter je.`,
        slug: "klimmen-in-de-groep",
      });
    }
    const hardest = route.hardestClimb;
    if (hardest && !route.descentsIntoClimbs.some((d) => d.climb === hardest) && !(route.finale.kind === "climb" && route.finale.climb === hardest)) {
      tips.push({
        finding: `De zwaarste klim is ${climbLabel(hardest)}: ${hardest.gainM} m op ${km(hardest.startKm)} (${pct(hardest.avgGradient)}), ${durationLabel(climbSeconds(hardest, category))} voor de kop.`,
        tip: "Schuif ervoor naar voren en rijd door over de top: in de afdaling groeit een klein gat.",
        slug: "klimmen-in-de-groep",
      });
    }
    if (route.finale.kind === "climb") {
      const { climb, runInKm } = route.finale;
      tips.push({
        finding: `Finale: ${climb.gainM} m klimmen op ${km(climb.startKm)} (${pct(climb.avgGradient)}, ${durationLabel(climbSeconds(climb, category))}), daarna ${km(runInKm)} tot de streep.`,
        tip: runInKm >= 0.5
          ? "Voluit tot over de top: een gat van een paar seconden is daarna nog dicht te rijden, tien seconden niet. Daarna een sprint uit het wiel."
          : "De top is bijna de streep: begin vooraan aan de klim en rijd hem voluit.",
        slug: "klimmen-in-de-groep",
      });
    } else {
      tips.push({
        finding: `Vlakke finale: de laatste ${km(route.finale.flatKm)} zonder klim.`,
        tip: "Zit in de laatste halve minuut vooraan in een wiel en ga niet als eerste aan.",
        slug: "de-sprint",
      });
    }
    if (route.lastArchKm !== null) {
      const has = (p: Powerup) => input.powerups.some((x) => x.powerup === p);
      const uses = [
        has("veer") && route.finale.kind === "climb" ? "veer voor de slotklim" : null,
        has("aerohelm") ? "aerohelm op ±200 m van de streep" : null,
        has("draft boost") ? "draft boost in het wiel op weg naar de finale" : null,
      ].filter(Boolean);
      tips.push({
        finding: `De laatste boog met een powerup ligt op ${km(route.lastArchKm)}.`,
        tip: `Gebruik je powerup vóór die boog, dan krijg je er een voor de finale${uses.length ? `: ${uses.join(", ")}` : ""}.`,
        slug: "zwift-spelregels",
      });
    }
  }

  if (input.watch.length > 0 && format !== "ttt") {
    const list = input.watch.slice(0, 4).map((w) => `${firstName(w.rider.name)}${w.reason === "won" ? " (won eerder deze ronde)" : ""}`);
    tips.push({
      finding: `Gevaarlijk: ${list.join(", ")}.`,
      tip: "Volg hun aanvallen met de renners die tempo rijden; de kopmannen sparen zich voor de finale.",
      slug: "aanvallen-en-volgen",
    });
  }

  const near = own.filter((r) => r.limits.status !== "ok");
  if (near.length > 0) {
    tips.push({
      finding: `${names(near)} ${near.length === 1 ? "zit" : "zitten"} dicht bij de grens van de divisie (zFTP of zMAP volgens WTRL).`,
      tip: "Geen lange stukken voluit boven de drempel: wie er in de race overheen gaat, krijgt strafpunten en mag niet meer in deze divisie rijden.",
    });
  }

  return tips;
}

/** Een moment op de route voor het racebriefje: waar, wat, en wat je doet. */
export type BriefingMoment = { km: number; what: string; todo: string; key?: boolean };

/** De route als lijst momenten in spiekbrieftaal, op volgorde van de kilometer. */
export function briefingMoments(input: {
  format: BriefingFormat;
  category: string | null;
  route: RouteKeyPoints | null;
  powerups: Array<{ powerup: Powerup; percent: number }>;
  own: OwnRiderForTips[];
}): BriefingMoment[] {
  const { format, category, route } = input;
  if (!route) return [];
  const short = (climb: BriefingClimb) => (climb.name ?? "klim").replace(/\s+(KOM|QOM)$/i, "");
  const time = (climb: BriefingClimb) => durationLabel(climbSeconds(climb, category));
  const out: BriefingMoment[] = [];
  const has = (p: Powerup) => input.powerups.some((x) => x.powerup === p);
  /**
   * De sprints, KOM's en ronden met punten, behalve een KOM over een klim die al een
   * moment heeft en een segment dat op de streep eindigt (dan telt de finish).
   */
  const scoring = (covered: Array<BriefingClimb | null>, todo: (segment: BriefingSegment) => string): BriefingMoment[] =>
    route.segments
      .filter((s) => s.endKm < route.totalKm - 0.3 && !(s.kind === "kom" && covered.some((c) => c && overlaps(s, c))))
      .map((s) => {
        const climb = s.kind === "kom" ? route.climbs.find((c) => overlaps(s, c)) : undefined;
        const what = climb ? `${segmentLabel(s)} ${climb.gainM} m · ${time(climb)}` : s.kind === "lap" ? `${segmentLabel(s)} ${km(s.endKm - s.startKm)}` : segmentLabel(s);
        return { km: s.startKm, what, todo: todo(s) };
      });

  if (format === "ttt" || format === "rot") {
    for (const climb of route.climbs) {
      out.push({
        km: climb.startKm,
        what: `${short(climb)} ${climb.gainM} m · ${time(climb)}`,
        todo: format === "ttt" ? "W/kg-doel, bij elkaar blijven" : "niet harder dan je drempel",
      });
    }
    if (format === "rot") out.push(...scoring(route.climbs, () => "telt voor FAL en FTS"));
    return out.sort((a, b) => a.km - b.km);
  }

  const positie = input.own.filter((r) => r.role === "positie").map((r) => cleanRiderName(r.name).split(/\s+/)[0]);
  if (route.earlyClimb) out.push({ km: route.earlyClimb.startKm, what: `${short(route.earlyClimb)} ${route.earlyClimb.gainM} m`, todo: "voorste derde, eerste selectie" });
  for (const { descent, climb } of route.descentsIntoClimbs) {
    out.push({ km: descent.startKm, what: `afdaling ${descent.dropM} m`, todo: `naar voren, plek 3–8${positie.length ? ` (${positie.join(", ")})` : ""}`, key: true });
    out.push({ km: climb.startKm, what: `${short(climb)} ${climb.gainM} m · ${time(climb)}`, todo: "het lint breekt: lossen doe je niet", key: true });
  }
  const hardest = route.hardestClimb;
  const finaleClimb = route.finale.kind === "climb" ? route.finale.climb : null;
  const hardestOwn = hardest && hardest !== finaleClimb && hardest !== route.earlyClimb && !route.descentsIntoClimbs.some((d) => d.climb === hardest);
  if (hardest && hardestOwn) {
    out.push({ km: hardest.startKm, what: `${short(hardest)} ${hardest.gainM} m · ${time(hardest)}`, todo: "doortrappen over de top" });
  }
  if (format === "points") {
    const covered = [route.earlyClimb, finaleClimb, hardestOwn ? hardest : null, ...route.descentsIntoClimbs.map((d) => d.climb)];
    const todo = { sprint: "sprinters erop, de rest in het wiel", kom: "klimmers erop, de rest in het wiel", lap: "in de kopgroep blijven: de rondetijd telt" };
    out.push(...scoring(covered, (s) => todo[s.kind]));
  }
  if (route.lastArchKm !== null) out.push({ km: route.lastArchKm, what: "laatste boog", todo: "powerup vóór de boog op" });
  if (route.finale.kind === "climb") {
    const { climb, runInKm } = route.finale;
    out.push({ km: climb.startKm, what: `${climb.name ? short(climb) : "slotklim"} ${climb.gainM} m · ${time(climb)}`, todo: `voluit tot de top${has("veer") ? ", veer aan" : ""}`, key: true });
    if (runInKm >= 0.5) out.push({ km: climb.endKm, what: `nog ${km(runInKm)}`, todo: `sprint uit het wiel${has("aerohelm") ? ", helm op ±200 m" : ""}` });
  } else {
    out.push({ km: Math.max(0, route.totalKm - 0.5), what: "vlakke finish", todo: `wiel, niet als eerste aan${has("aerohelm") ? ", helm op ±200 m" : ""}` });
  }
  return out.sort((a, b) => a.km - b.km);
}
