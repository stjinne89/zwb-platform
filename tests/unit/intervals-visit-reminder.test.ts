import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const sent = vi.hoisted(() => [] as Array<{ trigger: string; profileIds?: string[] }>);
vi.mock("@/lib/push/send", () => ({
  sendNotificationToMembers: vi.fn(
    async (trigger: string, _payload: unknown, options: { profileIds?: string[] }) => {
      sent.push({ trigger, profileIds: options.profileIds });
      return { sent: 1, pruned: 0, skipped: false };
    },
  ),
}));

const { visitPushDue, visitReminderDue, VISIT_REMINDER_DAYS } = await import(
  "@/lib/intervals/visit-reminder"
);
const { sendDueVisitReminders } = await import("@/lib/intervals/ride-sync");

const now = new Date("2026-09-30T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86400_000).toISOString();

describe("visitReminderDue", () => {
  it("staat 60 dagen na koppelen of na de laatste Gedaan", () => {
    expect(VISIT_REMINDER_DAYS).toBe(60);
    expect(visitReminderDue({ created_at: daysAgo(59), visit_confirmed_at: null }, now)).toBe(false);
    expect(visitReminderDue({ created_at: daysAgo(60), visit_confirmed_at: null }, now)).toBe(true);
    expect(
      visitReminderDue({ created_at: daysAgo(200), visit_confirmed_at: daysAgo(10) }, now),
    ).toBe(false);
  });

  it("doet niets zonder datum", () => {
    expect(visitReminderDue({ created_at: null, visit_confirmed_at: null }, now)).toBe(false);
  });
});

describe("visitPushDue", () => {
  it("stuurt één push per ronde", () => {
    const base = { created_at: daysAgo(70), visit_confirmed_at: null };
    expect(visitPushDue({ ...base, visit_reminded_at: null }, now)).toBe(true);
    expect(visitPushDue({ ...base, visit_reminded_at: daysAgo(5) }, now)).toBe(false);
  });

  it("stuurt weer na een nieuwe ronde", () => {
    // Afgevinkt 65 dagen geleden, de vorige push was daarvóór.
    expect(
      visitPushDue(
        { created_at: daysAgo(300), visit_confirmed_at: daysAgo(65), visit_reminded_at: daysAgo(130) },
        now,
      ),
    ).toBe(true);
  });
});

describe("sendDueVisitReminders", () => {
  it("stuurt alleen naar wie aan de beurt is en legt dat vast", async () => {
    const rows = [
      { profile_id: "a", athlete_id: "i1", api_key: "k", rides_backfilled_at: null, created_at: daysAgo(90), visit_confirmed_at: null, visit_reminded_at: null },
      { profile_id: "b", athlete_id: "i2", api_key: "k", rides_backfilled_at: null, created_at: daysAgo(10), visit_confirmed_at: null, visit_reminded_at: null },
    ];
    const db = fakeDb({ intervals_connections: rows.map((row) => ({ ...row })) });
    const count = await sendDueVisitReminders(db, rows, now);
    expect(count).toBe(1);
    expect(sent).toEqual([{ trigger: "on_intervals_visit_reminder", profileIds: ["a"] }]);
    expect(db.tables.intervals_connections.find((row) => row.profile_id === "a")?.visit_reminded_at).toBe(
      now.toISOString(),
    );
    expect(db.tables.intervals_connections.find((row) => row.profile_id === "b")?.visit_reminded_at).toBeNull();
  });
});
