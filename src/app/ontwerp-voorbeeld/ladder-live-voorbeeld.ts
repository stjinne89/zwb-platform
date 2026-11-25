// Een verzonnen ladderrace voor de live stand in het designvoorbeeld: vijf
// tegen vijf, zes bogen, en de laatste boog waar nog niet iedereen langs is.

import { ladderLive } from "@/lib/club-ladder/live";
import type { LadderLiveOutcome } from "@/lib/club-ladder/live-load";
import type { Passage } from "@/lib/zrl-live/scoring";

const START = Date.UTC(2026, 10, 26, 18, 32, 0);
const NOW = START + 29 * 60 * 1000;

const riders = [
  { zwiftId: 1, name: "Sanne de Wit", own: true },
  { zwiftId: 2, name: "Jeroen Bakker", own: true },
  { zwiftId: 3, name: "Lotte Visser", own: true },
  { zwiftId: 4, name: "Mark Jansen", own: true },
  { zwiftId: 5, name: "Iris Smit", own: true },
  { zwiftId: 6, name: "Tom Fischer", own: false },
  { zwiftId: 7, name: "Lena Weber", own: false },
  { zwiftId: 8, name: "Paul Wagner", own: false },
  { zwiftId: 9, name: "Nina Koch", own: false },
  { zwiftId: 10, name: "Max Becker", own: false },
];

const route = [
  { segmentId: "1", name: "Fuego Flats Sprint" },
  { segmentId: "2", name: "Epic KOM" },
  { segmentId: "3", name: "Radio Tower KOM" },
  { segmentId: "1", name: "Fuego Flats Sprint" },
  { segmentId: "2", name: "Epic KOM" },
  { segmentId: "3", name: "Radio Tower KOM" },
];

// Per boog: seconden na de start van de eerste, en per renner de achterstand in seconden (null = nog niet langs).
const timeline: Array<[number, Array<number | null>]> = [
  [262, [0.4, 0.9, 0, 1.6, 2.1, 0.2, 0.7, 1.2, 1.9, 2.4]],
  [618, [0, 1.8, 0.6, 4.2, 9.5, 0.3, 2.6, 5.1, 7.7, 14.2]],
  [905, [3.1, 6.4, 0, 12.8, 41.0, 0.8, 7.3, 13.5, 20.2, 55.4]],
  [1244, [0.2, 2.5, 0, 9.3, 38.6, 0.5, 3.0, 9.9, 18.4, 63.1]],
  [1590, [0, 4.4, 1.2, 21.7, 66.2, 0.9, 5.0, 22.3, 30.6, 92.8]],
  [1702, [0, null, 0.8, null, null, 1.5, 3.9, null, null, null]],
];

const passages: Passage[] = timeline.flatMap(([seconds, gaps], index) =>
  gaps.flatMap((gap, i) =>
    gap === null
      ? []
      : [{
          id: `${index}-${i}`,
          athleteId: riders[i].zwiftId,
          segmentId: route[index].segmentId,
          ts: START + (seconds + gap) * 1000,
          elapsed: 60,
        }],
  ),
);

export const LADDER_LIVE_VOORBEELD: LadderLiveOutcome = {
  status: "ok",
  view: {
    event: { id: "voorbeeld", title: "Club Ladder: ZWBeasts – Voorbeeld Racing", startAt: START, ladderUrl: null },
    ours: "ZWBeasts",
    theirs: "Voorbeeld Racing",
    challenger: true,
    fetchedAt: NOW,
    live: ladderLive({ riders, route, passages, startAt: START, results: [], final: false, challenger: true }),
    riders,
    profiles: { "1": "voorbeeld-1", "3": "voorbeeld-3" },
    incomplete: false,
    noRoute: false,
  },
};
