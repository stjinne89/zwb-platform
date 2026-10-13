// Poses voor de mobiliteitsoefeningen. De gouden lijn wijst hier de
// bewegingsrichting aan, of markeert waar je op let.

import { ANKLE_Y, arrow, guide, type Pose } from "./figure-kit";

// De bank krijgt poten, anders leest het blad als een streep door het lichaam.
const BENCH = ["M 62 138 L 132 138", "M 72 138 L 72 190", "M 122 138 L 122 190"];
// Het blok moet ruim onder heuphoogte blijven, anders leest de figuur als
// zittend.
const BLOCK = ["M 214 172 L 262 172", "M 222 172 L 222 190", "M 254 172 L 254 190"];
const WALL = "M 268 30 L 268 192";

export const MOBILITY_POSES: Record<string, Pose[]> = {
  "cat-camel": [
    {
      // Bolle rug, kin naar de borst.
      facing: -1,
      hip: [163, 141],
      shoulder: [110, 132],
      arch: 13,
      nod: 40,
      hand: [114, 184],
      farHand: [126, 184],
      foot: [204, 186],
      farFoot: [216, 186],
      accent: arrow([137, 100], [137, 74]),
    },
    {
      // Holle rug, borst open.
      facing: -1,
      hip: [163, 141],
      shoulder: [110, 130],
      arch: -9,
      nod: -30,
      hand: [114, 184],
      farHand: [126, 184],
      foot: [204, 186],
      farFoot: [216, 186],
      accent: arrow([137, 86], [137, 112]),
    },
  ],

  "thoracic-rotation": [
    {
      // Hand achter het hoofd, elleboog naar de mat toe.
      facing: -1,
      hip: [163, 141],
      shoulder: [110, 130],
      hand: [92, 126],
      elbow: -1,
      farHand: [126, 184],
      foot: [204, 186],
      farFoot: [216, 186],
    },
    {
      // Elleboog naar het plafond, blik volgt.
      facing: -1,
      hip: [163, 141],
      shoulder: [110, 128],
      nod: -20,
      hand: [92, 122],
      elbow: 1,
      farHand: [126, 184],
      foot: [204, 186],
      farFoot: [216, 186],
      accent: arrow([122, 100], [122, 72]),
    },
  ],

  "thoracic-extension": [
    {
      // Op de knieën met de onderarmen op een bank.
      props: BENCH,
      facing: -1,
      hip: [196, 141],
      shoulder: [143, 130],
      hand: [96, 124],
      farHand: [104, 126],
      foot: [238, 186],
      accent: arrow([170, 96], [170, 122]),
    },
    {
      // Borst zakt tussen de armen door: de rug krijgt extensie.
      props: BENCH,
      facing: -1,
      hip: [196, 141],
      shoulder: [143, 138],
      arch: -10,
      nod: -10,
      hand: [96, 124],
      farHand: [104, 126],
      foot: [238, 186],
    },
  ],

  "child-pose": [
    {
      // Zit op de hielen. Beide poses kijken dezelfde kant op, anders klapt de
      // figuur tijdens de lus om.
      facing: -1,
      hip: [178, 160],
      shoulder: [176, 106],
      hand: [150, 158],
      foot: [182, 186],
      accent: arrow([150, 98], [118, 128]),
    },
    {
      // Zitbotten blijven op de hielen, borst zakt naar de mat: die schuine
      // lijn is wat de houding herkenbaar maakt.
      facing: -1,
      hip: [178, 160],
      shoulder: [125, 171],
      arch: 6,
      hand: [72, 184],
      foot: [182, 186],
    },
  ],

  "shoulder-opener": [
    {
      // De stok voor het lichaam, armen gestrekt.
      zoom: 0.86,
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [166, 108],
      foot: [150, ANKLE_Y],
      farFoot: [160, ANKLE_Y],
      accent: arrow([200, 110], [200, 76]),
    },
    {
      // Tussenstand: zonder deze pose zou de hand in een rechte lijn door de
      // schouder omhoog gaan in plaats van in een boog.
      zoom: 0.86,
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [206, 56],
      foot: [150, ANKLE_Y],
      farFoot: [160, ANKLE_Y],
    },
    {
      zoom: 0.86,
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [144, -1],
      foot: [150, ANKLE_Y],
      farFoot: [160, ANKLE_Y],
    },
  ],

  "hip-flexor-stretch": [
    {
      // Half geknield; het geknielde been is de kant die je rekt.
      hip: [150, 142],
      shoulder: [150, 88],
      hand: [158, 138],
      foot: [100, 186],
      farFoot: [200, ANKLE_Y],
      farToes: 0,
      // Eerst het bekken kantelen, dán pas de heup naar voren.
      accent: arrow([100, 122], [134, 122]),
    },
    {
      hip: [164, 146],
      shoulder: [162, 92],
      hand: [172, 142],
      foot: [100, 186],
      farFoot: [200, ANKLE_Y],
      farToes: 0,
      accent: arrow([112, 126], [146, 126]),
    },
  ],

  "hamstring-stretch": [
    {
      // Staand, hiel op een lage verhoging.
      props: BLOCK,
      hip: [172, 105],
      shoulder: [172, 51],
      hand: [178, 108],
      foot: [232, 162],
      toes: -62,
      farFoot: [170, ANKLE_Y],
      farToes: 0,
    },
    {
      props: BLOCK,
      hip: [168, 105],
      shoulder: [210, 71],
      hand: [226, 130],
      foot: [232, 162],
      toes: -62,
      farFoot: [170, ANKLE_Y],
      farToes: 0,
      // Rechte rug: kantel vanuit de heup, rond je rug niet.
      accent: guide([156, 88], [208, 46]),
    },
  ],

  "figure-four": [
    {
      // Enkel op de andere knie. De knie van het gekruiste been wijst naar de
      // kijker, vandaar de verkorte tekening.
      hip: [186, 180],
      shoulder: [132, 181],
      hand: [184, 150],
      foot: [194, 134],
      knee: 0.4,
      farFoot: [228, 134],
      accent: arrow([252, 112], [222, 104]),
    },
    {
      hip: [186, 180],
      shoulder: [132, 181],
      hand: [176, 140],
      foot: [182, 122],
      knee: 0.4,
      farFoot: [216, 120],
      accent: arrow([240, 98], [210, 90]),
    },
  ],

  "ankle-rock": [
    {
      // Half geknield voor een muur. Voorste voet plat, scheenbeen nog
      // verticaal: dit is de startpositie.
      props: [WALL],
      hip: [171, 146],
      shoulder: [171, 92],
      hand: [206, 138],
      foot: [214, ANKLE_Y],
      toes: 0,
      farFoot: [118, 186],
      accent: arrow([214, 124], [244, 124]),
    },
    {
      // Knie ver over de tenen; de voet blijft op dezelfde plek staan.
      props: [WALL],
      hip: [188, 148],
      shoulder: [190, 94],
      hand: [222, 140],
      foot: [214, ANKLE_Y],
      toes: 0,
      farFoot: [118, 186],
      accent: arrow([228, 124], [256, 124]),
    },
  ],
};
