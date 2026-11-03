import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0304 slaat de systeemprompt één keer op en ruimt vervangen workouts na 30
// dagen op, zodat de database binnen Free blijft (docs/database-bewaartermijn.md).
let db: PGlite;

async function migrate() {
  await db.exec(await readFile("supabase/migrations/0304_training_storage_retention.sql", "utf8"));
}

async function rows<T>(sql: string) {
  return (await db.query<T>(sql)).rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      "create role anon; create role authenticated; create role service_role;",
      "create table training_ai_generations(id int primary key,status text,prompt_text text,created_at timestamptz default now());",
      "insert into training_ai_generations(id,status,prompt_text) values (1,'completed','regels v1'),(2,'completed','regels v1'),(3,'completed','regels v2'),(4,'failed',null);",
      "create table training_workouts(id int primary key,status text,superseded_at timestamptz,intervals_event_id text);",
      "create table training_workout_reports(id int primary key,workout_id int references training_workouts(id) on delete cascade);",
      "create table training_ftp_tests(id int primary key,workout_id int references training_workouts(id) on delete set null);",
      "create table strava_activity_summaries(id int primary key,workout_id int references training_workouts(id) on delete set null);",
      "insert into training_workouts values",
      "  (1,'planned',now()-interval '40 days',null),", // weg
      "  (2,'planned',now()-interval '10 days',null),", // te jong
      "  (3,'planned',null,null),", // niet vervangen
      "  (4,'planned',now()-interval '40 days','evt-1'),", // event nog in intervals.icu
      "  (5,'completed',now()-interval '40 days',null),", // gereden
      "  (6,'planned',now()-interval '40 days',null),", // rapportage
      "  (7,'planned',now()-interval '40 days',null),", // FTP-test
      "  (8,'planned',now()-interval '40 days',null);", // ritsamenvatting
      "insert into training_workout_reports values (1,6);",
      "insert into training_ftp_tests values (1,7);",
      "insert into strava_activity_summaries values (1,8);",
    ].join("\n"),
  );
  await migrate();
});

afterAll(async () => {
  await db.close();
});

describe("0304 prompt één keer opslaan", () => {
  it("zet bestaande prompts om naar een hash en bewaart elke tekst één keer", async () => {
    expect(await rows("select count(*)::int as n from training_ai_prompts")).toEqual([{ n: 2 }]);
    expect(
      await rows(
        "select g.id, g.prompt_text, p.prompt_text as stored from training_ai_generations g left join training_ai_prompts p on p.hash = g.prompt_hash order by g.id",
      ),
    ).toEqual([
      { id: 1, prompt_text: null, stored: "regels v1" },
      { id: 2, prompt_text: null, stored: "regels v1" },
      { id: 3, prompt_text: null, stored: "regels v2" },
      { id: 4, prompt_text: null, stored: null },
    ]);
  });

  it("doet hetzelfde bij nieuwe en bijgewerkte generaties", async () => {
    await db.exec("insert into training_ai_generations(id,status,prompt_text) values (5,'queued','regels v1'),(6,'queued','regels v3')");
    await db.exec("update training_ai_generations set prompt_text='regels v4' where id=4");
    await db.exec("update training_ai_generations set status='completed' where id=5");
    expect(await rows("select count(*)::int as n from training_ai_prompts")).toEqual([{ n: 4 }]);
    expect(
      await rows(
        "select g.id, g.prompt_text, p.prompt_text as stored from training_ai_generations g join training_ai_prompts p on p.hash = g.prompt_hash where g.id in (4,5,6) order by g.id",
      ),
    ).toEqual([
      { id: 4, prompt_text: null, stored: "regels v4" },
      { id: 5, prompt_text: null, stored: "regels v1" },
      { id: 6, prompt_text: null, stored: "regels v3" },
    ]);
  });
});

describe("0304 vervangen workouts opruimen", () => {
  it("verwijdert alleen vervangen, ongereden workouts ouder dan 30 dagen waar niets meer aan hangt", async () => {
    expect(await rows("select public.prune_superseded_training_workouts(30) as n")).toEqual([{ n: 1 }]);
    expect((await rows<{ id: number }>("select id from training_workouts order by id")).map((r) => r.id)).toEqual([
      2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(await rows("select public.prune_superseded_training_workouts(30) as n")).toEqual([{ n: 0 }]);
  });

  it("is idempotent", async () => {
    await migrate();
    expect(await rows("select count(*)::int as n from training_ai_prompts")).toEqual([{ n: 4 }]);
  });
});
