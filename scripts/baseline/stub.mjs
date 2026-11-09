// Een lege PGlite die genoeg op een nieuw Supabase-project lijkt om de migraties
// af te spelen: de rollen, auth, storage, de publicatie voor realtime, uuid-ossp
// in het schema extensions en de standaardrechten die Supabase op nieuwe objecten
// in public zet. Gebruikt door scripts/build-baseline.mjs en de baselinetest.
//
// Wat dit niet is: Supabase zelf. Het bewijst dat de SQL klopt en in volgorde
// afloopt, niet hoe een echt project zich gedraagt (docs/installatie.md).

import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import fs from "node:fs";
import path from "node:path";

export const MIGRATIONS_DIR = path.resolve("supabase/migrations");
export const BASELINE_DIR = path.resolve("supabase/baseline");

/** Het laatste migratienummer dat in de baseline zit. */
export const BASELINE_VERSION = 320;

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
grant usage on schema public, extensions to anon, authenticated, service_role;
create table auth.users(
  id uuid primary key,
  email text,
  phone text,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  deleted_at timestamptz
);
create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid, created_at timestamptz default now(), updated_at timestamptz default now(), refreshed_at timestamp, not_after timestamptz);
create table auth.refresh_tokens(id bigserial primary key, user_id varchar, updated_at timestamptz default now(), created_at timestamptz default now());
create table auth.identities(id uuid primary key default gen_random_uuid(), user_id uuid, provider text, identity_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.email() returns text language sql stable as $$ select current_setting('request.jwt.claim.email', true) $$;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[], owner uuid, created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[], created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
create function storage.filename(name text) returns text language sql as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
create function storage.extension(name text) returns text language sql as $$ select split_part(name, '.', 2) $$;
alter table storage.objects enable row level security;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
set search_path = public, extensions;
`;

/** Een nieuwe, lege database met de Supabase-stub. */
export async function createSupabasePglite() {
  const db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(SUPABASE_STUB);
  return db;
}

/** Nummer van een migratiebestand: "0320_club_recognition.sql" → 320. */
export function migrationNumber(file) {
  return Number(file.slice(0, 4));
}

/** De migratiebestanden op volgorde, eventueel alleen die na een nummer. */
export function migrationFiles({ after = -1 } = {}) {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .filter((file) => migrationNumber(file) > after);
}

/** Speelt bestanden af; een fout noemt het bestand. */
export async function applySqlFiles(db, files, dir = MIGRATIONS_DIR) {
  for (const file of files) {
    // Op Windows checkt git de bestanden uit met CRLF; zonder dit komt een CR in
    // functies en in tekst van de seed. In git en op productie is het LF.
    const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
    try {
      await db.exec(sql);
    } catch (err) {
      throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
    // Een migratie kan het pad veranderen (set search_path); zet het terug.
    await db.exec("set search_path = public, extensions;");
  }
}

/**
 * Een vingerafdruk van het schema: tabellen en kolommen, constraints, indexen,
 * functies, policies, triggers, rechten, buckets en de realtimepublicatie.
 * Twee databases met dezelfde vingerafdruk hebben hetzelfde schema.
 */
export async function schemaFingerprint(db) {
  const rows = async (sql) => (await db.query(sql)).rows.map((row) => Object.values(row).join(" | "));
  return {
    columns: await rows(`
      select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, coalesce(c.column_default, '')
      from information_schema.columns c
      where c.table_schema = 'public'
      order by 1, 2`),
    // Zonder haakjes: Postgres schrijft "a AND (b AND c)" na opnieuw inlezen als
    // "a AND b AND c". Dat is dezelfde check.
    constraints: (
      await rows(`
      select conrelid::regclass::text, conname, pg_get_constraintdef(oid)
      from pg_constraint
      where connamespace = 'public'::regnamespace
      order by 1, 2`)
    ).map((row) => row.replace(/[()]/g, "")),
    indexes: await rows(`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`),
    functions: await rows(`
      select p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid))
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
      order by 1`),
    views: await rows(`select viewname, md5(definition) from pg_views where schemaname = 'public' order by 1`),
    policies: await rows(`
      select schemaname, tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')
      from pg_policies
      where schemaname in ('public', 'storage')
      order by 1, 2, 3`),
    rls: await rows(`
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r'
      order by 1`),
    triggers: await rows(`
      select tgrelid::regclass::text, tgname, pg_get_triggerdef(oid)
      from pg_trigger
      where not tgisinternal
      order by 1, 2`),
    tableGrants: await rows(`
      select c.relname, a.grantee::regrole::text, a.privilege_type
      from pg_class c, aclexplode(c.relacl) a
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'S') and a.grantee <> 0
      order by 1, 2, 3`),
    functionGrants: await rows(`
      select p.oid::regprocedure::text, case when a.grantee = 0 then 'public' else a.grantee::regrole::text end, a.privilege_type
      from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where p.pronamespace = 'public'::regnamespace
      order by 1, 2, 3`),
    buckets: await rows(`select id, public, coalesce(file_size_limit, 0), coalesce(allowed_mime_types::text, '') from storage.buckets order by 1`),
    publication: await rows(`select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1, 2`),
  };
}
