// Poses voor de core-oefeningen. Twee poses per oefening: de eerste is de
// makkelijkere of de startpositie, de tweede de volledige uitvoering. Zo laat de
// lus meteen de progressie zien.
//
// Coördinaten in de 320×220-ruimte van figure-kit; de grondlijn ligt op y=192.

import type { Pose } from "./figure-kit";

export const CORE_POSES: Record<string, Pose[]> = {
  plank: [
    {
      // Knieplank: zelfde rechte lijn, kortere hefboom.
      head: [76, 132],
      neck: [100, 140],
      hip: [178, 152],
      arm: [
        [96, 186],
        [124, 186],
      ],
      leg: [
        [222, 186],
        [252, 164],
      ],
      accent: { d: "M 92 130 L 226 178", dashed: true },
    },
    {
      head: [72, 138],
      neck: [98, 146],
      hip: [180, 160],
      arm: [
        [94, 186],
        [122, 186],
      ],
      leg: [
        [222, 172],
        [258, 186],
      ],
      accent: { d: "M 88 136 L 258 180", dashed: true },
    },
  ],

  "side-plank": [
    {
      // De bovenste arm recht omhoog is het duidelijkste teken dat dit een
      // zijplank is en geen gewone plank; de steunende onderarm staat lichter.
      head: [80, 128],
      neck: [104, 138],
      hip: [186, 148],
      arm: [
        [110, 104],
        [114, 74],
      ],
      farArm: [
        [100, 186],
        [128, 186],
      ],
      leg: [
        [230, 186],
        [258, 164],
      ],
      accent: {
        d: "M 186 176 L 186 146",
        arrow: [
          [186, 136],
          [179, 151],
          [193, 151],
        ],
      },
    },
    {
      head: [76, 134],
      neck: [100, 144],
      hip: [188, 156],
      arm: [
        [106, 110],
        [110, 80],
      ],
      farArm: [
        [96, 186],
        [124, 186],
      ],
      leg: [
        [232, 170],
        [262, 186],
      ],
      accent: { d: "M 90 134 L 262 178", dashed: true },
    },
  ],

  "bird-dog": [
    {
      head: [84, 124],
      neck: [108, 136],
      hip: [196, 136],
      arm: [
        [106, 164],
        [104, 188],
      ],
      farArm: [
        [124, 164],
        [122, 188],
      ],
      leg: [
        [198, 164],
        [196, 188],
      ],
      farLeg: [
        [214, 164],
        [212, 188],
      ],
    },
    {
      // Hoofd hangt onder de schouder: neutrale nek, blik naar de mat. Het
      // houdt de kop ook los van de gestrekte arm, anders lopen ze in elkaar.
      head: [86, 152],
      neck: [108, 134],
      hip: [196, 134],
      // De gestrekte arm en het gestrekte been zijn de hoofdlijnen; de
      // steunende ledematen staan lichter.
      arm: [
        [76, 118],
        [46, 110],
      ],
      farArm: [
        [124, 162],
        [122, 188],
      ],
      leg: [
        [232, 126],
        [268, 118],
      ],
      farLeg: [
        [212, 162],
        [210, 188],
      ],
      accent: { d: "M 46 106 L 268 110", dashed: true },
    },
  ],

  "dead-bug": [
    {
      head: [92, 172],
      neck: [116, 176],
      hip: [190, 182],
      arm: [
        [118, 142],
        [120, 116],
      ],
      farArm: [
        [132, 144],
        [134, 118],
      ],
      leg: [
        [190, 144],
        [222, 142],
      ],
      farLeg: [
        [204, 146],
        [236, 144],
      ],
      // Onderrug tegen de mat: dat is de hele oefening.
      accent: { d: "M 148 190 L 196 190" },
    },
    {
      head: [92, 172],
      neck: [116, 176],
      hip: [190, 182],
      arm: [
        [92, 150],
        [66, 142],
      ],
      farArm: [
        [132, 144],
        [134, 118],
      ],
      leg: [
        [228, 168],
        [264, 166],
      ],
      farLeg: [
        [204, 146],
        [236, 144],
      ],
      accent: { d: "M 148 190 L 196 190" },
    },
  ],

  "hollow-hold": [
    {
      // Knieën gebogen: de instapvariant als de onderrug loskomt.
      head: [100, 152],
      neck: [122, 160],
      hip: [186, 180],
      arm: [
        [98, 140],
        [74, 132],
      ],
      leg: [
        [216, 152],
        [244, 150],
      ],
      farLeg: [
        [228, 156],
        [256, 154],
      ],
      accent: { d: "M 154 190 L 192 190" },
    },
    {
      head: [96, 146],
      neck: [120, 156],
      hip: [186, 180],
      arm: [
        [92, 132],
        [66, 124],
      ],
      leg: [
        [222, 160],
        [258, 144],
      ],
      farLeg: [
        [232, 164],
        [268, 148],
      ],
      accent: { d: "M 154 190 L 192 190" },
    },
  ],

  "glute-bridge": [
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
        [226, 160],
        [232, 190],
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
        [228, 154],
        [234, 190],
      ],
      // Schouder, heup en knie op één lijn: het eindpunt van de beweging.
      accent: { d: "M 102 184 L 216 152", dashed: true },
    },
  ],
};
