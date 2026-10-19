// De tekst van de coach in het weekoverzicht: de opdracht aan de AI en de
// tekst uit vaste regels als de AI er niet is.
//
// De AI-tekst komt alleen voor leden die ZWBeter al voor hun training gebruiken
// (een doel of een schema). Hun trainingsdata gaat al naar OpenAI bij elke
// schemageneratie en in de coachchat; voor de rest blijft het bij de tekst uit
// regels, zodat er geen nieuwe gegevens van hen naar OpenAI gaan.
//
// Puur.

import { cleanAiText, HUMAN_WRITING_RULES } from "@/lib/ai-writing";
import { durationWords, type FormSection, type NextWeek, type WeekSummary } from "@/lib/weekly-review/summary";

export const WEEK_COACH_PROMPT = `Je bent de ZWB-coach van wielervereniging ZWB. Je schrijft het korte oordeel
in het weekoverzicht dat een lid op zondagavond ziet.

Je krijgt \`week\`: wat het lid de afgelopen week deed (ritten, schema, vorm, vermogen,
teams, voeding en core, club). Een ontbrekend onderdeel gebruikte het lid niet; noem het dan niet.
En \`volgendeWeek\`: beschikbaarheid per dag in minuten, geplande trainingen en events.

Het lid zag de cijfers van de week al op de schermen hiervoor. Zet ze niet opnieuw op een rij.
Zeg wat ze betekenen: wat er opviel, wat er niet liep (zonder te preken), en waar het lid
volgende week op moet letten. Gebruik hooguit één cijfer, alleen als het iets uitlegt.
Drie of vier zinnen, samen hooguit 60 woorden. Niet altijd in die volgorde.

Regels:
- Spreek het lid aan met je. Nederlands, informeel.
- Verzin niets: alleen wat je krijgt.
- Zet precies één kort zinsdeel tussen dubbele sterretjes, zo: **312 W is een nieuwe grens**.
  Een feit, geen compliment.
- Geen opsomming, geen kop, geen aanhef, geen afsluitende groet, geen emoji.
- Geen medisch advies. Noem geen andere leden.

${HUMAN_WRITING_RULES}`;

/**
 * "ZRL 2026/27 · R1 · W5 · Bdev" wordt "ZRL-race": zo zegt een renner het. De
 * AI nam de volle titel anders letterlijk over, met seizoen en ronde erbij.
 */
export function spokenEvent(title: string): string {
  if (/^ZRL\b/i.test(title.trim())) return "ZRL-race";
  return title.split(" · ")[0].trim();
}

/** Vorm in woorden: met de getallen erbij schreef de AI "TSB -47,5". */
export function formWords(form: FormSection): { fitheid: string; frisheid: string | null } {
  const change = form.ctlStart == null ? 0 : form.ctlEnd - form.ctlStart;
  const fitheid = change >= 1 ? "fitter geworden" : change <= -1 ? "wat fitheid verloren" : "gelijk gebleven";
  const tsb = form.tsbEnd;
  const frisheid =
    tsb == null ? null : tsb > 5 ? "fris" : tsb >= -10 ? "in balans" : tsb >= -30 ? "moe" : "erg moe, de vermoeidheid stapelt zich op";
  return { fitheid, frisheid };
}

/** Wat er naar de AI gaat: geen naam, vorm in woorden, events zoals je ze zegt. */
export function coachInput(summary: WeekSummary, next: NextWeek | null): string {
  const rest: Partial<WeekSummary> = { ...summary };
  delete rest.firstName;
  delete rest.version;
  delete rest.form;
  const { form, teams } = summary;
  const week = {
    ...rest,
    vorm: form ? formWords(form) : null,
    teams: teams
      ? {
          ...teams,
          results: teams.results.map((result) => ({ ...result, event: spokenEvent(result.event) })),
          src: teams.src.map((result) => ({ ...result, event: spokenEvent(result.event) })),
        }
      : null,
  };
  const volgendeWeek = next
    ? next.days.map((day) => ({
        dag: day.day,
        minuten: day.minutes,
        training: day.plan,
        events: day.events.map((event) => ({ titel: spokenEvent(event.title), status: event.status })),
      }))
    : null;
  return JSON.stringify({ week, volgendeWeek }, null, 1);
}

/**
 * De AI-tekst klaar voor het scherm: de vaste AI-tekens eruit, en als het model
 * toch meer dan één stuk vet gaf, alleen het eerste houden.
 */
export function finishCoachText(text: string): string {
  let seen = 0;
  return cleanAiText(text).replace(/\*\*(.+?)\*\*/g, (whole, inner: string) => (++seen === 1 ? whole : inner));
}

const plural = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} uur` : `${h}:${String(m).padStart(2, "0")} uur`;
}

/**
 * Het oordeel uit vaste regels. Kort, met hooguit één kernzin tussen sterretjes,
 * net als de AI-tekst, zodat het scherm er hetzelfde uitziet.
 */
export function fallbackCoachText(summary: WeekSummary, next: NextWeek | null): string {
  const parts: string[] = [];
  const { rides, plan, power, form, teams } = summary;

  if (power?.record) {
    parts.push(`**${power.record.watts} W over ${durationWords(power.record.seconds)} is je beste van het afgelopen jaar.**`);
  } else if (teams?.results[0]) {
    const result = teams.results[0];
    parts.push(`**${result.team} werd ${result.rank}e in de ${spokenEvent(result.event)}.**`);
  } else if (rides) {
    parts.push(`**${plural(rides.count, "rit", "ritten")}, ${Math.round(rides.km)} km.**`);
  }

  if (plan) {
    const missed = plan.perDay.filter((day) => day.status === "gemist").length;
    if (plan.done === plan.planned && plan.planned > 0) {
      parts.push(`Je deed alle ${plan.planned} trainingen uit je schema.`);
    } else {
      const left = missed === 0 ? "" : missed === 1 ? " Eén bleef liggen." : ` ${missed} bleven liggen.`;
      parts.push(`Je deed ${plan.done} van de ${plan.planned} trainingen uit je schema.${left}`);
    }
  }

  if (form?.ctlStart != null && form.ctlEnd !== form.ctlStart) {
    const diff = Math.round(form.ctlEnd - form.ctlStart);
    if (diff !== 0) parts.push(`Je fitness ging van ${Math.round(form.ctlStart)} naar ${Math.round(form.ctlEnd)}.`);
  }

  if (next) {
    const total = next.days.reduce((sum, day) => sum + day.minutes, 0);
    const firstEvent = next.days.flatMap((day) => day.events).find((event) => event.status === "opgesteld" || event.status === "aangemeld");
    if (firstEvent) parts.push(`Volgende week staat de ${spokenEvent(firstEvent.title)} klaar. Je hebt ${hours(total)} opgegeven.`);
    else if (total > 0) parts.push(`Volgende week heb je ${hours(total)} opgegeven.`);
  }

  return parts.slice(0, 4).join(" ");
}

/** Splitst een tekst op **kernzin** in stukken voor de weergave. */
export function emphasisParts(text: string): Array<{ text: string; strong: boolean }> {
  const out: Array<{ text: string; strong: boolean }> = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index), strong: false });
    out.push({ text: match[1], strong: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), strong: false });
  return out;
}
