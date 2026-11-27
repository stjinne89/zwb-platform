import { describe, expect, it } from "vitest";
import {
  clubWarmupFor,
  isUpcomingRace,
  raceWarmupExternalId,
  raceWarmupView,
  suggestedWarmupTitle,
  warmupRaceId,
  warmupStart,
} from "@/lib/training/race-warmup";

const race = {
  id: "race-1",
  title: "ZRL Race 3",
  duration_minutes: 50,
  intensity: "race",
  status: "planned",
  scheduled_at: "2026-10-13T18:15:00+00:00",
  intervals_external_id: null as string | null,
};

describe("warming-up bij een race", () => {
  it("herkent een geplande race van vandaag of later", () => {
    expect(isUpcomingRace(race, "2026-10-13")).toBe(true);
    expect(isUpcomingRace(race, "2026-10-14")).toBe(false);
    expect(isUpcomingRace({ ...race, intensity: "threshold" }, "2026-10-13")).toBe(false);
    expect(isUpcomingRace({ ...race, status: "completed" }, "2026-10-13")).toBe(false);
    expect(isUpcomingRace({ ...race, superseded_at: "2026-10-01" }, "2026-10-13")).toBe(false);
  });

  it("kiest de voorkeuze uit titel en duur", () => {
    expect(suggestedWarmupTitle(race)).toBe("Warming-up wedstrijd");
    expect(suggestedWarmupTitle({ ...race, title: "ZRL TTT Watopia" })).toBe(
      "Warming-up ploegentijdrit",
    );
    expect(suggestedWarmupTitle({ ...race, title: "FRR etappe 2 tijdrit" })).toBe(
      "Warming-up tijdrit",
    );
    expect(suggestedWarmupTitle({ ...race, title: "Sunday Race Club", duration_minutes: 95 })).toBe(
      "Warming-up lange wedstrijd",
    );
    // "ttt" zit niet in een gewoon woord verstopt.
    expect(suggestedWarmupTitle({ ...race, title: "Kattteam race" })).toBe("Warming-up wedstrijd");
  });

  it("is vijf minuten voor de start klaar en blijft op de racedag", () => {
    expect(warmupStart(race.scheduled_at, 21)).toBe("2026-10-13T17:49:00.000Z");
    expect(warmupStart("2026-10-13T00:10:00+00:00", 25)).toBe("2026-10-13T00:10:00.000Z");
  });

  it("vindt de warming-up die al bij de race staat", () => {
    const options = [
      { id: "t-lang", title: "Warming-up wedstrijd", durationMinutes: 21 },
      { id: "t-kort", title: "Warming-up wedstrijd kort", durationMinutes: 10 },
    ];
    expect(raceWarmupView(race, [race], options)).toEqual({
      options,
      suggestedId: "t-lang",
      current: null,
    });
    const warmup = {
      ...race,
      id: "w-1",
      title: "Warming-up wedstrijd kort",
      intensity: "endurance",
      intervals_external_id: raceWarmupExternalId(race.id),
    };
    expect(warmupRaceId(warmup)).toBe("race-1");
    expect(warmupRaceId(race)).toBeNull();
    expect(raceWarmupView(race, [race, warmup], options).current).toEqual({
      id: "w-1",
      title: "Warming-up wedstrijd kort",
      clubEvent: false,
    });
  });

  it("telt een clubevent vlak voor de race als warming-up", () => {
    const options = [{ id: "t-kort", title: "Warming-up wedstrijd", durationMinutes: 20 }];
    // Race om 18:15 UTC; de groepstraining van 20 minuten eindigt om 18:05.
    const raceRow = { ...race, origin: "event" };
    const club = {
      ...raceRow,
      id: "club-1",
      title: "ZWB ZRL Aqua Warm up sessie",
      duration_minutes: 20,
      intensity: "tempo",
      scheduled_at: "2026-10-13T17:45:00+00:00",
    };
    expect(clubWarmupFor(raceRow, [raceRow, club])?.id).toBe("club-1");
    expect(raceWarmupView(raceRow, [raceRow, club], options).current).toEqual({
      id: "club-1",
      title: "ZWB ZRL Aqua Warm up sessie",
      clubEvent: true,
    });

    // Te vroeg, over de start heen, geen event of zelf een race: niet.
    expect(clubWarmupFor(raceRow, [{ ...club, scheduled_at: "2026-10-13T17:00:00+00:00" }])).toBeNull();
    expect(clubWarmupFor(raceRow, [{ ...club, scheduled_at: "2026-10-13T18:00:00+00:00" }])).toBeNull();
    expect(clubWarmupFor(raceRow, [{ ...club, origin: "plan" }])).toBeNull();
    expect(clubWarmupFor(raceRow, [{ ...club, intensity: "race" }])).toBeNull();

    // Een eigen warming-up gaat voor.
    const own = {
      ...raceRow,
      id: "w-1",
      title: "Warming-up wedstrijd",
      origin: "plan",
      intervals_external_id: raceWarmupExternalId(race.id),
    };
    expect(raceWarmupView(raceRow, [raceRow, club, own], options).current?.id).toBe("w-1");
  });
});
