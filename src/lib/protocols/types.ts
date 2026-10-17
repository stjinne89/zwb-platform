// Een protocol is iets wat je uitvoert: je start het, je krijgt per dag taken en
// je vinkt die af. Daarin verschilt het van een kennisartikel. De inhoud staat in
// code (training.ts, nutrition.ts) zodat elke dosis via een commit gaat; de
// database weet alleen wie welk protocol volgt (0237_member_protocols.sql).

import type { KnowledgeSource } from "@/lib/knowledge/source";
import type { MethodLabel } from "@/lib/training/method-label";

export type ProtocolPillar = "trainen" | "voeden";

export const PROTOCOL_EVIDENCE = ["sterk", "matig", "beperkt"] as const;
export type ProtocolEvidence = (typeof PROTOCOL_EVIDENCE)[number];

export const PROTOCOL_EVIDENCE_LABELS: Record<ProtocolEvidence, string> = {
  sterk: "Sterk bewijs",
  matig: "Matig bewijs",
  beperkt: "Beperkt bewijs",
};

/**
 * Waar de dagen aan hangen. `start`: dag 0 is de eerste dag. `wedstrijd`: dag 0
 * is de wedstrijddag en dag -3 drie dagen ervoor.
 */
export type ProtocolAnchor = "start" | "wedstrijd";

/** Een dosis per kg lichaamsgewicht; de app rekent hem om met het gewicht van het lid. */
export type ProtocolDose = {
  perKg: { min: number; max: number };
  unit: "mg" | "g" | "ml";
  /** Afronden op deze stap, in `unit`. */
  step: number;
  /** Nooit meer dan dit, in `unit`, ook bij een hoog gewicht. */
  max: number;
};

export type ProtocolTask = {
  /** Uniek binnen het protocol; zo staat hij in member_protocol_checks. */
  key: string;
  label: string;
  detail: string;
  dose?: ProtocolDose;
  /** Zoveel keer per week; de taak blijft staan tot dat aantal is afgevinkt. */
  perWeek?: number;
  /** Eén keer in de hele fase; de taak blijft staan tot hij is afgevinkt. */
  once?: boolean;
  /**
   * Hittesessie die een CORE-sensor kan bevestigen: zoveel minuten op of boven
   * CORE_THRESHOLD_C en de app vinkt hem af (core-temperature.ts).
   */
  coreMinutes?: number;
  /** Zoveel minuten fietsen schrijft de hittesessie voor; de analyse toetst eraan. */
  rideMinutes?: number;
};

export type ProtocolPhase = {
  key: string;
  title: string;
  /** Dagnummers ten opzichte van het anker, beide inclusief. */
  fromDay: number;
  toDay: number;
  tasks: ProtocolTask[];
};

export type Protocol = {
  slug: string;
  pillar: ProtocolPillar;
  /** Kopje in de lijst, bv. "Hitte" of "Op de wedstrijddag". */
  group: string;
  title: string;
  /** Kort label in de agenda van het schema. */
  shortLabel: string;
  summary: string;
  /** Waarvoor het werkt, in één zin. */
  goal: string;
  evidence: ProtocolEvidence;
  /**
   * Veelbelovend of experimenteel: het effect op prestatie staat nog niet vast
   * (docs/trainingsmethodes-onderzoek-2026-10-16.md). Staat naast het
   * bewijsniveau, dat zegt hoeveel onderzoek er is.
   */
  methodLabel?: MethodLabel;
  anchor: ProtocolAnchor;
  phases: ProtocolPhase[];
  /** Waar je op let tijdens het protocol. */
  cautions: string[];
  /** Wanneer je het niet doet. */
  notFor: string[];
  /** Wat het onderzoek níét laat zien, of wat een eigen keuze van ZWB is. */
  limits: string[];
  /**
   * Staat als markering in de agenda van het schema. Alleen voor protocollen
   * die aan dagen vastzitten (hitte, de wedstrijddag); een dagelijkse pil of
   * ademtrainer zou de agenda alleen vullen.
   */
  calendar?: boolean;
  /** Supplementen: niet te starten onder deze leeftijd (AIS-framework). */
  minAge?: number;
  sources: KnowledgeSource[];
  /** Kennisartikel met de achtergrond. */
  article?: { href: string; title: string };
  /**
   * Wat de AI-generator moet weten zolang het protocol loopt. Alleen bij
   * trainingsprotocollen die het schema raken.
   */
  aiHint?: string;
  /**
   * Laat op de protocolpagina de eigen metingen zien. "duurtest": de
   * ontkoppeling uit de geplande Duurtest (durability-test.ts).
   */
  measure?: "duurtest";
};

/** Een rij uit member_protocols, zoals de app hem gebruikt. */
export type ProtocolRun = {
  id: string;
  protocolSlug: string;
  startDate: string;
  raceDate: string | null;
  status: "actief" | "gestopt" | "afgerond";
};

export type ProtocolCheck = { protocolId: string; day: string; taskKey: string };

/** Een rit met kerntemperatuur uit member_protocol_core_sessions (0238). */
export type ProtocolCoreSession = {
  protocolId: string;
  day: string;
  intervalsId: string;
  maxC: number;
  minutesAbove: number;
  /** Uit 0239; null bij een rit die eerder werd gemeten. */
  rideMinutes: number | null;
  minutesToThreshold: number | null;
  coveragePct: number | null;
  /** De app vinkte de sessie af. */
  autoChecked: boolean;
};
