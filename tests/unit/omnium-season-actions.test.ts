import { beforeEach, describe, expect, it, vi } from "vitest";

type Season = { id: string; slug: string; name?: string };
type InsertError = { code: string; message: string } | null;

let seasons: Season[];
let insertError: InsertError;
let inserted: Record<string, unknown> | null;
let concurrentSeason: Season | null;

function fakeAdmin() {
  return {
    from(table: string) {
      if (table !== "omnium_seasons") throw new Error(`Onverwachte tabel: ${table}`);

      let slugFilter: string | null = null;
      let pendingInsert: Record<string, unknown> | null = null;
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          if (column !== "slug") throw new Error(`Onverwacht filter: ${column}`);
          slugFilter = String(value);
          return builder;
        },
        maybeSingle: async () => ({
          data: seasons.find((season) => season.slug === slugFilter) ?? null,
          error: null,
        }),
        insert: (values: Record<string, unknown>) => {
          inserted = values;
          pendingInsert = values;
          return builder;
        },
        single: async () => {
          if (insertError) {
            if (concurrentSeason) seasons.push(concurrentSeason);
            return { data: null, error: insertError };
          }
          const season = {
            id: "nieuw-seizoen",
            slug: String(pendingInsert?.slug),
            name: String(pendingInsert?.name),
          };
          seasons.push(season);
          return { data: season, error: null };
        },
      };
      return builder;
    },
  };
}

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/auth/permissions", () => ({
  getCurrentUserAccess: async () => ({
    user: { id: "beheerder" },
    has: (permission: string) => permission === "omnium.manage",
  }),
}));

const { createOmniumSeason } = await import("@/app/(app)/beheer/omnium/_actions");

describe("createOmniumSeason", () => {
  beforeEach(() => {
    seasons = [];
    insertError = null;
    inserted = null;
    concurrentSeason = null;
  });

  it("opent een bestaand seizoen wanneer de slug al bestaat", async () => {
    seasons = [{ id: "bestaand", slug: "2026-27" }];

    const result = await createOmniumSeason({
      slug: "2026-27",
      name: "ZWB Omnium 2026/27",
    });

    expect(result).toEqual({
      ok: true,
      seasonId: "bestaand",
      seasonSlug: "2026-27",
    });
    expect(inserted).toBeNull();
  });

  it("normaliseert de slug en geeft de opgeslagen slug terug", async () => {
    const result = await createOmniumSeason({
      slug: " 2027-28 ",
      name: "ZWB Omnium 2027/28",
    });

    expect(inserted).toEqual(
      expect.objectContaining({ slug: "2027-28", name: "ZWB Omnium 2027/28" }),
    );
    expect(result).toEqual({
      ok: true,
      seasonId: "nieuw-seizoen",
      seasonSlug: "2027-28",
    });
  });

  it("herstelt van een gelijktijdige insert met dezelfde slug", async () => {
    insertError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "omnium_seasons_slug_key"',
    };
    concurrentSeason = { id: "gelijktijdig", slug: "2028-29" };

    const result = await createOmniumSeason({
      slug: "2028-29",
      name: "ZWB Omnium 2028/29",
    });

    expect(result).toEqual({
      ok: true,
      seasonId: "gelijktijdig",
      seasonSlug: "2028-29",
    });
  });
});
