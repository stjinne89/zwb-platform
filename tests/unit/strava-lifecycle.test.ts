import { describe, expect, it } from "vitest";
import {
  decideInactivity,
  reconnectPatch,
  revocationPatch,
} from "@/lib/strava/lifecycle";
import { isInvalidGrant } from "@/lib/strava/deauthorize";
import { isStravaHostedAvatar } from "@/lib/strava/retention";

const AT = new Date("2026-09-05T10:00:00.000Z");

describe("revocationPatch", () => {
  it("laat deauthorized_at leeg zolang Strava nog niets weet", () => {
    // De rij moet dan blijven staan: we hebben de token nog nodig om alsnog te
    // kunnen deauthoriseren.
    const patch = revocationPatch("member", { deauthorized: false, at: AT });
    expect(patch.revoked_at).toBe(AT.toISOString());
    expect(patch.deauthorized_at).toBeNull();
    expect(patch.revoked_reason).toBe("member");
  });

  it("zet beide stempels als er niets meer in te trekken valt", () => {
    const patch = revocationPatch("strava", { deauthorized: true, at: AT });
    expect(patch.deauthorized_at).toBe(AT.toISOString());
  });

  it("bewaart de foutmelding met tijdstip", () => {
    const patch = revocationPatch("member", {
      deauthorized: false,
      at: AT,
      error: "Strava deauthorize faalde (500)",
    });
    expect(patch.last_error).toBe("Strava deauthorize faalde (500)");
    expect(patch.last_error_at).toBe(AT.toISOString());
  });

  it("negeert een lege foutmelding", () => {
    const patch = revocationPatch("member", { deauthorized: true, at: AT, error: "  " });
    expect(patch.last_error).toBeNull();
    expect(patch.last_error_at).toBeNull();
  });
});

describe("reconnectPatch", () => {
  it("veegt elke revocatie schoon", () => {
    // Zonder dit blijft een lid dat netjes opnieuw koppelt door de sync
    // overgeslagen worden.
    expect(reconnectPatch()).toEqual({
      revoked_at: null,
      revoked_reason: null,
      deauthorized_at: null,
      inactivity_warned_at: null,
      consecutive_failures: 0,
      last_error: null,
      last_error_at: null,
    });
  });
});

describe("decideInactivity", () => {
  const base = {
    lastActivityAt: null,
    lastSignInAt: null,
    inactivityWarnedAt: null,
    now: AT,
    inactiveMonths: 12,
    graceDays: 30,
  };

  it("laat een lid met een recente rit met rust", () => {
    expect(
      decideInactivity({ ...base, lastActivityAt: "2026-08-01T00:00:00.000Z" }),
    ).toBe("active");
  });

  it("laat een lid dat wel inlogt maar niet rijdt met rust", () => {
    // Iemand kan maandenlang niet fietsen en de app toch gebruiken.
    expect(
      decideInactivity({ ...base, lastSignInAt: "2026-07-01T00:00:00.000Z" }),
    ).toBe("active");
  });

  it("waarschuwt bij stilte op beide fronten", () => {
    expect(
      decideInactivity({
        ...base,
        lastActivityAt: "2024-01-01T00:00:00.000Z",
        lastSignInAt: "2024-02-01T00:00:00.000Z",
      }),
    ).toBe("warn");
  });

  it("wacht de respijtperiode af na een waarschuwing", () => {
    expect(
      decideInactivity({ ...base, inactivityWarnedAt: "2026-08-25T00:00:00.000Z" }),
    ).toBe("waiting");
  });

  it("heft pas op als het respijt voorbij is", () => {
    expect(
      decideInactivity({ ...base, inactivityWarnedAt: "2026-07-01T00:00:00.000Z" }),
    ).toBe("revoke");
  });

  it("waarschuwt opnieuw bij een onleesbare waarschuwingsdatum", () => {
    expect(decideInactivity({ ...base, inactivityWarnedAt: "onzin" })).toBe("warn");
  });

  it("trekt de waarschuwing in zodra het lid terug is", () => {
    expect(
      decideInactivity({
        ...base,
        inactivityWarnedAt: "2026-07-01T00:00:00.000Z",
        lastActivityAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toBe("active");
  });
});

describe("isInvalidGrant", () => {
  it("herkent een ingetrokken grant", () => {
    expect(isInvalidGrant(new Error("invalid_grant"))).toBe(true);
    expect(
      isInvalidGrant(
        new Error(
          'Strava token request faalde (400): {"message":"Bad Request","errors":[{"field":"refresh_token","code":"invalid"}]}',
        ),
      ),
    ).toBe(true);
  });

  it("houdt een netwerkfout of serverfout apart", () => {
    // Die mogen géén koppeling opheffen — het lid heeft niets gedaan.
    expect(isInvalidGrant(new Error("fetch failed"))).toBe(false);
    expect(isInvalidGrant(new Error("Strava token request faalde (500): boem"))).toBe(false);
    expect(isInvalidGrant(null)).toBe(false);
  });
});

describe("isStravaHostedAvatar", () => {
  it("herkent Strava's eigen bestanden", () => {
    expect(
      isStravaHostedAvatar("https://dgalywyr863hv.cloudfront.net/pictures/athletes/1/2.jpg"),
    ).toBe(true);
    expect(isStravaHostedAvatar("https://content.strava.com/foo.jpg")).toBe(true);
  });

  it("laat een eigen upload staan", () => {
    expect(
      isStravaHostedAvatar("https://xyz.supabase.co/storage/v1/object/public/avatars/a.jpg"),
    ).toBe(false);
    expect(isStravaHostedAvatar(null)).toBe(false);
  });
});
