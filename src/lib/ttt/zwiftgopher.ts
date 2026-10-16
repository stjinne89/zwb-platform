// Het TTT-plan wordt gemaakt op zwiftgopher.com/TTT. ZWB geeft de Zwift-ID's
// mee en neemt het plan terug over uit Export JSON, Export Link of Export Text.

import type { TttPlanRiderInput } from "@/lib/ttt/types";

export const ZWIFTGOPHER_TTT_URL = "https://www.zwiftgopher.com/TTT/";

function numericZwiftId(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return /^[0-9]+$/.test(trimmed) ? trimmed : null;
}

/**
 * De Zwift-ID's in planvolgorde, één per regel, om te plakken in het vak
 * "Zwift IDs" op zwiftgopher.com/TTT. `missing` noemt wie geen (numeriek)
 * Zwift-ID heeft.
 */
export function zwiftIdExport(
  riders: Array<Pick<TttPlanRiderInput, "name" | "displayOrder"> & { zwiftId: string | null }>,
) {
  const ids: string[] = [];
  const missing: string[] = [];
  for (const rider of riders.slice().sort((a, b) => a.displayOrder - b.displayOrder)) {
    const zwiftId = numericZwiftId(rider.zwiftId);
    if (!zwiftId) missing.push(rider.name.trim() || "Naamloos");
    else if (!ids.includes(zwiftId)) ids.push(zwiftId);
  }
  return { text: ids.join("\n"), count: ids.length, missing };
}

export type GopherPlanRider = {
  order: number;
  name: string;
  zwiftId: string | null;
  ftpWatts: number | null;
  weightKg: number | null;
  heightCm: number | null;
  power300Watts: number | null;
  pullWatts: number | null;
  pullSeconds: number;
  /** Intensity factor in procenten, zoals ZwiftGopher hem toont. */
  intensityFactor: number | null;
};

export type GopherPlan = {
  format: "json" | "text";
  teamName: string | null;
  /** Doelsnelheid op het vlakke; geen verwacht gemiddelde. */
  targetSpeedKmh: number | null;
  intensity: number | null;
  efficiency: number | null;
  riders: GopherPlanRider[];
};

/** Getal uit "316", "316.5", "316 W" of "30s"; anders null. */
function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*[a-z%]*\s*$/i.exec(String(value ?? ""));
  return match ? Number(match[1].replace(",", ".")) : null;
}

function positive(value: unknown) {
  const n = number(value);
  return n != null && n > 0 ? n : null;
}

/** Seconden uit "45", "45s" of "1:30". */
function seconds(value: unknown) {
  const clock = /^\s*(\d+):([0-5]\d)\s*$/.exec(String(value ?? ""));
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const n = number(value);
  return n != null && n >= 0 ? Math.round(n) : null;
}

/** Teamtags zoals "[ZWB]" en "(ZWB)" staan al in de teamnaam. */
function cleanName(name: string) {
  const clean = name.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return clean || name.trim();
}

function checkRiders(riders: GopherPlanRider[]) {
  if (riders.length === 0) throw new Error("Geen renners gevonden in de export.");
  if (!riders.some((rider) => rider.pullSeconds > 0)) {
    throw new Error("Geen enkele renner heeft een kopbeurt.");
  }
  return riders;
}

/**
 * Export JSON van zwiftgopher.com/TTT (gemeten 2026-10-13, versie 1.14.0):
 * `riders` is een object per Zwift-ID met `name`, `order` (vanaf 0),
 * `pull_power`, `pull_duration`, `ftp`, `weight`, `height`, `wkg300` (in watt,
 * ondanks de naam) en `IF` in procenten. Getallen staan er soms als tekst in.
 */
function parseGopherJson(data: Record<string, unknown>): GopherPlan {
  const rows = Object.entries(data.riders as Record<string, unknown>)
    .filter((entry): entry is [string, Record<string, unknown>] =>
      typeof entry[1] === "object" && entry[1] !== null,
    )
    .sort(([, a], [, b]) => Number(a.order ?? 0) - Number(b.order ?? 0));

  const riders = rows.map(([key, rider], index): GopherPlanRider => {
    const name = cleanName(String(rider.name || rider.alt_name || ""));
    if (!name) throw new Error(`Renner ${index + 1} heeft geen naam.`);
    const pullWatts = positive(rider.pull_power);
    const power300 = positive(rider.wkg300);
    const intensityFactor = positive(rider.IF);
    return {
      order: index + 1,
      name,
      zwiftId: numericZwiftId(key) && rider.zr !== false ? key : null,
      ftpWatts: positive(rider.ftp),
      weightKg: positive(rider.weight),
      heightCm: positive(rider.height),
      power300Watts: power300 ? Math.round(power300) : null,
      pullWatts: pullWatts ? Math.round(pullWatts) : null,
      pullSeconds: seconds(rider.pull_duration) ?? 0,
      intensityFactor: intensityFactor ? Math.round(intensityFactor * 10) / 10 : null,
    };
  });

  const team = data.team as { name?: unknown } | undefined;
  const intensity = number(data.intensity);
  const efficiency = number(data.efficiency);
  return {
    format: "json",
    teamName: typeof team?.name === "string" && team.name.trim() ? team.name.trim() : null,
    targetSpeedKmh: positive(data.target_speed),
    intensity: intensity != null ? Math.round(intensity) : null,
    efficiency: efficiency != null ? Math.round(efficiency) : null,
    riders: checkRiders(riders),
  };
}

/**
 * Export Text: per renner naam, kopbeurtvermogen, kopbeurtduur en kitkleuren,
 * gescheiden door tab, komma of pipe, met of zonder kopregel (instellingen op
 * zwiftgopher.com/TTT). Regels zonder vermogen en duur, zoals de kopregel,
 * worden overgeslagen. Een volgnummer vooraan mag. Is de vierde kolom een getal
 * in plaats van een kleur, dan is dat de IF in procenten (zo zet de herkende
 * afbeelding hem in het importvak).
 */
function parseGopherText(text: string): GopherPlan {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const delimiter = lines.some((line) => line.includes("\t"))
    ? "\t"
    : lines.some((line) => line.includes("|"))
      ? "|"
      : ",";

  const riders: GopherPlanRider[] = [];
  for (const line of lines) {
    let cells = line.split(delimiter).map((cell) => cell.trim());
    if (/^\d+\.?$/.test(cells[0] ?? "") && number(cells[1]) == null) cells = cells.slice(1);
    if (cells.length < 3 || !cells[0]) continue;
    const watts = positive(cells[1]);
    const duration = seconds(cells[2]);
    if (watts == null && duration == null) continue;
    const intensityFactor = /^\d+(?:[.,]\d+)?$/.test(cells[3] ?? "") ? positive(cells[3]) : null;
    riders.push({
      order: riders.length + 1,
      name: cleanName(cells[0]),
      zwiftId: null,
      ftpWatts: null,
      weightKg: null,
      heightCm: null,
      power300Watts: null,
      pullWatts: watts ? Math.round(watts) : null,
      pullSeconds: duration ?? 0,
      intensityFactor,
    });
  }

  return {
    format: "text",
    teamName: null,
    targetSpeedKmh: null,
    intensity: null,
    efficiency: null,
    riders: checkRiders(riders),
  };
}

/** Het plan uit de JSON of de tekst die ZwiftGopher exporteert. */
export function parseGopherExport(input: string): GopherPlan {
  const text = input.replace(/^﻿/, "").trim();
  if (!text) throw new Error("Plak eerst een export uit ZwiftGopher.");
  if (text.startsWith("{")) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Dit is geen geldige JSON.");
    }
    const riders = (data as Record<string, unknown> | null)?.riders;
    if (typeof riders !== "object" || !riders || Array.isArray(riders)) {
      throw new Error("Dit is geen export van ZwiftGopher.");
    }
    return parseGopherJson(data as Record<string, unknown>);
  }
  return parseGopherText(text);
}

const GOPHER_HOSTS = ["zwiftgopher.com", "www.zwiftgopher.com"];

/**
 * Van Export Link (of het adres dat Export JSON opent) naar het JSON-adres, of
 * null als de invoer geen link van ZwiftGopher is. Alleen dat adres: de server
 * haalt geen willekeurige URL op.
 */
export function gopherJsonUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const save = url.searchParams.get("save");
  if (!GOPHER_HOSTS.includes(url.hostname) || !/^\/TTT\/?$/.test(url.pathname) || !save) {
    return null;
  }
  return `${ZWIFTGOPHER_TTT_URL}?save=${encodeURIComponent(save)}&json=true`;
}

/** Lijkt de invoer op een link? Dan moet het een link van ZwiftGopher zijn. */
export function looksLikeUrl(input: string) {
  return /^https?:\/\//i.test(input.trim());
}
