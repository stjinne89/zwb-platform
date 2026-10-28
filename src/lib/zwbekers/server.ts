import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { readDesign, type BekerDesign } from "./design";
import {
  NominationError,
  canEdit,
  isPhotoPathFor,
  photoPath,
  recentSince,
  zrlRoundLabel,
  zrlRoundOf,
  type BekerKind,
  type BekerStatus,
  type Nomination,
} from "./nomination";

// ZWBekers op de server (0286). Lezen gaat met de sessie van het lid, zodat RLS
// beslist wat iemand ziet: een voordracht alleen voor wie hem deed en wie keurt,
// een toegekende beker voor elk goedgekeurd lid. Schrijven gaat met de
// admin-client, na de checks hieronder; de tabellen hebben geen schrijfpolicies.

/** Het recht om voordrachten te keuren: hetzelfde als badges toekennen. */
export const REVIEW_PERMISSION = "achievements.finalize" as const;
export const PHOTO_BUCKET = "zwbeker-photos";
/** Zo lang blijft een leeslink van een foto geldig. */
const PHOTO_URL_SECONDS = 3600;

export type Person = { id: string; name: string; avatarUrl: string | null };

export type BekerSummary = {
  id: string;
  kind: BekerKind;
  title: string;
  achievedOn: string;
  status: BekerStatus;
  design: BekerDesign;
  teamName: string | null;
  winners: Person[];
};

export type BekerDetail = BekerSummary & {
  story: string;
  teamId: string | null;
  event: { id: string; title: string; startAt: string } | null;
  /** Een hele ZRL-ronde, "2026/27 R1" (0287); nooit samen met een event. */
  zrlRound: string | null;
  resultUrl: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  /** Wie voordroeg; null als dat account is opgeheven. */
  nominator: Person | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  congrats: Array<{ id: string; author: Person; body: string; createdAt: string }>;
};

const SUMMARY_COLUMNS =
  "id, kind, title, achieved_on, status, design, team_name, winners:zwbeker_winners(profile:profiles(id, display_name, avatar_url))";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, story, team_id, event_id, zrl_round, result_url, photo_path, profile_id, review_note, reviewed_at, created_at, nominator:profiles!zwbekers_profile_id_fkey(id, display_name, avatar_url), event:events(id, title, start_at)`;

type ProfileRef = { id: string; display_name: string | null; avatar_url: string | null } | null;
type SummaryRow = {
  id: string;
  kind: BekerKind;
  title: string;
  achieved_on: string;
  status: BekerStatus;
  design: unknown;
  team_name: string | null;
  winners: Array<{ profile: ProfileRef }> | null;
};
type DetailRow = SummaryRow & {
  story: string;
  team_id: string | null;
  event_id: string | null;
  zrl_round: string | null;
  result_url: string | null;
  photo_path: string | null;
  profile_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  nominator: ProfileRef;
  event: { id: string; title: string; start_at: string } | null;
};

function person(profile: ProfileRef): Person | null {
  if (!profile) return null;
  return { id: profile.id, name: profile.display_name?.trim() || "Lid", avatarUrl: profile.avatar_url };
}

function summary(row: SummaryRow): BekerSummary {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    achievedOn: row.achieved_on,
    status: row.status,
    design: readDesign(row.design),
    teamName: row.team_name,
    winners: (row.winners ?? [])
      .map((winner) => person(winner.profile))
      .filter((winner): winner is Person => winner !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "nl")),
  };
}

/** Ingelogd en goedgekeurd, met de privacyverklaring getekend; anders een zin voor het scherm. */
export async function requireBekerMember() {
  const client = await createClient();
  const access = await getCurrentUserAccess(client);
  const user = access.user;
  if (!user) throw new NominationError("Log in om ZWBekers te zien.");
  const { data: member } = await client
    .from("profiles")
    .select("id, display_name, is_approved, privacy_accepted_version")
    .eq("id", user.id)
    .single();
  if (!member?.is_approved) throw new NominationError("Alleen goedgekeurde ZWB-leden zien de prijzenkast.");
  if (!privacyConsentIsCurrent(member.privacy_accepted_version)) {
    throw new NominationError("Bevestig eerst de privacyverklaring.");
  }
  return {
    client,
    access,
    member: { id: user.id, name: (member.display_name as string | null)?.trim() || "Een lid" },
    canReview: access.has(REVIEW_PERMISSION),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Lezen (met de sessie van het lid)
// ──────────────────────────────────────────────────────────────────────

/** De prijzenkast: alle toegekende bekers, van oud naar nieuw. */
export async function loadKast(client: SupabaseClient): Promise<BekerSummary[]> {
  const { data, error } = await client
    .from("zwbekers")
    .select(SUMMARY_COLUMNS)
    .eq("status", "toegekend")
    .order("achieved_on", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<SummaryRow[]>();
  if (error) throw new Error("De prijzenkast is even niet te openen.");
  return (data ?? []).map(summary);
}

/** De bekers van één lid, nieuwste eerst; voor het profiel. */
export async function loadProfileBekers(client: SupabaseClient, profileId: string): Promise<BekerSummary[]> {
  const { data: won, error } = await client.from("zwbeker_winners").select("beker_id").eq("profile_id", profileId);
  // Zonder 0286 (of bij een storing) gewoon geen plank, het profiel blijft werken.
  if (error || !won?.length) return [];
  const { data } = await client
    .from("zwbekers")
    .select(SUMMARY_COLUMNS)
    .in("id", won.map((row) => row.beker_id as string))
    .eq("status", "toegekend")
    .order("achieved_on", { ascending: false })
    .returns<SummaryRow[]>();
  return (data ?? []).map(summary);
}

/**
 * Toegekende bekers van de afgelopen week, nieuwste eerst: voor het dashboard.
 * Bij een storing (of zonder 0286) gewoon niets; het dashboard blijft werken.
 */
export async function loadRecentBekers(client: SupabaseClient, today: string): Promise<BekerSummary[]> {
  const { data, error } = await client
    .from("zwbekers")
    .select(SUMMARY_COLUMNS)
    .eq("status", "toegekend")
    .gte("achieved_on", recentSince(today))
    .lte("achieved_on", today)
    .order("achieved_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<SummaryRow[]>();
  if (error) return [];
  return (data ?? []).map(summary);
}

/** Je eigen voordrachten die nog niet in de kast staan. */
export async function loadOwnNominations(client: SupabaseClient, profileId: string): Promise<BekerSummary[]> {
  const { data } = await client
    .from("zwbekers")
    .select(SUMMARY_COLUMNS)
    .eq("profile_id", profileId)
    .neq("status", "toegekend")
    .order("created_at", { ascending: false })
    .returns<SummaryRow[]>();
  return (data ?? []).map(summary);
}

/** Voor het beheer: open voordrachten (oudste eerst) en de laatst beoordeelde. */
export async function loadReviewQueue(client: SupabaseClient) {
  const [open, recent] = await Promise.all([
    client
      .from("zwbekers")
      .select(DETAIL_COLUMNS)
      .eq("status", "voorgedragen")
      .order("created_at", { ascending: true })
      .returns<DetailRow[]>(),
    client
      .from("zwbekers")
      .select(SUMMARY_COLUMNS)
      .neq("status", "voorgedragen")
      .order("reviewed_at", { ascending: false })
      .limit(12)
      .returns<SummaryRow[]>(),
  ]);
  return {
    open: await Promise.all((open.data ?? []).map((row) => detail(row, []))),
    recent: (recent.data ?? []).map(summary),
  };
}

/** Eén beker met alles erbij, of null als hij niet bestaat of niet voor jou is. */
export async function loadBeker(client: SupabaseClient, id: string): Promise<BekerDetail | null> {
  const { data: row } = await client
    .from("zwbekers")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle<DetailRow>();
  if (!row) return null;
  const { data: congrats } = await client
    .from("zwbeker_congrats")
    .select("id, body, created_at, author:profiles(id, display_name, avatar_url)")
    .eq("beker_id", id)
    .order("created_at", { ascending: true })
    .returns<Array<{ id: string; body: string; created_at: string; author: ProfileRef }>>();
  return detail(row, congrats ?? []);
}

async function detail(
  row: DetailRow,
  congrats: Array<{ id: string; body: string; created_at: string; author: ProfileRef }>,
): Promise<BekerDetail> {
  return {
    ...summary(row),
    story: row.story,
    teamId: row.team_id,
    event: row.event ? { id: row.event.id, title: row.event.title, startAt: row.event.start_at } : null,
    zrlRound: row.zrl_round,
    resultUrl: row.result_url,
    photoPath: row.photo_path,
    // De rij is met RLS gelezen, dus wie hem ziet, mag de foto zien.
    photoUrl: row.photo_path ? await signedPhotoUrl(row.photo_path) : null,
    nominator: person(row.nominator),
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    congrats: congrats.map((item) => ({
      id: item.id,
      author: person(item.author) ?? { id: "", name: "Oud-lid", avatarUrl: null },
      body: item.body,
      createdAt: item.created_at,
    })),
  };
}

async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_URL_SECONDS);
  return data?.signedUrl ?? null;
}

/**
 * Wat het formulier nodig heeft: goedgekeurde leden, teams met hun leden, events
 * van het afgelopen jaar, en de ZRL-rondes die al begonnen zijn (uit de titels
 * van de hoofdevents per raceweek, 0178).
 */
export async function loadFormOptions(client: SupabaseClient, today: string) {
  const yearAgo = new Date(`${today}T12:00:00Z`);
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const endOfToday = new Date(`${today}T23:59:59Z`).toISOString();
  const [members, teams, events, raceWeeks] = await Promise.all([
    client.from("profiles").select("id, display_name").eq("is_approved", true).order("display_name"),
    client.from("teams").select("id, name, type, team_members(profile_id)").order("name"),
    client
      .from("events")
      .select("id, title, start_at")
      .gte("start_at", yearAgo.toISOString())
      .lte("start_at", endOfToday)
      .order("start_at", { ascending: false })
      .limit(300),
    client
      .from("events")
      .select("title, start_at")
      .eq("type", "zrl")
      .is("parent_event_id", null)
      .lte("start_at", endOfToday)
      .order("start_at", { ascending: false })
      .limit(200),
  ]);
  // Nieuwste ronde eerst; per ronde de dag van de laatste race tot nu.
  const rounds = new Map<string, { key: string; label: string; lastDay: string }>();
  for (const row of raceWeeks.data ?? []) {
    const key = zrlRoundOf(row.title as string);
    if (key && !rounds.has(key)) {
      rounds.set(key, { key, label: zrlRoundLabel(key), lastDay: (row.start_at as string).slice(0, 10) });
    }
  }
  return {
    members: (members.data ?? [])
      .filter((row) => (row.display_name as string | null)?.trim())
      .map((row) => ({ id: row.id as string, name: (row.display_name as string).trim() })),
    teams: (teams.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      members: ((row.team_members as Array<{ profile_id: string }> | null) ?? []).map((m) => m.profile_id),
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      day: (row.start_at as string).slice(0, 10),
    })),
    zrlRounds: [...rounds.values()],
  };
}

// ──────────────────────────────────────────────────────────────────────
// Schrijven (admin-client, na de checks hier)
// ──────────────────────────────────────────────────────────────────────

type Admin = ReturnType<typeof createAdminClient>;

type StoredBeker = { id: string; status: BekerStatus; profile_id: string | null; photo_path: string | null; title: string };

async function stored(admin: Admin, id: string): Promise<StoredBeker> {
  const { data } = await admin
    .from("zwbekers")
    .select("id, status, profile_id, photo_path, title")
    .eq("id", id)
    .maybeSingle<StoredBeker>();
  if (!data) throw new NominationError("Die beker bestaat niet (meer).");
  return data;
}

/** Controleert winnaars, team, event en ZRL-ronde tegen de database; geeft de teamnaam terug. */
async function checkReferences(admin: Admin, nomination: Nomination): Promise<string | null> {
  const [winners, team, event, raceWeek] = await Promise.all([
    admin.from("profiles").select("id").in("id", nomination.winners).eq("is_approved", true),
    nomination.teamId
      ? admin.from("teams").select("name").eq("id", nomination.teamId).maybeSingle()
      : Promise.resolve({ data: null }),
    nomination.eventId
      ? admin.from("events").select("id").eq("id", nomination.eventId).maybeSingle()
      : Promise.resolve({ data: null }),
    nomination.zrlRound
      ? admin
          .from("events")
          .select("id")
          .eq("type", "zrl")
          .like("title", `ZRL ${nomination.zrlRound.replace(" ", " · ")} · W%`)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if ((winners.data ?? []).length !== nomination.winners.length) {
    throw new NominationError("Kies alleen goedgekeurde ZWB-leden als winnaar.");
  }
  if (nomination.teamId && !team.data) throw new NominationError("Dat team bestaat niet meer.");
  if (nomination.eventId && !event.data) throw new NominationError("Dat event bestaat niet meer.");
  if (nomination.zrlRound && !raceWeek.data) throw new NominationError("Die ZRL-ronde staat niet in de kalender.");
  return nomination.teamId ? ((team.data as { name: string }).name.slice(0, 80) ?? null) : null;
}

function columns(nomination: Nomination, teamName: string | null) {
  return {
    kind: nomination.kind,
    title: nomination.title,
    story: nomination.story,
    achieved_on: nomination.achievedOn,
    team_id: nomination.teamId,
    team_name: teamName,
    event_id: nomination.eventId,
    zrl_round: nomination.zrlRound,
    result_url: nomination.resultUrl,
    design: nomination.design,
  };
}

async function setWinners(admin: Admin, bekerId: string, winners: string[]) {
  const removed = await admin.from("zwbeker_winners").delete().eq("beker_id", bekerId);
  if (removed.error) throw new Error(removed.error.message);
  const added = await admin
    .from("zwbeker_winners")
    .insert(winners.map((profileId) => ({ beker_id: bekerId, profile_id: profileId })));
  if (added.error) throw new Error(added.error.message);
}

export async function createNomination(admin: Admin, nominatorId: string, nomination: Nomination): Promise<string> {
  const teamName = await checkReferences(admin, nomination);
  const { data, error } = await admin
    .from("zwbekers")
    .insert({ ...columns(nomination, teamName), profile_id: nominatorId, status: "voorgedragen" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Opslaan mislukt.");
  try {
    await setWinners(admin, data.id as string, nomination.winners);
  } catch (failure) {
    // Geen beker zonder winnaars laten staan.
    await admin.from("zwbekers").delete().eq("id", data.id);
    throw failure;
  }
  return data.id as string;
}

/** Aanpassen zet een teruggestuurde voordracht weer open voor het bestuur. */
export async function updateNomination(admin: Admin, editorId: string, id: string, nomination: Nomination) {
  const beker = await stored(admin, id);
  if (!canEdit({ status: beker.status, profileId: beker.profile_id }, editorId)) {
    throw new NominationError("Deze voordracht kun je niet meer aanpassen.");
  }
  const teamName = await checkReferences(admin, nomination);
  const { error } = await admin
    .from("zwbekers")
    .update({
      ...columns(nomination, teamName),
      status: "voorgedragen",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    // Niet tegelijk met een beoordeling: alleen zolang hij niet is toegekend.
    .neq("status", "toegekend");
  if (error) throw new Error(error.message);
  await setWinners(admin, id, nomination.winners);
}

/** Intrekken door wie voordroeg (zolang niet toegekend) of verwijderen door wie keurt. */
export async function deleteBeker(admin: Admin, actorId: string, id: string, canReview: boolean) {
  const beker = await stored(admin, id);
  if (!canReview && !canEdit({ status: beker.status, profileId: beker.profile_id }, actorId)) {
    throw new NominationError("Deze beker kun je niet verwijderen.");
  }
  const { error } = await admin.from("zwbekers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (beker.photo_path) await admin.storage.from(PHOTO_BUCKET).remove([beker.photo_path]);
  return beker;
}

/** Toekennen of terugsturen; alleen een open voordracht. Geeft winnaars en voordrager terug voor de melding. */
export async function reviewNomination(
  admin: Admin,
  reviewerId: string,
  id: string,
  decision: "toegekend" | "afgewezen",
  note: string | null,
) {
  if (decision === "afgewezen" && !note) throw new NominationError("Schrijf erbij waarom, zodat de voordracht beter terug kan komen.");
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("zwbekers")
    .update({ status: decision, review_note: note, reviewed_by: reviewerId, reviewed_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "voorgedragen")
    .select("id, title, profile_id, winners:zwbeker_winners(profile_id)")
    .maybeSingle<{ id: string; title: string; profile_id: string | null; winners: Array<{ profile_id: string }> }>();
  if (error) throw new Error(error.message);
  if (!data) throw new NominationError("Deze voordracht is al beoordeeld of aangepast. Laad de pagina opnieuw.");
  return { title: data.title, nominatorId: data.profile_id, winnerIds: data.winners.map((winner) => winner.profile_id) };
}

export async function addCongrats(admin: Admin, authorId: string, bekerId: string, body: string) {
  const beker = await stored(admin, bekerId);
  if (beker.status !== "toegekend") throw new NominationError("Feliciteren kan zodra de beker is toegekend.");
  const { error } = await admin.from("zwbeker_congrats").insert({ beker_id: bekerId, profile_id: authorId, body });
  if (error) throw new Error(error.message);
}

export async function deleteCongrats(admin: Admin, actorId: string, congratsId: string, canModerate: boolean) {
  const { data } = await admin.from("zwbeker_congrats").select("profile_id, beker_id").eq("id", congratsId).maybeSingle();
  if (!data) return null;
  if (data.profile_id !== actorId && !canModerate) throw new NominationError("Alleen je eigen felicitatie kun je weghalen.");
  const { error } = await admin.from("zwbeker_congrats").delete().eq("id", congratsId);
  if (error) throw new Error(error.message);
  return data.beker_id as string;
}

/** Een uploadlink voor de foto bij een voordracht die je nog mag aanpassen. */
export async function photoUploadTarget(admin: Admin, uploaderId: string, bekerId: string) {
  const beker = await stored(admin, bekerId);
  if (!canEdit({ status: beker.status, profileId: beker.profile_id }, uploaderId)) {
    throw new NominationError("Bij deze beker kun je geen foto meer zetten.");
  }
  const path = photoPath(bekerId, uploaderId, Date.now());
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Uploaden kan nu niet.");
  return { path, token: data.token };
}

/** Na het uploaden: de foto aan de beker hangen en een vorige weghalen. */
export async function attachPhoto(admin: Admin, uploaderId: string, bekerId: string, path: string) {
  const beker = await stored(admin, bekerId);
  if (!canEdit({ status: beker.status, profileId: beker.profile_id }, uploaderId)) {
    throw new NominationError("Bij deze beker kun je geen foto meer zetten.");
  }
  if (!isPhotoPathFor(path, bekerId, uploaderId)) throw new NominationError("Die foto hoort niet bij deze beker.");
  // Bestaat het bestand echt? Anders hangt er een lege foto aan de beker.
  const folder = path.split("/").slice(0, 2).join("/");
  const name = path.split("/")[2];
  const { data: found } = await admin.storage.from(PHOTO_BUCKET).list(folder, { search: name, limit: 1 });
  if (!found?.some((file) => file.name === name)) throw new NominationError("De foto is niet aangekomen. Probeer het opnieuw.");
  const { error } = await admin.from("zwbekers").update({ photo_path: path }).eq("id", bekerId);
  if (error) throw new Error(error.message);
  if (beker.photo_path && beker.photo_path !== path) await admin.storage.from(PHOTO_BUCKET).remove([beker.photo_path]);
}

/** De foto weghalen: door wie voordroeg (zolang niet toegekend) of door wie keurt. */
export async function removePhoto(admin: Admin, actorId: string, bekerId: string, canReview: boolean) {
  const beker = await stored(admin, bekerId);
  if (!canReview && !canEdit({ status: beker.status, profileId: beker.profile_id }, actorId)) {
    throw new NominationError("Deze foto kun je niet weghalen.");
  }
  if (!beker.photo_path) return;
  const { error } = await admin.from("zwbekers").update({ photo_path: null }).eq("id", bekerId);
  if (error) throw new Error(error.message);
  await admin.storage.from(PHOTO_BUCKET).remove([beker.photo_path]);
}
