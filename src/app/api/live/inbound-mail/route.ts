import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationToMembers } from "@/lib/push/send";
import { rateLimitHit } from "@/lib/rate-limit";
import { extractExternalLink } from "@/lib/live/external-livetrack";
import {
  hashMailCode,
  inboundDomain,
  mailCodeFromRecipients,
  verifySvixSignature,
} from "@/lib/live/inbound-mail";

// Resend-webhook email.received: een LiveTrack-mail van Garmin of Wahoo aan
// live-<code>@LIVE_INBOUND_DOMAIN. De code wijst de renner aan; de link in de
// mail wordt een live-sessie. De mail zelf bewaren we niet.
//
// Alles wat geen bruikbare LiveTrack-mail is, krijgt 200 met `ignored`, zodat
// Resend niet blijft herhalen. Alleen een foute handtekening geeft 401.

type ReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[];
    received_for?: string[];
  };
};

type ReceivedEmail = {
  html?: string | null;
  text?: string | null;
};

const PROVIDER_LABEL = { garmin: "Garmin", wahoo: "Wahoo" } as const;

function ignored(reason: string) {
  return NextResponse.json({ ok: true, ignored: reason });
}

async function fetchReceivedEmail(emailId: string, apiKey: string) {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`Resend gaf HTTP ${res.status}.`);
  return (await res.json()) as ReceivedEmail;
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const domain = inboundDomain();
  if (!secret || !apiKey || !domain) {
    return NextResponse.json({ ok: false, error: "Niet ingesteld." }, { status: 503 });
  }

  const body = await request.text();
  const valid = verifySvixSignature(
    secret,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    body,
  );
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Ongeldige handtekening." }, { status: 401 });
  }

  let event: ReceivedEvent;
  try {
    event = JSON.parse(body) as ReceivedEvent;
  } catch {
    return ignored("geen json");
  }
  if (event.type !== "email.received" || !event.data?.email_id) {
    return ignored("geen email.received");
  }

  const code = mailCodeFromRecipients(
    [...(event.data.to ?? []), ...(event.data.received_for ?? [])],
    domain,
  );
  if (!code) return ignored("onbekende ontvanger");

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Admin client onbeschikbaar." },
      { status: 500 },
    );
  }

  const { data: tokenRow } = await admin
    .from("live_tracker_tokens")
    .select("id, profile_id, enabled, revoked_at, profiles(is_approved, display_name)")
    .eq("provider", "mail")
    .eq("token_hash", hashMailCode(code))
    .maybeSingle();
  if (!tokenRow || !tokenRow.enabled || tokenRow.revoked_at) {
    return ignored("adres niet actief");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (tokenRow as any).profiles;
  const approved = Array.isArray(profile) ? profile[0]?.is_approved : profile?.is_approved;
  const displayName = Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name;
  if (!approved) return ignored("profiel niet goedgekeurd");

  if (!(await rateLimitHit("live-mail", tokenRow.id, 30, 3600)).allowed) {
    return ignored("te veel mail");
  }

  let email: ReceivedEmail;
  try {
    email = await fetchReceivedEmail(event.data.email_id, apiKey);
  } catch (err) {
    // 500: Resend probeert de webhook later opnieuw.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Mail ophalen mislukt." },
      { status: 500 },
    );
  }

  const link = extractExternalLink(`${email.html ?? ""}\n${email.text ?? ""}`);
  const nowIso = new Date().toISOString();
  await admin
    .from("live_tracker_tokens")
    .update({ last_seen_at: nowIso })
    .eq("id", tokenRow.id);
  if (!link) return ignored("geen LiveTrack-link");

  const { data: existing } = await admin
    .from("live_sessions")
    .select("id")
    .eq("profile_id", tokenRow.profile_id)
    .eq("external_track_url", link.url)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    await admin.from("live_sessions").update({ last_seen_at: nowIso }).eq("id", existing.id);
    return NextResponse.json({ ok: true, sessionId: existing.id });
  }

  // Een nieuwe link is een nieuwe rit: de vorige externe sessie is voorbij.
  await admin
    .from("live_sessions")
    .update({ ended_at: nowIso })
    .eq("profile_id", tokenRow.profile_id)
    .in("source", ["garmin", "wahoo", "external"])
    .is("ended_at", null);

  const { data: session, error } = await admin
    .from("live_sessions")
    .insert({
      profile_id: tokenRow.profile_id,
      mode: "outdoor",
      source: link.provider,
      external_track_url: link.url,
      visibility: "members",
      last_seen_at: nowIso,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await sendNotificationToMembers(
    "on_live_started",
    {
      title: "ZWB'er is live",
      body: `${displayName ?? "Een ZWB'er"} is live via ${PROVIDER_LABEL[link.provider]}.`,
      url: "/live",
      tag: `live-${session.id}`,
    },
    { excludeProfileId: tokenRow.profile_id },
  ).catch(() => null);

  return NextResponse.json({ ok: true, sessionId: session.id });
}
