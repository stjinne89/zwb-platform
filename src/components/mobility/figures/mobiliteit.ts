// Poses voor de mobiliteitsoefeningen. De gouden lijn wijst hier de
// bewegingsrichting aan, of markeert het hulpmiddel (bank, muur, blok).

import type { Pose } from "./figure-kit";

export const MOBILITY_POSES: Record<string, Pose[]> = {
  "cat-camel": [
    {
      // Bolle rug, kin naar de borst.
      head: [84, 142],
      neck: [108, 138],
      hip: [196, 138],
      torsoPath: "M 108 138 Q 152 104 196 138",
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
      accent: {
        d: "M 152 96 L 152 72",
        arrow: [
          [152, 62],
          [145, 77],
          [159, 77],
        ],
      },
    },
    {
      // Holle rug, borst open.
      head: [80, 118],
      neck: [108, 134],
      hip: [196, 134],
      torsoPath: "M 108 134 Q 152 166 196 134",
      arm: [
        [106, 162],
        [104, 188],
      ],
      farArm: [
        [124, 162],
        [122, 188],
      ],
      leg: [
        [198, 162],
        [196, 188],
      ],
      farLeg: [
        [214, 162],
        [212, 188],
      ],
      accent: {
        d: "M 152 94 L 152 118",
        arrow: [
          [152, 128],
          [145, 113],
          [159, 113],
        ],
      },
    },
  ],

  "thoracic-rotation": [
    {
      // Elleboog naar de mat toe.
      head: [86, 132],
      neck: [110, 136],
      hip: [196, 136],
      arm: [
        [126, 166],
        [98, 144],
      ],
      farArm: [
        [122, 164],
        [120, 188],
      ],
      leg: [
        [198, 164],
        [196, 188],
      ],
      farLeg: [
        [214, 164],
        [212, 188],
      ],
      accent: { d: "M 136 172 Q 178 142 158 100", dashed: true },
    },
    {
      // Elleboog naar het plafond, blik volgt.
      head: [84, 126],
      neck: [110, 134],
      hip: [196, 134],
      arm: [
        [128, 92],
        [100, 118],
      ],
      farArm: [
        [122, 162],
        [120, 188],
      ],
      leg: [
        [198, 162],
        [196, 188],
      ],
      farLeg: [
        [214, 162],
        [212, 188],
      ],
      accent: {
        d: "M 142 84 Q 160 66 182 66",
        arrow: [
          [192, 66],
          [178, 59],
          [178, 73],
        ],
      },
    },
  ],

  "thoracic-extension": [
    {
      // Op de knieën met de onderarmen op een bank. De bank krijgt poten, anders
      // leest het blad als een streep dwars door het lichaam.
      props: ["M 30 138 L 128 138", "M 42 138 L 42 190", "M 116 138 L 116 190"],
      head: [62, 116],
      neck: [92, 126],
      hip: [178, 140],
      arm: [
        [66, 138],
        [38, 138],
      ],
      farArm: [
        [80, 140],
        [52, 140],
      ],
      leg: [
        [184, 188],
        [214, 190],
      ],
      accent: {
        d: "M 126 106 L 126 130",
        arrow: [
          [126, 140],
          [119, 125],
          [133, 125],
        ],
      },
    },
    {
      // Borst zakt tussen de armen door: de rug krijgt extensie.
      props: ["M 30 138 L 128 138", "M 42 138 L 42 190", "M 116 138 L 116 190"],
      head: [60, 132],
      neck: [92, 142],
      hip: [178, 146],
      torsoPath: "M 92 142 Q 134 170 178 148",
      arm: [
        [66, 140],
        [38, 140],
      ],
      farArm: [
        [80, 142],
        [52, 142],
      ],
      leg: [
        [184, 188],
        [214, 190],
      ],
      accent: { d: "M 100 162 Q 134 186 170 164", dashed: true },
    },
  ],

  "child-pose": [
    {
      // Zit op de hielen: knie naar voren, voet ónder de zitbotten terug.
      head: [150, 112],
      neck: [152, 138],
      hip: [156, 172],
      arm: [
        [140, 158],
        [132, 176],
      ],
      leg: [
        [198, 186],
        [160, 190],
      ],
    },
    {
      head: [92, 168],
      neck: [116, 174],
      hip: [176, 178],
      torsoPath: "M 116 174 Q 148 160 176 178",
      arm: [
        [80, 178],
        [46, 184],
      ],
      leg: [
        [212, 186],
        [178, 190],
      ],
      accent: { d: "M 46 176 L 178 170", dashed: true },
    },
  ],

  "shoulder-opener": [
    {
      // De stok voor het lichaam, handen ruim uit elkaar.
      head: [150, 62],
      neck: [152, 90],
      hip: [154, 146],
      arm: [
        [138, 120],
        [128, 144],
      ],
      farArm: [
        [168, 120],
        [178, 144],
      ],
      leg: [
        [150, 170],
        [148, 190],
      ],
      farLeg: [
        [162, 170],
        [164, 190],
      ],
      accent: { d: "M 112 146 L 194 146" },
    },
    {
      head: [150, 70],
      neck: [152, 96],
      hip: [154, 150],
      arm: [
        [128, 72],
        [116, 44],
      ],
      farArm: [
        [176, 72],
        [188, 44],
      ],
      leg: [
        [150, 172],
        [148, 190],
      ],
      farLeg: [
        [162, 172],
        [164, 190],
      ],
      accent: { d: "M 102 44 L 202 44" },
    },
  ],

  "hip-flexor-stretch": [
    {
      head: [148, 70],
      neck: [150, 98],
      hip: [152, 148],
      arm: [
        [146, 122],
        [142, 146],
      ],
      leg: [
        [110, 168],
        [96, 190],
      ],
      farLeg: [
        [188, 186],
        [224, 190],
      ],
      accent: {
        // Eerst het bekken kantelen, dán pas de heup naar voren.
        d: "M 166 128 L 130 128",
        arrow: [
          [120, 128],
          [135, 121],
          [135, 135],
        ],
      },
    },
    {
      head: [140, 76],
      neck: [144, 104],
      hip: [148, 152],
      arm: [
        [140, 126],
        [136, 150],
      ],
      leg: [
        [104, 170],
        [92, 190],
      ],
      farLeg: [
        [192, 188],
        [230, 190],
      ],
      accent: {
        d: "M 162 132 L 118 132",
        arrow: [
          [108, 132],
          [123, 125],
          [123, 139],
        ],
      },
    },
  ],

  "hamstring-stretch": [
    {
      // Staand, hiel op een láge verhoging. Het blok moet ruim onder heuphoogte
      // blijven, anders leest de hele figuur als zittend.
      props: ["M 44 166 L 100 166", "M 54 166 L 54 190", "M 90 166 L 90 190"],
      head: [178, 48],
      neck: [178, 76],
      hip: [180, 126],
      arm: [
        [172, 100],
        [168, 124],
      ],
      leg: [
        [140, 146],
        [104, 164],
      ],
      farLeg: [
        [180, 158],
        [178, 190],
      ],
    },
    {
      props: ["M 44 166 L 100 166", "M 54 166 L 54 190", "M 90 166 L 90 190"],
      head: [128, 84],
      neck: [148, 98],
      hip: [182, 130],
      arm: [
        [136, 124],
        [126, 142],
      ],
      leg: [
        [142, 148],
        [104, 164],
      ],
      farLeg: [
        [182, 160],
        [180, 190],
      ],
      // Rechte rug: kantel vanuit de heup, rond je rug niet.
      accent: { d: "M 124 78 L 186 126", dashed: true },
    },
  ],

  "figure-four": [
    {
      head: [86, 172],
      neck: [110, 176],
      hip: [186, 180],
      arm: [
        [148, 160],
        [196, 152],
      ],
      leg: [
        [216, 148],
        [222, 190],
      ],
      farLeg: [
        [198, 146],
        [224, 150],
      ],
      accent: {
        d: "M 240 138 L 208 126",
        arrow: [
          [198, 122],
          [213, 118],
          [208, 132],
        ],
      },
    },
    {
      head: [86, 172],
      neck: [110, 176],
      hip: [186, 180],
      arm: [
        [142, 154],
        [192, 140],
      ],
      leg: [
        [206, 136],
        [214, 180],
      ],
      farLeg: [
        [190, 134],
        [218, 138],
      ],
      accent: {
        d: "M 232 126 L 202 114",
        arrow: [
          [192, 110],
          [207, 106],
          [202, 120],
        ],
      },
    },
  ],

  "ankle-rock": [
    {
      // Half geknield: de heup moet duidelijk bóven de knieën liggen, anders
      // leest de houding als zitten op de grond.
      props: ["M 58 56 L 58 190"],
      head: [180, 60],
      neck: [180, 90],
      hip: [188, 142],
      arm: [
        [168, 118],
        [156, 142],
      ],
      // Voorste voet plat, scheenbeen nog verticaal: dit is de startpositie.
      leg: [
        [140, 158],
        [138, 190],
      ],
      farLeg: [
        [194, 188],
        [226, 190],
      ],
      accent: {
        d: "M 130 158 L 104 158",
        arrow: [
          [94, 158],
          [109, 151],
          [109, 165],
        ],
      },
    },
    {
      props: ["M 58 56 L 58 190"],
      head: [174, 64],
      neck: [176, 94],
      hip: [186, 146],
      arm: [
        [164, 122],
        [152, 146],
      ],
      // Knie ver over de tenen; de voet blijft op dezelfde plek staan.
      leg: [
        [118, 156],
        [138, 190],
      ],
      farLeg: [
        [192, 188],
        [224, 190],
      ],
      accent: {
        d: "M 108 156 L 82 156",
        arrow: [
          [72, 156],
          [87, 149],
          [87, 163],
        ],
      },
    },
  ],
};
