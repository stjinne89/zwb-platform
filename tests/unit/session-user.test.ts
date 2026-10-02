import { describe, expect, it, vi } from "vitest";
import { getSessionUser } from "@/lib/auth/session-user";

function client(claims: unknown, user: unknown = null) {
  const getUser = vi.fn(async () => ({ data: { user }, error: null }));
  const getClaims = vi.fn(async () => claims);
  return { supabase: { auth: { getClaims, getUser } } as never, getUser };
}

describe("getSessionUser", () => {
  it("leest de gebruiker uit het JWT, zonder de Auth-server te vragen", async () => {
    const { supabase, getUser } = client({ data: { claims: { sub: "lid-1", email: "a@zwb.nl" } }, error: null });
    expect(await getSessionUser(supabase)).toEqual({ id: "lid-1", email: "a@zwb.nl" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("geeft niemand terug zonder sessie, ook zonder netwerkrondje", async () => {
    const { supabase, getUser } = client({ data: null, error: null });
    expect(await getSessionUser(supabase)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("valt terug op de Auth-server als de lokale controle faalt", async () => {
    const { supabase, getUser } = client({ data: null, error: new Error("jwks") }, { id: "lid-2", email: "b@zwb.nl" });
    expect(await getSessionUser(supabase)).toEqual({ id: "lid-2", email: "b@zwb.nl" });
    expect(getUser).toHaveBeenCalledOnce();
  });

  it("is niemand als ook de Auth-server de sessie niet kent", async () => {
    const { supabase } = client({ data: null, error: new Error("invalid") }, null);
    expect(await getSessionUser(supabase)).toBeNull();
  });
});

describe("getSessionUser bij een onverwachte fout", () => {
  it("valt terug op de Auth-server als de lokale controle een fout gooit", async () => {
    const getUser = vi.fn(async () => ({ data: { user: { id: "lid-3", email: "c@zwb.nl" } }, error: null }));
    const supabase = { auth: { getClaims: vi.fn(async () => { throw new Error("crypto"); }), getUser } } as never;
    expect(await getSessionUser(supabase)).toEqual({ id: "lid-3", email: "c@zwb.nl" });
  });
});
