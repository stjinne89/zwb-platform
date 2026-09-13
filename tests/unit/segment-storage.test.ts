import { describe, expect, it, vi } from "vitest";
import { storeActivitySegmentEfforts } from "@/lib/segments/sync";

describe("activity segment replacement", () => {
  it("atomically replaces even an empty result so removed efforts disappear", async () => {
    const rpc = vi.fn().mockResolvedValue({ data:0,error:null });
    expect(await storeActivitySegmentEfforts({ from:vi.fn(),rpc },"owner",{ id:123,start_date:"2026-09-13",efforts_fetched_at:null },{ segment_efforts:[] })).toBe(0);
    expect(rpc).toHaveBeenCalledWith("replace_activity_segment_efforts",{ p_profile:"owner",p_activity:123,p_rows:[] });
  });
  it("keeps elapsed and moving time distinct, with stable effort identity", async () => {
    const rpc = vi.fn().mockResolvedValue({ data:1,error:null });
    const detail = { segment_efforts:[{ id:1,elapsed_time:120,moving_time:90,segment:{ id:55,name:"Sprint" } }] };
    await storeActivitySegmentEfforts({ from:vi.fn(),rpc },"owner",{ id:123,start_date:"2026-09-13",efforts_fetched_at:null },detail);
    const row = rpc.mock.calls[0][1].p_rows[0];
    expect(row.elapsed_time_seconds).toBe(120); expect(row.moving_time_seconds).toBe(90); expect(row.effort_uid).toBe("owner:1");
  });
  it("does not mark failed writes as successfully synchronized", async () => {
    const rpc = vi.fn().mockResolvedValue({ error:{ message:"database unavailable" } });
    await expect(storeActivitySegmentEfforts({ from:vi.fn(),rpc },"owner",{ id:123,start_date:"2026-09-13",efforts_fetched_at:null },{})).rejects.toThrow("database unavailable");
  });
});
