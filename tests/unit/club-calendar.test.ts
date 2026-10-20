import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchClubCalendarEvents = vi.fn();
const saveConfirmedZwiftCandidate = vi.fn();
const publishCandidateToCalendar = vi.fn();

vi.mock("@/lib/events/zwift-club", () => ({
  zwiftClubConfigured: () => true,
  fetchClubCalendarEvents: () => fetchClubCalendarEvents(),
}));
vi.mock("@/lib/events/scan-runner", () => ({
  loadMemberIndex: async () => ({ profiles: [], rosterZwiftIds: new Set() }),
  saveConfirmedZwiftCandidate: (...args: unknown[]) => saveConfirmedZwiftCandidate(...args),
}));
vi.mock("@/lib/events/publish-candidate", () => ({
  publishCandidateToCalendar: (...args: unknown[]) => publishCandidateToCalendar(...args),
}));

const { publishClubEvents } = await import("@/lib/events/club-calendar");

const NEXT_WEEK = new Date(Date.now() + 7 * 86_400_000).toISOString();

function clubEvent(externalId: string) {
  return { candidate: { externalId, startAt: NEXT_WEEK }, subgroupIds: [`${externalId}0`] };
}

type Row = Record<string, unknown>;

/** Alleen de twee leesvragen die publishClubEvents aan external_event_candidates stelt. */
function fakeAdmin(known: Row[], lastPublisher: string | null) {
  return {
    from: () => ({
      select: (columns: string) => {
        if (columns === "published_by") {
          const chain = {
            not: () => chain,
            order: () => chain,
            limit: () => chain,
            maybeSingle: async () => ({ data: lastPublisher ? { published_by: lastPublisher } : null }),
          };
          return chain;
        }
        return { eq: () => ({ in: async () => ({ data: known }) }) };
      },
    }),
  } as never;
}

describe("publishClubEvents", () => {
  beforeEach(() => {
    fetchClubCalendarEvents.mockReset();
    saveConfirmedZwiftCandidate.mockReset();
    publishCandidateToCalendar.mockReset();
    saveConfirmedZwiftCandidate.mockImplementation(async (_admin, event) => ({
      saved: { id: `cand-${event.candidate.externalId}`, published_event_id: null, ignored_at: null },
      members: 0,
    }));
    publishCandidateToCalendar.mockResolvedValue("event-id");
  });

  it("slaat gepubliceerde en genegeerde clubevents over zonder startlijst", async () => {
    fetchClubCalendarEvents.mockResolvedValue({
      events: [clubEvent("1"), clubEvent("2"), clubEvent("3")],
      route: "club",
    });
    const admin = fakeAdmin(
      [
        { external_id: "1", published_event_id: "e1", ignored_at: null },
        { external_id: "2", published_event_id: null, ignored_at: "2026-10-01" },
      ],
      "beheerder",
    );

    const result = await publishClubEvents(admin);

    expect(result).toMatchObject({ found: 3, published: 1, alreadyPublished: 1, ignored: 1, failed: 0 });
    expect(saveConfirmedZwiftCandidate).toHaveBeenCalledTimes(1);
    expect(publishCandidateToCalendar).toHaveBeenCalledWith(admin, "cand-3", "beheerder");
  });

  it("zet een verwijderd clubevent alleen met de knop terug", async () => {
    fetchClubCalendarEvents.mockResolvedValue({ events: [clubEvent("7")], route: "club" });
    const removed = [{ external_id: "7", published_event_id: null, published_at: "2026-10-19", ignored_at: null }];

    const byCron = await publishClubEvents(fakeAdmin(removed, "beheerder"));
    expect(byCron).toMatchObject({ removed: 1, published: 0 });
    expect(saveConfirmedZwiftCandidate).not.toHaveBeenCalled();

    const byButton = await publishClubEvents(fakeAdmin(removed, "beheerder"), "drukker");
    expect(byButton).toMatchObject({ removed: 0, published: 1 });
  });

  it("publiceert met de knop namens wie drukt", async () => {
    fetchClubCalendarEvents.mockResolvedValue({ events: [clubEvent("4")], route: "club" });
    const admin = fakeAdmin([], "iemand-anders");

    await publishClubEvents(admin, "drukker");

    expect(publishCandidateToCalendar).toHaveBeenCalledWith(admin, "cand-4", "drukker");
  });

  it("publiceert niets zolang niemand ooit iets publiceerde", async () => {
    fetchClubCalendarEvents.mockResolvedValue({ events: [clubEvent("5")], route: "club" });

    const result = await publishClubEvents(fakeAdmin([], null));

    expect(result).toMatchObject({ published: 0, failed: 1 });
    expect(result?.note).toBeTruthy();
    expect(saveConfirmedZwiftCandidate).not.toHaveBeenCalled();
  });

  it("laat events die al begonnen zijn liggen", async () => {
    fetchClubCalendarEvents.mockResolvedValue({
      events: [{ candidate: { externalId: "6", startAt: "2020-01-01T00:00:00Z" }, subgroupIds: [] }],
      route: "club",
    });

    const result = await publishClubEvents(fakeAdmin([], "beheerder"));

    expect(result).toMatchObject({ found: 0, published: 0 });
  });
});
