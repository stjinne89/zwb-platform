import { describe, expect, it } from "vitest";
import { eventMessageRecipients } from "@/lib/ride-messages/deliver";

describe("eventMessageRecipients", () => {
  const rsvps = [
    { profile_id: "ja", status: "yes" },
    { profile_id: "misschien-live", status: "maybe" },
    { profile_id: "misschien-thuis", status: "maybe" },
    { profile_id: "nee-live", status: "no" },
    { profile_id: "organisator", status: "yes" },
  ];

  it("stuurt naar wie ja zei en naar wie misschien zei en nu rijdt", () => {
    expect(
      eventMessageRecipients(rsvps, ["misschien-live", "nee-live", "vreemde"], "organisator").sort(),
    ).toEqual(["ja", "misschien-live"]);
  });

  it("laat de afzender weg en geeft niemand dubbel", () => {
    expect(
      eventMessageRecipients(
        [...rsvps, { profile_id: "ja", status: "yes" }],
        new Set<string>(),
        "ja",
      ),
    ).toEqual(["organisator"]);
  });
});
