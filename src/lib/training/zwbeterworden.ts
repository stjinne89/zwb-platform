// "ZWBeterWorden": 5 niveaus afgeleid van de training-readiness (state + score),
// van overtraind (1) tot superfris (5). Gedeeld door de trainingspagina én het
// dashboard-trainingsblok, zodat de niveau-logica/teksten één bron hebben.

import type { IntervalsWellness } from "@/lib/intervals/client";
import {
  summarizeTrainingReadiness,
  summarizeWellness,
  type TrainingReadinessSummary,
  type WellnessDevice,
  type WellnessSummary,
} from "@/lib/training/wellness";

export type ZwbAdvice = {
  level: number;
  title: string;
  description: string;
  pill: string;
  block: string;
};

// Statische opmaak per niveau (titel + kleuren). De teksten staan los, zodat we
// er per niveau 10 varianten van hebben die per dag wisselen.
export const ZWB_LEVEL_META: Record<
  1 | 2 | 3 | 4 | 5,
  { title: string; pill: string; block: string }
> = {
  1: {
    title: "DOE NIKS",
    pill: "bg-destructive/20 text-destructive",
    block: "border border-destructive/40 bg-destructive/10",
  },
  2: {
    title: "RICHT OP HERSTEL",
    pill: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    block: "border border-orange-500/40 bg-orange-500/10",
  },
  3: {
    title: "ALLEEN DUUR",
    pill: "bg-zwb-petrol text-white",
    block: "border border-zwb-petrol/50 bg-zwb-petrol/10",
  },
  4: {
    title: "FRIS GENOEG",
    pill: "bg-zwb-teal text-white",
    block: "border border-zwb-teal/50 bg-zwb-teal/10",
  },
  5: {
    title: "BETER WORDT HET NIET",
    pill: "bg-zwb-gold text-white",
    block: "border border-zwb-gold/50 bg-zwb-gold/10",
  },
};

// 10 varianten per niveau. `{partner}` wordt vervangen door "man"/"vrouw" op
// basis van de ZRL-divisie. Per dag wordt er deterministisch één gekozen.
export const ZWB_LEVEL_DESCRIPTIONS: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    "Je bent aan het overtrainen, geef je {partner} even wat aandacht ofzo.",
    "Je lichaam smeekt om rust. Leg die fiets weg en zak in de bank.",
    "Vandaag geen watt. Helemaal niks. Echt waar.",
    "Je accu is leeg: opladen, niet ontladen.",
    "Trainen heeft nu averechts effect. Doe iets liefs voor je {partner}.",
    "Zelfs de trap op is vandaag al een intervaltraining. Rustig aan.",
    "Je vorm gaat juist omhoog als je nú niets doet.",
    "Stap niet op die fiets, stap op de bank.",
    "Overtraind. Een dag Netflix maakt je sneller dan een rit.",
    "Je bent over je toeren: koffie, krant, klaar.",
  ],
  2: [
    "Ga maar lekker vogeltjes kijken.",
    "Een wandelingetje mag, meer ook echt niet.",
    "Herstel is nu je training. Omarm de luiheid.",
    "Hooguit een rondje uitrollen, en dan bedoel ik écht uitrollen.",
    "Geef je benen een vrije dag, ze hebben het verdiend.",
    "Vandaag is foamrollen je zwaarste oefening.",
    "Rustig aan, morgen is er weer een dag met watt.",
    "Laat de fiets in de schuur en pak een goed boek.",
    "Actief herstel = koffie drinken op een terras.",
    "Bewegen mag, zolang je hartslag het niet doorheeft.",
  ],
  3: [
    "Je mag wel gaan fietsen, maar geen heftige intervallen.",
    "Lekker D2'tje, blijf netjes uit het rood.",
    "Duurtempo vandaag: kletsen met je maatje moet kunnen.",
    "Rustig opbouwen, geen koppositie-onzin.",
    "Houd het gezellig, laat de sprintbordjes links liggen.",
    "Zone 2 is vandaag je beste vriend.",
    "Kilometers maken, geen held uithangen.",
    "Mooi basistempo, bewaar de pijn voor later.",
    "Geen blokjes, gewoon lekker doortrappen.",
    "Endurance-rit: praten moet kunnen, hijgen niet.",
  ],
  4: [
    "Ga er maar lekker op uit en blokjes mogen ook, vergeet de chocomelk niet na afloop.",
    "Je bent fris, gooi er gerust wat intervallen tegenaan.",
    "Goeie dag voor wat pittige blokken. Geniet ervan.",
    "Benen staan goed, je mag best even pijn lijden.",
    "Vandaag mag de hartslag de hoogte in.",
    "Fris genoeg voor een stevige training, ga los.",
    "Tijd om wat scherpte te pakken. En daarna chocomelk.",
    "Je kunt wat hebben vandaag, pak je intervallen.",
    "Lekker knallen mag, maar bewaar nog íets voor morgen.",
    "Goeie vorm, mooie dag om kwaliteit te maken.",
  ],
  5: [
    "Alles mag, probeer die andere ZWB'ers er vandaag maar vanaf te rijden.",
    "Topvorm. Tijd om een Strava-segment te slopen.",
    "Je bent vlamberg-fit, ga PR's stelen.",
    "Vandaag ben jij de sterkste. Laat het zien.",
    "Maximale frisheid: vol gas en geen excuses.",
    "Dit is je dag, jaag op die KOM.",
    "Beter wordt het niet, dus rij iedereen op kop eraf.",
    "Benen van staal vandaag. Gebruik ze.",
    "Pak die kopgroep en kijk niet meer om.",
    "Alles staat groen. Tijd om te schitteren.",
  ],
};

/** Amsterdam-datumsleutel "YYYY-MM-DD" — basis voor de dagelijkse rotatie. */
export function amsterdamDayKey(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

/** Deterministische index 0..len-1 op basis van de dag-sleutel (FNV-1a). */
export function dayIndex(dayKey: string, len: number): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % len;
}

export function zwbeterWordenAdvice(
  summary: TrainingReadinessSummary,
  zrlDivision?: string | null,
  dayKey: string = amsterdamDayKey(),
): ZwbAdvice {
  const score = summary.score;
  // Geslacht-signaal uit de gekozen ZRL-divisie: "women" (Dames) → partner = man.
  const partner = zrlDivision === "women" ? "man" : "vrouw";
  if (summary.state === "unknown" || score == null) {
    return {
      level: 0,
      title: "Nog geen advies",
      description:
        "Deel je herstel-data (slaap/HRV) en koppel intervals.icu, dan verschijnt hier je ZWBeterWorden-advies.",
      pill: "bg-muted text-muted-foreground",
      block: "border bg-background",
    };
  }
  let level: 1 | 2 | 3 | 4 | 5;
  if (summary.state === "recovery") level = score < 25 ? 1 : 2;
  else if (summary.state === "caution") level = score < 58 ? 3 : 4;
  else level = 5;

  const variants = ZWB_LEVEL_DESCRIPTIONS[level];
  const description = variants[dayIndex(dayKey, variants.length)].replace(
    "{partner}",
    partner,
  );
  return { level, ...ZWB_LEVEL_META[level], description };
}

export type ZwbStatus = {
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  eftp: number | null;
  recoverySummary: WellnessSummary | null;
  readiness: TrainingReadinessSummary;
  advice: ZwbAdvice;
};

/**
 * Centraliseert de extractie uit intervals.icu-wellness naar de ZWBeterWorden-
 * status: CTL/ATL/TSB/eFTP + herstel-samenvatting + readiness + advies.
 * `wellnessOptIn` bepaalt of de herstel-data (slaap/HRV/readiness) meeweegt.
 */
export function computeZwbStatus(
  wellness: IntervalsWellness[],
  {
    wellnessOptIn,
    zrlDivision,
    wellnessDevice,
  }: {
    wellnessOptIn: boolean;
    zrlDivision?: string | null;
    wellnessDevice?: WellnessDevice | null;
  },
): ZwbStatus {
  const sorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id));
  const latest = sorted[sorted.length - 1];
  const ctl = latest?.ctl ?? null;
  const atl = latest?.atl ?? null;
  const tsb = ctl != null && atl != null ? ctl - atl : null;
  const eftp = [...sorted].reverse().find((w) => w.eftp)?.eftp ?? null;

  const recoverySummary =
    wellnessOptIn && wellness.length > 0
      ? summarizeWellness(
          wellness.map((w) => ({
            date: w.id,
            resting_hr: w.restingHR ?? null,
            hrv: w.hrv ?? w.hrvSDNN ?? null,
            sleep_secs: w.sleepSecs ?? null,
            sleep_score: w.sleepScore ?? null,
            readiness: w.readiness ?? null,
            fatigue: w.fatigue ?? null,
            stress: w.stress ?? null,
            soreness: w.soreness ?? null,
            mood: w.mood ?? null,
          })),
          wellnessDevice,
        )
      : null;

  const readiness = summarizeTrainingReadiness({ tsb, wellness: recoverySummary });
  const advice = zwbeterWordenAdvice(readiness, zrlDivision);

  return { ctl, atl, tsb, eftp, recoverySummary, readiness, advice };
}
