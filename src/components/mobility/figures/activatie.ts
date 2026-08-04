// Poses voor de activatie-oefeningen: het dynamische werk vóór de rit. De twee
// poses zijn hier de uiteinden van de beweging, niet een progressie — de lus
// laat de oefening dus letterlijk heen en weer gaan.

import type { Pose } from "./figure-kit";

export const ACTIVATION_POSES: Record<string, Pose[]> = {
  "leg-swing": [
    {
      props: ["M 276 54 L 276 190"],
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [206, 110],
        [266, 104],
      ],
      leg: [
        [116, 152],
        [86, 146],
      ],
      farLeg: [
        [158, 170],
        [158, 190],
      ],
      accent: {
        d: "M 92 154 Q 150 180 202 156",
        arrow: [
          [212, 152],
          [197, 147],
          [201, 161],
        ],
        dashed: true,
      },
    },
    {
      props: ["M 276 54 L 276 190"],
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [206, 110],
        [266, 104],
      ],
      leg: [
        [186, 154],
        [214, 144],
      ],
      farLeg: [
        [152, 170],
        [152, 190],
      ],
      accent: {
        d: "M 202 156 Q 150 180 96 154",
        arrow: [
          [86, 150],
          [101, 145],
          [97, 159],
        ],
        dashed: true,
      },
    },
  ],

  "hip-circle": [
    {
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [176, 116],
        [190, 140],
      ],
      farArm: [
        [130, 116],
        [116, 140],
      ],
      leg: [
        [116, 140],
        [110, 172],
      ],
      farLeg: [
        [156, 170],
        [156, 190],
      ],
      accent: { d: "M 110 130 Q 84 158 112 180 Q 146 190 156 156", dashed: true },
    },
    {
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [176, 116],
        [190, 140],
      ],
      farArm: [
        [130, 116],
        [116, 140],
      ],
      leg: [
        [104, 152],
        [88, 180],
      ],
      farLeg: [
        [156, 170],
        [156, 190],
      ],
      accent: { d: "M 110 130 Q 84 158 112 180 Q 146 190 156 156", dashed: true },
    },
  ],

  "hip-hinge": [
    {
      // De stok raakt achterhoofd, rug en stuit; dat blijft zo in pose twee.
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [148, 118],
        [146, 142],
      ],
      leg: [
        [152, 170],
        [150, 190],
      ],
      farLeg: [
        [164, 170],
        [164, 190],
      ],
      accent: { d: "M 148 46 L 158 158" },
    },
    {
      head: [104, 102],
      neck: [126, 116],
      hip: [164, 150],
      arm: [
        [116, 140],
        [108, 158],
      ],
      leg: [
        [168, 172],
        [162, 190],
      ],
      farLeg: [
        [178, 172],
        [172, 190],
      ],
      accent: { d: "M 92 92 L 176 160" },
    },
  ],
};
