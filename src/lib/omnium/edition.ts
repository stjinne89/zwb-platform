// Genereert één complete Omnium-editie uit één formulier.
//
// Zelfde gedachte als generateZrlRound in src/lib/teams/zrl-season.ts: de
// structuur is een patroon, dus die hoeft niemand vier keer over te typen. Uit
// één datum, één starttijd en de duur per onderdeel volgen de vier starttijden,
// het kalenderitem van negentig minuten en de recon-rit.
//
// Dit vervangt het handwerk dat op de statische site nodig was: daar stond één
// editie verspreid over zeven HTML-bestanden, met als resultaat dat drie
// pagina's het oneens waren over welke routes er gereden werden.

import { amsterdamWallTimeToIso } from "@/lib/birthdays";
import type { Discipline } from "@/lib/omnium/scoring";

export type OmniumPartSpec = {
  discipline: Discipline;
  title: string;
  routeName?: string;
  routeUrl?: string;
  world?: string;
  distanceKm?: number;
  laps?: number;
  durationMinutes: number;
  /** Pauze ná dit onderdeel. */
  breakMinutes: number;
  zwiftEventId?: string;
  /** Aantal FAL-tussensprints; alleen zinvol bij de Crit Royale. */
  sprintCount?: number;
  drafting?: boolean;
  bikeRule?: string;
};

export type OmniumEditionSpec = {
  seasonSlug: string;
  number: number;
  slug: string;
  title: string;
  subtitle?: string;
  /** yyyy-mm-dd. */
  dateKey: string;
  /** Lokale starttijd van het eerste onderdeel, "11:00". */
  firstStartLocal: string;
  preshowMinutesBefore?: number;
  reconDateKey?: string;
  reconTimeLocal?: string;
  reconZwiftEventId?: string;
  parts: OmniumPartSpec[];
};

export type GeneratedOmniumPart = OmniumPartSpec & {
  orderIndex: number;
  startAtIso: string;
};

export type GeneratedCalendarEvent = {
  title: string;
  type: "omnium";
  startAtIso: string;
  endAtIso: string;
};

export type GeneratedOmniumEdition = {
  parts: GeneratedOmniumPart[];
  startAtIso: string;
  endAtIso: string;
  preshowAtIso: string | null;
  totalMinutes: number;
  calendarEvent: GeneratedCalendarEvent;
  reconEvent: GeneratedCalendarEvent | null;
};

const REQUIRED_DISCIPLINES: Discipline[] = [
  "prologue",
  "scratch",
  "sprint",
  "crit",
];

/**
 * De standaardopzet: vier onderdelen met pauzes ertussen, samen negentig
 * minuten. De duur per onderdeel is een startpunt, geen wet — een editie mag
 * afwijken zolang het totaal klopt met wat er is aangekondigd.
 */
export const DEFAULT_OMNIUM_PARTS: OmniumPartSpec[] = [
  {
    discipline: "prologue",
    title: "The Prologue",
    durationMinutes: 15,
    breakMinutes: 5,
    drafting: false,
  },
  {
    discipline: "scratch",
    title: "The Spicy Scratch",
    durationMinutes: 25,
    breakMinutes: 5,
    drafting: true,
  },
  {
    discipline: "sprint",
    title: "Sprint Quali",
    durationMinutes: 15,
    breakMinutes: 5,
    drafting: true,
  },
  {
    discipline: "crit",
    title: "Crit Royale",
    durationMinutes: 20,
    breakMinutes: 0,
    drafting: true,
    sprintCount: 3,
  },
];

export function validateEditionSpec(spec: OmniumEditionSpec): string[] {
  const errors: string[] = [];
  if (!spec.seasonSlug.trim()) errors.push("Kies een seizoen.");
  if (!Number.isInteger(spec.number) || spec.number < 1) {
    errors.push("Vul een editienummer van 1 of hoger in.");
  }
  if (!spec.slug.trim()) errors.push("Vul een slug in voor de editie-URL.");
  if (!spec.title.trim()) errors.push("Vul een titel in.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.dateKey)) {
    errors.push("Vul een geldige datum in.");
  }
  if (!/^\d{2}:\d{2}$/.test(spec.firstStartLocal)) {
    errors.push("Vul een starttijd in als 11:00.");
  }

  const disciplines = spec.parts.map((part) => part.discipline);
  for (const discipline of REQUIRED_DISCIPLINES) {
    if (!disciplines.includes(discipline)) {
      errors.push(`Onderdeel ontbreekt: ${discipline}.`);
    }
  }
  if (new Set(disciplines).size !== disciplines.length) {
    errors.push("Elk onderdeel mag maar één keer voorkomen.");
  }
  for (const part of spec.parts) {
    if (!part.title.trim()) {
      errors.push(`Vul een titel in voor ${part.discipline}.`);
    }
    if (!Number.isInteger(part.durationMinutes) || part.durationMinutes < 1) {
      errors.push(`Vul een duur in voor ${part.discipline}.`);
    }
    if (!Number.isInteger(part.breakMinutes) || part.breakMinutes < 0) {
      errors.push(`Vul een geldige pauze in na ${part.discipline}.`);
    }
  }

  if (spec.reconDateKey && !/^\d{4}-\d{2}-\d{2}$/.test(spec.reconDateKey)) {
    errors.push("Vul een geldige datum in voor de recon-rit.");
  }
  if (spec.reconDateKey && !/^\d{2}:\d{2}$/.test(spec.reconTimeLocal ?? "")) {
    errors.push("Vul een tijd in voor de recon-rit.");
  }

  return errors;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * Berekent de vier starttijden cumulatief. amsterdamWallTimeToIso houdt de
 * zomer-/wintertijd bij, wat hier echt uitmaakt: de oktober-editie valt nog in
 * zomertijd en de rest niet, terwijl 11:00 lokaal 11:00 lokaal moet blijven.
 */
export function generateEdition(
  spec: OmniumEditionSpec,
): GeneratedOmniumEdition | null {
  if (validateEditionSpec(spec).length > 0) return null;

  const startAtIso = amsterdamWallTimeToIso(spec.dateKey, spec.firstStartLocal);
  if (!startAtIso) return null;

  const ordered = REQUIRED_DISCIPLINES.map(
    (discipline) => spec.parts.find((part) => part.discipline === discipline)!,
  );

  const parts: GeneratedOmniumPart[] = [];
  let cursor = startAtIso;
  let totalMinutes = 0;
  ordered.forEach((part, index) => {
    parts.push({ ...part, orderIndex: index + 1, startAtIso: cursor });
    const consumed = part.durationMinutes + part.breakMinutes;
    totalMinutes += index === ordered.length - 1 ? part.durationMinutes : consumed;
    cursor = addMinutes(cursor, consumed);
  });

  const endAtIso = addMinutes(startAtIso, totalMinutes);
  const preshowMinutes = spec.preshowMinutesBefore ?? 0;
  const preshowAtIso = preshowMinutes
    ? addMinutes(startAtIso, -preshowMinutes)
    : null;

  const calendarEvent: GeneratedCalendarEvent = {
    title: `${spec.title} — ZWB Omnium ${spec.number}`,
    type: "omnium",
    // De voorbeschouwing hoort bij het kalenderitem: wie meekijkt begint eerder
    // dan wie meerijdt.
    startAtIso: preshowAtIso ?? startAtIso,
    endAtIso,
  };

  let reconEvent: GeneratedCalendarEvent | null = null;
  if (spec.reconDateKey && spec.reconTimeLocal) {
    const reconStart = amsterdamWallTimeToIso(
      spec.reconDateKey,
      spec.reconTimeLocal,
    );
    if (reconStart) {
      reconEvent = {
        title: `Recon — ${spec.title}`,
        type: "omnium",
        startAtIso: reconStart,
        endAtIso: addMinutes(reconStart, 60),
      };
    }
  }

  return {
    parts,
    startAtIso,
    endAtIso,
    preshowAtIso,
    totalMinutes,
    calendarEvent,
    reconEvent,
  };
}
