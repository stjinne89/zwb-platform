// Poses voor de krachtoefeningen (0160). Net als bij activatie zijn twee poses
// de uiteinden van de beweging; de muurzit is een hold en heeft er één.

import { ANKLE_Y, arrow, guide, type Pose } from "./figure-kit";

const STEP = "M 184 192 L 184 162 L 262 162 L 262 192";
const WALL_RIGHT = "M 262 30 L 262 192";
const WALL_LEFT = "M 104 30 L 104 192";

export const STRENGTH_POSES: Record<string, Pose[]> = {
  // Springen voor je botten (0245): inzakken en in de lucht.
  "countermovement-jump": [
    {
      // Kwart squat, armen naar achteren.
      hip: [132, 128],
      shoulder: [152, 78],
      hand: [118, 134],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      accent: arrow([92, 140], [92, 96]),
    },
    {
      // Gestrekt in de lucht, armen omhoog.
      hip: [150, 80],
      shoulder: [150, 26],
      hand: [178, 14],
      foot: [150, ANKLE_Y - 24],
      farFoot: [162, ANKLE_Y - 24],
      toes: 70,
      farToes: 70,
      accent: arrow([92, 96], [92, 140]),
    },
  ],

  squat: [
    {
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [200, 62],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      accent: arrow([92, 96], [92, 146]),
    },
    {
      // Bovenbenen horizontaal, borst omhoog, knieën boven de tenen.
      hip: [116, 148],
      shoulder: [140, 100],
      hand: [190, 106],
      foot: [150, ANKLE_Y],
      farFoot: [162, ANKLE_Y],
      accent: arrow([92, 146], [92, 96]),
    },
  ],

  "split-squat": [
    {
      hip: [150, 116],
      shoulder: [150, 62],
      hand: [160, 112],
      foot: [192, ANKLE_Y],
      farFoot: [104, 180],
      toes: 0,
      farToes: 55,
      accent: arrow([250, 100], [250, 150]),
    },
    {
      // Achterste knie net boven de grond, voorste knie boven de voet.
      hip: [150, 144],
      shoulder: [150, 90],
      hand: [160, 140],
      foot: [192, ANKLE_Y],
      farFoot: [104, 180],
      toes: 0,
      farToes: 55,
      accent: arrow([250, 150], [250, 100]),
    },
  ],

  "step-up": [
    {
      props: [STEP],
      zoom: 0.84,
      hip: [146, 106],
      shoulder: [150, 52],
      hand: [152, 108],
      foot: [206, 157],
      farFoot: [140, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 150], [92, 100]),
    },
    {
      props: [STEP],
      zoom: 0.84,
      hip: [212, 73],
      shoulder: [212, 19],
      hand: [214, 75],
      foot: [210, 157],
      farFoot: [196, 157],
      toes: 0,
      farToes: 0,
      accent: arrow([92, 100], [92, 150]),
    },
  ],

  "single-leg-bridge": [
    {
      hip: [176, 180],
      shoulder: [122, 181],
      hand: [182, 187],
      foot: [222, ANKLE_Y],
      farFoot: [235, 119],
      accent: arrow([176, 164], [176, 134]),
    },
    {
      hip: [175, 161],
      shoulder: [124, 180],
      hand: [182, 187],
      foot: [222, ANKLE_Y],
      farFoot: [253, 132],
      // Schouder, heup en gestrekt been op één lijn.
      accent: guide([120, 162], [258, 114]),
    },
  ],

  "calf-raise": [
    {
      props: [WALL_RIGHT],
      hip: [196, 104],
      shoulder: [198, 50],
      hand: [254, 72],
      foot: [196, ANKLE_Y],
      farFoot: [206, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([140, 150], [140, 100]),
    },
    {
      props: [WALL_RIGHT],
      hip: [198, 93],
      shoulder: [200, 39],
      hand: [254, 62],
      foot: [198, 176],
      farFoot: [208, 176],
      toes: 42,
      farToes: 42,
      accent: arrow([140, 100], [140, 150]),
    },
  ],

  "single-leg-rdl": [
    {
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [152, 108],
      foot: [150, ANKLE_Y],
      farFoot: [142, 185],
      toes: 0,
    },
    {
      hip: [158, 106],
      shoulder: [106, 92],
      hand: [114, 150],
      foot: [156, ANKLE_Y],
      farFoot: [240, 126],
      toes: 0,
      // Romp en achterste been één rechte lijn.
      accent: guide([92, 70], [250, 108]),
    },
  ],

  "wall-sit": [
    {
      props: [WALL_LEFT],
      hip: [120, 146],
      shoulder: [120, 92],
      hand: [158, 136],
      foot: [164, ANKLE_Y],
      farFoot: [174, ANKLE_Y],
      // Bovenbeen horizontaal: knie in een hoek van 90 graden.
      accent: guide([120, 128], [172, 128]),
    },
  ],
};

