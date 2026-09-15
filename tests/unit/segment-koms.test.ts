import { describe, expect, it, vi } from "vitest";
import { KOM_REFRESH_LIMIT, refreshSegmentKoms } from "@/lib/segments/koms";

function admin(result: unknown) {
  const abortSignal = vi.fn(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)));
  return { rpc: vi.fn(() => ({ abortSignal })), abortSignal };
}

describe("refreshSegmentKoms", () => {
  it("recomputes a bounded batch and reports the number of segments", async () => {
    const db = admin({ data: 37, error: null });
    expect(await refreshSegmentKoms(db, { deadline: 5000, now: () => 0 })).toEqual({ segments: 37 });
    expect(db.rpc).toHaveBeenCalledWith("refresh_segment_koms", { p_limit: KOM_REFRESH_LIMIT });
  });
  it("skips when the run budget is nearly spent", async () => {
    const db = admin({ data: 1, error: null });
    expect(await refreshSegmentKoms(db, { deadline: 900, now: () => 0 })).toEqual({ skipped: true });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("never throws on a missing migration or timeout", async () => {
    expect(await refreshSegmentKoms(admin({ data: null, error: { message: "function does not exist" } }), { deadline: 5000, now: () => 0 }))
      .toEqual({ error: "function does not exist" });
    expect(await refreshSegmentKoms(admin(new Error("aborted")), { deadline: 5000, now: () => 0 })).toEqual({ error: "aborted" });
  });
});
