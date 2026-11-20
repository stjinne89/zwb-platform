import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGateProfile, resetGateProfileCache } from "@/lib/auth/gate-profile";

function client(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn(async () => result);
  const chain = { select: () => chain, eq: () => chain, maybeSingle };
  return { supabase: { from: () => chain } as never, maybeSingle };
}

const PROFILE = { is_approved: true, is_admin: false, community_roles: ["zrl"] };

describe("loadGateProfile", () => {
  afterEach(() => {
    resetGateProfileCache();
    vi.useRealTimers();
  });

  it("vraagt het profiel binnen een minuut maar één keer op", async () => {
    const { supabase, maybeSingle } = client({ data: PROFILE, error: null });
    expect(await loadGateProfile(supabase, "lid-1")).toEqual(PROFILE);
    expect(await loadGateProfile(supabase, "lid-1")).toEqual(PROFILE);
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("vraagt het opnieuw na een minuut", async () => {
    vi.useFakeTimers();
    const { supabase, maybeSingle } = client({ data: PROFILE, error: null });
    await loadGateProfile(supabase, "lid-1");
    vi.advanceTimersByTime(61_000);
    await loadGateProfile(supabase, "lid-1");
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("onthoudt per lid", async () => {
    const { supabase, maybeSingle } = client({ data: PROFILE, error: null });
    await loadGateProfile(supabase, "lid-1");
    await loadGateProfile(supabase, "lid-2");
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("onthoudt geen fout en geen ontbrekend profiel", async () => {
    const failing = client({ data: null, error: new Error("netwerk") });
    expect(await loadGateProfile(failing.supabase, "lid-1")).toBeNull();
    expect(await loadGateProfile(failing.supabase, "lid-1")).toBeNull();
    expect(failing.maybeSingle).toHaveBeenCalledTimes(2);
  });
});
