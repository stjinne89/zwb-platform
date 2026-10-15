import { describe, expect, it } from "vitest";
import { KNOWLEDGE_TOPICS, isKnowledgeTopic, topicLabel } from "@/lib/wie-weet-wat/topics";
import { countUnread, isUnreadFor, tipsForEvent, type ThreadReadState } from "@/lib/wie-weet-wat/data";

const A = "a";
const B = "b";

function thread(over: Partial<ThreadReadState> = {}): ThreadReadState {
  return {
    asker_id: A,
    expert_id: B,
    last_author_id: A,
    last_message_at: "2026-10-15T10:00:00Z",
    asker_read_at: "2026-10-15T10:00:00Z",
    expert_read_at: null,
    ...over,
  };
}

describe("onderwerpen", () => {
  it("heeft unieke slugs die de database accepteert", () => {
    const slugs = KNOWLEDGE_TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]{2,40}$/);
  });

  it("herkent alleen onderwerpen uit de lijst", () => {
    expect(isKnowledgeTopic("gravel")).toBe(true);
    expect(isKnowledgeTopic("blessures")).toBe(false);
    expect(isKnowledgeTopic(undefined)).toBe(false);
    expect(topicLabel("gravel")).toBe("Gravel en bikepacking");
  });
});

describe("ongelezen", () => {
  it("is ongelezen voor de ontvanger tot die het opent", () => {
    expect(isUnreadFor(thread(), B)).toBe(true);
    expect(isUnreadFor(thread({ expert_read_at: "2026-10-15T10:01:00Z" }), B)).toBe(false);
  });

  it("is nooit ongelezen voor wie het laatste bericht schreef", () => {
    expect(isUnreadFor(thread(), A)).toBe(false);
  });

  it("telt een nieuw antwoord na het leesmoment", () => {
    const t = thread({
      last_author_id: B,
      last_message_at: "2026-10-15T12:00:00Z",
      asker_read_at: "2026-10-15T11:00:00Z",
    });
    expect(isUnreadFor(t, A)).toBe(true);
    expect(countUnread([t, thread()], A)).toBe(1);
  });

  it("geldt niet voor een buitenstaander", () => {
    expect(isUnreadFor(thread(), "c")).toBe(false);
  });
});

describe("tips bij een event", () => {
  const tip = (id: string, event_id: string | null, col_slug: string | null, created_at: string) => ({
    id,
    event_id,
    col_slug,
    created_at,
  });

  it("neemt tips bij het event, het moederevent en de cols op de route, nieuwste eerst", () => {
    const tips = [
      tip("1", "e1", null, "2026-01-01T00:00:00Z"),
      tip("2", "moeder", null, "2026-03-01T00:00:00Z"),
      tip("3", null, "ventoux", "2026-02-01T00:00:00Z"),
      tip("4", "ander", "tourmalet", "2026-04-01T00:00:00Z"),
      tip("3", null, "ventoux", "2026-02-01T00:00:00Z"),
    ];
    const result = tipsForEvent(tips, { eventIds: ["e1", "moeder"], colSlugs: ["ventoux"] });
    expect(result.map((t) => t.id)).toEqual(["2", "3", "1"]);
  });
});
