import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// Migratie 0205 in een echte Postgres (PGlite): de profieltrigger, de
// trainingspolicies en het afschermen van definer-functies. De rechten zelf
// zijn een stub: een tabel met (gebruiker, recht), zoals 0024 ze uit de rollen
// haalt.

let db: PGlite;
const admin = "00000000-0000-0000-0000-00000000000a";
const roleManager = "00000000-0000-0000-0000-00000000000b"; // members.manage_roles
const approver = "00000000-0000-0000-0000-00000000000c"; // members.approve
const member = "00000000-0000-0000-0000-00000000000d";
const trainer = "00000000-0000-0000-0000-00000000000e"; // rol trainer

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    [
      // Net als bij Supabase omzeilt de service-role RLS.
      "create role anon; create role authenticated; create role service_role bypassrls;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      `create table public.profiles(
         id uuid primary key, display_name text, is_admin boolean not null default false,
         community_roles text[] not null default '{}', is_approved boolean default false,
         approved_at timestamptz, approved_by uuid, ftp_watts int);`,
      "create table public.test_permissions(profile_id uuid, permission text);",
      "create function public.current_user_is_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;",
      "create function public.current_user_has_permission(permission text) returns boolean language sql stable security definer set search_path = public as $$ select public.current_user_is_admin() or exists (select 1 from test_permissions t where t.profile_id = auth.uid() and t.permission = $1) $$;",
      // De trigger zelf komt uit 0020; 0205 vervangt alleen de functie.
      "create function public.protect_profile_admin_fields() returns trigger language plpgsql as $$ begin return new; end $$;",
      "create trigger profiles_protect_admin_fields before update on public.profiles for each row execute function public.protect_profile_admin_fields();",
      "alter table public.profiles enable row level security;",
      "create policy profiles_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());",
      "create policy profiles_admin_update on public.profiles for update to authenticated using (public.current_user_has_permission('members.approve') or public.current_user_has_permission('members.manage_roles'));",
      "create policy profiles_read on public.profiles for select to authenticated using (true);",
      // Training (0037, 0051), alleen de kolommen die de policies lezen.
      "create table public.training_coach_assignments(id uuid primary key default gen_random_uuid(), athlete_id uuid, trainer_id uuid, status text not null default 'active');",
      "create function public.current_user_can_train_profile(target_profile uuid) returns boolean language sql stable as $$ select auth.uid() = target_profile or public.current_user_has_permission('training.manage_assignments') or exists (select 1 from public.training_coach_assignments t where t.athlete_id = target_profile and t.trainer_id = auth.uid() and t.status = 'active') $$;",
      "create policy training_assignments_select on public.training_coach_assignments for select to authenticated using (true);",
      ...["training_plans", "training_workouts", "training_ai_generations", "training_adaptation_runs", "training_workout_reports"].map(
        (table) =>
          `create table public.${table}(id uuid primary key default gen_random_uuid(), profile_id uuid, trainer_id uuid); alter table public.${table} enable row level security;`,
      ),
      "alter table public.training_coach_assignments enable row level security;",
      // Twee van de functies die worden afgeschermd.
      "create function public.rate_limit_cleanup() returns void language sql security definer as $$ select $$;",
      "create function public.join_event_team_for_member(p uuid, e uuid, t uuid) returns uuid language sql security definer as $$ select t $$;",
      "grant usage on schema public, auth to anon, authenticated, service_role;",
      "grant execute on all functions in schema public to anon, authenticated;",
    ].join("\n"),
  );
  await db.exec(await readFile("supabase/migrations/0205_permission_hardening.sql", "utf8"));
  await db.exec(
    "grant select, insert, update, delete on all tables in schema public to authenticated, service_role;",
  );
}, 30_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(
    "reset role; truncate profiles, test_permissions, training_coach_assignments, training_plans, training_workout_reports cascade;",
  );
  for (const [id, roles, isAdmin] of [
    [admin, [], true],
    [roleManager, ["community_manager"], false],
    [approver, [], false],
    [member, [], false],
    [trainer, ["trainer"], false],
  ] as const) {
    await db.query("insert into profiles(id, display_name, community_roles, is_admin) values ($1, 'x', $2, $3)", [
      id,
      roles,
      isAdmin,
    ]);
  }
  await db.query("insert into test_permissions values ($1, 'members.manage_roles'), ($2, 'members.approve')", [
    roleManager,
    approver,
  ]);
});

/** Voert SQL uit als ingelogd lid (of als service-role zonder gebruiker). */
async function as(userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${userId ? "authenticated" : "service_role"};`,
  );
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

describe("0205: profielen", () => {
  it("laat een rollenbeheerder zichzelf of een ander geen admin maken", async () => {
    await expect(as(roleManager, "update profiles set is_admin = true where id = $1", [roleManager])).rejects.toThrow(
      /beheerder/,
    );
    await expect(as(roleManager, "update profiles set is_admin = true where id = $1", [member])).rejects.toThrow(
      /beheerder/,
    );
    await as(admin, "update profiles set is_admin = true where id = $1", [member]);
    const { rows } = await db.query<{ is_admin: boolean }>("select is_admin from profiles where id = $1", [member]);
    expect(rows[0].is_admin).toBe(true);
  });

  it("laat Bestuur alleen toekennen door wie rechten beheert", async () => {
    await as(roleManager, "update profiles set community_roles = '{trainer}' where id = $1", [member]);
    await expect(
      as(roleManager, "update profiles set community_roles = '{board}' where id = $1", [member]),
    ).rejects.toThrow(/Bestuur/);
    await db.query("insert into test_permissions values ($1, 'roles.manage_permissions')", [roleManager]);
    await as(roleManager, "update profiles set community_roles = '{board}' where id = $1", [member]);
    const { rows } = await db.query<{ community_roles: string[] }>("select community_roles from profiles where id = $1", [
      member,
    ]);
    expect(rows[0].community_roles).toEqual(["board"]);
  });

  it("laat een goedkeurder alleen de goedkeuring van een ander wijzigen", async () => {
    await as(approver, "update profiles set is_approved = true, approved_by = $2 where id = $1", [member, approver]);
    await expect(as(approver, "update profiles set display_name = 'kaap' where id = $1", [member])).rejects.toThrow(
      /alleen goedkeuring en rollen/,
    );
    await expect(as(approver, "update profiles set ftp_watts = 400 where id = $1", [member])).rejects.toThrow();
  });

  it("laat je eigen profiel en de service-role ongemoeid", async () => {
    await as(member, "update profiles set display_name = 'nieuw', ftp_watts = 250 where id = $1", [member]);
    await as(null, "update profiles set ftp_watts = 300 where id = $1", [member]);
    const { rows } = await db.query<{ display_name: string; ftp_watts: number }>(
      "select display_name, ftp_watts from profiles where id = $1",
      [member],
    );
    expect(rows[0]).toEqual({ display_name: "nieuw", ftp_watts: 300 });
  });
});

describe("0205: training", () => {
  it("laat geen trainingsschema voor een ander schrijven zonder koppeling", async () => {
    await expect(
      as(member, "insert into training_plans(profile_id, trainer_id) values ($1, $2)", [trainer, member]),
    ).rejects.toThrow(/row-level security/);
    // Voor jezelf mag het wel.
    await as(member, "insert into training_plans(profile_id, trainer_id) values ($1, $1)", [member]);
  });

  it("laat een gekoppelde trainer wel schrijven, en een ingetrokken niet meer", async () => {
    await db.query("insert into training_coach_assignments(athlete_id, trainer_id) values ($1, $2)", [member, trainer]);
    await as(trainer, "insert into training_plans(profile_id, trainer_id) values ($1, $2)", [member, trainer]);
    await db.query("update training_coach_assignments set status = 'revoked'");
    await expect(
      as(trainer, "insert into training_plans(profile_id, trainer_id) values ($1, $2)", [member, trainer]),
    ).rejects.toThrow(/row-level security/);
  });

  it("koppelt alleen aan iemand met de rol trainer, en intrekken mag altijd", async () => {
    await expect(
      as(member, "insert into training_coach_assignments(athlete_id, trainer_id) values ($1, $2)", [member, approver]),
    ).rejects.toThrow(/row-level security/);
    await as(member, "insert into training_coach_assignments(athlete_id, trainer_id) values ($1, $2)", [member, trainer]);
    // De trainer verliest zijn rol; het lid kan de koppeling toch intrekken.
    await as(admin, "update profiles set community_roles = '{}' where id = $1", [trainer]);
    await as(member, "update training_coach_assignments set status = 'revoked' where athlete_id = $1", [member]);
    const { rows } = await db.query<{ status: string }>("select status from training_coach_assignments");
    expect(rows[0].status).toBe("revoked");
  });

  it("laat een lid zijn eigen workoutverslag schrijven", async () => {
    await as(member, "insert into training_workout_reports(profile_id, trainer_id) values ($1, $2)", [member, trainer]);
  });
});

describe("0205: definer-functies", () => {
  it("zijn niet meer aan te roepen door leden, wel door de service-role", async () => {
    const privilege = async (role: string, fn: string) =>
      (
        await db.query<{ ok: boolean }>(`select has_function_privilege('${role}', '${fn}', 'execute') as ok`)
      ).rows[0].ok;
    expect(await privilege("authenticated", "public.rate_limit_cleanup()")).toBe(false);
    expect(await privilege("anon", "public.join_event_team_for_member(uuid, uuid, uuid)")).toBe(false);
    expect(await privilege("service_role", "public.rate_limit_cleanup()")).toBe(true);
  });
});
