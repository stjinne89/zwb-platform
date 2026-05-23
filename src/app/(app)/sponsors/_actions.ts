"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

const TIERS = ["hoofd", "sub", "team", "web", "vriend"] as const;
type SponsorTier = (typeof TIERS)[number];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function requireSponsorAdmin() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { ok: false as const, error: "Niet ingelogd." };
  }
  if (!access.has("sponsors.manage")) {
    return { ok: false as const, error: "Geen recht om sponsors te beheren." };
  }
  return { ok: true as const, userId: access.user.id };
}

function revalidateSponsorPaths() {
  revalidatePath("/sponsors");
  revalidatePath("/dashboard");
}

// ─── Sponsors ──────────────────────────────────────────────────────────

export async function createSponsor(formData: FormData) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Naam is verplicht." };

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput ? slugify(slugInput) : slugify(name);
  if (!slug) return { ok: false as const, error: "Ongeldige slug." };

  const tierInput = String(formData.get("tier") ?? "team") as SponsorTier;
  const tier = TIERS.includes(tierInput) ? tierInput : "team";

  const website = String(formData.get("website_url") ?? "").trim() || null;
  const description =
    String(formData.get("description_md") ?? "").trim() || null;
  const contactEmail =
    String(formData.get("contact_email") ?? "").trim() || null;
  const displayOrder = Number(formData.get("display_order") ?? 100) || 100;

  const admin = createAdminClient();
  const { error } = await admin.from("sponsors").insert({
    name,
    slug,
    tier,
    website_url: website,
    description_md: description,
    contact_email: contactEmail,
    display_order: displayOrder,
    created_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

export async function updateSponsor(id: string, formData: FormData) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Naam is verplicht." };

  const tierInput = String(formData.get("tier") ?? "team") as SponsorTier;
  const tier = TIERS.includes(tierInput) ? tierInput : "team";

  const website = String(formData.get("website_url") ?? "").trim() || null;
  const description =
    String(formData.get("description_md") ?? "").trim() || null;
  const contactEmail =
    String(formData.get("contact_email") ?? "").trim() || null;
  const displayOrder = Number(formData.get("display_order") ?? 100) || 100;
  const active = formData.get("active") === "on";

  const admin = createAdminClient();
  const { error } = await admin
    .from("sponsors")
    .update({
      name,
      tier,
      website_url: website,
      description_md: description,
      contact_email: contactEmail,
      display_order: displayOrder,
      active,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

export async function deleteSponsor(id: string) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  // Hard delete: voordelen behouden (sponsor_id → null door FK on delete set null)
  const { error } = await admin.from("sponsors").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

export async function uploadSponsorLogo(
  sponsorId: string,
  file: File,
): Promise<{ ok: true; logoUrl: string } | { ok: false; error: string }> {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  if (!file || file.size === 0) {
    return { ok: false as const, error: "Geen bestand ontvangen." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false as const, error: "Logo is te groot (max 2 MB)." };
  }

  const admin = createAdminClient();

  // Lees huidige sponsor om slug + oude logo te kennen.
  const { data: sponsor, error: readErr } = await admin
    .from("sponsors")
    .select("slug, logo_url")
    .eq("id", sponsorId)
    .single();
  if (readErr || !sponsor) {
    return { ok: false as const, error: "Sponsor niet gevonden." };
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1] || "png";
  const path = `${sponsor.slug}/logo-${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("sponsors")
    .upload(path, buffer, {
      contentType: file.type || "image/png",
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) return { ok: false as const, error: upErr.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("sponsors").getPublicUrl(path);

  const { error: updErr } = await admin
    .from("sponsors")
    .update({ logo_url: publicUrl })
    .eq("id", sponsorId);
  if (updErr) return { ok: false as const, error: updErr.message };

  // Best-effort: oude logo opruimen
  if (sponsor.logo_url) {
    const m = sponsor.logo_url.match(
      /\/storage\/v1\/object\/public\/sponsors\/(.+?)(?:\?|$)/,
    );
    if (m) {
      await admin.storage.from("sponsors").remove([m[1]]);
    }
  }

  revalidateSponsorPaths();
  return { ok: true as const, logoUrl: publicUrl };
}

// ─── Member benefits ───────────────────────────────────────────────────

export async function createBenefit(formData: FormData) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Titel is verplicht." };

  const sponsorId = String(formData.get("sponsor_id") ?? "").trim() || null;
  const description =
    String(formData.get("description_md") ?? "").trim() || null;
  const discountCode =
    String(formData.get("discount_code") ?? "").trim() || null;
  const redeemUrl = String(formData.get("redeem_url") ?? "").trim() || null;
  const validFrom = String(formData.get("valid_from") ?? "").trim() || null;
  const validUntil = String(formData.get("valid_until") ?? "").trim() || null;
  const displayOrder = Number(formData.get("display_order") ?? 100) || 100;

  const admin = createAdminClient();
  const { error } = await admin.from("member_benefits").insert({
    sponsor_id: sponsorId,
    title,
    description_md: description,
    discount_code: discountCode,
    redeem_url: redeemUrl,
    valid_from: validFrom,
    valid_until: validUntil,
    display_order: displayOrder,
    created_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

export async function updateBenefit(id: string, formData: FormData) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Titel is verplicht." };

  const sponsorId = String(formData.get("sponsor_id") ?? "").trim() || null;
  const description =
    String(formData.get("description_md") ?? "").trim() || null;
  const discountCode =
    String(formData.get("discount_code") ?? "").trim() || null;
  const redeemUrl = String(formData.get("redeem_url") ?? "").trim() || null;
  const validFrom = String(formData.get("valid_from") ?? "").trim() || null;
  const validUntil = String(formData.get("valid_until") ?? "").trim() || null;
  const displayOrder = Number(formData.get("display_order") ?? 100) || 100;
  const active = formData.get("active") === "on";

  const admin = createAdminClient();
  const { error } = await admin
    .from("member_benefits")
    .update({
      sponsor_id: sponsorId,
      title,
      description_md: description,
      discount_code: discountCode,
      redeem_url: redeemUrl,
      valid_from: validFrom,
      valid_until: validUntil,
      display_order: displayOrder,
      active,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

export async function deleteBenefit(id: string) {
  const guard = await requireSponsorAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("member_benefits").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateSponsorPaths();
  return { ok: true as const };
}

/**
 * Ruimt voordelen op die meer dan 7 dagen verlopen zijn.
 *
 * Flow: een voordeel met valid_until in het verleden wordt eerst nog 7
 * dagen "vervaagd" op de pagina getoond (grijs + niet-klikbaar) zodat
 * leden zien dat het bestond — daarna pas verwijderd. Veilig om
 * meerdere keren te draaien (idempotent). Geen permission-check
 * omdat dit als best-effort vanuit de publieke page-render draait;
 * service-role-client doet de eigenlijke delete.
 */
export async function pruneExpiredBenefits(): Promise<{
  ok: boolean;
  deleted: number;
}> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 7 * 86400_000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await admin
      .from("member_benefits")
      .delete()
      .lt("valid_until", cutoff)
      .select("id");
    if (error) return { ok: false, deleted: 0 };
    return { ok: true, deleted: data?.length ?? 0 };
  } catch {
    return { ok: false, deleted: 0 };
  }
}
