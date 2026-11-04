"use server";

// Pop-up "nog niet gekoppeld" versturen (0307). De ontvangers komen van de
// client, maar de server rekent zelf na wie de koppeling echt mist: een
// verouderde pagina stuurt dan niemand die intussen koppelde een melding.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { loadMemberIntegrationInputs } from "@/lib/integrations/load";
import { memberIntegrations } from "@/lib/integrations/member-overview";
import { cleanNoticeBody, isNoticeIntegration, NOTICE_BODY_MAX } from "@/lib/integrations/notices";

/** Eén verzending; meer leden heeft de club niet. */
const MAX_RECIPIENTS = 300;

export type SendNoticeResult =
  | { ok: false; error: string }
  | { ok: true; sent: number; alreadyOpen: number; notMissing: number };

export async function sendIntegrationNotice(input: {
  integration: string;
  profileIds: string[];
  body: string;
}): Promise<SendNoticeResult> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false, error: "Niet ingelogd." };
  if (!access.has(adminAreaPermission("koppelingen"))) {
    return { ok: false, error: "Geen recht om leden over koppelingen te berichten." };
  }
  if (!isNoticeIntegration(input.integration)) {
    return { ok: false, error: "Voor deze koppeling is er geen pop-up." };
  }
  const integration = input.integration;
  const body = cleanNoticeBody(input.body);
  if (!body) return { ok: false, error: `Tekst leeg of langer dan ${NOTICE_BODY_MAX} tekens.` };
  const ids = [...new Set((input.profileIds ?? []).map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) return { ok: false, error: "Geen leden gekozen." };
  if (ids.length > MAX_RECIPIENTS) return { ok: false, error: "Te veel leden in één keer." };

  try {
    const admin = createAdminClient();
    const now = new Date();
    const loaded = await loadMemberIntegrationInputs(admin, { profileIds: ids, now });
    const missing = loaded
      .filter(({ input: member }) =>
        memberIntegrations(member, now).some((item) => item.key === integration && item.missing),
      )
      .map(({ profileId }) => profileId);

    // Wie al een melding over deze koppeling heeft openstaan, krijgt er geen tweede.
    let open = new Set<string>();
    if (missing.length > 0) {
      const { data, error } = await admin
        .from("integration_notices")
        .select("profile_id")
        .eq("integration", integration)
        .is("seen_at", null)
        .is("resolved_at", null)
        .in("profile_id", missing);
      if (error) return { ok: false, error: error.message };
      open = new Set(((data ?? []) as { profile_id: string }[]).map((row) => row.profile_id));
    }
    const recipients = missing.filter((id) => !open.has(id));

    if (recipients.length > 0) {
      const { error } = await admin.from("integration_notices").insert(
        recipients.map((profileId) => ({
          profile_id: profileId,
          integration,
          body,
          sent_by: access.user!.id,
        })),
      );
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/beheer/koppelingen");
    return {
      ok: true,
      sent: recipients.length,
      alreadyOpen: open.size,
      notMissing: ids.length - missing.length,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Versturen mislukt." };
  }
}
