import type { WeekReview } from "@/lib/weekly-review/service";

// Een volle week voor /ontwerp-voorbeeld?scherm=weekoverzicht: elk onderdeel
// gevuld, zodat elk scherm van het weekoverzicht te zien is. Verzonnen.
export const WEEK_VOORBEELD: WeekReview = {
  weekStart: "2026-10-12",
  seen: false,
  coachState: "done",
  coachText:
    "Sterke week. Je trainde gericht en dat zag je donderdag: **312 W over 5 minuten is een nieuwe grens**. Woensdag overslaan na die zware dinsdag was slim. Begin volgende week rustig; de VO2-blokken van dinsdag rijd je op gevoel.",
  summary: {
    version: 3,
    weekStart: "2026-10-12",
    weekEnd: "2026-10-18",
    firstName: "Sanne",
    rides: {
      count: 4,
      km: 210,
      movingMinutes: 400,
      elevationM: 1840,
      longest: { day: "2026-10-17", km: 92, name: "Clubrit Heuvelrug" },
      perDay: [
        { day: "2026-10-12", km: 0, minutes: 0 },
        { day: "2026-10-13", km: 38, minutes: 75 },
        { day: "2026-10-14", km: 0, minutes: 0 },
        { day: "2026-10-15", km: 42, minutes: 65 },
        { day: "2026-10-16", km: 0, minutes: 0 },
        { day: "2026-10-17", km: 92, minutes: 200 },
        { day: "2026-10-18", km: 38, minutes: 60 },
      ],
    },
    plan: {
      planned: 5,
      done: 4,
      perDay: [
        { day: "2026-10-12", plannedMinutes: 0, doneMinutes: 0, status: null, title: null },
        { day: "2026-10-13", plannedMinutes: 75, doneMinutes: 75, status: "gedaan", title: "Sweet spot 3×12" },
        { day: "2026-10-14", plannedMinutes: 60, doneMinutes: 0, status: "gemist", title: "Duur" },
        { day: "2026-10-15", plannedMinutes: 65, doneMinutes: 65, status: "gedaan", title: "ZRL ronde 3" },
        { day: "2026-10-16", plannedMinutes: 20, doneMinutes: 20, status: "gedaan", title: "Core" },
        { day: "2026-10-17", plannedMinutes: 200, doneMinutes: 200, status: "gedaan", title: "Lange duurrit" },
        { day: "2026-10-18", plannedMinutes: 0, doneMinutes: 0, status: null, title: null },
      ],
    },
    form: {
      source: "intervals",
      ctlStart: 58,
      ctlEnd: 61,
      atlEnd: 69,
      tsbEnd: -8,
      weeks: [
        { weekEnd: "2026-09-13", ctl: 49, atl: 52 },
        { weekEnd: "2026-09-20", ctl: 51, atl: 50 },
        { weekEnd: "2026-09-27", ctl: 53, atl: 60 },
        { weekEnd: "2026-10-04", ctl: 55, atl: 57 },
        { weekEnd: "2026-10-11", ctl: 58, atl: 62 },
        { weekEnd: "2026-10-18", ctl: 61, atl: 69 },
      ],
    },
    power: {
      points: [
        { seconds: 5, label: "5s", week: 910, best: 980 },
        { seconds: 60, label: "1m", week: 452, best: 470 },
        { seconds: 300, label: "5m", week: 312, best: 300 },
        { seconds: 1200, label: "20m", week: 251, best: 262 },
        { seconds: 3600, label: "60m", week: 221, best: 238 },
      ],
      record: { seconds: 300, label: "5m", watts: 312, wattsPerKg: 4.3 },
      focus: null,
    },
    teams: {
      results: [{ team: "ZWB Lynx", event: "ZRL ronde 3", day: "2026-10-15", rank: 3, teams: 18, riderPosition: 4, riderCategory: "B" }],
      src: [{ event: "Sunday Race Club", day: "2026-10-18", rank: 12, category: 3 }],
    },
    fuel: { loggedDays: [true, true, false, true, true, true, false], mobilitySessions: 2, mobilityMinutes: 40 },
    club: { clubRides: [{ title: "Clubrit Heuvelrug", day: "2026-10-17", riders: 11 }], newBlocks: 14, badges: ["Klimgeit"] },
    briljant: {
      points: 427,
      level: 4,
      levelName: "Platina",
      nextName: "Amethist",
      toNext: 73,
      previousPoints: 412,
      previousLevel: 4,
      weakestFacet: "Durability",
    },
  },
  next: {
    weekStart: "2026-10-19",
    source: "week",
    days: [
      { day: "2026-10-19", minutes: 0, plan: null, events: [] },
      { day: "2026-10-20", minutes: 60, plan: "VO2max 4×4", events: [] },
      {
        day: "2026-10-21",
        minutes: 90,
        plan: "Duur",
        events: [{ id: "e1", day: "2026-10-21", time: "20:00", title: "TTT-training", status: "beschikbaar", durationMinutes: 45 }],
      },
      {
        day: "2026-10-22",
        minutes: 60,
        plan: null,
        events: [{ id: "e2", day: "2026-10-22", time: "19:30", title: "ZRL ronde 4", status: "opgesteld", durationMinutes: 60 }],
      },
      { day: "2026-10-23", minutes: 0, plan: null, events: [] },
      {
        day: "2026-10-24",
        minutes: 180,
        plan: null,
        events: [{ id: "e3", day: "2026-10-24", time: "09:00", title: "Clubrit Amerongen", status: "aangemeld", durationMinutes: 180 }],
      },
      { day: "2026-10-25", minutes: 120, plan: "Herstel", events: [] },
    ],
  },
};
