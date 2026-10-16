import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { HELP_ANCHORS, helpHrefFor } from "@/lib/help-anchors";

describe("helpHrefFor", () => {
  it("kiest het meest specifieke patroon", () => {
    expect(helpHrefFor("/zwbeter-worden")).toBe("/hulp#trainingsruimte");
    expect(helpHrefFor("/zwbeter-worden/jaarplan")).toBe("/hulp#jaarplan");
    expect(helpHrefFor("/zwbeter-worden/trainer/racen")).toBe("/hulp#racen-trainer");
    expect(helpHrefFor("/stats/ik")).toBe("/hulp#mijn-statistieken");
  });

  it("laat een vast segment winnen van een joker", () => {
    expect(helpHrefFor("/teams/ttt-planner/abc")).toBe("/hulp#ttt-beheer");
    expect(helpHrefFor("/teams/123")).toBe("/hulp#teambeheer");
    expect(helpHrefFor("/teams")).toBe("/hulp#teams");
    expect(helpHrefFor("/events/42/bewerk")).toBe("/hulp#eventbeheer");
    expect(helpHrefFor("/events/42")).toBe("/hulp#events");
  });

  it("valt terug op /hulp zonder eigen uitleg", () => {
    expect(helpHrefFor("/dashboard")).toBe("/hulp");
    expect(helpHrefFor("/")).toBe("/hulp");
  });

  it("verwijst alleen naar ankers die op /hulp bestaan", async () => {
    const source = await readFile("src/app/(app)/hulp/page.tsx", "utf8");
    const ids = new Set([...source.matchAll(/\bid(?:=|: )"([a-z0-9-]+)"/g)].map((match) => match[1]));
    const missing = HELP_ANCHORS.map(([, anchor]) => anchor).filter((anchor) => !ids.has(anchor));
    expect(missing).toEqual([]);
  });
});
