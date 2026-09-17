import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromRequest, rateLimitHit } from "@/lib/rate-limit";
import { sendNotificationToMembers } from "@/lib/push/send";
import { activeTrainersOf, canCoach } from "@/lib/training/coach-access";
import {
  loadChatMessages,
  MAX_CHAT_BODY,
  replanResultMessage,
  settlePendingCoachAnswers,
  startCoachAnswer,
} from "@/lib/training/coach-chat";
import { requestReplan } from "@/lib/training/replan";

// De coachchat van ZWBeter Worden. Eén doorlopend gesprek per lid:
//   GET    → de berichten, en onderweg het afhandelen van een coach-antwoord dat
//            nog bij OpenAI liep.
//   POST   → een bericht plaatsen. Is de afzender het lid zelf, dan start er een
//            coach-antwoord; is het zijn trainer, dan niet.
//   DELETE → eigen bericht weghalen; RLS dwingt dat af.
//
// Een route en geen server action, omdat de chat gepolld wordt — dezelfde
// uitzondering als de live-chat op een event.

/** Geen twee berichten binnen deze tijd van dezelfde afzender. */
const THROTTLE_MS = 2000;
/**
 * Hoeveel coach-antwoorden een lid per dag krijgt. Elk antwoord kost geld;
 * hetzelfde motief als de cooldown op de schema-herzieningen. Boven de limiet
 * komt het bericht er wél in — de trainer leest het — maar zonder AI-antwoord.
 */
const AI_ANSWERS_PER_DAY = 25;

/** Wie is dit, en mag die bij het gesprek van `athlete`? */
async function resolveViewer(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Niet ingelogd." };

  const admin = createAdminClient();
  const requested = new URL(req.url).searchParams.get("athlete");
  const profileId = requested || user.id;

  // Een id uit de URL gaat nooit rechtstreeks in een query: eerst de koppeling.
  if (profileId !== user.id && !(await canCoach(admin, user.id, profileId))) {
    return { ok: false as const, status: 403, error: "Geen toegang tot dit gesprek." };
  }

  return {
    ok: true as const,
    admin,
    userId: user.id,
    profileId,
    isMember: profileId === user.id,
  };
}

export async function GET(req: Request) {
  const viewer = await resolveViewer(req);
  if (!viewer.ok) {
    return NextResponse.json({ ok: false, error: viewer.error }, { status: viewer.status });
  }

  // Draait mee op de gewone poll van de chat, zodat er geen aparte route of cron
  // nodig is om een antwoord op te halen dat bij OpenAI klaarstaat.
  const { stillPending } = await settlePendingCoachAnswers(viewer.admin, viewer.profileId).catch(
    () => ({ stillPending: false }),
  );

  const messages = await loadChatMessages(viewer.admin, viewer.profileId);
  return NextResponse.json(
    { ok: true, messages, pending: stillPending },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(req: Request) {
  const viewer = await resolveViewer(req);
  if (!viewer.ok) {
    return NextResponse.json({ ok: false, error: viewer.error }, { status: viewer.status });
  }

  if (!(await rateLimitHit("training-chat", clientIpFromRequest(req), 20, 60)).allowed) {
    return NextResponse.json(
      { ok: false, error: "Te veel berichten. Wacht even." },
      { status: 429 },
    );
  }

  let payload: { body?: string; affectsPlan?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ongeldige payload." }, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  if (!body) {
    return NextResponse.json({ ok: false, error: "Leeg bericht." }, { status: 400 });
  }
  if (body.length > MAX_CHAT_BODY) {
    return NextResponse.json(
      { ok: false, error: `Bericht is te lang (max ${MAX_CHAT_BODY} tekens).` },
      { status: 400 },
    );
  }

  const { admin, userId, profileId, isMember } = viewer;

  // Lichte rem: weiger als dezelfde afzender net iets plaatste.
  const { data: recent } = await admin
    .from("training_chat_messages")
    .select("id")
    .eq("profile_id", profileId)
    .eq("author_id", userId)
    .gte("created_at", new Date(Date.now() - THROTTLE_MS).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Even rustig — wacht een paar tellen." },
      { status: 429 },
    );
  }

  // Het schema waar dit bericht bij hoort, zodat later te zien is bij welke
  // versie een vraag werd gesteld.
  const { data: nextWorkout } = await admin
    .from("training_workouts")
    .select("plan_id")
    .eq("profile_id", profileId)
    .is("superseded_at", null)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const planId = (nextWorkout as { plan_id: string } | null)?.plan_id ?? null;

  // Alleen het lid zelf kan zeggen dat iets zijn schema raakt; een trainer die
  // het schema wil wijzigen doet dat in de schema-tab.
  const affectsPlan = isMember && payload.affectsPlan === true;

  let replanResult: string | null = null;
  if (affectsPlan) {
    const result = await requestReplan(admin, profileId, `Chatbericht: ${body.slice(0, 120)}`).catch(
      () => null,
    );
    replanResult = result ? (result.started ? "started" : result.reason) : "failed";
  }

  const { error } = await admin.from("training_chat_messages").insert({
    profile_id: profileId,
    author_id: userId,
    role: isMember ? "member" : "trainer",
    body,
    status: "sent",
    plan_id: planId,
    affects_plan: affectsPlan,
    replan_result: replanResult,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const trainers = await activeTrainersOf(admin, profileId).catch(() => []);

  if (isMember) {
    // Boven de dagelijkse limiet komt er geen antwoord, maar het bericht staat er
    // wel: de trainer leest het alsnog.
    const withinBudget = (await rateLimitHit("training-chat-ai", profileId, AI_ANSWERS_PER_DAY, 86_400))
      .allowed;
    if (withinBudget) {
      await startCoachAnswer(admin, profileId, body, planId);
    } else {
      await admin.from("training_chat_messages").insert({
        profile_id: profileId,
        author_id: null,
        role: "coach",
        body: "Je hebt vandaag het maximum aan coach-antwoorden gehad. Je trainer ziet je bericht wel.",
        status: "failed",
        plan_id: planId,
      });
    }

    if (trainers.length > 0) {
      await sendNotificationToMembers(
        "on_training_chat",
        {
          title: "Nieuw bericht in de coachchat",
          body: "Een lid heeft iets gevraagd of ingebracht.",
          url: `/zwbeter-worden/trainer/coach?athlete=${profileId}`,
          // Eén tag per lid: vijf vragen op een avond zijn geen vijf meldingen.
          tag: `training-chat-${profileId}`,
        },
        { profileIds: trainers.map((trainer) => trainer.id) },
      ).catch(() => null);
    }
  } else {
    await sendNotificationToMembers(
      "on_training_chat",
      {
        title: "Je trainer reageerde",
        body: "Er staat een bericht in je coachchat.",
        url: "/zwbeter-worden/coach",
        tag: `training-chat-${profileId}`,
      },
      { profileIds: [profileId] },
    ).catch(() => null);
  }

  return NextResponse.json({ ok: true, planNote: affectsPlan ? replanResultMessage(replanResult) : null });
}

// Moderatie: alleen de auteur, en dus nooit een coach-antwoord. RLS op de
// auth-client dwingt dat af.
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
  const { error } = await supabase.from("training_chat_messages").delete().eq("id", messageId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
