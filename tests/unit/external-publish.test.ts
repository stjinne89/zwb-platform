import { describe, expect, it } from "vitest";
import {
  eventTypeForSource,
  resultsUrlForSource,
} from "@/lib/events/external-publish";

describe("eventTypeForSource", () => {
  it("mapt Zwift naar eigen type + locatie", () => {
    expect(eventTypeForSource("zwift")).toEqual({ type: "zwift", location: "Zwift" });
  });

  it("mapt MyWhoosh naar eigen type + locatie", () => {
    expect(eventTypeForSource("mywhoosh")).toEqual({
      type: "mywhoosh",
      location: "MyWhoosh",
    });
  });

  it("valt terug op overig/Online voor onbekende of lege bron", () => {
    expect(eventTypeForSource("iets")).toEqual({ type: "overig", location: "Online" });
    expect(eventTypeForSource(null)).toEqual({ type: "overig", location: "Online" });
  });
});

describe("resultsUrlForSource", () => {
  it("leidt de ZwiftPower-URL af uit het numerieke event-id", () => {
    expect(resultsUrlForSource("zwift", "5617667")).toBe(
      "https://zwiftpower.com/events.php?zid=5617667",
    );
  });

  it("geeft null bij niet-numeriek of leeg id", () => {
    expect(resultsUrlForSource("zwift", "abc")).toBeNull();
    expect(resultsUrlForSource("zwift", "")).toBeNull();
    expect(resultsUrlForSource("zwift", null)).toBeNull();
  });

  it("geeft null voor niet-Zwift-bronnen", () => {
    expect(resultsUrlForSource("mywhoosh", "5617667")).toBeNull();
    expect(resultsUrlForSource(null, "5617667")).toBeNull();
  });
});
