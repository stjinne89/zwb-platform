import { describe, expect, it } from "vitest";
import {
  buildPopularityIndex,
  chooseSubgroup,
  estimateEventMinutes,
  eventIntensity,
  intensityForPct,
  MATCH_FLOOR_PCT,
  parseWkgRange,
  rejectReason,
  scoreEvent,
  subgroupBand,
  suggestZwiftEvents,
  type MatchAthlete,
  type PlannedSession,
  type ZwiftEventCandidate,
  type ZwiftSubgroup,
} from "@/lib/training/zwift-match";
import type { WorkoutBlock, WorkoutIntensity } from "@/lib/training/workouts";

// Alles speelt zich af op één dag, zodat het "andere dag"-filter nooit per
// ongeluk de reden is dat een test slaagt of faalt.
const NOW = new Date("2026-09-21T10:00:00Z");

function subgroup(partial: Partial<ZwiftSubgroup> = {}): ZwiftSubgroup {
  return {
    label: null,
    minWkg: null,
    maxWkg: null,
    startAt: null,
    distanceM: null,
    signups: null,
    ...partial,
  };
}

function event(partial: Partial<ZwiftEventCandidate> = {}): ZwiftEventCandidate {
  return {
    eventId: 1,
    name: "Testrit",
    startAt: "2026-09-21T18:00:00Z",
    eventType: "GROUP_RIDE",
    sport: "CYCLING",
    durationSeconds: 3600,
    distanceM: null,
    laps: null,
    subgroups: [],
    seriesName: null,
    description: null,
    totalSignups: null,
    zwbSignups: null,
    externalUrl: "https://www.zwift.com/events/view/1",
    route: null,
    ...partial,
  };
}

function block(minutes: number, intensity: WorkoutIntensity, target = ""): WorkoutBlock {
  return { label: "Blok", durationMinutes: minutes, target, notes: "", intensity };
}

function session(partial: Partial<PlannedSession> = {}): PlannedSession {
  return {
    scheduledAt: "2026-09-21T18:00:00Z",
    durationMinutes: 60,
    intensity: "endurance",
    blocks: [block(60, "endurance")],
    ...partial,
  };
}

const ATHLETE: MatchAthlete = { ftpWatts: 250, weightKg: 75, availableMinutes: null };

describe("parseWkgRange", () => {
  it("leest de gewone band", () => {
    expect(parseWkgRange("3.2-3.9 w/kg")).toEqual({ minWkg: 3.2, maxWkg: 3.9 });
  });

  it("leest een band met spaties, een komma en een en-dash", () => {
    expect(parseWkgRange("2,0 – 2.5 W/kg")).toEqual({ minWkg: 2.0, maxWkg: 2.5 });
  });

  it("leest een open onderkant", () => {
    expect(parseWkgRange("< 2.5 WKG")).toEqual({ minWkg: null, maxWkg: 2.5 });
  });

  it("leest een open bovenkant", () => {
    expect(parseWkgRange("4.0+ w/kg")).toEqual({ minWkg: 4.0, maxWkg: null });
  });

  it("geeft null bij tekst zonder band", () => {
    expect(parseWkgRange("Open to all")).toBeNull();
    expect(parseWkgRange(null)).toBeNull();
  });
});

describe("subgroupBand", () => {
  it("gebruikt de band van het event zelf als die er is", () => {
    expect(subgroupBand(subgroup({ label: "A", minWkg: 1, maxWkg: 2 }))).toEqual({
      minWkg: 1,
      maxWkg: 2,
    });
  });

  it("valt terug op de gepubliceerde Zwift-categorie", () => {
    expect(subgroupBand(subgroup({ label: "C" })).minWkg).toBe(2.5);
  });

  it("laat E open: dat is in Zwift de groep zonder categorie-eis", () => {
    expect(subgroupBand(subgroup({ label: "E" }))).toEqual({ minWkg: null, maxWkg: null });
  });
});

describe("estimateEventMinutes", () => {
  it("gebruikt de duur van het event als Zwift die geeft", () => {
    expect(estimateEventMinutes(event({ durationSeconds: 5400 }), 200, 75)).toBe(90);
  });

  it("rekent een rondenrace uit de route door", () => {
    const minutes = estimateEventMinutes(
      event({
        durationSeconds: null,
        laps: 3,
        route: {
          name: "Watopia Flat Route",
          world: "watopia",
          distanceKm: 10,
          elevationM: 50,
          leadInKm: 0.5,
          leadInElevationM: 5,
        },
      }),
      200,
      75,
    );
    // 30,5 km grotendeels vlak op 200 W: ergens rond het uur, niet tien minuten
    // en niet drie uur.
    expect(minutes).toBeGreaterThan(45);
    expect(minutes).toBeLessThan(80);
  });

  it("maakt een bergrit langer dan dezelfde afstand op het vlakke", () => {
    const flat = estimateEventMinutes(
      event({
        durationSeconds: null,
        laps: 1,
        route: { name: "Vlak", world: "watopia", distanceKm: 20, elevationM: 20, leadInKm: 0, leadInElevationM: 0 },
      }),
      200,
      75,
    );
    const climb = estimateEventMinutes(
      event({
        durationSeconds: null,
        laps: 1,
        route: { name: "Klim", world: "watopia", distanceKm: 20, elevationM: 900, leadInKm: 0, leadInElevationM: 0 },
      }),
      200,
      75,
    );
    expect(climb!).toBeGreaterThan(flat!);
  });

  it("geeft null zonder duur, route en vermogen", () => {
    expect(estimateEventMinutes(event({ durationSeconds: null }), null, null)).toBeNull();
  });
});

describe("intensityForPct", () => {
  it("noemt 70% van je FTP over een hele rit tempo, niet duur", () => {
    // Over één blok is 70% duur (intensityFromPct); over anderhalf uur
    // aaneengesloten rijden is het dat niet.
    expect(intensityForPct(70)).toBe("tempo");
  });

  it("schaalt van herstel tot anaeroob", () => {
    expect(intensityForPct(45)).toBe("recovery");
    expect(intensityForPct(60)).toBe("endurance");
    expect(intensityForPct(85)).toBe("threshold");
    expect(intensityForPct(120)).toBe("anaerobic");
  });
});

describe("eventIntensity", () => {
  it("rekent een W/kg-band om naar %FTP met gewicht en FTP van het lid", () => {
    const group = subgroup({ label: "D", minWkg: 1.5, maxWkg: 2.5 });
    const result = eventIntensity(event({ subgroups: [group] }), group, ATHLETE);
    // Midden van de band is 2,0 W/kg -> 150 W -> 60% van een FTP van 250.
    expect(result?.source).toBe("band");
    expect(Math.round(result!.pctFtp!)).toBe(60);
    expect(result?.intensity).toBe("endurance");
  });

  it("noemt hetzelfde event zwaarder voor een lid met een lagere FTP", () => {
    // Dezelfde groepsrit op 2,0 W/kg is 60% van een FTP van 250 en 83% van een
    // FTP van 180. Dat is het hele punt van omrekenen naar %FTP.
    const group = subgroup({ minWkg: 1.5, maxWkg: 2.5 });
    const sterk = eventIntensity(event({ subgroups: [group] }), group, ATHLETE);
    const zwak = eventIntensity(event({ subgroups: [group] }), group, {
      ftpWatts: 180,
      weightKg: 75,
      availableMinutes: null,
    });
    expect(sterk!.pctFtp!).toBeLessThan(zwak!.pctFtp!);
    expect(zwak?.intensity).toBe("threshold");
  });

  it("leest de band van een race niet als tempo", () => {
    // "B, 3.2-3.9 W/kg" is bij een race een toelatingseis, geen tempo. Voor een
    // renner van 3,33 W/kg zou het midden van die band 108% van zijn FTP zijn,
    // en dan heette een gewone B-race ineens anaeroob.
    const group = subgroup({ label: "B", minWkg: 3.2, maxWkg: 3.99 });
    const result = eventIntensity(event({ eventType: "RACE", subgroups: [group] }), group, ATHLETE);
    expect(result).toEqual({ intensity: "race", pctFtp: null, source: "soort" });
  });

  it("valt terug op de eventsoort bij een race zonder band", () => {
    const result = eventIntensity(event({ eventType: "RACE" }), null, ATHLETE);
    expect(result).toEqual({ intensity: "race", pctFtp: null, source: "soort" });
  });

  it("leest de intensiteit uit de naam van een group workout", () => {
    const result = eventIntensity(
      event({ eventType: "GROUP_WORKOUT", name: "Tuesday Threshold Intervals" }),
      null,
      ATHLETE,
    );
    expect(result).toEqual({ intensity: "threshold", pctFtp: null, source: "naam" });
  });

  it("gokt niet als er niets te herkennen valt", () => {
    expect(
      eventIntensity(event({ eventType: "GROUP_WORKOUT", name: "Club Session 14" }), null, ATHLETE),
    ).toBeNull();
  });
});

describe("rejectReason", () => {
  it("gooit een hardloopevent weg", () => {
    expect(rejectReason(event({ sport: "RUNNING" }), session(), ATHLETE, NOW, 60)).toBe("sport");
  });

  it("gooit een event op een andere dag weg", () => {
    expect(
      rejectReason(event({ startAt: "2026-09-23T18:00:00Z" }), session(), ATHLETE, NOW, 60),
    ).toBe("andere_dag");
  });

  it("gooit een event weg dat zo begint", () => {
    expect(
      rejectReason(
        event({ startAt: "2026-09-21T10:05:00Z" }),
        session({ scheduledAt: "2026-09-21T10:30:00Z" }),
        ATHLETE,
        NOW,
        60,
      ),
    ).toBe("gestart");
  });

  it("stelt geen race voor bij een duurtraining", () => {
    expect(
      rejectReason(event({ eventType: "RACE" }), session({ intensity: "endurance" }), ATHLETE, NOW, 60),
    ).toBe("verkeerde_soort");
  });

  it("stelt wel een race voor bij een geplande race", () => {
    expect(
      rejectReason(
        event({ eventType: "RACE" }),
        session({ intensity: "race" }),
        ATHLETE,
        NOW,
        60,
      ),
    ).toBeNull();
  });

  it("gooit een event weg dat langer duurt dan het lid die dag heeft", () => {
    expect(
      rejectReason(event(), session(), { ...ATHLETE, availableMinutes: 45 }, NOW, 60),
    ).toBe("te_lang");
  });

  it("gooit een race weg waar het lid in geen enkele categorie past", () => {
    // Het lid rijdt 250/75 = 3,33 W/kg; de enige categorie eist 4.0+.
    expect(
      rejectReason(
        event({ eventType: "RACE", subgroups: [subgroup({ label: "A", minWkg: 4.0 })] }),
        session({ intensity: "race" }),
        ATHLETE,
        NOW,
        60,
      ),
    ).toBe("categorie");
  });

  it("houdt een groepsrit wél: een pacegroep is een advies, geen toelatingseis", () => {
    expect(
      rejectReason(
        event({ eventType: "GROUP_RIDE", subgroups: [subgroup({ label: "A", minWkg: 4.0 })] }),
        session(),
        ATHLETE,
        NOW,
        60,
      ),
    ).toBeNull();
  });

  it("laat een lid zonder FTP of gewicht overal in: onbekend is geen nee", () => {
    expect(
      rejectReason(
        event({ eventType: "RACE", subgroups: [subgroup({ label: "A", minWkg: 4.0 })] }),
        session({ intensity: "race" }),
        { ftpWatts: null, weightKg: null, availableMinutes: null },
        NOW,
        60,
      ),
    ).toBeNull();
  });
});

describe("chooseSubgroup", () => {
  const groups = [
    subgroup({ label: "A", minWkg: 4.0 }),
    subgroup({ label: "B", minWkg: 3.2, maxWkg: 3.99 }),
    subgroup({ label: "C", minWkg: 2.5, maxWkg: 3.19 }),
    subgroup({ label: "D", minWkg: 1.5, maxWkg: 2.49 }),
  ];

  it("kiest bij een race de categorie waar de W/kg van het lid in valt", () => {
    expect(
      chooseSubgroup(event({ eventType: "RACE", subgroups: groups }), ATHLETE, session())?.label,
    ).toBe("B");
  });

  it("kiest bij een groepsrit de groep die het geplande tempo rijdt", () => {
    // Duur is 60-75% van 250 W, dus ongeveer 169 W ofwel 2,25 W/kg: de D-groep.
    // Het lid kán in B rijden, maar dat is niet de training die gepland staat.
    expect(
      chooseSubgroup(
        event({ eventType: "GROUP_RIDE", subgroups: groups }),
        ATHLETE,
        session({ intensity: "endurance" }),
      )?.label,
    ).toBe("D");
  });

  it("schuift bij een zwaardere training mee naar een snellere groep", () => {
    expect(
      chooseSubgroup(
        event({ eventType: "GROUP_RIDE", subgroups: groups }),
        ATHLETE,
        session({ intensity: "threshold", blocks: [block(60, "threshold")] }),
      )?.label,
    ).toBe("B");
  });
});

describe("buildPopularityIndex", () => {
  it("vergelijkt binnen hetzelfde uur van de dag", () => {
    // Drie events om 18:00 UTC en drie om 04:00 UTC. Vier inschrijvingen is in
    // het nachtslot het drukste event en in het avondslot het rustigste.
    const events = [
      event({ eventId: 1, startAt: "2026-09-21T18:00:00Z", totalSignups: 40 }),
      event({ eventId: 2, startAt: "2026-09-21T18:10:00Z", totalSignups: 80 }),
      event({ eventId: 3, startAt: "2026-09-21T18:20:00Z", totalSignups: 120 }),
      event({ eventId: 4, startAt: "2026-09-21T04:00:00Z", totalSignups: 1 }),
      event({ eventId: 5, startAt: "2026-09-21T04:10:00Z", totalSignups: 2 }),
      event({ eventId: 6, startAt: "2026-09-21T04:20:00Z", totalSignups: 3 }),
    ];
    const index = buildPopularityIndex(events);
    expect(index.percentileFor("2026-09-21T04:30:00Z", 4)).toBe(100);
    expect(index.percentileFor("2026-09-21T18:30:00Z", 4)).toBe(0);
  });

  it("zegt niets bij te weinig events in een slot", () => {
    const index = buildPopularityIndex([event({ totalSignups: 10 })]);
    expect(index.percentileFor("2026-09-21T18:00:00Z", 10)).toBeNull();
  });
});

describe("scoreEvent", () => {
  it("scoort een event dat op duur en intensiteit klopt hoog", () => {
    // Duurtraining van een uur; de D-groep rijdt 2.0 W/kg = 60% van een FTP van
    // 250, en dat is precies duur.
    const match = scoreEvent(
      event({
        durationSeconds: 3600,
        subgroups: [subgroup({ label: "D", minWkg: 1.5, maxWkg: 2.5 })],
      }),
      session({ durationMinutes: 60, intensity: "endurance" }),
      ATHLETE,
      { now: NOW },
    );
    expect(match).not.toBeNull();
    expect(match!.scorePct).toBeGreaterThanOrEqual(80);
    expect(match!.subgroup?.label).toBe("D");
  });

  it("straft een event dat de helft langer duurt", () => {
    const passend = scoreEvent(event({ durationSeconds: 3600 }), session(), ATHLETE, { now: NOW });
    const telang = scoreEvent(event({ durationSeconds: 5400 }), session(), ATHLETE, { now: NOW });
    expect(telang!.scorePct).toBeLessThan(passend!.scorePct);
    expect(telang!.weakest?.dimension).toBe("duur");
  });

  it("noemt in het zwakste punt hoeveel langer het event is", () => {
    const match = scoreEvent(event({ durationSeconds: 4320 }), session(), ATHLETE, { now: NOW });
    expect(match!.weakest?.note).toContain("12 min langer dan gepland");
  });

  it("verlaagt de score niet als Zwift een veld niet meestuurt", () => {
    // Twee identieke events; bij het tweede ontbreekt alles wat optioneel is.
    // Zonder hernormalisatie zou het tweede stil punten verliezen.
    const kaal = scoreEvent(
      event({ eventType: "GROUP_WORKOUT", name: "Endurance Builder", durationSeconds: 3600 }),
      session(),
      ATHLETE,
      { now: NOW },
    );
    const compleet = scoreEvent(
      event({
        eventType: "GROUP_WORKOUT",
        name: "Endurance Builder",
        durationSeconds: 3600,
        route: {
          name: "Tempus Fugit",
          world: "watopia",
          distanceKm: 17.3,
          elevationM: 16,
          leadInKm: 0.2,
          leadInElevationM: 0,
        },
      }),
      session(),
      ATHLETE,
      { now: NOW },
    );
    expect(kaal!.scorePct).toBeGreaterThanOrEqual(compleet!.scorePct - 2);
    expect(kaal!.scores.map((score) => score.dimension)).not.toContain("terrein");
  });

  it("laat een ZWB-inschrijving zien in plaats van een wereldwijd getal", () => {
    const match = scoreEvent(
      event({ durationSeconds: 3600, zwbSignups: 2 }),
      session(),
      ATHLETE,
      { now: NOW },
    );
    const popularity = match!.scores.find((score) => score.dimension === "populariteit");
    expect(popularity?.note).toBe("2 ZWB'ers rijden mee");
  });

  it("geeft null voor een event dat door een hard filter valt", () => {
    expect(scoreEvent(event({ sport: "RUNNING" }), session(), ATHLETE, { now: NOW })).toBeNull();
  });

  it("prefereert klimwerk bij een drempelsessie en vlak bij een duurrit", () => {
    const klim = {
      name: "Road to Sky",
      world: "watopia",
      distanceKm: 17,
      elevationM: 1035,
      leadInKm: 0,
      leadInElevationM: 0,
    };
    const vlak = {
      name: "Tempus Fugit",
      world: "watopia",
      distanceKm: 17,
      elevationM: 16,
      leadInKm: 0,
      leadInElevationM: 0,
    };
    const drempel = session({ intensity: "threshold", blocks: [block(60, "threshold")] });
    const klimScore = scoreEvent(event({ route: klim }), drempel, ATHLETE, { now: NOW })!.scores;
    const vlakScore = scoreEvent(event({ route: vlak }), drempel, ATHLETE, { now: NOW })!.scores;
    const terrein = (scores: typeof klimScore) =>
      scores.find((score) => score.dimension === "terrein")!.scorePct;
    expect(terrein(klimScore)).toBeGreaterThan(terrein(vlakScore));
  });
});

describe("suggestZwiftEvents", () => {
  it("geeft de best passende events, hoogste score eerst", () => {
    const events = [
      event({ eventId: 1, durationSeconds: 3600 }),
      event({ eventId: 2, durationSeconds: 5400 }),
      event({ eventId: 3, durationSeconds: 3900 }),
    ];
    const matches = suggestZwiftEvents(events, session({ durationMinutes: 60 }), ATHLETE, {
      now: NOW,
    });
    expect(matches[0].event.eventId).toBe(1);
    expect(matches.map((match) => match.scorePct)).toEqual(
      [...matches.map((match) => match.scorePct)].sort((a, b) => b - a),
    );
  });

  it("toont niets onder de ondergrens", () => {
    // Drie kwartier gepland, een event van drie uur: dat is geen voorstel.
    const matches = suggestZwiftEvents(
      [event({ durationSeconds: 10800 })],
      session({ durationMinutes: 45 }),
      ATHLETE,
      { now: NOW },
    );
    expect(matches).toEqual([]);
  });

  it("houdt zich aan de limiet", () => {
    const events = Array.from({ length: 8 }, (_, index) =>
      event({ eventId: index + 1, durationSeconds: 3600 }),
    );
    expect(suggestZwiftEvents(events, session(), ATHLETE, { now: NOW })).toHaveLength(3);
    expect(suggestZwiftEvents(events, session(), ATHLETE, { now: NOW, limit: 5 })).toHaveLength(5);
  });

  it("sorteert bij gelijke score op starttijd, zodat de volgorde stabiel is", () => {
    const events = [
      event({ eventId: 1, startAt: "2026-09-21T20:00:00Z", durationSeconds: 3600 }),
      event({ eventId: 2, startAt: "2026-09-21T18:00:00Z", durationSeconds: 3600 }),
    ];
    const first = suggestZwiftEvents(events, session(), ATHLETE, { now: NOW });
    const second = suggestZwiftEvents([...events].reverse(), session(), ATHLETE, { now: NOW });
    expect(first.map((match) => match.event.eventId)).toEqual(
      second.map((match) => match.event.eventId),
    );
  });

  it("gebruikt dezelfde ondergrens als de export", () => {
    expect(MATCH_FLOOR_PCT).toBe(55);
  });
});
