"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

// Verwijder een ritverslag = het voorbije event en alle bijbehorende foto's,
// verslagen en chat (cascade). Alleen moderators (events.manage_all) of de
// maker van het event.
export async function deleteRitverslag(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "Event niet gevonden." };

  const access = await getCurrentUserAccess(supabase);
  const canManage =
    access.has("events.manage_all") || event.created_by === user.id;
  if (!canManage) {
    return {
      ok: false as const,
      error: "Geen recht om dit ritverslag te verwijderen.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/ritverslagen");
  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  return { ok: true as const };
}

function revalidateReportSurfaces(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/ritverslagen");
  revalidatePath("/dashboard");
}

// Eén verslag per (event, lid): bestaat er al een → bijwerken, anders nieuw.
export async function saveEventReport(eventId: string, bodyMd: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const body = (bodyMd ?? "").trim();
  if (!body) return { ok: false as const, error: "Schrijf eerst iets." };
  if (body.length > 8000) {
    return { ok: false as const, error: "Verslag is te lang (max 8000 tekens)." };
  }

  const { data: existing } = await supabase
    .from("event_reports")
    .select("id")
    .eq("event_id", eventId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("event_reports")
      .update({ body_md: body })
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("event_reports").insert({
      event_id: eventId,
      profile_id: user.id,
      body_md: body,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidateReportSurfaces(eventId);
  return { ok: true as const };
}

export async function deleteEventReport(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: report } = await supabase
    .from("event_reports")
    .select("event_id")
    .eq("id", reportId)
    .maybeSingle();

  // RLS staat alleen auteur of admin toe te verwijderen.
  const { error } = await supabase
    .from("event_reports")
    .delete()
    .eq("id", reportId);
  if (error) return { ok: false as const, error: error.message };

  if (report?.event_id) revalidateReportSurfaces(report.event_id);
  return { ok: true as const };
}

export async function addReportComment(reportId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const text = (body ?? "").trim();
  if (!text) return { ok: false as const, error: "Lege reactie." };
  if (text.length > 2000) {
    return { ok: false as const, error: "Reactie is te lang (max 2000 tekens)." };
  }

  const { error } = await supabase.from("event_report_comments").insert({
    report_id: reportId,
    profile_id: user.id,
    body: text,
  });
  if (error) return { ok: false as const, error: error.message };

  const { data: report } = await supabase
    .from("event_reports")
    .select("event_id")
    .eq("id", reportId)
    .maybeSingle();
  if (report?.event_id) revalidateReportSurfaces(report.event_id);
  return { ok: true as const };
}

export async function deleteReportComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: comment } = await supabase
    .from("event_report_comments")
    .select("report_id")
    .eq("id", commentId)
    .maybeSingle();

  const { error } = await supabase
    .from("event_report_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { ok: false as const, error: error.message };

  if (comment?.report_id) {
    const { data: report } = await supabase
      .from("event_reports")
      .select("event_id")
      .eq("id", comment.report_id)
      .maybeSingle();
    if (report?.event_id) revalidateReportSurfaces(report.event_id);
  }
  return { ok: true as const };
}
