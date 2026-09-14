// Poses voor de krachtoefeningen (0158). Net als bij activatie zijn twee poses
// de uiteinden van de beweging; de muurzit is een hold en heeft er één.

import type { Pose } from "./figure-kit";

const ARROW_DOWN = (x: number, y: number): Pose["accent"] => ({
  d: `M ${x} ${y - 50} L ${x} ${y - 10}`,
  arrow: [
    [x, y],
    [x - 7, y - 14],
    [x + 7, y - 14],
  ],
});

const ARROW_UP = (x: number, y: number): Pose["accent"] => ({
  d: `M ${x} ${y + 50} L ${x} ${y + 10}`,
  arrow: [
    [x, y],
    [x - 7, y + 14],
    [x + 7, y + 14],
  ],
});

export const STRENGTH_POSES: Record<string, Pose[]> = {
  squat: [
    {
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [180, 104],
        [210, 106],
      ],
      leg: [
        [156, 170],
        [156, 190],
      ],
      farLeg: [
        [166, 170],
        [166, 190],
      ],
      accent: ARROW_DOWN(96, 160),
    },
    {
      head: [168, 94],
      neck: [158, 118],
      hip: [122, 152],
      arm: [
        [190, 124],
        [222, 126],
      ],
      leg: [
        [168, 158],
        [158, 190],
      ],
      farLeg: [
        [178, 160],
        [170, 190],
      ],
      accent: ARROW_UP(96, 110),
    },
  ],

  "split-squat": [
    {
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [150, 118],
        [148, 142],
      ],
      leg: [
        [186, 166],
        [196, 190],
      ],
      farLeg: [
        [124, 168],
        [98, 186],
      ],
      accent: ARROW_DOWN(250, 150),
    },
    {
      head: [150, 88],
      neck: [152, 116],
      hip: [154, 160],
      arm: [
        [150, 142],
        [148, 164],
      ],
      leg: [
        [196, 160],
        [196, 190],
      ],
      farLeg: [
        [140, 186],
        [100, 188],
      ],
      accent: ARROW_UP(250, 110),
    },
  ],

  "step-up": [
    {
      props: ["M 180 190 L 180 150 L 262 150 L 262 190"],
      head: [134, 62],
      neck: [136, 90],
      hip: [138, 146],
      arm: [
        [136, 118],
        [134, 142],
      ],
      leg: [
        [180, 130],
        [196, 150],
      ],
      farLeg: [
        [134, 170],
        [130, 190],
      ],
      accent: ARROW_UP(96, 100),
    },
    {
      props: ["M 180 190 L 180 150 L 262 150 L 262 190"],
      head: [206, 22],
      neck: [208, 50],
      hip: [210, 106],
      arm: [
        [208, 78],
        [206, 102],
      ],
      leg: [
        [212, 128],
        [212, 150],
      ],
      farLeg: [
        [194, 130],
        [182, 150],
      ],
      accent: ARROW_UP(96, 60),
    },
  ],

  "single-leg-bridge": [
    {
      head: [78, 178],
      neck: [102, 182],
      hip: [176, 184],
      arm: [
        [130, 188],
        [158, 190],
      ],
      leg: [
        [214, 158],
        [220, 190],
      ],
      farLeg: [
        [220, 172],
        [262, 162],
      ],
      accent: {
        d: "M 176 174 L 176 148",
        arrow: [
          [176, 138],
          [169, 153],
          [183, 153],
        ],
      },
    },
    {
      head: [78, 182],
      neck: [102, 186],
      hip: [178, 152],
      arm: [
        [132, 190],
        [160, 190],
      ],
      leg: [
        [216, 152],
        [222, 190],
      ],
      farLeg: [
        [220, 140],
        [262, 128],
      ],
      // Schouder, heup en gestrekt been op één lijn.
      accent: { d: "M 102 184 L 262 128", dashed: true },
    },
  ],

  "calf-raise": [
    {
      props: ["M 256 54 L 256 190"],
      head: [180, 62],
      neck: [182, 90],
      hip: [184, 146],
      arm: [
        [214, 104],
        [248, 100],
      ],
      leg: [
        [184, 170],
        [186, 190],
      ],
      farLeg: [
        [194, 170],
        [196, 190],
      ],
      accent: ARROW_UP(150, 150),
    },
    {
      props: ["M 256 54 L 256 190"],
      head: [180, 48],
      neck: [182, 76],
      hip: [184, 132],
      arm: [
        [214, 92],
        [248, 90],
      ],
      leg: [
        [184, 156],
        [190, 180],
      ],
      farLeg: [
        [194, 156],
        [200, 180],
      ],
      accent: ARROW_DOWN(150, 180),
    },
  ],

  "single-leg-rdl": [
    {
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [150, 118],
        [148, 142],
      ],
      leg: [
        [156, 170],
        [154, 190],
      ],
      farLeg: [
        [148, 168],
        [140, 186],
      ],
    },
    {
      head: [90, 108],
      neck: [116, 118],
      hip: [160, 146],
      arm: [
        [116, 142],
        [114, 166],
      ],
      leg: [
        [162, 170],
        [158, 190],
      ],
      farLeg: [
        [204, 138],
        [248, 130],
      ],
      // Romp en achterste been één rechte lijn.
      accent: { d: "M 84 110 L 254 128", dashed: true },
    },
  ],

  "wall-sit": [
    {
      props: ["M 108 40 L 108 190"],
      ground: true,
      head: [124, 76],
      neck: [124, 104],
      hip: [126, 156],
      arm: [
        [146, 132],
        [172, 150],
      ],
      leg: [
        [176, 156],
        [178, 190],
      ],
      farLeg: [
        [186, 158],
        [188, 190],
      ],
      // Bovenbeen horizontaal: knie in een hoek van 90 graden.
      accent: { d: "M 126 146 L 178 146", dashed: true },
    },
  ],
};
