import { describe, expect, it } from "vitest";
import { answerSnippet, splitQuestions, toQaItem, type QuestionRow } from "@/lib/qa/data";

const row = (overrides: Partial<QuestionRow>): QuestionRow => ({
  id: "q1",
  profile_id: "lid",
  body: "Hoe koppel ik mijn Wahoo?",
  visibility: "club",
  answer: null,
  answered_by: null,
  answered_at: null,
  created_at: "2026-10-19T10:00:00Z",
  asker: { display_name: "Lid" },
  answerer: null,
  ...overrides,
});

describe("toQaItem", () => {
  it("neemt de namen over, ook als PostgREST een lijst geeft", () => {
    const item = toQaItem(
      row({
        answer: "Via Samen fietsen.",
        answered_by: "bestuur",
        answered_at: "2026-10-19T12:00:00Z",
        asker: [{ display_name: "Lid" }],
        answerer: { display_name: "Bestuurder" },
      }),
      "lid",
    );
    expect(item).toMatchObject({ askerName: "Lid", answererName: "Bestuurder", mine: true });
  });

  it("valt terug als een naam ontbreekt, en noemt geen naam als wie antwoordde vertrok", () => {
    const item = toQaItem(
      row({ asker: null, answer: "Ja", answered_at: "2026-10-19T12:00:00Z", answerer: { display_name: "Oud" } }),
      "ander",
    );
    expect(item).toMatchObject({ askerName: "ZWB'er", answererName: null, mine: false });
    expect(toQaItem(row({}), null).mine).toBe(false);
  });
});

describe("splitQuestions", () => {
  it("zet open vragen oudste eerst en beantwoorde met het nieuwste antwoord bovenaan", () => {
    const items = [
      row({ id: "open-nieuw", created_at: "2026-10-19T09:00:00Z" }),
      row({ id: "open-oud", created_at: "2026-10-18T09:00:00Z" }),
      row({ id: "antwoord-oud", answer: "a", answered_at: "2026-10-18T12:00:00Z" }),
      row({ id: "antwoord-nieuw", answer: "b", answered_at: "2026-10-19T12:00:00Z" }),
    ].map((r) => toQaItem(r, null));
    const { open, answered } = splitQuestions(items);
    expect(open.map((item) => item.id)).toEqual(["open-oud", "open-nieuw"]);
    expect(answered.map((item) => item.id)).toEqual(["antwoord-nieuw", "antwoord-oud"]);
  });

  it("zet de FAQ apart, het vaakst gestelde eerst, en niet nog eens bij beantwoord", () => {
    const answeredAt = "2026-10-19T12:00:00Z";
    const items = [
      row({ id: "faq-1x", answer: "a", answered_at: answeredAt, faq_at: answeredAt, asked_count: 1 }),
      row({ id: "faq-4x", answer: "b", answered_at: answeredAt, faq_at: answeredAt, asked_count: 4 }),
      row({ id: "gewoon", answer: "c", answered_at: answeredAt }),
    ].map((r) => toQaItem(r, null));
    const { faq, answered } = splitQuestions(items);
    expect(faq.map((item) => item.id)).toEqual(["faq-4x", "faq-1x"]);
    expect(answered.map((item) => item.id)).toEqual(["gewoon"]);
  });
});

describe("Ik ook", () => {
  it("telt minstens de vrager, ook zonder 0258, en weet wat de kijker tikte", () => {
    expect(toQaItem(row({}), null)).toMatchObject({ askedCount: 1, faq: false, alsoAsked: false });
    expect(toQaItem(row({ asked_count: 3 }), "ander", new Set(["q1"]))).toMatchObject({
      askedCount: 3,
      alsoAsked: true,
    });
  });
});

describe("answerSnippet", () => {
  it("maakt platte tekst van markdown en kapt lange antwoorden af", () => {
    expect(answerSnippet("**Ja**, zie [de hulp](/hulp/koppelen#strava-rechten).\n\nKlaar")).toBe(
      "Ja, zie de hulp. Klaar",
    );
    expect(answerSnippet("x".repeat(200), 10)).toBe(`${"x".repeat(10)}…`);
  });
});
