import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// DB-backed fixed-window rate limiter (zie migratie 0062). Bewust *fail-open*:
// als de limiter zelf faalt mag dat de normale werking niet blokkeren — de
// limiter is een misbruik-rem, geen kritieke beveiligingspoort.

export async function rateLimitHit(
  bucket: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) return { allowed: true };
    return { allowed: data === true };
  } catch {
    return { allowed: true };
  }
}

/** Beste-schatting client-IP uit de proxy-headers (Netlify/Vercel). */
export async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("x-nf-client-connection-ip") ?? "unknown";
}

/** IP uit een Request (voor route handlers). */
export function clientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-nf-client-connection-ip") ??
    "unknown"
  );
}
