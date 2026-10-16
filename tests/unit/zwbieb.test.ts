import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BUILT_IN_ITEMS,
  BUILT_IN_TOPICS,
  buildTopicCatalog,
  similarTopics,
  slugifyTopic,
  type TopicRow,
} from "@/lib/zwbieb/topics";
import { countUnread, isUnreadFor, tipsForEvent, type ThreadReadState } from "@/lib/zwbieb/data";

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
  it("heeft unieke slugs die de database accepteert, gelijk aan de startlijst van 0242", () => {
    const migration = readFileSync("supabase/migrations/0242_knowledge_topics.sql", "utf8");
    const all = [...BUILT_IN_TOPICS, ...BUILT_IN_ITEMS];
    const slugs = all.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const topic of all) {
      expect(topic.slug).toMatch(/^[a-z0-9-]{2,40}$/);
      expect(migration).toContain(`('${topic.slug}', '${topic.label.replace(/'/g, "''")}'`);
    }
  });

  const rows: TopicRow[] = [
    { slug: "gravel", label: "Gravel en bikepacking", kind: "kennis", sort_order: 11, status: "active" },
    { slug: "bergen-cols", label: "Bergen en cols", kind: "kennis", sort_order: 12, status: "active" },
    { slug: "tijdrijden", label: "Tijdrijden", kind: "kennis", sort_order: 1000, status: "active" },
    { slug: "oud", label: "Oud onderwerp", kind: "kennis", sort_order: 1000, status: "hidden" },
    { slug: "camper", label: "Camper", kind: "spullen", sort_order: 106, status: "active" },
  ];

  it("zet de startlijst voor nieuwe onderwerpen en verbergt wat verborgen is", () => {
    const catalog = buildTopicCatalog(rows);
    expect(catalog.options.map((o) => o.slug)).toEqual(["gravel", "bergen-cols", "camper", "tijdrijden"]);
    expect(catalog.isActive("oud")).toBe(false);
    expect(catalog.exists("oud")).toBe(true);
    expect(catalog.label("oud")).toBe("Oud onderwerp");
    expect(catalog.label("onbekend")).toBe("onbekend");
    expect(catalog.kindOf("camper")).toBe("spullen");
    expect(catalog.exists(undefined)).toBe(false);
  });

  it("maakt een slug zonder accenten en tekens", () => {
    expect(slugifyTopic("  Tijdrijden & TT ")).toBe("tijdrijden-tt");
    expect(slugifyTopic("Één fiets per café")).toBe("een-fiets-per-cafe");
    expect(slugifyTopic("x".repeat(60))).toHaveLength(40);
    expect(slugifyTopic("!!")).toBe("");
  });

  it("vindt bestaande onderwerpen die lijken op wat je typt", () => {
    const options = buildTopicCatalog(rows).options;
    expect(similarTopics(options, "gravel").map((o) => o.slug)).toEqual(["gravel"]);
    expect(similarTopics(options, "cols in de Alpen").map((o) => o.slug)).toEqual(["bergen-cols"]);
    expect(similarTopics(options, "x")).toEqual([]);
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
