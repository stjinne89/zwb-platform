// Voorbeeldbekers voor het dashboardblok "ZWBekers van deze week" op
// /ontwerp-voorbeeld. Verzonnen namen, geen echte leden.

import { DEFAULT_DESIGN } from "@/lib/zwbekers/design";
import type { BekerSummary } from "@/lib/zwbekers/server";

const person = (id: string, name: string) => ({ id, name, avatarUrl: null });

export const ZWBEKERS_VOORBEELD: BekerSummary[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    kind: "individueel",
    title: "Nummer 1 van de wereld",
    achievedOn: "2026-10-11",
    status: "toegekend",
    design: { ...DEFAULT_DESIGN, vorm: "een", sokkel: "marmer", regio: "Wereld", periode: "Oktober 2026" },
    teamName: null,
    winners: [person("p1", "Anna")],
  },
  {
    id: "00000000-0000-4000-8000-0000000000b2",
    kind: "team",
    title: "Promotie naar A1",
    achievedOn: "2026-10-08",
    status: "toegekend",
    design: { ...DEFAULT_DESIGN, vorm: "bokaal", oren: "vleugel", silhouet: "slank", sokkel: "hout", gravure: "Promotie naar A1" },
    teamName: "ZWB B1",
    winners: ["Bert", "Carla", "Dirk", "Eva", "Femke"].map((name, index) => person(`t${index}`, name)),
  },
  {
    id: "00000000-0000-4000-8000-0000000000b3",
    kind: "individueel",
    title: "Koning van de Muur",
    achievedOn: "2026-10-06",
    status: "toegekend",
    design: { ...DEFAULT_DESIGN, vorm: "schaal", metaal: "zilver", gravure: "Koning van de Muur" },
    teamName: null,
    winners: [person("p2", "Gijs")],
  },
];
