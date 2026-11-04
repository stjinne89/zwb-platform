import { describe, expect, it } from "vitest";
import {
  agendaStatus,
  deviceKind,
  intervalsStatus,
  liveStatus,
  memberIntegrations,
  memberRideSource,
  pushStatus,
  stravaStatus,
  telegramStatus,
  worstState,
  zwiftStatus,
  type IntervalsInput,
  type MemberIntegrationInput,
  type StravaInput,
} from "@/lib/integrations/member-overview";

const NOW = new Date("2026-11-04T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const empty: MemberIntegrationInput = {
  zwiftId: null,
  zwiftRefused: false,
  strava: null,
  intervals: null,
  telegram: null,
  push: [],
  agenda: null,
  live: [],
  lastRideAt: null,
};

const strava = (patch: Partial<StravaInput> = {}): StravaInput => ({
  connected_at: daysAgo(30),
  last_synced_at: daysAgo(0.1),
  scope: "read,activity:read_all,activity:write",
  revoked_at: null,
  revoked_reason: null,
  inactivity_warned_at: null,
  consecutive_failures: 0,
  last_error: null,
  last_error_at: null,
  ...patch,
});

const intervals = (patch: Partial<IntervalsInput> = {}): IntervalsInput => ({
  athlete_id: "i123",
  created_at: daysAgo(20),
  last_synced_at: daysAgo(0.05),
  last_ride_sync_error: null,
  visit_confirmed_at: null,
  wellness_opt_in: false,
  rides_via_intervals: false,
  ...patch,
});

describe("lid zonder koppelingen", () => {
  it("staat overal uit", () => {
    const statuses = memberIntegrations(empty, NOW);
    expect(statuses.map((s) => s.key)).toEqual([
      "strava",
      "intervals",
      "zwift",
      "telegram",
      "push",
      "agenda",
      "live",
    ]);
    expect(statuses.every((s) => s.state === "off")).toBe(true);
    expect(worstState(statuses)).toBe("off");
  });
});

describe("Strava", () => {
  it("is in orde met lees- en schrijfrecht", () => {
    expect(stravaStatus({ ...empty, strava: strava() }, NOW).state).toBe("ok");
  });

  it("is een probleem zonder activiteitenrecht", () => {
    const result = stravaStatus({ ...empty, strava: strava({ scope: "read" }) }, NOW);
    expect(result.state).toBe("problem");
    expect(result.summary).toMatch(/opnieuw koppelen/);
  });

  it("vraagt aandacht zonder schrijfrecht", () => {
    const result = stravaStatus({ ...empty, strava: strava({ scope: "read,activity:read" }) }, NOW);
    expect(result.state).toBe("attention");
  });

  it("onderscheidt één fout van een reeks", () => {
    const once = stravaStatus(
      { ...empty, strava: strava({ last_error: "500", last_error_at: daysAgo(0.1), consecutive_failures: 1 }) },
      NOW,
    );
    expect(once.state).toBe("attention");
    expect(once.facts).toContainEqual({ label: "Fout", text: "500" });
    const many = stravaStatus(
      { ...empty, strava: strava({ last_error: "500", consecutive_failures: 3 }) },
      NOW,
    );
    expect(many.state).toBe("problem");
  });

  it("weegt de reden van opheffen", () => {
    const self = stravaStatus(
      { ...empty, strava: strava({ revoked_at: daysAgo(1), revoked_reason: "member" }) },
      NOW,
    );
    expect(self.state).toBe("off");
    const onStrava = stravaStatus(
      { ...empty, strava: strava({ revoked_at: daysAgo(1), revoked_reason: "strava" }) },
      NOW,
    );
    expect(onStrava.state).toBe("problem");
    const unknown = stravaStatus(
      { ...empty, strava: strava({ revoked_at: daysAgo(1), revoked_reason: "iets nieuws" }) },
      NOW,
    );
    expect(unknown.state).toBe("attention");
  });

  it("meldt de inactiviteitswaarschuwing", () => {
    const result = stravaStatus(
      { ...empty, strava: strava({ inactivity_warned_at: daysAgo(3) }) },
      NOW,
    );
    expect(result.state).toBe("attention");
    expect(result.summary).toMatch(/inactiviteit/);
  });

  it("verwacht geen sync als de ritten via intervals.icu komen", () => {
    const input = {
      ...empty,
      strava: strava({ last_synced_at: null }),
      intervals: intervals({ rides_via_intervals: true }),
    };
    expect(memberRideSource(input)).toBe("intervals");
    expect(stravaStatus(input, NOW).state).toBe("ok");
    expect(stravaStatus({ ...empty, strava: strava({ last_synced_at: null }) }, NOW).state).toBe(
      "attention",
    );
  });
});

describe("intervals.icu", () => {
  it("zegt niets over de ritten-sync als de ritten van Strava komen", () => {
    const input = {
      ...empty,
      strava: strava(),
      intervals: intervals({ last_synced_at: null, created_at: daysAgo(200) }),
    };
    expect(memberRideSource(input)).toBe("strava");
    expect(intervalsStatus(input, NOW).state).toBe("ok");
  });

  it("is een probleem bij een fout in de ritten-sync", () => {
    const result = intervalsStatus(
      { ...empty, intervals: intervals({ last_ride_sync_error: "401 Unauthorized" }) },
      NOW,
    );
    expect(result.state).toBe("problem");
    expect(result.facts).toContainEqual({ label: "Fout", text: "401 Unauthorized" });
  });

  it("waarschuwt voor een ingeslapen account na 90 dagen zonder bevestigd bezoek", () => {
    const dormant = intervalsStatus(
      { ...empty, intervals: intervals({ created_at: daysAgo(120), visit_confirmed_at: daysAgo(95) }) },
      NOW,
    );
    expect(dormant.state).toBe("problem");
    const fresh = intervalsStatus(
      { ...empty, intervals: intervals({ created_at: daysAgo(120), visit_confirmed_at: daysAgo(10) }) },
      NOW,
    );
    expect(fresh.state).toBe("ok");
  });

  it("vraagt aandacht als de sync een dag stil ligt", () => {
    const result = intervalsStatus(
      { ...empty, intervals: intervals({ last_synced_at: daysAgo(2) }) },
      NOW,
    );
    expect(result.state).toBe("attention");
  });

  it("is een probleem zonder atleet-ID", () => {
    expect(intervalsStatus({ ...empty, intervals: intervals({ athlete_id: null }) }, NOW).state).toBe(
      "problem",
    );
  });
});

describe("Zwift", () => {
  it("leest het Zwift-ID en een weigering", () => {
    expect(zwiftStatus({ ...empty, zwiftId: "123456" }).state).toBe("ok");
    expect(zwiftStatus({ ...empty, zwiftId: "123456", zwiftRefused: true }).state).toBe("attention");
    expect(zwiftStatus({ ...empty, zwiftId: "abc" }).state).toBe("problem");
    expect(zwiftStatus({ ...empty, zwiftId: "  " }).state).toBe("off");
  });
});

describe("Telegram", () => {
  it("kent gekoppeld, bezig en een verlopen link", () => {
    expect(
      telegramStatus({ ...empty, telegram: { linked: true, linked_at: daysAgo(5), link_token_expires_at: null } }, NOW)
        .state,
    ).toBe("ok");
    const pending = telegramStatus(
      {
        ...empty,
        telegram: { linked: false, linked_at: null, link_token_expires_at: new Date(NOW.getTime() + 60_000).toISOString() },
      },
      NOW,
    );
    expect(pending.summary).toBe("Koppelen bezig");
    const expired = telegramStatus(
      { ...empty, telegram: { linked: false, linked_at: null, link_token_expires_at: daysAgo(1) } },
      NOW,
    );
    expect(expired.state).toBe("attention");
    expect(expired.summary).toBe("Koppellink niet gebruikt");
  });
});

describe("meldingen", () => {
  it("toont per toestel alleen het type, nieuwste eerst", () => {
    const result = pushStatus({
      ...empty,
      push: [
        {
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130",
          created_at: daysAgo(100),
          last_used_at: daysAgo(50),
        },
        {
          user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
          created_at: daysAgo(10),
          last_used_at: daysAgo(1),
        },
      ],
    });
    expect(result.state).toBe("ok");
    expect(result.summary).toBe("2 toestellen");
    expect(result.facts.map((fact) => fact.label)).toEqual(["iPhone", "Windows"]);
  });

  it("herkent toestellen grof", () => {
    expect(deviceKind("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("Android");
    expect(deviceKind("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("Mac");
    expect(deviceKind(null)).toBe("Onbekend toestel");
  });
});

describe("agenda", () => {
  it("ziet of de agenda-app de link nog ophaalt", () => {
    const ok = agendaStatus(
      { ...empty, agenda: { created_at: daysAgo(30), last_fetched_at: daysAgo(0.5) } },
      NOW,
    );
    expect(ok.state).toBe("ok");
    const stale = agendaStatus(
      { ...empty, agenda: { created_at: daysAgo(30), last_fetched_at: daysAgo(5) } },
      NOW,
    );
    expect(stale.state).toBe("attention");
    const never = agendaStatus({ ...empty, agenda: { created_at: daysAgo(2), last_fetched_at: null } }, NOW);
    expect(never.summary).toBe("Link nooit opgehaald");
    const justMade = agendaStatus(
      { ...empty, agenda: { created_at: daysAgo(0.01), last_fetched_at: null } },
      NOW,
    );
    expect(justMade.state).toBe("ok");
  });
});

describe("live", () => {
  it("noemt de actieve trackers en negeert uitgezette", () => {
    const result = liveStatus({
      ...empty,
      live: [
        { provider: "mail", enabled: true, last_seen_at: daysAgo(3), last_checked_at: null },
        { provider: "wahoo_link", enabled: true, last_seen_at: null, last_checked_at: daysAgo(1) },
        { provider: "owntracks", enabled: false, last_seen_at: null, last_checked_at: null },
      ],
    });
    expect(result.state).toBe("ok");
    expect(result.summary).toBe("Garmin, Wahoo");
    expect(result.facts).toEqual([
      { label: "Garmin", at: daysAgo(3) },
      { label: "Wahoo", at: daysAgo(1) },
    ]);
    expect(
      liveStatus({
        ...empty,
        live: [{ provider: "owntracks", enabled: false, last_seen_at: null, last_checked_at: null }],
      }).summary,
    ).toBe("Uitgezet");
  });
});

describe("lidstatus", () => {
  it("neemt de ernstigste koppeling", () => {
    const statuses = memberIntegrations(
      {
        ...empty,
        zwiftId: "1",
        strava: strava({ scope: "read" }),
        agenda: { created_at: daysAgo(30), last_fetched_at: daysAgo(10) },
      },
      NOW,
    );
    expect(worstState(statuses)).toBe("problem");
    expect(worstState(memberIntegrations({ ...empty, zwiftId: "1" }, NOW))).toBe("ok");
  });
});
