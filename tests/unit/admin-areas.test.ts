import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { ADMIN_AREAS } from "@/lib/admin-areas";
import { ADMIN_NAV } from "@/app/(app)/_components/nav-config";
import { COMMUNITY_PERMISSION_IDS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

describe("register van beheergebieden", () => {
  it("vult het beheermenu, en elk gebied vraagt een bestaand recht", () => {
    expect(ADMIN_NAV.map((item) => item.href)).toEqual(Object.values(ADMIN_AREAS).map((area) => area.href));
    for (const area of Object.values(ADMIN_AREAS)) {
      expect(COMMUNITY_PERMISSION_IDS).toContain(area.permission);
    }
  });

  it("geeft standaardrollen alleen bestaande rechten", () => {
    for (const permissions of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permission of permissions) expect(COMMUNITY_PERMISSION_IDS).toContain(permission);
    }
  });
});

/** De laatste migratie die de toegestane rechtenlijst opnieuw vastlegt. */
async function latestAllowedList() {
  const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files.reverse()) {
    const sql = await readFile(`supabase/migrations/${file}`, "utf8");
    const match = /add constraint community_role_permissions_allowed[\s\S]*?array\[([\s\S]*?)\]::text\[\]/.exec(sql);
    if (match) return { file, ids: [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) };
  }
  throw new Error("Geen migratie met community_role_permissions_allowed.");
}

describe("rechten in de database", () => {
  it("staan in de laatste check precies zoals in de code", async () => {
    const { ids } = await latestAllowedList();
    expect([...ids].sort()).toEqual([...COMMUNITY_PERMISSION_IDS].sort());
  });

  it("0206 geeft elke rol het nieuwe recht als hij het oude had, en ruimt live.manage op", async () => {
    const db = new PGlite();
    try {
      await db.exec(
        "create table public.community_role_permissions(role text primary key, permissions text[] not null default '{}');",
      );
      await db.exec(`insert into community_role_permissions values
        ('board', '{events.manage_all,community.manage,live.manage}'),
        ('team_captain', '{teams.manage_roster,events.create}'),
        ('community_manager', '{events.manage_all,community.manage,live.manage,live.start}'),
        ('event_organizer', '{events.create,src.manage}'),
        ('community_member', '{content.create_posts,live.start}');`);
      await db.exec(await readFile("supabase/migrations/0206_themed_permissions.sql", "utf8"));
      const { rows } = await db.query<{ role: string; permissions: string[] }>(
        "select role, permissions from community_role_permissions order by role",
      );
      const byRole = Object.fromEntries(rows.map((row) => [row.role, row.permissions]));
      expect(byRole.board).toEqual(
        expect.arrayContaining(["calendar.sources", "competitions.manage", "integrations.manage", "notifications.broadcast", "zwbgame.manage"]),
      );
      expect(byRole.community_manager).toEqual(
        expect.arrayContaining(["calendar.sources", "competitions.manage", "integrations.manage", "notifications.broadcast"]),
      );
      expect(byRole.community_manager).not.toContain("zwbgame.manage");
      expect(byRole.team_captain).toEqual(["competitions.manage", "events.create", "teams.manage_roster"]);
      expect(byRole.event_organizer).toEqual(["events.create", "src.manage"]);
      expect(rows.flatMap((row) => row.permissions)).not.toContain("live.manage");
      // De check staat erop: een onbekend recht wordt geweigerd.
      await expect(
        db.exec("update community_role_permissions set permissions = '{live.manage}' where role = 'board'"),
      ).rejects.toThrow();
    } finally {
      await db.close();
    }
  });
});
