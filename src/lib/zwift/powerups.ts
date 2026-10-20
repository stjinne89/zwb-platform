// Welke powerups een Zwift-event uitdeelt, uit `rulesSet` en `tags` van de API.
//
// De tag `powerup_percent="0,50,8,50"` is een lijst van paren *nummer, kans*.
// Zwift publiceert die nummering niet; dit is de nummering van de community
// (zwift-offline). 2, 3 en 10 zijn XP en dergelijke en tellen niet mee. Zie
// docs/zwift-race-opzet-spike.md.

export type ZwiftPowerup = "feather" | "draft" | "burrito" | "aero" | "ghost" | "steamroller" | "anvil";

const NUMBERS: Record<number, ZwiftPowerup> = {
  0: "feather",
  1: "draft",
  4: "burrito",
  5: "aero",
  6: "ghost",
  7: "steamroller",
  8: "anvil",
};

export const ZWIFT_POWERUP_LABELS: Record<ZwiftPowerup, string> = {
  feather: "Veer",
  draft: "Draft boost",
  burrito: "Burrito",
  aero: "Aerohelm",
  ghost: "Spook",
  steamroller: "Stoomwals",
  anvil: "Aambeeld",
};

export type PowerupChance = { powerup: ZwiftPowerup; percent: number };

/**
 * De verdeling uit `powerup_percent`, in de volgorde van de tag. Null als het
 * event die tag niet heeft: dan deelt Zwift zijn standaardmix uit.
 */
export function powerupChances(tags: unknown): PowerupChance[] | null {
  if (!Array.isArray(tags)) return null;
  const tag = tags.map(String).find((item) => item.split("=")[0].trim().toLowerCase() === "powerup_percent");
  if (!tag) return null;
  const numbers = (tag.split("=")[1] ?? "")
    .replace(/["']/g, "")
    .split(",")
    .map((value) => Number(value.trim()));
  const out: PowerupChance[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const powerup = NUMBERS[numbers[i]];
    if (powerup && numbers[i + 1] > 0 && !out.some((item) => item.powerup === powerup)) {
      out.push({ powerup, percent: numbers[i + 1] });
    }
  }
  return out;
}

/** Of het event powerups uitzet (`NO_POWERUPS` of de tag `disable powerups`). */
export function powerupsDisabled(rules: unknown, tags: unknown): boolean {
  const ruleList = Array.isArray(rules) ? rules.map((rule) => String(rule).toUpperCase()) : [];
  const tagList = Array.isArray(tags) ? tags.map((tag) => String(tag).trim().toLowerCase()) : [];
  return ruleList.includes("NO_POWERUPS") || tagList.some((tag) => tag.split("=")[0].trim() === "disable powerups");
}

export type EventPowerups =
  | { kind: "none" }
  | { kind: "standard" }
  | { kind: "custom"; chances: PowerupChance[] };

/**
 * Wat een lid op de eventpagina ziet. Null als het niet vast te stellen is:
 * regels nog niet opgehaald, of een (ploegen)tijdrit of event zonder slipstream
 * zonder expliciete regel. Op productie (20 oktober 2026) had elke tijdrit
 * NO_POWERUPS, maar de ploegentijdritten hadden regel noch tag; daar gokken we niet.
 */
export function eventPowerups(input: {
  eventType: string | null;
  rules: string[] | null;
  tags: string[] | null;
}): EventPowerups | null {
  if (input.rules === null) return null;
  if (powerupsDisabled(input.rules, input.tags)) return { kind: "none" };
  const noDrafting = input.rules.some((rule) => rule.toUpperCase() === "NO_DRAFTING");
  const chances = powerupChances(input.tags);
  if (chances) {
    const usable = chances.filter((item) => !(noDrafting && item.powerup === "draft"));
    return usable.length > 0 ? { kind: "custom", chances: usable } : { kind: "none" };
  }
  const type = (input.eventType ?? "").toUpperCase();
  if (type === "TIME_TRIAL" || type === "TEAM_TIME_TRIAL" || noDrafting) return null;
  return { kind: "standard" };
}
