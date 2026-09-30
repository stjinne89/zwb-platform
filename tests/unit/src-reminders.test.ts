import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, type Row } from "./src-fake-admin";

const send = vi.fn(async (_trigger: string, _payload: unknown, options?: { profileIds?: string[] }) => ({
  sent: options?.profileIds?.length ?? 0,
  pruned: 0,
  skipped: false,
}));

vi.mock("@/lib/push/send", () => ({
  sendNotificationToMembers: (...args: unknown[]) =>
    send(...(args as [string, unknown, { profileIds?: string[] }])),
}));

const {
  processSrcReminders,
  srcRegistrationRecipients,
  srcRegistrationReminderAt,
  srcReminderDue,
  srcWeighInRecipients,
} = await import("@/lib/src/reminders");

describe("srcRegistrationReminderAt", () => {
  it("valt om 20:00 Nederlandse tijd op de avond voor de sluiting, ook rond de klokwissel", () => {
    // Zomertijd: sluiting do 1 okt 05:00 NL → wo 30 sep 20:00 NL = 18:00 UTC.
    expect(srcRegistrationReminderAt("2026-10-01T03:00:00.000Z")).toBe("2026-09-30T18:00:00.000Z");
    // Finale van 25 okt, de dag van de klokwissel: sluiting do 22 okt, nog zomertijd.
    expect(srcRegistrationReminderAt("2026-10-22T03:00:00.000Z")).toBe("2026-10-21T18:00:00.000Z");
    // Wintertijd: sluiting do 29 okt 04:00 NL → wo 28 okt 20:00 NL = 19:00 UTC.
    expect(srcRegistrationReminderAt("2026-10-29T03:00:00.000Z")).toBe("2026-10-28T19:00:00.000Z");
  });

  it("stuurt tussen dat moment en de sluiting", () => {
    const at = "2026-09-30T18:00:00.000Z";
    const until = "2026-10-01T03:00:00.000Z";
    expect(srcReminderDue(new Date("2026-09-30T17:59:00Z"), at, until)).toBe(false);
    expect(srcReminderDue(new Date("2026-09-30T18:00:00Z"), at, until)).toBe(true);
    expect(srcReminderDue(new Date("2026-10-01T03:00:00Z"), at, until)).toBe(false);
    expect(srcReminderDue(new Date("2026-09-30T20:00:00Z"), null, until)).toBe(false);
  });
});

describe("ontvangers", () => {
  it("inschrijven: wie meedoet, behalve wie voor dit team zei dat hij niet kan", () => {
    expect(
      srcRegistrationRecipients(
        [
          { profile_id: "a", team_id: "t" },
          { profile_id: "b", team_id: "t" },
          { profile_id: "c", team_id: "t" },
        ],
        [
          { profile_id: "a", team_id: "t", status: "available" },
          { profile_id: "b", team_id: "t", status: "unavailable" },
        ],
      ),
    ).toEqual(["a", "c"]);
  });

  it("weigh-in: ja of misschien, in een categorie met weigh-in", () => {
    const category: Record<string, number | null> = { a: 1, b: 2, c: 3, d: null, e: 1 };
    expect(
      srcWeighInRecipients(
        [
          { profile_id: "a", status: "yes" },
          { profile_id: "b", status: "maybe" },
          { profile_id: "c", status: "yes" },
          { profile_id: "d", status: "yes" },
          { profile_id: "e", status: "no" },
        ],
        (id) => category[id] ?? null,
        [1, 2],
      ),
    ).toEqual(["a", "b"]);
  });
});

describe("processSrcReminders", () => {
  beforeEach(() => send.mockClear());

  function tables(): Record<string, Row[]> {
    return {
      src_races: [
        {
          event_id: "men",
          sunday: "2026-10-04",
          gender: "men",
          registration_closes_at: "2026-10-01T03:00:00.000Z",
          pre_weight_categories: [1, 2],
          pre_weight_opens_at: "2026-10-04T09:00:00.000Z",
          pre_weight_closes_at: "2026-10-04T09:32:00.000Z",
          events: { parent_event_id: "sunday" },
        },
      ],
      src_month_entries: [
        { month: "2026-10-01", profile_id: "a", team_id: "t", category: 2 },
        { month: "2026-10-01", profile_id: "b", team_id: "t", category: null },
        { month: "2026-10-01", profile_id: "c", team_id: "t", category: 4 },
      ],
      team_event_availability: [
        { event_id: "sunday", profile_id: "c", team_id: "t", status: "unavailable" },
      ],
      event_rsvps: [
        { event_id: "men", profile_id: "a", status: "yes" },
        { event_id: "men", profile_id: "b", status: "yes" },
      ],
      src_results: [{ race_event_id: "sep", profile_id: "b", category: 1 }],
      event_reminder_sends: [],
    };
  }

  it("stuurt de inschrijfherinnering één keer per lid", async () => {
    const data = tables();
    const admin = fakeAdmin(data);
    const now = new Date("2026-09-30T19:00:00Z");
    expect(await processSrcReminders(admin, now)).toEqual({ registration: 2, weighIn: 0 });
    expect(send.mock.calls[0][2]).toEqual({ profileIds: ["a", "b"] });
    expect(await processSrcReminders(admin, now)).toEqual({ registration: 0, weighIn: 0 });
    expect(data.event_reminder_sends).toHaveLength(2);
  });

  it("stuurt de weigh-in naar opgegeven én recent gereden categorieën met weigh-in", async () => {
    const data = tables();
    // Lid b gaf geen categorie op, maar reed in september in cat 1.
    data.src_races.push({ event_id: "sep", sunday: "2026-09-27" });
    const admin = fakeAdmin(data);
    const result = await processSrcReminders(admin, new Date("2026-10-04T08:52:00Z"));
    expect(result).toEqual({ registration: 0, weighIn: 2 });
    expect(send.mock.calls[0][2]).toEqual({ profileIds: ["a", "b"] });
    expect((send.mock.calls[0][1] as { body: string }).body).toBe(
      "Weigh-in voor cat 1 en 2: van 11:00 tot 11:32.",
    );
  });
});
