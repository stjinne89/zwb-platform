// Een verzonnen race voor ZWB DS in het designvoorbeeld: 40 km met twee
// klimmen, een kopgroep, een achtervolging, het peloton en een paar lossers.

import { buildField, type DsEntrant, type DsMark } from "@/lib/ds/field";
import type { DsView } from "@/lib/ds/snapshot";

const NOW = Date.UTC(2026, 9, 20, 18, 31, 0);
const ROUTE_M = 40_000;

function altitude(m: number) {
  const km = m / 1000;
  const climb = (from: number, to: number, rise: number) =>
    km <= from ? 0 : km >= to ? rise : (rise * (km - from)) / (to - from);
  const descent = (from: number, to: number, drop: number) =>
    km <= from ? 0 : km >= to ? -drop : (-drop * (km - from)) / (to - from);
  return (
    12 +
    4 * Math.sin(km / 1.7) +
    climb(11.8, 14.2, 118) +
    descent(14.6, 17.5, 112) +
    climb(29.6, 31.4, 64) +
    descent(32, 34, 60)
  );
}

const distanceM = Array.from({ length: 401 }, (_, i) => (i * ROUTE_M) / 400);
const altitudeM = distanceM.map((m) => Math.round(altitude(m) * 10) / 10);

function gradeAt(m: number) {
  return ((altitude(m + 50) - altitude(m - 50)) / 100) * 100;
}

const MARKS: DsMark[] = [
  { name: "Fox Hill", atM: 14_200 },
  { name: "Village Sprint", atM: 18_400 },
  { name: "Fox Hill", atM: 31_400 },
];

type Seed = { name: string; at: number; kmh: number; w: number; kg: number; zwb?: boolean; age?: number; draft?: number; rpm?: number };

const SEEDS: Seed[] = [
  // Kopgroep op de afdaling naar de sprint.
  { name: "Lars Hendriks", at: 16_420, kmh: 52, w: 210, kg: 72 },
  { name: "Tomás Ruiz [CRC]", at: 16_412, kmh: 52, w: 180, kg: 68, draft: 140 },
  { name: "Joost Bakker", at: 16_405, kmh: 51, w: 160, kg: 80, draft: 160 },
  { name: "Ilse Smit [ZWB]", at: 16_398, kmh: 51, w: 150, kg: 61, zwb: true, draft: 170, rpm: 92 },
  { name: "Mark Visser", at: 16_390, kmh: 51, w: 230, kg: 77, draft: 90 },
  // Achtervolging, nog op de top.
  { name: "Ben Okafor", at: 15_020, kmh: 34, w: 330, kg: 74, age: 12 },
  { name: "Jij [ZWB]", at: 15_010, kmh: 33, w: 300, kg: 70, zwb: true, age: 6, draft: 60, rpm: 88 },
  { name: "Pieter de Wit", at: 15_000, kmh: 33, w: 310, kg: 82, age: 12 },
  { name: "Sanne Mulder", at: 14_985, kmh: 32, w: 250, kg: 59, age: 12 },
  // Peloton op de klim.
  ...Array.from({ length: 14 }, (_, i): Seed => ({
    name: ["Kees", "Ruben", "Femke", "Daan", "Noor", "Sem", "Mila", "Thijs", "Eva", "Bram", "Lotte", "Jesse", "Fleur", "Niels"][i] + " " + ["Jansen", "de Boer", "Peters", "Vos", "Dekker", "Meijer", "Bos", "Kok", "Smits", "de Graaf", "Hoek", "Prins", "Brouwer", "Kuipers"][i],
    at: 13_620 - i * 6,
    kmh: 19,
    w: 260 + ((i * 37) % 70),
    kg: 64 + ((i * 7) % 22),
    age: 20 + ((i * 11) % 25),
  })),
  { name: "Wim Ahmadi [ZWB]", at: 13_590, kmh: 19, w: 270, kg: 78, zwb: true, age: 18, draft: 30, rpm: 79 },
  // Lossers.
  { name: "Rik Veenstra", at: 12_900, kmh: 15, w: 220, kg: 90, age: 40 },
  { name: "Anouk Bosman", at: 12_420, kmh: 14, w: 170, kg: 62, age: 33 },
];

const entrants: DsEntrant[] = [
  ...SEEDS.map((seed, i) => ({
    zwiftId: String(1000 + i),
    name: seed.name,
    zwb: Boolean(seed.zwb),
    weightKg: seed.kg,
    sample: {
      stateAt: NOW - (seed.age ?? 8) * 1000,
      eventDistanceM: seed.at - ((seed.kmh / 3.6) * (seed.age ?? 8)),
      speedKmh: seed.kmh,
      power: seed.w,
      cadenceRpm: seed.rpm ?? 85,
      draft: seed.draft ?? 40,
      elapsedS: 1_560,
      kj: (seed.w * 0.86 * 1_560) / 1000,
    },
  })),
  { zwiftId: "2000", name: "Carla Dijkman [ZWB]", zwb: true, weightKg: 66, sample: null },
];

const field = buildField(entrants, { now: NOW, routeM: ROUTE_M, marks: MARKS, gradeAt });

export const DS_VOORBEELD: DsView = {
  event: { id: "voorbeeld", title: "ZRL ronde 2 · Bdev", zrlLiveHref: "#" },
  subgroups: [
    { id: "a", label: "A", riders: 31, zwb: 0 },
    { id: "b", label: "B", riders: SEEDS.length + 1, zwb: 4 },
    { id: "c", label: "C", riders: 42, zwb: 2 },
  ],
  subgroup: { id: "b", label: "B", startAt: NOW - 26 * 60 * 1000 },
  field,
  profile: { distanceM, altitudeM },
  focusId: "1006",
  zwbUnseen: ["Carla Dijkman [ZWB]"],
  now: NOW,
  live: true,
  newestStateAt: NOW - 6000,
  problem: null,
};
