import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OwnTracksPayload = {
  _type?: string;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
  alt?: number | string;
  vel?: number | string;
  tst?: number | string;
  batt?: number | string;
  conn?: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function bearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || request.nextUrl.searchParams.get("token")?.trim() || null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function recordedAtFromPayload(payload: OwnTracksPayload) {
  const tst = toNumber(payload.tst);
  if (!tst) return new Date().toISOString();
  const date = new Date(tst * 1000);
  const min = new Date("2020-01-01T00:00:00Z").getTime();
  const max = Date.now() + 24 * 60 * 60 * 1000;
  if (date.getTime() < min || date.getTime() > max) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

async function readPayload(request: NextRequest): Promise<OwnTracksPayload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as OwnTracksPayload;
  }

  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as OwnTracksPayload;
  } catch {
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries()) as OwnTracksPayload;
  }
}

export async function POST(request: NextRequest) {
  const rawToken = bearerToken(request);
  if (!rawToken) {
    return NextResponse.json({ ok: false, error: "Token ontbreekt." }, { status: 401 });
  }

  let payload: OwnTracksPayload;
  try {
    payload = await readPayload(request);
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige payload." }, { status: 400 });
  }

  if (payload._type && payload._type !== "location") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const lat = toNumber(payload.lat);
  const lng = toNumber(payload.lon ?? payload.lng);
  if (lat === null || lng === null) {
    return NextResponse.json({ ok: false, error: "lat/lon ontbreekt." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "lat/lon buiten bereik." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Admin client onbeschikbaar." },
      { status: 500 },
    );
  }

  const { data: tokenRow, error: tokenError } = await admin
    .from("live_tracker_tokens")
    .select("id, profile_id, enabled, revoked_at, profiles(is_approved)")
    .eq("provider", "owntracks")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ ok: false, error: tokenError.message }, { status: 500 });
  }
  if (!tokenRow || !tokenRow.enabled || tokenRow.revoked_at) {
    return NextResponse.json({ ok: false, error: "Token ongeldig." }, { status: 403 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!((tokenRow as any).profiles?.is_approved ?? false)) {
    return NextResponse.json({ ok: false, error: "Profiel niet goedgekeurd." }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { data: existingSession } = await admin
    .from("live_sessions")
    .select("id")
    .eq("profile_id", tokenRow.profile_id)
    .eq("mode", "outdoor")
    .eq("source", "owntracks")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId = existingSession?.id as string | undefined;
  if (sessionId) {
    await admin
      .from("live_sessions")
      .update({ last_seen_at: nowIso })
      .eq("id", sessionId);
  } else {
    const { data: newSession, error: sessionError } = await admin
      .from("live_sessions")
      .insert({
        profile_id: tokenRow.profile_id,
        mode: "outdoor",
        source: "owntracks",
        status_text: "OwnTracks live",
        visibility: "members",
        last_seen_at: nowIso,
      })
      .select("id")
      .single();
    if (sessionError) {
      return NextResponse.json({ ok: false, error: sessionError.message }, { status: 500 });
    }
    sessionId = newSession.id;
  }

  const recorded_at = recordedAtFromPayload(payload);
  const { error: positionError } = await admin.from("live_positions").insert({
    session_id: sessionId,
    profile_id: tokenRow.profile_id,
    lat,
    lng,
    altitude: toNumber(payload.alt),
    speed_kmh: toNumber(payload.vel),
    recorded_at,
  });
  if (positionError) {
    return NextResponse.json({ ok: false, error: positionError.message }, { status: 500 });
  }

  await admin
    .from("live_tracker_tokens")
    .update({ last_seen_at: nowIso })
    .eq("id", tokenRow.id);

  return NextResponse.json({
    ok: true,
    sessionId,
    recorded_at,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "owntracks",
    message: "POST OwnTracks location payloads naar dit endpoint.",
  });
}
