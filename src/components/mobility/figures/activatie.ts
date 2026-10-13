// Poses voor de activatie-oefeningen: het dynamische werk vóór de rit. De twee
// poses zijn hier de uiteinden van de beweging, niet een progressie — de lus
// laat de oefening dus letterlijk heen en weer gaan.

import { ANKLE_Y, type Pose } from "./figure-kit";

export const ACTIVATION_POSES: Record<string, Pose[]> = {
  "leg-swing": [
    {
      hip: [150, 103],
      shoulder: [152, 49],
      hand: [160, 100],
      foot: [112, 178],
      farFoot: [152, ANKLE_Y],
      farToes: 0,
    },
    {
      hip: [150, 103],
      shoulder: [150, 49],
      hand: [160, 100],
      foot: [206, 164],
      farFoot: [152, ANKLE_Y],
      farToes: 0,
    },
  ],

  "hip-circle": [
    {
      // Knie hoog voor het lichaam.
      hip: [150, 103],
      shoulder: [150, 49],
      hand: [160, 100],
      foot: [193, 144],
      farFoot: [152, ANKLE_Y],
      farToes: 0,
      accent: { d: "M 216 104 A 24 17 0 1 0 215.9 104.4", dashed: true },
    },
    {
      // Knie naar buiten gedraaid: het bovenbeen wijst naar de kijker en is
      // daarom verkort getekend.
      hip: [150, 103],
      shoulder: [150, 49],
      hand: [160, 100],
      foot: [158, 152],
      knee: 0.45,
      farFoot: [152, ANKLE_Y],
      farToes: 0,
      accent: { d: "M 216 104 A 24 17 0 1 0 215.9 104.4", dashed: true },
    },
  ],

  "hip-hinge": [
    {
      // De stok raakt achterhoofd, rug en stuit; dat blijft zo in pose twee.
      hip: [150, 104],
      shoulder: [150, 50],
      hand: [160, 100],
      foot: [150, ANKLE_Y],
      farFoot: [160, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: { d: "M 135 18 L 136 118" },
    },
    {
      hip: [144, 106],
      shoulder: [188, 75],
      hand: [156, 110],
      foot: [150, ANKLE_Y],
      farFoot: [160, ANKLE_Y],
      toes: 0,
      farToes: 0,
      accent: { d: "M 210 44 L 128 102" },
    },
  ],
};
