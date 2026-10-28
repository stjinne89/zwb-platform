import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import { isChapterId, type ChapterId } from "./chapters";
import {
  PHOTOS_MAX,
  StoryError,
  canEdit,
  isPhotoPathFor,
  photoPath,
  type StoryInput,
  type StoryStatus,
} from "./story";

// Clubverhaal op de server (0288). Ingestuurde verhalen lezen gaat met de sessie
// van het lid, zodat RLS beslist: alleen wie schreef en wie plaatst. Wat
// geplaatst is, staat op de publieke pagina /verhaal; dat leest de admin-client,
// altijd met de filter op status hieronder. Schrijven gaat met de admin-client,
// na de checks hier; de tabellen hebben geen schrijfpolicies.

/** Het recht om verhalen te plaatsen: hetzelfde als aankondigingen en tips en citaten. */
export const REVIEW_PERMISSION = "community.manage" as const;
export const PHOTO_BUCKET = "club-story-photos";
/** Zo lang blijft een leeslink van een foto geldig. */
const PHOTO_URL_SECONDS = 3600;

export type StoryPhoto = { id: string; path: string; caption: string | null; url: string | null };

export type StorySummary = {
  id: string;
  chapter: ChapterId;
  title: string;
  happenedYear: number | null;
  status: StoryStatus;
  reviewNote: string | null;
  createdAt: string;
};

export type StoryDetail = StorySummary & {
  body: string;
  authorId: string | null;
  author: string;
  beker: { id: string; title: string } | null;
  photos: StoryPhoto[];
};

const COLUMNS =
  "id, chapter, title, body, happened_year, status, review_note, created_at, profile_id, author:profiles!club_stories_profile_id_fkey(display_name), beker:zwbekers(id, title, status), photos:club_story_photos(id, path, caption, position)";

type Row = {
  id: string;
  chapter: string;
  title: string;
  body: string;
  happened_year: number | null;
  status: StoryStatus;
  review_note: string | null;
  created_at: string;
  profile_id: string | null;
  author: { display_name: string | null } | null;
  beker: { id: string; title: string; status: string } | null;
  photos: Array<{ id: string; path: string; caption: string | null; position: number }> | null;
};

function summary(row: Row): StorySummary {
  return {
    id: row.id,
    chapter: isChapterId(row.chapter) ? row.chapter : "basis",
    title: row.title,
    happenedYear: row.happened_year,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

/**
 * Een verhaal met foto's. `photoLimit` beperkt de leeslinks (voor een overzicht
 * is één foto genoeg); de rest krijgt geen url.
 */
async function details(rows: Row[], photoLimit = PHOTOS_MAX): Promise<StoryDetail[]> {
  const sorted = rows.map((row) => ({
    row,
    photos: [...(row.photos ?? [])].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
  }));
  const paths = sorted.flatMap(({ photos }) => photos.slice(0, photoLimit).map((photo) => photo.path));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_URL_SECONDS);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return sorted.map(({ row, photos }) => ({
    ...summary(row),
    body: row.body,
    authorId: row.profile_id,
    author: row.author?.display_name?.trim() || "Een lid",
    // Alleen een toegekende beker; een voordracht is geheim (0286).
    beker: row.beker && row.beker.status === "toegekend" ? { id: row.beker.id, title: row.beker.title } : null,
    photos: photos.map((photo) => ({ id: photo.id, path: photo.path, caption: photo.caption, url: urls.get(photo.path) ?? null })),
  }));
}

/** Ingelogd en goedgekeurd, met de privacyverklaring getekend; anders een zin voor het scherm. */
export async function requireStoryMember() {
  const client = await createClient();
  const access = await getCurrentUserAccess(client);
  const user = access.user;
  if (!user) throw new StoryError("Log in om een verhaal in te sturen.");
  const { data: member } = await client
    .from("profiles")
    .select("id, display_name, is_approved, privacy_accepted_version")
    .eq("id", user.id)
    .single();
  if (!member?.is_approved) throw new StoryError("Alleen goedgekeurde ZWB-leden sturen verhalen in.");
  if (!privacyConsentIsCurrent(member.privacy_accepted_version)) {
    throw new StoryError("Bevestig eerst de privacyverklaring.");
  }
  return {
    client,
    access,
    member: { id: user.id, name: (member.display_name as string | null)?.trim() || "Een lid" },
    canReview: access.has(REVIEW_PERMISSION),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Publiek: alleen geplaatste verhalen (admin-client, met de filter op status)
// ──────────────────────────────────────────────────────────────────────

/** Alle geplaatste verhalen voor /verhaal, per hoofdstuk op jaar. Met één foto per verhaal. */
export async function loadPlacedStories(): Promise<StoryDetail[]> {
  const { data, error } = await createAdminClient()
    .from("club_stories")
    .select(COLUMNS)
    .eq("status", "geplaatst")
    .order("happened_year", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<Row[]>();
  // Zonder 0288 (of bij een storing) gewoon zonder verhalen; de pagina blijft werken.
  if (error) return [];
  return details(data ?? [], 1);
}

/** Eén geplaatst verhaal, of null. */
export async function loadPlacedStory(id: string): Promise<StoryDetail | null> {
  const { data } = await createAdminClient()
    .from("club_stories")
    .select(COLUMNS)
    .eq("id", id)
    .eq("status", "geplaatst")
    .maybeSingle<Row>();
  if (!data) return null;
  return (await details([data]))[0];
}

/** De geplaatste verhalen bij een ZWBeker, voor de link op de beker. */
export async function loadStoriesForBeker(bekerId: string): Promise<Array<{ id: string; title: string }>> {
  const { data, error } = await createAdminClient()
    .from("club_stories")
    .select("id, title")
    .eq("beker_id", bekerId)
    .eq("status", "geplaatst")
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id as string, title: row.title as string }));
}

// ──────────────────────────────────────────────────────────────────────
// Lezen (met de sessie van het lid)
// ──────────────────────────────────────────────────────────────────────

/** Je eigen verhalen, nieuwste eerst. */
export async function loadOwnStories(client: SupabaseClient, profileId: string): Promise<StorySummary[]> {
  const { data } = await client
    .from("club_stories")
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  return (data ?? []).map(summary);
}

/** Eén verhaal met foto's, of null als het niet bestaat of niet voor jou is. */
export async function loadStory(client: SupabaseClient, id: string): Promise<StoryDetail | null> {
  const { data } = await client.from("club_stories").select(COLUMNS).eq("id", id).maybeSingle<Row>();
  if (!data) return null;
  return (await details([data]))[0];
}

/** Voor het beheer: open inzendingen (oudste eerst) en wat geplaatst is (nieuwste eerst). */
export async function loadReviewQueue(client: SupabaseClient) {
  const [open, placed] = await Promise.all([
    client.from("club_stories").select(COLUMNS).eq("status", "ingestuurd").order("created_at", { ascending: true }).returns<Row[]>(),
    client
      .from("club_stories")
      .select(COLUMNS)
      .eq("status", "geplaatst")
      .order("reviewed_at", { ascending: false })
      .limit(40)
      .returns<Row[]>(),
  ]);
  return { open: await details(open.data ?? []), placed: (placed.data ?? []).map(summary) };
}

/** Toegekende ZWBekers voor de keuzelijst, nieuwste eerst (RLS: elk goedgekeurd lid). */
export async function loadBekerOptions(client: SupabaseClient) {
  const { data } = await client
    .from("zwbekers")
    .select("id, title, achieved_on")
    .eq("status", "toegekend")
    .order("achieved_on", { ascending: false })
    .limit(300);
  return (data ?? []).map((row) => ({ id: row.id as string, title: row.title as string, day: row.achieved_on as string }));
}

// ──────────────────────────────────────────────────────────────────────
// Schrijven (admin-client, na de checks hier)
// ──────────────────────────────────────────────────────────────────────

type Admin = ReturnType<typeof createAdminClient>;

type Stored = {
  id: string;
  status: StoryStatus;
  profile_id: string | null;
  title: string;
  photos: Array<{ id: string; path: string }>;
};

async function stored(admin: Admin, id: string): Promise<Stored> {
  const { data } = await admin
    .from("club_stories")
    .select("id, status, profile_id, title, photos:club_story_photos(id, path)")
    .eq("id", id)
    .maybeSingle<Stored>();
  if (!data) throw new StoryError("Dat verhaal bestaat niet (meer).");
  return data;
}

async function checkBeker(admin: Admin, bekerId: string | null) {
  if (!bekerId) return;
  const { data } = await admin.from("zwbekers").select("status").eq("id", bekerId).maybeSingle();
  if (data?.status !== "toegekend") throw new StoryError("Kies een beker uit de prijzenkast.");
}

function columns(input: StoryInput) {
  return {
    chapter: input.chapter,
    title: input.title,
    body: input.body,
    happened_year: input.happenedYear,
    beker_id: input.bekerId,
  };
}

export async function createStory(admin: Admin, authorId: string, input: StoryInput): Promise<string> {
  await checkBeker(admin, input.bekerId);
  const { data, error } = await admin
    .from("club_stories")
    .insert({ ...columns(input), profile_id: authorId, status: "ingestuurd" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Opslaan mislukt.");
  return data.id as string;
}

/**
 * Aanpassen zet een teruggestuurd verhaal weer open voor het bestuur. Foto's die
 * niet meer in `input.photos` staan, gaan weg; de rest krijgt de nieuwe volgorde
 * en onderschriften.
 */
export async function updateStory(admin: Admin, editorId: string, id: string, input: StoryInput) {
  const story = await stored(admin, id);
  if (!canEdit({ status: story.status, profileId: story.profile_id }, editorId)) {
    throw new StoryError("Dit verhaal kun je niet meer aanpassen.");
  }
  const known = new Set(story.photos.map((photo) => photo.id));
  if (input.photos.some((photo) => !known.has(photo.id))) throw new StoryError("Die foto hoort niet bij dit verhaal.");
  await checkBeker(admin, input.bekerId);
  const { error } = await admin
    .from("club_stories")
    .update({
      ...columns(input),
      status: "ingestuurd",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    // Niet tegelijk met een beoordeling: alleen zolang het niet geplaatst is.
    .neq("status", "geplaatst");
  if (error) throw new Error(error.message);

  const keep = new Set(input.photos.map((photo) => photo.id));
  const dropped = story.photos.filter((photo) => !keep.has(photo.id));
  if (dropped.length) {
    const removed = await admin.from("club_story_photos").delete().in("id", dropped.map((photo) => photo.id));
    if (removed.error) throw new Error(removed.error.message);
    await admin.storage.from(PHOTO_BUCKET).remove(dropped.map((photo) => photo.path));
  }
  for (const [position, photo] of input.photos.entries()) {
    const updated = await admin.from("club_story_photos").update({ caption: photo.caption, position }).eq("id", photo.id);
    if (updated.error) throw new Error(updated.error.message);
  }
}

/** Weghalen door wie schreef (altijd, ook geplaatst) of door wie plaatst. */
export async function deleteStory(admin: Admin, actorId: string, id: string, canReview: boolean) {
  const story = await stored(admin, id);
  if (!canReview && story.profile_id !== actorId) throw new StoryError("Dit verhaal kun je niet weghalen.");
  const { error } = await admin.from("club_stories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (story.photos.length) await admin.storage.from(PHOTO_BUCKET).remove(story.photos.map((photo) => photo.path));
  return story;
}

/** Plaatsen of terugsturen; alleen een open inzending. Geeft titel en schrijver terug voor de melding. */
export async function reviewStory(
  admin: Admin,
  reviewerId: string,
  id: string,
  decision: "geplaatst" | "teruggestuurd",
  note: string | null,
) {
  if (decision === "teruggestuurd" && !note) throw new StoryError("Schrijf erbij waarom, zodat het verhaal beter terug kan komen.");
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("club_stories")
    .update({ status: decision, review_note: note, reviewed_by: reviewerId, reviewed_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "ingestuurd")
    .select("id, title, profile_id")
    .maybeSingle<{ id: string; title: string; profile_id: string | null }>();
  if (error) throw new Error(error.message);
  if (!data) throw new StoryError("Dit verhaal is al beoordeeld of aangepast. Laad de pagina opnieuw.");
  return { title: data.title, authorId: data.profile_id };
}

/** Een uploadlink voor een foto bij een verhaal dat je nog mag aanpassen. */
export async function photoUploadTarget(admin: Admin, uploaderId: string, storyId: string) {
  const story = await stored(admin, storyId);
  if (!canEdit({ status: story.status, profileId: story.profile_id }, uploaderId)) {
    throw new StoryError("Bij dit verhaal kun je geen foto meer zetten.");
  }
  if (story.photos.length >= PHOTOS_MAX) throw new StoryError(`Hooguit ${PHOTOS_MAX} foto's per verhaal.`);
  const path = photoPath(storyId, uploaderId, Date.now());
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Uploaden kan nu niet.");
  return { path, token: data.token };
}

/** Na het uploaden: de foto achteraan bij het verhaal zetten. */
export async function attachPhoto(admin: Admin, uploaderId: string, storyId: string, path: string, caption: string | null) {
  const story = await stored(admin, storyId);
  if (!canEdit({ status: story.status, profileId: story.profile_id }, uploaderId)) {
    throw new StoryError("Bij dit verhaal kun je geen foto meer zetten.");
  }
  if (!isPhotoPathFor(path, storyId, uploaderId)) throw new StoryError("Die foto hoort niet bij dit verhaal.");
  if (story.photos.length >= PHOTOS_MAX) throw new StoryError(`Hooguit ${PHOTOS_MAX} foto's per verhaal.`);
  // Bestaat het bestand echt? Anders hangt er een lege foto aan het verhaal.
  const folder = path.split("/").slice(0, 2).join("/");
  const name = path.split("/")[2];
  const { data: found } = await admin.storage.from(PHOTO_BUCKET).list(folder, { search: name, limit: 1 });
  if (!found?.some((file) => file.name === name)) throw new StoryError("De foto is niet aangekomen. Probeer het opnieuw.");
  const { error } = await admin
    .from("club_story_photos")
    .insert({ story_id: storyId, path, caption, position: story.photos.length });
  if (error) throw new Error(error.message);
}
