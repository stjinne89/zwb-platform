import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// 0274 tegen een geïsoleerde PostgreSQL met alleen de kolommen die de migratie
// leest. Zegt niets over de productiedatabase zelf; daar worden migraties met
// de hand toegepast.

let db: PGlite;

const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

async function statusOf(id: string) {
  const { rows } = await db.query<{ status: string; approved_at: string | null; published_at: string | null }>(
    "select status, approved_at, published_at from public.training_plans where id = $1",
    [id],
  );
  return rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.training_plans (
      id uuid primary key,
      status text not null,
      approved_by uuid, approved_at timestamptz,
      published_by uuid, published_at timestamptz,
      updated_at timestamptz not null default '2026-08-01T10:00:00Z'
    );
    create table public.training_workouts (
      id serial primary key,
      plan_id uuid not null references public.training_plans(id),
      status text not null default 'planned',
      publish_status text not null default 'pending',
      superseded_at timestamptz
    );
    insert into public.training_plans (id, status, approved_at) values
      ('${ID(1)}', 'review', null),
      ('${ID(2)}', 'review', null),
      ('${ID(3)}', 'approved', '2026-10-21T08:00:00Z'),
      ('${ID(4)}', 'approved', '2026-10-21T08:00:00Z'),
      ('${ID(5)}', 'approved', '2026-10-21T08:00:00Z'),
      ('${ID(6)}', 'draft', null),
      ('${ID(7)}', 'approved', '2026-10-21T08:00:00Z');
    insert into public.training_workouts (plan_id, status, publish_status, superseded_at) values
      ('${ID(1)}', 'planned', 'published', null),
      ('${ID(1)}', 'planned', 'pending', null),
      ('${ID(2)}', 'planned', 'pending', null),
      ('${ID(2)}', 'planned', 'published', '2026-09-01T00:00:00Z'),
      ('${ID(3)}', 'planned', 'published', null),
      ('${ID(3)}', 'skipped', 'pending', null),
      ('${ID(4)}', 'planned', 'published', null),
      ('${ID(4)}', 'planned', 'failed', null),
      ('${ID(6)}', 'planned', 'published', null),
      ('${ID(7)}', 'skipped', 'pending', null);
  `);
  await db.exec(await readFile("supabase/migrations/0274_training_plan_status_cleanup.sql", "utf8"));
});

describe("0274 schema-statussen opruimen", () => {
  it("review met een training in intervals.icu wordt goedgekeurd, niet gepubliceerd", async () => {
    const plan = await statusOf(ID(1));
    expect(plan.status).toBe("approved");
    expect(plan.approved_at).not.toBeNull();
  });

  it("review zonder training in intervals.icu wordt weer concept; vervangen telt niet", async () => {
    expect((await statusOf(ID(2))).status).toBe("draft");
  });

  it("goedgekeurd met alles in intervals.icu wordt gepubliceerd; rustdagen tellen niet", async () => {
    const plan = await statusOf(ID(3));
    expect(plan.status).toBe("published");
    expect(new Date(plan.published_at!).toISOString()).toBe("2026-10-21T08:00:00.000Z");
  });

  it("goedgekeurd met een mislukte training blijft goedgekeurd", async () => {
    expect((await statusOf(ID(4))).status).toBe("approved");
  });

  it("goedgekeurd zonder trainingen blijft goedgekeurd", async () => {
    expect((await statusOf(ID(5))).status).toBe("approved");
    expect((await statusOf(ID(7))).status).toBe("approved");
  });

  it("laat een concept staan", async () => {
    expect((await statusOf(ID(6))).status).toBe("draft");
  });
});
