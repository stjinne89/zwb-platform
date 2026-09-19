import { beforeEach, describe, expect, it, vi } from "vitest";

// Het afhandelen van een coach-antwoord dat in de achtergrond bij OpenAI draait.
// Dit is het stuk waar een fout stilletjes blijft staan: een bel die eeuwig "denkt
// na", of een antwoord dat bij de eerste netwerkhik wordt weggegooid.

type Row = Record<string, unknown>;

let tables: Record<string, Row[]>;

// Geen vi.fn() hier: die houdt de afloop van een teruggegeven promise bij met een
// eigen .then() zonder foutafvanger, en dan telt een afgewezen antwoord als een
// onafgehandelde fout — ook al vangt settlePendingCoachAnswers hem netjes op.
type RetrieveResult = Awaited<
  ReturnType<typeof import("@/lib/training/ai").retrieveCoachAnswerBackground>
>;
let retrieveImpl: () => Promise<RetrieveResult>;
let retrieveCalls = 0;

vi.mock("@/lib/training/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/training/ai")>()),
  retrieveCoachAnswerBackground: async () => {
    retrieveCalls += 1;
    return retrieveImpl();
  },
}));

function fakeAdmin() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const rows = () => (tables[table] ??= []);
    const run = () => {
      const matched = rows().filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      return matched;
    };
    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from };
}

const { settlePendingCoachAnswers, unansweredCounts, PENDING_TIMEOUT_MS } = await import(
  "@/lib/training/coach-chat"
);

const LID = "lid-1";
const verse = () => new Date().toISOString();
const oud = () => new Date(Date.now() - PENDING_TIMEOUT_MS - 1000).toISOString();

function pending(created: string) {
  tables = {
    training_chat_messages: [
      {
        id: "m1",
        profile_id: LID,
        role: "coach",
        status: "pending",
        body: "",
        response_id: "resp-1",
        created_at: created,
      },
    ],
  };
}

const rij = () => tables.training_chat_messages[0];

describe("openstaand coach-antwoord", () => {
  beforeEach(() => {
    retrieveCalls = 0;
    retrieveImpl = async () => ({ status: "in_progress" });
  });

  it("vult het antwoord in zodra OpenAI klaar is", async () => {
    pending(verse());
    retrieveImpl = async () => ({ status: "completed", text: "Omdat je woensdag maar een uur hebt." });

    const result = await settlePendingCoachAnswers(fakeAdmin() as never, LID);

    expect(result.stillPending).toBe(false);
    expect(rij()).toMatchObject({ status: "sent", body: "Omdat je woensdag maar een uur hebt." });
  });

  it("laat een lopende generatie staan en vraagt om snel terugkomen", async () => {
    pending(verse());
    retrieveImpl = async () => ({ status: "in_progress" });

    const result = await settlePendingCoachAnswers(fakeAdmin() as never, LID);

    expect(result.stillPending).toBe(true);
    expect(rij().status).toBe("pending");
  });

  it("geeft het op als het te lang duurt, in plaats van eeuwig te blijven denken", async () => {
    pending(oud());
    retrieveImpl = async () => ({ status: "in_progress" });

    const result = await settlePendingCoachAnswers(fakeAdmin() as never, LID);

    expect(result.stillPending).toBe(false);
    expect(rij().status).toBe("failed");
    expect(String(rij().body)).toContain("te lang");
  });

  it("gooit een antwoord niet weg bij één netwerkfout", async () => {
    pending(verse());
    retrieveImpl = async () => {
      throw new Error("fetch failed");
    };

    const result = await settlePendingCoachAnswers(fakeAdmin() as never, LID);

    expect(result.stillPending).toBe(true);
    expect(rij().status).toBe("pending");
  });

  it("markeert een mislukte generatie als mislukt", async () => {
    pending(verse());
    retrieveImpl = async () => ({ status: "failed", error: "leeg" });

    await settlePendingCoachAnswers(fakeAdmin() as never, LID);

    expect(rij().status).toBe("failed");
  });

  it("doet niets zonder openstaande rij", async () => {
    tables = { training_chat_messages: [] };
    const result = await settlePendingCoachAnswers(fakeAdmin() as never, LID);
    expect(result.stillPending).toBe(false);
    expect(retrieveCalls).toBe(0);
  });
});

describe("teller voor de rennerkiezer", () => {
  it("telt leden-berichten en begint opnieuw zodra de trainer reageert", async () => {
    tables = {
      training_chat_messages: [
        { profile_id: "a", role: "member", created_at: "2026-09-16T10:00:00Z" },
        { profile_id: "a", role: "trainer", created_at: "2026-09-16T11:00:00Z" },
        { profile_id: "a", role: "member", created_at: "2026-09-16T12:00:00Z" },
        { profile_id: "a", role: "member", created_at: "2026-09-16T13:00:00Z" },
        { profile_id: "b", role: "member", created_at: "2026-09-16T10:00:00Z" },
        { profile_id: "c", role: "trainer", created_at: "2026-09-16T10:00:00Z" },
      ],
    };

    const counts = await unansweredCounts(fakeAdmin() as never, ["a", "b", "c"]);

    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBe(0);
  });

  it("vraagt niets op zonder renners", async () => {
    tables = {};
    expect((await unansweredCounts(fakeAdmin() as never, [])).size).toBe(0);
  });
});
