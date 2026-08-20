import { describe, expect, it } from "vitest";
import {
  CAUTION_PREFIX,
  cautionsFromSummary,
  MEMBER_CAUTION_LIMIT,
  memberCautions,
  summaryWithoutCautions,
} from "@/lib/training/plan-summary";

// Zoals createPlanFromAiGeneration() hem samenstelt: omschrijving, lege regel,
// dan elke caution als eigen alinea.
const summary = [
  "Concept-bijwerking: verder bouwen aan FTP binnen de huidige beschikbaarheid.",
  `${CAUTION_PREFIX}De eerste dagen zijn bewust rustiger vanwege vermoeidheidssignalen.`,
  `${CAUTION_PREFIX}De weekbeschikbaarheid telt op tot 9 uur en ligt onder het plafond van 12 uur.`,
].join("\n\n");

describe("cautionsFromSummary", () => {
  it("haalt de regels eruit zonder het voorvoegsel", () => {
    expect(cautionsFromSummary(summary)).toEqual([
      "De eerste dagen zijn bewust rustiger vanwege vermoeidheidssignalen.",
      "De weekbeschikbaarheid telt op tot 9 uur en ligt onder het plafond van 12 uur.",
    ]);
  });

  it("geeft niets terug bij een samenvatting zonder let-op-regels", () => {
    expect(cautionsFromSummary("Alleen een omschrijving.")).toEqual([]);
    expect(cautionsFromSummary(null)).toEqual([]);
    expect(cautionsFromSummary("")).toEqual([]);
  });

  it("laat een zin die toevallig zo begint midden in een alinea staan", () => {
    // Alleen aan het begin van een alinea telt het als caution.
    expect(cautionsFromSummary("We bouwen door. Let op: dit is geen taper.")).toEqual([]);
  });
});

describe("summaryWithoutCautions", () => {
  it("houdt de omschrijving over", () => {
    expect(summaryWithoutCautions(summary)).toBe(
      "Concept-bijwerking: verder bouwen aan FTP binnen de huidige beschikbaarheid.",
    );
  });
});

describe("memberCautions", () => {
  // Letterlijk uit gegenereerde schema's van 19 en 20 augustus 2026.
  const echt = [
    "Herplanning is beperkt tot 2026-08-20 t/m 2026-10-01; eerder gereden werk blijft staan en er zijn geen workouts buiten dit bereik toegevoegd.",
    "De gewijzigde beschikbaarheid is leidend: er is alleen gepland op di/do/vr/zo.",
    "De opgegeven weekbeschikbaarheid telt op tot 9 uur en ligt onder het doelplafond van 12 uur.",
    "De eerste dagen zijn bewust rustiger vanwege vermoeidheidssignalen.",
  ];

  it("laat de administratie van de herplanning weg", () => {
    expect(memberCautions(echt)).toEqual(echt.slice(1));
  });

  it("laat ook de concept- en reviewregels weg", () => {
    const rest = memberCautions([
      "Concept ter review door de trainer; alle vermogens zijn gebaseerd op FTP 343w.",
      "Alleen de periode 2026-08-19 t/m 2026-09-30 is herpland.",
      "Dit is alleen de herplanning van 2026-08-19 t/m 2026-10-01.",
      "TSB is licht negatief (-10,6); vandaag blijft het herstelkarakter overeind.",
    ]);
    expect(rest).toEqual(["TSB is licht negatief (-10,6); vandaag blijft het herstelkarakter overeind."]);
  });

  it("houdt het bij een handvol regels", () => {
    const veel = Array.from({ length: 9 }, (_, i) => `Reden ${i + 1}.`);
    expect(memberCautions(veel)).toHaveLength(MEMBER_CAUTION_LIMIT);
  });
});
