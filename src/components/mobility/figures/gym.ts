// Poses voor de krachtoefeningen met gewicht (0232): de vier uit het
// gymprogramma en hun thuisversies. Het materiaal zit als `gear` aan het
// lichaam vast, zodat het met de beweging meegaat.

import { ANKLE_Y, arrow, type Gear, type Pose } from "./figure-kit";

const BAR: Gear[] = [{ kind: "schijf", at: "shoulder" }];
const WEIGHT: Gear[] = [{ kind: "gewicht", at: "hand" }];

// Schuine rugleuning en zitting van de leg press.
const PRESS_SEAT = ["M 66 96 L 110 172", "M 110 172 L 138 172"];
const CABLE_TOWER = ["M 58 60 L 58 192"];
const BAND_ANCHOR = ["M 66 168 L 66 192"];
const REAR_BENCH = ["M 70 152 L 118 152", "M 78 152 L 78 190", "M 110 152 L 110 190"];
const STEP_WITH_RAIL = ["M 144 192 L 144 178 L 214 178 L 214 192", "M 214 178 L 214 64"];

const hipFlexion = (anchor: [number, number], props: string[]): Pose[] => [
  {
    props,
    gear: [{ kind: "lijn", from: "foot", to: anchor }],
    hip: [150, 103],
    shoulder: [150, 49],
    hand: [160, 100],
    foot: [138, 184],
    farFoot: [152, ANKLE_Y],
    farToes: 0,
    accent: arrow([214, 150], [214, 112]),
  },
  {
    // Bovenbeen horizontaal, romp blijft rechtop.
    props,
    gear: [{ kind: "lijn", from: "foot", to: anchor }],
    hip: [150, 103],
    shoulder: [150, 49],
    hand: [160, 100],
    foot: [193, 144],
    farFoot: [152, ANKLE_Y],
    farToes: 0,
  },
];

export const GYM_POSES: Record<string, Pose[]> = {
  "barbell-half-squat": [
    {
      gear: BAR,
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [157, 61],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 96], [92, 136]),
    },
    {
      // Halve squat: knieën 90 graden, niet dieper.
      gear: BAR,
      hip: [124, 134],
      shoulder: [142, 83],
      hand: [150, 93],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 136], [92, 96]),
    },
  ],

  "single-leg-press": [
    {
      // Knie ongeveer 90 graden; het andere been rust naast de plaat.
      props: PRESS_SEAT,
      gear: [{ kind: "plaat", at: "foot" }],
      hip: [124, 158],
      shoulder: [88, 118],
      hand: [128, 150],
      foot: [178, 120],
      farFoot: [178, 184],
    },
    {
      // Weggeduwd, knie niet op slot.
      props: PRESS_SEAT,
      gear: [{ kind: "plaat", at: "foot" }],
      hip: [124, 158],
      shoulder: [88, 118],
      hand: [128, 150],
      foot: [192, 110],
      farFoot: [178, 184],
    },
  ],

  "standing-hip-flexion": hipFlexion([62, 182], CABLE_TOWER),

  "loaded-calf-raise": [
    {
      gear: BAR,
      hip: [160, 104],
      shoulder: [160, 50],
      hand: [167, 61],
      foot: [160, ANKLE_Y],
      farFoot: [170, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([104, 150], [104, 110]),
    },
    {
      gear: BAR,
      hip: [162, 93],
      shoulder: [162, 39],
      hand: [169, 50],
      foot: [162, 176],
      farFoot: [172, 176],
      toes: 42,
      farToes: 42,
      accent: arrow([104, 110], [104, 150]),
    },
  ],

  "goblet-squat": [
    {
      gear: WEIGHT,
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [168, 68],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 96], [92, 146]),
    },
    {
      gear: WEIGHT,
      hip: [116, 148],
      shoulder: [140, 100],
      hand: [160, 114],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 146], [92, 96]),
    },
  ],

  "bulgarian-split-squat": [
    {
      // Achterste voet op de bank, het gewicht hangt langs het lichaam.
      props: REAR_BENCH,
      gear: WEIGHT,
      hip: [150, 112],
      shoulder: [152, 58],
      hand: [154, 116],
      foot: [186, ANKLE_Y],
      farFoot: [106, 142],
      toes: 0,
      farToes: 160,
      accent: arrow([246, 100], [246, 140]),
    },
    {
      props: REAR_BENCH,
      gear: WEIGHT,
      hip: [148, 140],
      shoulder: [152, 86],
      hand: [154, 144],
      foot: [186, ANKLE_Y],
      farFoot: [106, 142],
      toes: 0,
      farToes: 160,
      accent: arrow([246, 140], [246, 100]),
    },
  ],

  "banded-hip-flexion": hipFlexion([68, 184], BAND_ANCHOR),

  "single-leg-calf-raise": [
    {
      // Voorvoet op de rand van de trede, het andere been vrij.
      props: STEP_WITH_RAIL,
      zoom: 0.86,
      hip: [158, 89],
      shoulder: [160, 35],
      hand: [208, 70],
      foot: [158, 173],
      farFoot: [140, 150],
      toes: 0,
      accent: arrow([100, 140], [100, 100]),
    },
    {
      props: STEP_WITH_RAIL,
      zoom: 0.86,
      hip: [160, 78],
      shoulder: [162, 24],
      hand: [208, 64],
      foot: [160, 162],
      farFoot: [142, 139],
      toes: 42,
      accent: arrow([100, 100], [100, 140]),
    },
  ],
};
