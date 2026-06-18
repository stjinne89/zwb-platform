"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { matchProfile, type MatchableProfile } from "@/lib/events/zwb-detection";
import {
  diagnoseZwiftClub,
  followZwbMembers,
  zwiftClubConfigured,
} from "@/lib/events/zwift-club";
import { allowedExternalUrl, runEventScan } from "@/lib/events/scan-runner";

const MATCH_STATUSES = new Set(["unknown", "likely", "confirmed", "manual"]);
const CATEGORY_VALUES = new Set(["A", "B", "C", "D", "E"]);

async function requireEventScanAccess() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return null;
  if (!access.has("events.manage_all")) {
    return null;
  }
  return { userId: access.user.id, admin: createAdminClient() };
}

function cleanParticipantName(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bcat(?:egory)?\s*[A-E]\b/gi, " ")
    .replace(/\b[A-E]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseParticipantLines(input: string, defaultCategory: string | null) {
  const seen = new Set<string>();
  return input
    .split(/[\n,;]+/)
    .map((line) => {
      const raw = line.trim();
      const category =
        raw.match(/\bcat(?:egory)?\s*([A-E])\b/i)?.[1]?.toUpperCase() ??
        raw.match(/\(([A-E])\)/i)?.[1]?.toUpperCase() ??
        defaultCategory;
      const name = cleanParticipantName(raw);
      return {
        externalName: name,
        category: category && CATEGORY_VALUES.has(category) ? category : null,
        rawText: raw,
      };
    })
    .filter((participant) => {
      if (participant.externalName.length < 2) return false;
      const key = `${participant.externalName.toLowerCase()}|${participant.category ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function participantDescription(
  participants: Array<{ external_name: string; category: string | null }>,
) {
  if (participants.length === 0) return null;
  const names = participants
    .map((participant) =>
      participant.category
        ? `${participant.external_name} (${participant.category})`
        : participant.external_name,
    )
    .join(", ");
  return `ZWB-deelnemers: ${names}`;
}

export async function scanExternalEventCandidates() {
  const access = await requireEventScanAccess();
  if (!access) return;

  const result = await runEventScan(access.admin);

  revalidatePath("/beheer/event-scan");
  revalidatePath("/kalender");

  const params = new URLSearchParams();
  params.set("found", String(result.found));
  params.set("saved", String(result.saved));
  if (result.auto > 0) params.set("auto", String(result.auto));
  if (result.feedEvents > 0 || result.feedMembers > 0) {
    params.set("club", String(result.feedEvents));
    params.set("clubMembers", String(result.feedMembers));
  }
  if (result.error) {
    params.set("scan", "error");
    params.set("message", result.error);
  } else {
    params.set("scan", result.found > 0 || result.feedEvents > 0 ? "ok" : "empty");
    if (result.notes.length > 0) params.set("message", result.notes.join(" "));
  }
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function testZwiftClubConnection() {
  const access = await requireEventScanAccess();
  if (!access) return;
  const message = await diagnoseZwiftClub();
  const params = new URLSearchParams();
  params.set("club", "test");
  params.set("message", message);
  redirect(`/beheer/event-scan?${params.toString()}`);
}

// Laat het serviceaccount alle leden met een Zwift-ID volgen, zodat hun
// inschrijvingen in de member-feed opduiken voor de feedsync.
export async function followZwbMembersAction() {
  const access = await requireEventScanAccess();
  if (!access) return;
  const params = new URLSearchParams();
  params.set("club", "follow");

  if (!zwiftClubConfigured()) {
    params.set("message", "Zwift-clubkoppeling niet geconfigureerd.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const { data: profileRows } = await access.admin
    .from("profiles")
    .select("zwift_id")
    .not("zwift_id", "is", null);
  const zwiftIds = ((profileRows ?? []) as Array<{ zwift_id: string | null }>)
    .map((row) => row.zwift_id?.trim())
    .filter((id): id is string => Boolean(id));

  if (zwiftIds.length === 0) {
    params.set("message", "Geen leden met een Zwift-ID gevonden.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  try {
    const result = await followZwbMembers(zwiftIds);
    params.set(
      "message",
      `Volgen klaar: ${result.followed} van ${zwiftIds.length} leden gevolgd${result.failed > 0 ? `, ${result.failed} mislukt` : ""}.`,
    );
  } catch (error) {
    params.set(
      "message",
      error instanceof Error ? `Volgen mislukt: ${error.message}` : "Volgen mislukt.",
    );
  }
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function publishCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;

  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  const { data: candidate } = await access.admin
    .from("external_event_candidates")
    .select(
      "id, title, start_at, external_url, distance_km, elevation_m, published_event_id",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate || candidate.published_event_id) return;
  if (!allowedExternalUrl(candidate.external_url)) return;

  const { data: participants } = await access.admin
    .from("external_event_participants")
    .select("external_name, category")
    .eq("candidate_id", candidateId)
    .order("external_name", { ascending: true });
  const description = participantDescription(
    (participants ?? []) as Array<{ external_name: string; category: string | null }>,
  );

  const { data: existing } = await access.admin
    .from("events")
    .select("id")
    .eq("external_url", candidate.external_url)
    .maybeSingle();
  if (existing) {
    await access.admin
      .from("external_event_candidates")
      .update({
        published_event_id: existing.id,
        published_at: new Date().toISOString(),
        published_by: access.userId,
      })
      .eq("id", candidateId);
    revalidatePath("/beheer/event-scan");
    return;
  }

  const { data: event, error } = await access.admin
    .from("events")
    .insert({
      title: candidate.title,
      type: "overig",
      start_at: new Date(candidate.start_at).toISOString(),
      end_at: null,
      location: "Online",
      description,
      external_url: candidate.external_url,
      live_timing_url: null,
      results_url: null,
      team_id: null,
      gpx_path: null,
      distance_km: candidate.distance_km,
      elevation_m: candidate.elevation_m,
      start_lat: null,
      start_lon: null,
      cover_image_path: null,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error) return;

  await access.admin
    .from("external_event_candidates")
    .update({
      published_event_id: event.id,
      published_at: new Date().toISOString(),
      published_by: access.userId,
    })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}

export async function addCandidateParticipants(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;

  const params = new URLSearchParams();
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const participantsText = String(formData.get("participants") ?? "").trim();
  const defaultCategory = String(formData.get("category") ?? "").trim().toUpperCase();
  if (!candidateId || !participantsText) {
    params.set("import", "empty");
    params.set("message", "Geen deelnemers opgegeven.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const [{ data: candidate }, { data: profiles }] = await Promise.all([
    access.admin
      .from("external_event_candidates")
      .select("id, published_event_id")
      .eq("id", candidateId)
      .is("ignored_at", null)
      .maybeSingle(),
    access.admin
      .from("profiles")
      .select("id, display_name, zwift_id, mywhoosh_id")
      .order("display_name", { ascending: true }),
  ]);
  if (!candidate || candidate.published_event_id) return;

  const parsed = parseParticipantLines(
    participantsText,
    CATEGORY_VALUES.has(defaultCategory) ? defaultCategory : null,
  );
  if (parsed.length === 0) {
    params.set("import", "empty");
    params.set("message", "Geen geldige deelnemers gevonden.");
    redirect(`/beheer/event-scan?${params.toString()}`);
  }

  const typedProfiles = (profiles ?? []) as MatchableProfile[];
  const { data: existingRows } = await access.admin
    .from("external_event_participants")
    .select("candidate_id, external_name, category")
    .eq("candidate_id", candidateId);
  const existing = new Set(
    ((existingRows ?? []) as Array<{
      candidate_id: string;
      external_name: string;
      category: string | null;
    }>).map((row) =>
      `${row.external_name.toLowerCase().trim()}|${row.category ?? ""}`,
    ),
  );

  const rows = parsed
    .filter((match) => !existing.has(`${match.externalName.toLowerCase()}|${match.category ?? ""}`))
    .map((match) => ({
      candidate_id: candidateId,
      source: "manual",
      external_name: match.externalName,
      category: match.category,
      profile_id: matchProfile(match.externalName, typedProfiles),
      raw_text: match.rawText,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await access.admin
      .from("external_event_participants")
      .insert(rows);
    if (error) {
      params.set("import", "error");
      params.set("message", error.message);
      redirect(`/beheer/event-scan?${params.toString()}`);
    }

    await access.admin
      .from("external_event_candidates")
      .update({ zwb_match_status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", candidateId);
  }

  revalidatePath("/beheer/event-scan");
  params.set("import", rows.length > 0 ? "ok" : "empty");
  params.set("matched", String(parsed.length));
  params.set("saved", String(rows.length));
  redirect(`/beheer/event-scan?${params.toString()}`);
}

export async function ignoreCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  // Verwijder het concept; een volgende scan kan het opnieuw opvoeren.
  await access.admin
    .from("external_event_candidates")
    .delete()
    .eq("id", candidateId)
    .is("published_event_id", null);

  revalidatePath("/beheer/event-scan");
}

export async function ignoreAllCandidates() {
  const access = await requireEventScanAccess();
  if (!access) return;

  // Verwijder alle nog niet gepubliceerde concepten. Een volgende scan kan ze
  // opnieuw opvoeren; gepubliceerde events blijven staan.
  await access.admin
    .from("external_event_candidates")
    .delete()
    .is("published_event_id", null);

  revalidatePath("/beheer/event-scan");
}

export async function reopenCandidate(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  if (!candidateId) return;

  await access.admin
    .from("external_event_candidates")
    .update({ ignored_at: null })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
}

export async function updateCandidateMatchStatus(formData: FormData) {
  const access = await requireEventScanAccess();
  if (!access) return;
  const candidateId = String(formData.get("candidate_id") ?? "").trim();
  const status = String(formData.get("zwb_match_status") ?? "").trim();
  if (!candidateId || !MATCH_STATUSES.has(status)) return;

  await access.admin
    .from("external_event_candidates")
    .update({ zwb_match_status: status })
    .eq("id", candidateId);

  revalidatePath("/beheer/event-scan");
}
