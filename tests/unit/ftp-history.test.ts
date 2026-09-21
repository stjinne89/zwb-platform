import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { ftpOnDate, ftpResolver } from "@/lib/training/ftp-history";
import { rideLoadRows, rideMetricsFromStrava } from "@/lib/training/ride-metrics";

const history = [
  { effectiveFrom: "1900-01-01", ftpWatts: 250 },
  { effectiveFrom: "2026-09-10", ftpWatts: 266 },
];

describe("ftpOnDate", () => {
  it("geeft de FTP die op de dag gold", () => {
    expect(ftpOnDate(history, "2026-09-09", 300)).toBe(250);
    expect(ftpOnDate(history, "2026-09-10", 300)).toBe(266);
    expect(ftpOnDate(history, "2026-09-21", 300)).toBe(266);
  });

  it("valt vóór de eerste regel terug op de eerste bekende FTP", () => {
    expect(ftpOnDate([{ effectiveFrom: "2026-09-10", ftpWatts: 266 }], "2026-01-01", 300)).toBe(266);
  });

  it("gebruikt de fallback zonder historie of zonder datum", () => {
    expect(ftpOnDate([], "2026-09-09", 300)).toBe(300);
    expect(ftpOnDate(history, null, 300)).toBe(300);
  });

  it("sorteert zelf in ftpResolver", () => {
    const at = ftpResolver([...history].reverse(), null);
    expect(at("2026-09-09")).toBe(250);
  });
});

describe("rideMetricsFromStrava met historie", () => {
  // Een uur op 250 W NP: TSS 100 bij FTP 250.
  const ride = (startDate: string) => ({
    start_date: startDate,
    moving_time: 3600,
    device_watts: true,
    weighted_average_watts: 250,
  });

  it("rekent een oude rit met de FTP van die dag, niet met de huidige", () => {
    const at = ftpResolver(history, 266);
    expect(rideMetricsFromStrava(ride("2026-09-01T08:00:00Z"), null, at).tss).toBe(100);
    expect(rideMetricsFromStrava(ride("2026-09-15T08:00:00Z"), null, at).tss).toBe(88);
    // Met een vaste FTP blijft het oude gedrag.
    expect(rideMetricsFromStrava(ride("2026-09-01T08:00:00Z"), null, 266).tss).toBe(88);
  });

  it("gebruikt de Amsterdamse dag van de rit", () => {
    // 9 september 23:30 UTC is 10 september 01:30 in Amsterdam.
    const at = ftpResolver(history, 266);
    expect(rideMetricsFromStrava(ride("2026-09-09T23:30:00Z"), null, at).intensityFactor).toBe(0.94);
  });

  it("werkt door in rideLoadRows", () => {
    const rows = rideLoadRows(
      [{ id: 1, name: "Rit", start_date: "2026-09-01T08:00:00Z", moving_time_seconds: 3600, raw: ride("2026-09-01T08:00:00Z") }],
      ftpResolver(history, 266),
    );
    expect(rows[0].training_load).toBe(100);
  });
});

describe("migratie 0175", () => {
  let db: PGlite;
  const memberId = "00000000-0000-0000-0000-000000000001";
  const otherId = "00000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    db = new PGlite();
    await db.exec([
      "create role anon; create role authenticated;",
      "create schema auth;",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
      "create function public.current_user_can_train_profile(target_profile uuid) returns boolean language sql stable as $$ select auth.uid() = target_profile $$;",
      "create table public.profiles(id uuid primary key, ftp_watts numeric);",
      `insert into public.profiles values ('${memberId}', 250), ('${otherId}', null);`,
      "grant usage on schema public, auth to anon, authenticated;",
    ].join("\n"));
    await db.exec(await readFile("supabase/migrations/0175_profile_ftp_history.sql", "utf8"));
    await db.exec("grant select on all tables in schema public to authenticated;");
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  beforeEach(async () => {
    await db.exec("reset role;");
  });

  const rows = async (id: string) =>
    (
      await db.query<{ effective_from: string; ftp_watts: number }>(
        "select effective_from::text, ftp_watts from profile_ftp_history where profile_id = $1 order by effective_from",
        [id],
      )
    ).rows;

  it("zet de huidige FTP neer vanaf 1900, dus er verschuift niets", async () => {
    expect(await rows(memberId)).toEqual([{ effective_from: "1900-01-01", ftp_watts: 250 }]);
    expect(await rows(otherId)).toEqual([]);
  });

  it("legt een wijziging vast vanaf vandaag, en per dag telt de laatste", async () => {
    await db.query("update profiles set ftp_watts = 266 where id = $1", [memberId]);
    await db.query("update profiles set ftp_watts = 268 where id = $1", [memberId]);
    const after = await rows(memberId);
    expect(after).toHaveLength(2);
    expect(after[0].ftp_watts).toBe(250);
    expect(after[1].ftp_watts).toBe(268);
  });

  it("slaat geen regel op bij null of een ongewijzigde waarde", async () => {
    const before = (await rows(memberId)).length;
    await db.query("update profiles set ftp_watts = ftp_watts where id = $1", [memberId]);
    await db.query("update profiles set ftp_watts = null where id = $1", [otherId]);
    expect(await rows(memberId)).toHaveLength(before);
    expect(await rows(otherId)).toEqual([]);
  });

  it("laat een lid alleen zijn eigen historie lezen, en niet schrijven", async () => {
    await db.exec(`select set_config('request.jwt.claim.sub', '${otherId}', false); set role authenticated;`);
    expect((await db.query("select * from profile_ftp_history")).rows).toHaveLength(0);
    await expect(
      db.query(`insert into profile_ftp_history values ('${otherId}', '2026-01-01', 200)`),
    ).rejects.toThrow();
  });
});
