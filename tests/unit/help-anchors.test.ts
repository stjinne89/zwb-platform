import { describe, expect, it } from "vitest";
import { HELP_ANCHORS, helpHrefFor } from "@/lib/help-anchors";
import { helpHrefForAnchor } from "@/lib/help-categories";

describe("helpHrefFor", () => {
  it("kiest het meest specifieke patroon", () => {
    expect(helpHrefFor("/zwbeter-worden")).toBe("/hulp/training#trainingsruimte");
    expect(helpHrefFor("/zwbeter-worden/jaarplan")).toBe("/hulp/schema#jaarplan");
    expect(helpHrefFor("/zwbeter-worden/trainer/racen")).toBe("/hulp/racen#racen-trainer");
    expect(helpHrefFor("/stats/ik")).toBe("/hulp/club#mijn-statistieken");
  });

  it("laat een vast segment winnen van een joker", () => {
    expect(helpHrefFor("/teams/ttt-planner/abc")).toBe("/hulp/beheer#ttt-beheer");
    expect(helpHrefFor("/teams/123")).toBe("/hulp/beheer#teambeheer");
    expect(helpHrefFor("/teams")).toBe("/hulp/wedstrijden#teams");
    expect(helpHrefFor("/events/42/bewerk")).toBe("/hulp/beheer#eventbeheer");
    expect(helpHrefFor("/events/42")).toBe("/hulp/wedstrijden#events");
  });

  it("valt terug op /hulp zonder eigen uitleg", () => {
    expect(helpHrefFor("/dashboard")).toBe("/hulp");
    expect(helpHrefFor("/")).toBe("/hulp");
  });

  it("verwijst alleen naar ankers die in een hulpcategorie staan", () => {
    const missing = HELP_ANCHORS.map(([, anchor]) => anchor).filter(
      (anchor) => !helpHrefForAnchor(anchor)?.includes("#"),
    );
    expect(missing).toEqual([]);
  });
});
