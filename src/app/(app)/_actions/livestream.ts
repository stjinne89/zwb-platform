"use server";

import { revalidatePath } from "next/cache";
import { routes as zwiftRoutes } from "zwift-data";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { getClub } from "@/lib/club";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createBoundBroadcast,
  deleteBroadcast,
  ensureReusableStream,
  getStreamIngestion,
  setThumbnail,
  YouTubeApiError,
  youtubeErrorMessage,
} from "@/lib/youtube-live/api";
import {
  broadcastDescription,
  broadcastTitle,
  eventTakesStreams,
  inPrepareWindow,
  scheduledStartFor,
} from "@/lib/youtube-live/broadcast";
import {
  loadYouTubeConnection,
  removeYouTubeConnection,
  youtubeAccessToken,
} from "@/lib/youtube-live/connection";
import { YouTubeGrantRevokedError, youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { ridesInEvent } from "@/lib/youtube-live/streams";
import { createHelperPairing, removeHelper, sendHelperCommand } from "@/lib/youtube-live/helper";
import { siteOrigin, streamRoute, streamThumbnail, type ThumbnailEvent } from "@/lib/youtube-live/thumbnail";
import { overlayMode, OVERLAY_MODES, type OverlayMode } from "@/lib/youtube-live/overlay-theme";
import { overlayStyle, OVERLAY_STYLES, type OverlayStyle } from "@/lib/youtube-live/overlay-styles";
import type { StreamRoute } from "@/lib/youtube-live/route-facts";
import { parseKopman, type KopmanLook } from "@/lib/youtube-live/kopman";
import { loadKopman } from "@/lib/youtube-live/kopman-store";
import { OVERLAY_SIZES, overlaySize } from "@/lib/youtube-live/overlay-size";
import { avatarPhoto, kopmanAvatarUrl } from "@/lib/avatar";

// Livestreams, fase 1 (0338). Alle schrijfacties lopen via de service-role, na
// de controles hier: module aan, ingericht, goedgekeurd lid, gekoppeld kanaal,
// en ingeschreven of opgesteld bij de race.

type Result = { ok: true } | { ok: false; error: string };

type EventRow = {
  id: string;
  type: string;
  title: string;
  start_at: string;
  team_id: string | null;
  parent_event_id: string | null;
  zwift_event_id: number | null;
  zwift_route_id: number | null;
  laps: number | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
};

async function approvedUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approved")
    .eq("id", access.user.id)
    .maybeSingle();
  if (!(profile as { is_approved?: boolean } | null)?.is_approved) return null;
  return { supabase, access, userId: access.user.id };
}

async function livestreamsOn(): Promise<boolean> {
  return youtubeLiveConfigured() && (await getClub()).isEnabled("livestream");
}

function grantError(err: unknown): string {
  return err instanceof YouTubeGrantRevokedError ? "Koppel YouTube opnieuw op je profiel." : youtubeErrorMessage(err);
}

/**
 * Maakt de thumbnail en zet hem op YouTube (2026-11-19). Een fout breekt de
 * stream niet: YouTube houdt dan de automatische thumbnail.
 */
async function pushThumbnail(
  accessToken: string,
  videoId: string,
  input: {
    eventTitle: string;
    eventType: string;
    startAt: string;
    route: StreamRoute;
    theme: OverlayMode;
    look: OverlayStyle;
    kopman?: KopmanLook | null;
  },
): Promise<string | null> {
  try {
    const image = await streamThumbnail({ ...input, origin: siteOrigin() });
    await setThumbnail(accessToken, videoId, await image.arrayBuffer());
    return null;
  } catch (err) {
    console.error("[livestream/thumbnail]", err);
    if (err instanceof YouTubeApiError && err.status === 403) {
      return "YouTube weigerde de thumbnail: zet eigen thumbnails aan op je kanaal (telefoonnummer bevestigen).";
    }
    return "De thumbnail kon niet naar YouTube.";
  }
}

/**
 * Klaarzetten. Lukt de stream maar weigert YouTube de thumbnail, dan `ok` met
 * `thumbnailError` (2026-11-20): de pagina wordt dan niet hier ververst, maar
 * door de knop, zodat de melding bij Thumbnail vernieuwen kan blijven staan.
 */
export async function prepareStream(
  eventId: string,
  /** De resolutie van de overlay (0348); zonder de resolutie van de vorige stream. */
  size?: string,
): Promise<{ ok: true; thumbnailError?: string } | { ok: false; error: string }> {
  if (!(await livestreamsOn())) return { ok: false, error: "Livestreams staan uit." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const { supabase, userId } = session;

  const { data } = await supabase
    .from("events")
    .select("id, type, title, start_at, team_id, parent_event_id, zwift_event_id, zwift_route_id, laps, distance_km, elevation_m")
    .eq("id", eventId)
    .maybeSingle();
  const event = data as EventRow | null;
  if (!event) return { ok: false, error: "Race niet gevonden." };

  const { count: subEvents } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("parent_event_id", event.id);
  const now = new Date();
  if (!eventTakesStreams(event, (subEvents ?? 0) > 0)) {
    return { ok: false, error: "Bij deze race kan geen stream." };
  }
  if (!inPrepareWindow(event.start_at, now)) {
    return { ok: false, error: "Klaarzetten kan vanaf twee weken voor de start." };
  }
  if (!(await ridesInEvent(supabase, userId, event))) {
    return { ok: false, error: "Alleen wie zich aanmeldde of opgesteld is, kan streamen." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("event_streams")
    .select("id, status")
    .eq("event_id", event.id)
    .eq("profile_id", userId)
    .maybeSingle();
  // Een stream die van YouTube verdween (0339), mag opnieuw.
  if ((existing as { status?: string } | null)?.status === "weg") {
    await admin.from("event_streams").delete().eq("id", (existing as { id: string }).id);
  } else if (existing) {
    return { ok: true };
  }

  const connection = await loadYouTubeConnection(admin, userId);
  if (!connection) return { ok: false, error: "Koppel eerst YouTube op je profiel." };

  // Een teamrace zonder eigen route rijdt die van zijn raceweek.
  let routeId = event.zwift_route_id;
  let laps = event.laps;
  if (!routeId && event.parent_event_id) {
    const { data: parent } = await supabase
      .from("events")
      .select("zwift_route_id, laps")
      .eq("id", event.parent_event_id)
      .maybeSingle();
    routeId = (parent as { zwift_route_id: number | null } | null)?.zwift_route_id ?? null;
    laps = laps ?? (parent as { laps: number | null } | null)?.laps ?? null;
  }
  const routeName = routeId ? zwiftRoutes.find((r) => r.id === Number(routeId))?.name ?? null : null;
  const club = await getClub();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || null;
  const liveStandUrl =
    site && event.type === "zrl" && event.team_id && event.zwift_event_id ? `${site}/live/zrl/${event.id}` : null;

  const scheduledStart = scheduledStartFor(event.start_at, now);
  let videoId: string;
  try {
    const accessToken = await youtubeAccessToken(admin, connection, now);
    let streamId = connection.stream_id;
    if (!streamId) {
      streamId = await ensureReusableStream(accessToken, null);
      await admin.from("youtube_connections").update({ stream_id: streamId }).eq("profile_id", userId);
    }
    videoId = await createBoundBroadcast(accessToken, streamId, {
      title: broadcastTitle({ eventTitle: event.title, clubShortName: club.texts.shortName, routeName }),
      description: broadcastDescription({
        eventTitle: event.title,
        startAt: event.start_at,
        routeName,
        laps,
        clubName: club.texts.name,
        liveStandUrl,
      }),
      scheduledStart,
      // Standaard openbaar (besluit eigenaar 2026-11-18).
      privacy: "public",
    });
  } catch (err) {
    console.error("[livestream/prepare]", err);
    return { ok: false, error: grantError(err) };
  }

  // Een nieuwe stream krijgt de stijl van de vorige stream van het lid (0346).
  const last = await lastLook(admin, userId);
  // De gekozen resolutie, alleen als de kolom er is (0348).
  if (size && "overlay_size" in last.columns && OVERLAY_SIZES.some((o) => o.key === size)) {
    last.columns.overlay_size = overlaySize(size);
  }
  const { error } = await admin.from("event_streams").insert({
    event_id: event.id,
    profile_id: userId,
    youtube_video_id: videoId,
    channel_title: connection.channel_title,
    scheduled_start_at: scheduledStart.toISOString(),
    ...last.columns,
  });
  if (error) {
    // Dubbel klikken: de tweede uitzending mag niet los op YouTube blijven staan.
    try {
      await deleteBroadcast(await youtubeAccessToken(admin, connection), videoId);
    } catch {
      // niet kritiek
    }
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: "De stream kon niet worden opgeslagen." };
  }
  let thumbnailError: string | null;
  try {
    thumbnailError = await pushThumbnail(await youtubeAccessToken(admin, connection), videoId, {
      eventTitle: event.title,
      eventType: event.type,
      startAt: event.start_at,
      route: await streamRoute(admin, event),
      theme: last.theme,
      look: last.look,
      kopman: last.look === "strip" ? await loadKopman(admin, userId) : null,
    });
  } catch (err) {
    console.error("[livestream/thumbnail]", err);
    thumbnailError = "De thumbnail kon niet naar YouTube.";
  }
  if (thumbnailError) return { ok: true, thumbnailError };
  revalidatePath(`/events/${event.id}`);
  return { ok: true };
}

type ThumbnailStream = {
  id: string;
  event_id: string;
  profile_id: string;
  youtube_video_id: string;
  overlay_theme?: string | null;
  overlay_style?: string | null;
  events: ThumbnailEvent | null;
};

const THUMBNAIL_EVENT_COLUMNS =
  "title, type, start_at, zwift_route_id, laps, parent_event_id, zwift_event_id, distance_km, elevation_m";

/** Maakt de thumbnail van een eigen stream opnieuw en zet hem op YouTube. */
async function pushStreamThumbnail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  stream: ThumbnailStream,
  look: { theme: OverlayMode; look: OverlayStyle },
): Promise<string | null> {
  if (!stream.events) return "Stream niet gevonden.";
  const connection = await loadYouTubeConnection(admin, userId);
  if (!connection) return "Koppel eerst YouTube op je profiel.";
  let accessToken: string;
  try {
    accessToken = await youtubeAccessToken(admin, connection);
  } catch (err) {
    return grantError(err);
  }
  return pushThumbnail(accessToken, stream.youtube_video_id, {
    eventTitle: stream.events.title,
    eventType: stream.events.type,
    startAt: stream.events.start_at,
    route: await streamRoute(admin, stream.events),
    ...look,
    kopman: look.look === "strip" ? await loadKopman(admin, userId) : null,
  });
}

/**
 * De stijl en het thema van de laatste stream van het lid, voor een nieuwe.
 * Ook de resolutie (0348). Alleen kolommen die er al zijn (zonder 0345, 0346
 * of 0348 blijft het insert gelijk). Heeft het lid nog geen stream, dan zijn
 * er geen kolommen en geldt de standaard van de database.
 */
async function lastLook(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ theme: OverlayMode; look: OverlayStyle; columns: Record<string, string> }> {
  const { data } = await admin
    .from("event_streams")
    .select("*")
    .eq("profile_id", userId)
    .order("scheduled_start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = (data as { overlay_theme?: string | null; overlay_style?: string | null; overlay_size?: string | null } | null) ?? {};
  const theme = overlayMode(row.overlay_theme);
  const look = overlayStyle(row.overlay_style);
  const columns: Record<string, string> = {};
  if ("overlay_theme" in row) columns.overlay_theme = theme;
  if ("overlay_style" in row) columns.overlay_style = look;
  if ("overlay_size" in row) columns.overlay_size = overlaySize(row.overlay_size);
  return { theme, look, columns };
}

const streamLook = (stream: ThumbnailStream) => ({
  theme: overlayMode(stream.overlay_theme),
  look: overlayStyle(stream.overlay_style),
});

async function loadThumbnailStream(
  admin: ReturnType<typeof createAdminClient>,
  streamId: string,
): Promise<ThumbnailStream | null> {
  // "*" zodat dit ook werkt zolang 0345 nog niet is toegepast.
  const { data } = await admin
    .from("event_streams")
    .select(`*, events(${THUMBNAIL_EVENT_COLUMNS})`)
    .eq("id", streamId)
    .maybeSingle();
  return (data as ThumbnailStream | null) ?? null;
}

/** De thumbnail van de eigen stream opnieuw maken en op YouTube zetten. */
export async function refreshStreamThumbnail(streamId: string): Promise<Result> {
  if (!(await livestreamsOn())) return { ok: false, error: "Livestreams staan uit." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const admin = createAdminClient();
  const stream = await loadThumbnailStream(admin, streamId);
  if (!stream?.events) return { ok: false, error: "Stream niet gevonden." };
  // Alleen de eigen stream: de thumbnail gaat met het eigen kanaal naar YouTube.
  if (stream.profile_id !== session.userId) return { ok: false, error: "Geen recht." };
  const error = await pushStreamThumbnail(admin, session.userId, stream, streamLook(stream));
  return error ? { ok: false, error } : { ok: true };
}

/**
 * Overlay en thumbnail in donker of licht (0345). De overlay volgt bij zijn
 * volgende verversing; bij de eigen stream gaat de thumbnail meteen mee. Lukt
 * dat niet, dan staat de keuze wel en komt de melding terug.
 */
export async function setOverlayTheme(streamId: string, theme: string): Promise<LookResult> {
  if (!(OVERLAY_MODES as readonly string[]).includes(theme)) return { ok: false, error: "Onbekende keuze." };
  return changeLook(streamId, { overlay_theme: overlayMode(theme) });
}

/** De stijl van overlay en thumbnail (0346), net als donker of licht. */
export async function setOverlayStyle(streamId: string, style: string): Promise<LookResult> {
  if (!OVERLAY_STYLES.some((s) => s.key === style)) return { ok: false, error: "Onbekende keuze." };
  return changeLook(streamId, { overlay_style: overlayStyle(style) });
}

type LookResult = { ok: true; thumbnailError?: string } | { ok: false; error: string };

/**
 * De resolutie van de overlay (0348). De overlay volgt bij zijn volgende
 * verversing; de thumbnail hangt er niet van af.
 */
export async function setOverlaySize(streamId: string, size: string): Promise<Result> {
  if (!OVERLAY_SIZES.some((o) => o.key === size)) return { ok: false, error: "Onbekende keuze." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const { access, userId } = session;
  const admin = createAdminClient();
  const { data } = await admin.from("event_streams").select("id, event_id, profile_id").eq("id", streamId).maybeSingle();
  const stream = data as { id: string; event_id: string; profile_id: string } | null;
  if (!stream) return { ok: false, error: "Stream niet gevonden." };
  if (stream.profile_id !== userId && !access.has("events.manage_all")) return { ok: false, error: "Geen recht." };
  const { error } = await admin.from("event_streams").update({ overlay_size: overlaySize(size) }).eq("id", stream.id);
  if (error) return { ok: false, error: "Opslaan lukte niet." };
  revalidatePath(`/events/${stream.event_id}`);
  return { ok: true };
}

async function changeLook(
  streamId: string,
  change: { overlay_theme?: OverlayMode; overlay_style?: OverlayStyle },
): Promise<LookResult> {
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const { access, userId } = session;
  const admin = createAdminClient();
  const stream = await loadThumbnailStream(admin, streamId);
  if (!stream) return { ok: false, error: "Stream niet gevonden." };
  const own = stream.profile_id === userId;
  if (!own && !access.has("events.manage_all")) return { ok: false, error: "Geen recht." };
  const { error } = await admin.from("event_streams").update(change).eq("id", stream.id);
  if (error) return { ok: false, error: "Opslaan lukte niet." };
  revalidatePath(`/events/${stream.event_id}`);
  if (!own || !(await livestreamsOn())) return { ok: true };
  const thumbnailError = await pushStreamThumbnail(admin, userId, { ...stream, ...change }, streamLook({ ...stream, ...change }));
  return thumbnailError ? { ok: true, thumbnailError } : { ok: true };
}

/**
 * De eigen kopman (0347), opgeslagen vanuit het profiel (0349): `value` null
 * haalt hem weg. `avatar` kiest wat de avatar is: de foto of de kopman. Zonder
 * foto is de kopman altijd de avatar (lib/avatar.ts). De thumbnails van de
 * komende eigen streams in strip gaan daarna opnieuw naar YouTube.
 */
export async function saveKopman(value: unknown, avatar: "foto" | "kopman"): Promise<LookResult> {
  // De avatar is van elk lid, ook van wie nog niet is goedgekeurd.
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  const userId = access.user.id;
  const look = value === null ? null : parseKopman(value);
  if (value !== null && !look) return { ok: false, error: "Onbekende keuze." };
  const admin = createAdminClient();
  const { error } = look
    ? await admin
        .from("stream_kopman")
        .upsert({ profile_id: userId, look, updated_at: new Date().toISOString() }, { onConflict: "profile_id" })
    : await admin.from("stream_kopman").delete().eq("profile_id", userId);
  if (error) return { ok: false, error: "Opslaan lukte niet." };

  // "*" zodat het lezen ook werkt zolang 0349 nog niet is toegepast.
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const photo = avatarPhoto(profile as { avatar_url?: string | null; avatar_photo_url?: string | null } | null);
  const useKopman = Boolean(look) && (avatar === "kopman" || !photo);
  // Zonder eigen kopman en zonder foto: leeg, dan toont de app de standaardkopman.
  const avatarChange = useKopman
    ? { avatar_url: kopmanAvatarUrl(userId, Date.now()), avatar_photo_url: photo }
    : { avatar_url: photo, avatar_photo_url: null };
  const { error: avatarError } = await admin.from("profiles").update(avatarChange).eq("id", userId);
  if (avatarError) return { ok: false, error: "De kopman staat opgeslagen, de avatar niet." };
  revalidatePath("/", "layout");

  if (!(await livestreamsOn())) return { ok: true };
  const { data: streams } = await admin
    .from("event_streams")
    .select(`*, events(${THUMBNAIL_EVENT_COLUMNS})`)
    .eq("profile_id", userId)
    .gt("scheduled_start_at", new Date().toISOString())
    .order("scheduled_start_at")
    .limit(5);
  let thumbnailError: string | null = null;
  for (const stream of (streams ?? []) as ThumbnailStream[]) {
    if (overlayStyle(stream.overlay_style) !== "strip") continue;
    thumbnailError = (await pushStreamThumbnail(admin, userId, stream, streamLook(stream))) ?? thumbnailError;
  }
  return thumbnailError ? { ok: true, thumbnailError } : { ok: true };
}

export async function removeStream(streamId: string): Promise<Result> {
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const { access, userId } = session;
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_streams")
    .select("id, event_id, profile_id, youtube_video_id, scheduled_start_at")
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as {
    id: string;
    event_id: string;
    profile_id: string;
    youtube_video_id: string;
    scheduled_start_at: string;
  } | null;
  if (!stream) return { ok: true };
  const own = stream.profile_id === userId;
  if (!own && !access.has("events.manage_all")) return { ok: false, error: "Geen recht." };

  // Alleen een eigen uitzending die nog niet begon, gaat ook op YouTube weg.
  // Een opname van een gereden race blijft van het lid.
  if (own && Date.parse(stream.scheduled_start_at) > Date.now()) {
    try {
      const connection = await loadYouTubeConnection(admin, userId);
      if (connection) await deleteBroadcast(await youtubeAccessToken(admin, connection), stream.youtube_video_id);
    } catch (err) {
      console.error("[livestream/remove]", err);
    }
  }
  const { error } = await admin.from("event_streams").delete().eq("id", stream.id);
  if (error) return { ok: false, error: "Weghalen lukte niet." };
  revalidatePath(`/events/${stream.event_id}`);
  return { ok: true };
}

/** De live stand in de overlay van deze stream aan of uit (0341). */
export async function setOverlayStand(streamId: string, on: boolean): Promise<Result> {
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const { access, userId } = session;
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_streams")
    .select("id, event_id, profile_id")
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as { id: string; event_id: string; profile_id: string } | null;
  if (!stream) return { ok: false, error: "Stream niet gevonden." };
  if (stream.profile_id !== userId && !access.has("events.manage_all")) {
    return { ok: false, error: "Geen recht." };
  }
  const { error } = await admin
    .from("event_streams")
    .update({ overlay_stand: Boolean(on) })
    .eq("id", stream.id);
  if (error) return { ok: false, error: "Opslaan lukte niet." };
  revalidatePath(`/events/${stream.event_id}`);
  return { ok: true };
}

export async function revealStreamKey(): Promise<
  { ok: true; serverUrl: string; streamKey: string } | { ok: false; error: string }
> {
  if (!(await livestreamsOn())) return { ok: false, error: "Livestreams staan uit." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  const admin = createAdminClient();
  const connection = await loadYouTubeConnection(admin, session.userId);
  if (!connection) return { ok: false, error: "Koppel eerst YouTube." };
  try {
    const accessToken = await youtubeAccessToken(admin, connection);
    let streamId = connection.stream_id;
    if (!streamId) {
      streamId = await ensureReusableStream(accessToken, null);
      await admin.from("youtube_connections").update({ stream_id: streamId }).eq("profile_id", session.userId);
    }
    const ingestion = await getStreamIngestion(accessToken, streamId);
    if (!ingestion) return { ok: false, error: "YouTube gaf geen streamsleutel." };
    return { ok: true, serverUrl: ingestion.serverUrl, streamKey: ingestion.streamKey };
  } catch (err) {
    console.error("[livestream/key]", err);
    return { ok: false, error: grantError(err) };
  }
}

export async function disconnectYouTube(): Promise<Result> {
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  try {
    await removeYouTubeConnection(createAdminClient(), session.userId);
  } catch {
    return { ok: false, error: "Ontkoppelen lukte niet." };
  }
  revalidatePath("/profiel");
  return { ok: true };
}

// ── Stream-hulp (fase 3, 0340) ────────────────────────────────────────────

/** Een nieuwe koppelcode voor de stream-hulp; een eerdere hulp werkt daarna niet meer. */
export async function pairStreamHelper(): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!(await livestreamsOn())) return { ok: false, error: "Livestreams staan uit." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  try {
    const code = await createHelperPairing(createAdminClient(), session.userId);
    revalidatePath("/profiel");
    return { ok: true, code };
  } catch (err) {
    console.error("[livestream/pair]", err);
    return { ok: false, error: "Koppelen lukte niet." };
  }
}

export async function unpairStreamHelper(): Promise<Result> {
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  try {
    await removeHelper(createAdminClient(), session.userId);
  } catch {
    return { ok: false, error: "Ontkoppelen lukte niet." };
  }
  revalidatePath("/profiel");
  return { ok: true };
}

/** OBS starten of stoppen via de eigen stream-hulp. */
export async function streamHelperCommand(action: "start" | "stop"): Promise<Result> {
  if (action !== "start" && action !== "stop") return { ok: false, error: "Onbekende opdracht." };
  if (!(await livestreamsOn())) return { ok: false, error: "Livestreams staan uit." };
  const session = await approvedUser();
  if (!session) return { ok: false, error: "Niet ingelogd." };
  try {
    await sendHelperCommand(createAdminClient(), session.userId, action);
    return { ok: true };
  } catch (err) {
    console.error("[livestream/helper]", err);
    return { ok: false, error: "De hulp-app is niet te bereiken." };
  }
}
