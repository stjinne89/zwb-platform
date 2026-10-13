// Poses voor de core-oefeningen. Bij plank, zijplank en hollow hold is de eerste
// pose de makkelijkere variant en de tweede de volledige uitvoering; bij de rest
// zijn het de uiteinden van de beweging.
//
// Coördinaten in de 320×220-ruimte van figure-kit; de grond ligt op y=192. Op
// de buik is `facing` -1 (borst naar de mat), op de rug 1.

import { ANKLE_Y, arrow, guide, type Pose } from "./figure-kit";

/** Gouden streep op de mat: de onderrug blijft daar liggen. */
const LOW_BACK_DOWN = { d: "M 150 192 L 198 192" };

export const CORE_POSES: Record<string, Pose[]> = {
  plank: [
    {
      // Knieplank: zelfde rechte lijn, kortere hefboom.
      facing: -1,
      hip: [156, 172],
      shoulder: [104, 156],
      hand: [80, 186],
      foot: [232, 163],
      accent: guide([96, 136], [204, 164]),
    },
    {
      facing: -1,
      hip: [157, 164],
      shoulder: [104, 156],
      hand: [80, 186],
      foot: [240, 176],
      accent: guide([96, 136], [246, 158]),
    },
  ],

  "side-plank": [
    {
      // De bovenste arm recht omhoog is het duidelijkste teken dat dit een
      // zijplank is en geen gewone plank; de steunende onderarm staat lichter.
      facing: -1,
      hip: [156, 172],
      shoulder: [104, 156],
      hand: [112, 100],
      farHand: [80, 186],
      foot: [232, 163],
      accent: arrow([170, 150], [170, 122]),
    },
    {
      facing: -1,
      hip: [157, 164],
      shoulder: [104, 156],
      hand: [112, 100],
      farHand: [80, 186],
      foot: [240, 176],
      accent: guide([124, 138], [246, 158]),
    },
  ],

  "bird-dog": [
    {
      facing: -1,
      hip: [163, 141],
      shoulder: [110, 130],
      hand: [114, 184],
      farHand: [126, 184],
      foot: [204, 186],
      farFoot: [216, 186],
    },
    {
      // De gestrekte arm en het gestrekte been zijn de hoofdlijnen; de
      // steunende ledematen staan lichter.
      facing: -1,
      hip: [163, 139],
      shoulder: [110, 130],
      hand: [58, 124],
      farHand: [126, 184],
      foot: [246, 134],
      farFoot: [216, 186],
      accent: guide([54, 106], [250, 116]),
    },
  ],

  "dead-bug": [
    {
      hip: [190, 180],
      shoulder: [136, 181],
      hand: [141, 125],
      farHand: [152, 127],
      foot: [231, 137],
      farFoot: [239, 141],
      // Onderrug tegen de mat: dat is de hele oefening.
      accent: LOW_BACK_DOWN,
    },
    {
      hip: [190, 180],
      shoulder: [136, 181],
      hand: [86, 174],
      farHand: [152, 127],
      foot: [272, 170],
      farFoot: [239, 141],
      accent: LOW_BACK_DOWN,
    },
  ],

  "hollow-hold": [
    {
      // Knieën gebogen: de instapvariant als de onderrug loskomt.
      hip: [186, 180],
      shoulder: [136, 160],
      arch: 6,
      nod: 10,
      hand: [88, 141],
      foot: [228, 150],
      farFoot: [236, 154],
      accent: LOW_BACK_DOWN,
    },
    {
      hip: [186, 180],
      shoulder: [136, 160],
      arch: 6,
      nod: 10,
      hand: [88, 141],
      foot: [264, 150],
      farFoot: [266, 156],
      accent: LOW_BACK_DOWN,
    },
  ],

  "glute-bridge": [
    {
      hip: [176, 180],
      shoulder: [122, 181],
      hand: [182, 187],
      foot: [222, ANKLE_Y],
      farFoot: [232, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: arrow([176, 164], [176, 134]),
    },
    {
      hip: [175, 161],
      shoulder: [124, 180],
      hand: [182, 187],
      foot: [222, ANKLE_Y],
      farFoot: [232, ANKLE_Y],
      toes: 0,
      farToes: 0,
      // Schouder, heup en knie op één lijn: het eindpunt van de beweging.
      accent: guide([120, 162], [216, 128]),
    },
  ],
};
