// De coach in de chat: wat hij mag zeggen, wat hij te zien krijgt, en hoe zijn
// antwoord de functietimeout overleeft.
//
// Hij legt het schema uit én beantwoordt vragen over de gereden trainingsdata;
// die tweede taak kwam er op 18 september 2026 bij, omdat de coach tot dan toe
// alleen het plan kende en op een vraag over gereden ritten "dat kan ik niet
// zien" antwoordde. Wat hij daarvoor meekrijgt staat in chat-context.ts.
//
// Het antwoord loopt bewust in de achtergrond bij OpenAI (background: true) in
// plaats van synchroon in de POST. Een reasoning-call duurt tientallen seconden
// en dit project kapt server-werk af rond de tien; hetzelfde probleem is bij de
// schema-generaties al zo opgelost. De POST zet dus meteen een lege coach-rij
// neer met status 'pending', en de eerstvolgende GET haalt het antwoord op.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  getCoachModel,
  retrieveCoachAnswerBackground,
  startCoachAnswerBackground,
} from "@/lib/training/ai";
import { buildCoachChatContext } from "@/lib/training/chat-context";

type Admin = ReturnType<typeof createAdminClient>;

/** Langste bericht dat iemand kan plaatsen. */
export const MAX_CHAT_BODY = 1000;
/** Hoeveel eerdere berichten de coach als gespreksgeschiedenis meekrijgt. */
export const CHAT_HISTORY_LIMIT = 20;
/**
 * Hoe lang een antwoord mag "denken" voordat we het opgeven. Ruim boven een
 * normale call, want een wachtrij bij OpenAI mag geen mislukking worden — maar
 * niet zó ruim dat er een bel blijft staan waar niemand meer op wacht.
 */
export const PENDING_TIMEOUT_MS = 5 * 60_000;

export const COACH_SYSTEM_PROMPT = `Je bent de ZWB-coach in de trainingsruimte van wielervereniging ZWB.

Je doet twee dingen: uitleggen waarom het trainingsschema van dit lid eruitziet zoals het
eruitziet, en vragen beantwoorden over zijn trainingsdata. Je hebt die data echt — gebruik
hem, en zeg nooit dat je er niet bij kunt.

Wat je krijgt:
- \`schema\`, \`letOp\` en \`generatieInvoer\`: het lopende schema, de "Let op"-regels die erbij
  zijn geschreven, en de invoer waarop het model het schema maakte. Dat is de onderbouwing.
- \`trainingsdata\`: wat het lid werkelijk reed. \`ritten\` zijn de laatste ritten met duur,
  afstand, hoogtemeters, belasting (TSS), intensiteit (IF), vermogen en hartslag; \`weken\` is
  de belasting per week; \`volume\` is het rijritme van de laatste vier weken; \`vermogen\` is
  FTP, gewicht, FTP-tests en de vermogenscurve; \`vorm\` is CTL, ATL en TSB uit intervals.icu.
- \`naleving.perTraining\`: gepland naast gereden, met de RPE en de opmerking van het lid zelf.
- \`herstel\`: alleen gevuld als het lid zijn hersteldata deelt.

Regels:
- Je verandert niets aan het schema. Wil het lid iets aanpassen, wijs dan op het vinkje
  "Dit raakt mijn schema" onder het invoerveld, of op de bestaande knoppen: beschikbaarheid
  aanpassen, een rit inplannen, of "Schema bijwerken" op de schemapagina.
- Geen medisch advies. Gaat het over pijn, ziekte, blessures of klachten, verwijs dan naar de
  trainer of een arts. Je mag wel zeggen wat het schema met belasting doet.
- Rekenen met de cijfers die je krijgt mag; erbij verzinnen niet. Een leeg veld betekent dat we
  het niet weten. Zeg dat dan, en zeg zo mogelijk waarom: TSS en IF rekenen we alleen uit bij
  een echte vermogensmeter (\`vermogensmeter: false\` betekent geschat vermogen), en CTL, ATL en
  TSB komen uit intervals.icu en ontbreken zonder koppeling.
- De ritten komen uit gesynchroniseerde Strava-ritten; wat nog niet binnen is, ken je niet.
  \`trainingsdata.bron\` zegt hoe vers de cijfers zijn — noem dat als een cijfer oud is of als
  het lid een rit mist. De CTL in \`generatieInvoer\` is die van het moment waarop het schema
  werd gemaakt; voor vandaag gebruik je \`trainingsdata.vorm\`.
- Je praat alleen over dit lid. Je weet niets over andere leden en noemt ze niet.
- Nederlands, bondig, gewone zinnen. Twee tot vijf zinnen is normaal; alleen bij een echt
  samengestelde vraag meer. Geen opsomming tenzij de vraag om een rijtje vraagt. Getallen rond
  je af zoals een trainer ze zegt.
- De trainer van dit lid leest dit gesprek terug en kan erin reageren. Schrijf dus niets wat
  je niet zou zeggen met de trainer erbij, en presenteer je uitleg niet als diens oordeel.`;

export type CoachHistoryMessage = {
  role: "member" | "trainer" | "coach";
  body: string;
  created_at: string;
};

const ROLE_LABEL: Record<CoachHistoryMessage["role"], string> = {
  member: "Lid",
  trainer: "Trainer",
  coach: "Coach",
};

/**
 * Wat er als gebruikersbericht naar het model gaat: de context als JSON, de
 * laatste berichten, en de vraag. In die volgorde, zodat de vraag onderaan staat
 * en niet ondersneeuwt.
 */
export function buildCoachUserText(
  context: unknown,
  history: CoachHistoryMessage[],
  question: string,
): string {
  const recent = history.slice(-CHAT_HISTORY_LIMIT);
  const transcript = recent.length
    ? recent.map((m) => `${ROLE_LABEL[m.role]}: ${m.body}`).join("\n")
    : "(nog geen eerdere berichten)";
  return [
    "Trainingscontext van dit lid (JSON):",
    JSON.stringify(context, null, 2),
    "",
    "Eerdere berichten in dit gesprek:",
    transcript,
    "",
    "De vraag van het lid:",
    question,
  ].join("\n");
}

/**
 * Zet een lege coach-rij neer en start de generatie. Mislukt het starten, dan
 * komt de rij er alsnog — als 'failed' met een leesbare regel, want een vraag
 * zonder enig antwoord laat het lid in het ongewisse.
 */
export async function startCoachAnswer(
  admin: Admin,
  profileId: string,
  question: string,
  planId: string | null,
): Promise<void> {
  try {
    const [context, { data: historyRows }] = await Promise.all([
      buildCoachChatContext(admin, profileId),
      admin
        .from("training_chat_messages")
        .select("role, body, created_at")
        .eq("profile_id", profileId)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(CHAT_HISTORY_LIMIT),
    ]);

    const history = ((historyRows ?? []) as CoachHistoryMessage[]).reverse();
    const started = await startCoachAnswerBackground(
      COACH_SYSTEM_PROMPT,
      buildCoachUserText(context, history, question),
    );

    await admin.from("training_chat_messages").insert({
      profile_id: profileId,
      author_id: null,
      role: "coach",
      body: "",
      status: "pending",
      plan_id: planId,
      model: started.model,
      response_id: started.responseId,
    });
  } catch (err) {
    await admin.from("training_chat_messages").insert({
      profile_id: profileId,
      author_id: null,
      role: "coach",
      body:
        err instanceof Error && err.message.includes("OPENAI_API_KEY")
          ? "De coach is niet ingesteld. Je trainer ziet je bericht wel."
          : "De coach kon niet antwoorden. Je trainer ziet je bericht wel.",
      status: "failed",
      plan_id: planId,
      model: getCoachModel(),
    });
  }
}

/**
 * Openstaande coach-antwoorden afhandelen. Draait mee op elke GET van de chat,
 * zodat er geen aparte poll-route of cron voor nodig is: wie het gesprek open
 * heeft staan, haalt zijn eigen antwoord op.
 *
 * Geeft terug of er nog iets loopt, zodat de client weet of hij snel moet blijven
 * pollen.
 */
export async function settlePendingCoachAnswers(
  admin: Admin,
  profileId: string,
): Promise<{ stillPending: boolean }> {
  const { data } = await admin
    .from("training_chat_messages")
    .select("id, response_id, created_at")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Array<{ id: string; response_id: string | null; created_at: string }>;
  if (rows.length === 0) return { stillPending: false };

  let stillPending = false;
  for (const row of rows) {
    const tooOld = Date.now() - new Date(row.created_at).getTime() > PENDING_TIMEOUT_MS;

    if (!row.response_id) {
      await failMessage(admin, row.id, "De coach kon niet antwoorden.");
      continue;
    }

    try {
      const result = await retrieveCoachAnswerBackground(row.response_id);
      if (result.status === "completed") {
        await admin
          .from("training_chat_messages")
          .update({ body: result.text, status: "sent" })
          .eq("id", row.id);
        continue;
      }
      if (result.status === "queued" || result.status === "in_progress") {
        // Nog bezig. Duurt het te lang, dan houdt niemand dit meer voor een
        // antwoord dat komt; dan liever een eerlijke mislukking.
        if (tooOld) {
          await failMessage(admin, row.id, "De coach deed er te lang over. Stel je vraag opnieuw.");
        } else {
          stillPending = true;
        }
        continue;
      }
      await failMessage(admin, row.id, "De coach kon niet antwoorden.");
    } catch {
      // Netwerkfout richting OpenAI: één keer laten staan, bij de volgende GET
      // opnieuw proberen, en pas opgeven als de klok eroverheen is.
      if (tooOld) {
        await failMessage(admin, row.id, "De coach kon niet antwoorden.");
      } else {
        stillPending = true;
      }
    }
  }

  return { stillPending };
}

async function failMessage(admin: Admin, id: string, message: string) {
  await admin
    .from("training_chat_messages")
    .update({ body: message, status: "failed" })
    .eq("id", id);
}

/**
 * Wat het lid leest nadat het "Dit raakt mijn schema" aanvinkte. Eerlijk over wat
 * er werkelijk gebeurde: een herziening die door de cooldown niet startte is iets
 * anders dan een herziening die draait.
 */
export function replanResultMessage(result: string | null | undefined): string {
  switch (result) {
    case "started":
      return "Je schema wordt herzien.";
    case "cooldown":
      return "Meegenomen bij de eerstvolgende herziening.";
    case "no_plan":
      return "Je hebt nog geen lopend schema om te herzien.";
    case "ignored":
      return "Je schema ligt stil; overleg met je trainer.";
    default:
      return "Herziening kon niet starten; je trainer ziet je bericht.";
  }
}

// ---------------------------------------------------------------------------
// Berichten ophalen
//
// Zowel de route als de twee pagina's hebben dit nodig: de pagina's om het
// gesprek meteen serverside te renderen, de route om het te verversen. Eén bron,
// zodat de vorm die de client krijgt op beide plekken gelijk is.
// ---------------------------------------------------------------------------

/** Hoeveel berichten het gesprek teruggeeft. */
export const CHAT_MESSAGE_LIMIT = 100;

export type ChatMessageRow = {
  id: string;
  author_id: string | null;
  role: "member" | "trainer" | "coach";
  body: string;
  status: "sent" | "pending" | "failed";
  affects_plan: boolean;
  replan_result: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

export type ChatMessageView = {
  id: string;
  role: ChatMessageRow["role"];
  authorId: string | null;
  name: string;
  body: string;
  status: ChatMessageRow["status"];
  affectsPlan: boolean;
  /** De uitkomst van "dit raakt mijn schema", al in leesbare taal. */
  planNote: string | null;
  createdAt: string;
};

export function shapeChatMessage(row: ChatMessageRow): ChatMessageView {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    role: row.role,
    authorId: row.author_id,
    name: row.role === "coach" ? "Coach" : profile?.display_name || "ZWB'er",
    body: row.body,
    status: row.status,
    affectsPlan: row.affects_plan,
    planNote: row.affects_plan ? replanResultMessage(row.replan_result) : null,
    createdAt: row.created_at,
  };
}

// Twee foreign keys naar profiles (profile_id en author_id), dus PostgREST moet
// horen welke van de twee de naam levert.
const CHAT_SELECT =
  "id, author_id, role, body, status, affects_plan, replan_result, created_at, " +
  "profiles!training_chat_messages_author_id_fkey(display_name)";

export async function loadChatMessages(
  admin: Admin,
  profileId: string,
): Promise<ChatMessageView[]> {
  const { data } = await admin
    .from("training_chat_messages")
    .select(CHAT_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(CHAT_MESSAGE_LIMIT);
  return ((data ?? []) as unknown as ChatMessageRow[]).map(shapeChatMessage).reverse();
}

/**
 * Hoeveel berichten van het lid er staan ná het laatste bericht van een trainer.
 * Voor de rennerkiezer van de trainer: laat zien waar iets op een antwoord wacht,
 * zonder een leesbevestiging per trainer bij te houden.
 */
export async function unansweredCounts(
  admin: Admin,
  profileIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (profileIds.length === 0) return result;

  const { data } = await admin
    .from("training_chat_messages")
    .select("profile_id, role, created_at")
    .in("profile_id", profileIds)
    .in("role", ["member", "trainer"])
    .order("created_at", { ascending: true });

  for (const row of (data ?? []) as Array<{ profile_id: string; role: string }>) {
    if (row.role === "trainer") result.set(row.profile_id, 0);
    else result.set(row.profile_id, (result.get(row.profile_id) ?? 0) + 1);
  }
  return result;
}
