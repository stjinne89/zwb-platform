import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitHit, clientIpFromRequest } from "@/lib/rate-limit";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { deliverRideMessage, eventMessageRecipients } from "@/lib/ride-messages/deliver";
import { normalizeRideMessage } from "@/lib/telegram/bot";

// Live-chat op de liveticker. Eén route voor beide pagina's:
//   GET  → laatste publieke (niet-interne) berichten — gepolled door de
//          publieke /live/[eventId]-pagina.
//   POST → bericht plaatsen. Ingelogde goedgekeurde leden posten als zichzelf
//          (mogen 'internal_only'); anonieme bezoekers posten met een gastnaam.
//          De maker van het event en wie events.manage_all heeft, kunnen het
//          bericht ook naar de fietscomputers van de rijders sturen (0253).
// Beide staan in PUBLIC_PATHS zodat anon erbij kan.

const MAX_BODY = 500;
const MAX_NAME = 40;
const THROTTLE_MS = 2000;
const LIVE_STALE_MS = 15 * 60 * 1000;
const BASE_COLUMNS = "id, profile_id, guest_name, body, created_at, internal_only, profiles(display_name)";

type ChatRow = {
  id: string;
  profile_id: string | null;
  guest_name: string | null;
  body: string;
  created_at: string;
  internal_only?: boolean | null;
  to_riders?: boolean | null;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

function shape(row: ChatRow) {
  const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const isGuest = !row.profile_id;
  return {
    id: row.id,
    profileId: row.profile_id,
    name: isGuest
      ? row.guest_name || "Gast"
      : prof?.display_name || "ZWB'er",
    isGuest,
    body: row.body,
    createdAt: row.created_at,
    internal: Boolean(row.internal_only),
    toRiders: Boolean(row.to_riders),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventId) return NextResponse.json({ messages: [] });

  const since = new URL(req.url).searchParams.get("since");

  // Goedgekeurde leden (cookie) zien ook interne berichten; anon/publiek niet.
  let includeInternal = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .maybeSingle();
      includeInternal = Boolean(profile?.is_approved);
    }
  } catch {
    // anon → alleen publieke berichten
  }

  const admin = createAdminClient();
  const load = (columns: string) => {
    let query = admin
      .from("event_chat_messages")
      .select(columns)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!includeInternal) query = query.eq("internal_only", false);
    if (since) query = query.gt("created_at", since);
    return query;
  };

  // Zonder migratie 0253 bestaat to_riders niet; dan zonder die kolom.
  const full = await load(`${BASE_COLUMNS}, to_riders`);
  const { data } = full.error ? await load(BASE_COLUMNS) : full;
  const messages = ((data ?? []) as unknown as ChatRow[]).map(shape).reverse();
  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Geen event." }, { status: 400 });
  }

  let payload: {
    body?: string;
    guestName?: string;
    internalOnly?: boolean;
    toRiders?: boolean;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige payload." }, { status: 400 });
  }

  // IP-rem tegen floods (naast de per-poster throttle verderop): max 20/min.
  const ip = clientIpFromRequest(req);
  if (!(await rateLimitHit("chat", ip, 20, 60)).allowed) {
    return NextResponse.json(
      { ok: false, error: "Te veel berichten. Wacht even." },
      { status: 429 },
    );
  }

  const body = (payload.body ?? "").replace(/\s+/g, " ").trim();
  if (!body) {
    return NextResponse.json({ ok: false, error: "Leeg bericht." }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, error: `Bericht is te lang (max ${MAX_BODY}).` },
      { status: 400 },
    );
  }

  // Identiteit bepalen via de sessie-cookie.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileId: string | null = null;
  let guestName: string | null = null;
  let internalOnly = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_approved) {
      profileId = user.id;
      internalOnly = Boolean(payload.internalOnly);
    }
  }

  if (!profileId) {
    // Gast: naam verplicht, nooit intern.
    guestName = (payload.guestName ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
    if (guestName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Vul een naam in om mee te chatten." },
        { status: 400 },
      );
    }
  }

  const admin = createAdminClient();

  // Naar de fietscomputers: alleen de maker van het event of een beheerder.
  let riderMessage: { senderName: string; recipientIds: string[] } | null = null;
  if (payload.toRiders) {
    if (!profileId) {
      return NextResponse.json({ ok: false, error: "Geen toegang." }, { status: 403 });
    }
    const [{ data: event }, access, { data: sender }] = await Promise.all([
      admin.from("events").select("created_by").eq("id", eventId).maybeSingle(),
      getCurrentUserAccess(supabase),
      admin.from("profiles").select("display_name").eq("id", profileId).maybeSingle(),
    ]);
    if (!event || (event.created_by !== profileId && !access.has("events.manage_all"))) {
      return NextResponse.json({ ok: false, error: "Geen toegang." }, { status: 403 });
    }
    if (!(await rateLimitHit("ride_message", profileId, 10, 600)).allowed) {
      return NextResponse.json(
        { ok: false, error: "Te veel berichten. Wacht even." },
        { status: 429 },
      );
    }
    const [{ data: rsvps }, { data: live }] = await Promise.all([
      admin.from("event_rsvps").select("profile_id, status").eq("event_id", eventId),
      admin
        .from("live_sessions")
        .select("profile_id")
        .is("ended_at", null)
        .gte("last_seen_at", new Date(Date.now() - LIVE_STALE_MS).toISOString()),
    ]);
    riderMessage = {
      senderName: sender?.display_name || "ZWB'er",
      recipientIds: eventMessageRecipients(
        (rsvps ?? []) as Array<{ profile_id: string; status: string }>,
        (live ?? []).map((row) => row.profile_id as string),
        profileId,
      ),
    };
  }

  // Lichte throttle: weiger als dezelfde poster < 2s geleden iets plaatste.
  const cutoff = new Date(Date.now() - THROTTLE_MS).toISOString();
  let throttleQuery = admin
    .from("event_chat_messages")
    .select("id")
    .eq("event_id", eventId)
    .gte("created_at", cutoff)
    .limit(1);
  throttleQuery = profileId
    ? throttleQuery.eq("profile_id", profileId)
    : throttleQuery.eq("guest_name", guestName as string);
  const { data: recent } = await throttleQuery;
  if (recent && recent.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Even rustig — wacht een paar tellen." },
      { status: 429 },
    );
  }

  const row: Record<string, unknown> = {
    event_id: eventId,
    profile_id: profileId,
    guest_name: guestName,
    body,
    internal_only: internalOnly,
  };
  let { error } = await admin
    .from("event_chat_messages")
    .insert(riderMessage ? { ...row, to_riders: true } : row);
  // Zonder migratie 0253: bericht toch in de chat, zonder markering.
  if (error && riderMessage) {
    ({ error } = await admin.from("event_chat_messages").insert(row));
  }
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (riderMessage) {
    const { reached } = await deliverRideMessage(admin, {
      recipientIds: riderMessage.recipientIds,
      senderName: riderMessage.senderName,
      body: normalizeRideMessage(body),
      url: `/events/${eventId}`,
      tag: `ride-event-${eventId}`,
    });
    return NextResponse.json({ ok: true, reached });
  }

  return NextResponse.json({ ok: true });
}

// Moderatie: auteur of admin verwijdert. RLS op de auth-client dwingt dit af.
export async function DELETE(req: Request) {
  const messageId = new URL(req.url).searchParams.get("id");
  if (!messageId) {
    return NextResponse.json({ ok: false, error: "Geen bericht-id." }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd." }, { status: 401 });
  }
  const { error } = await supabase
    .from("event_chat_messages")
    .delete()
    .eq("id", messageId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
