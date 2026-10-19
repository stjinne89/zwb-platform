import { beforeEach, describe, expect, it, vi } from "vitest";
import { RIDE_MESSAGE_MAX } from "@/lib/telegram/limits";

let userId: string | null;
let allowed: boolean;
const rateLimitHit = vi.fn();
const deliverRideMessage = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitHit: (...args: unknown[]) => {
    rateLimitHit(...args);
    return Promise.resolve({ allowed });
  },
}));
vi.mock("@/lib/ride-messages/deliver", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ride-messages/deliver")>()),
  deliverRideMessage: (...args: unknown[]) => deliverRideMessage(...args),
}));

const { sendTestRideMessage } = await import("@/app/(app)/live/_actions");
const { TEST_RIDE_MESSAGE } = await import("@/lib/ride-messages/deliver");

describe("sendTestRideMessage", () => {
  beforeEach(() => {
    userId = "lid";
    allowed = true;
    rateLimitHit.mockClear();
    deliverRideMessage.mockReset().mockResolvedValue({ reached: 1 });
  });

  it("stuurt alleen naar het eigen profiel, met ZWB als afzender", async () => {
    await expect(sendTestRideMessage()).resolves.toEqual({ ok: true, reached: 1 });
    expect(rateLimitHit).toHaveBeenCalledWith("ride_message_test", "lid", 3, 600);
    expect(deliverRideMessage).toHaveBeenCalledTimes(1);
    expect(deliverRideMessage.mock.calls[0][1]).toMatchObject({
      recipientIds: ["lid"],
      senderName: "ZWB",
      body: TEST_RIDE_MESSAGE,
    });
  });

  it("geeft door dat niets aankwam", async () => {
    deliverRideMessage.mockResolvedValue({ reached: 0 });
    await expect(sendTestRideMessage()).resolves.toEqual({ ok: true, reached: 0 });
  });

  it("stuurt niets boven de rem", async () => {
    allowed = false;
    const res = await sendTestRideMessage();
    expect(res.ok).toBe(false);
    expect(deliverRideMessage).not.toHaveBeenCalled();
  });

  it("stuurt niets zonder ingelogd lid", async () => {
    userId = null;
    const res = await sendTestRideMessage();
    expect(res.ok).toBe(false);
    expect(rateLimitHit).not.toHaveBeenCalled();
    expect(deliverRideMessage).not.toHaveBeenCalled();
  });

  it("past in één regel op de ELEMNT", () => {
    expect(TEST_RIDE_MESSAGE.length).toBeLessThanOrEqual(RIDE_MESSAGE_MAX);
    expect(TEST_RIDE_MESSAGE).not.toMatch(/\n/);
  });
});
