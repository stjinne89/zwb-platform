import "server-only";

// De openstaande pop-ups "nog niet gekoppeld" van één lid (0307), voor de
// app-layout. Koppelde het lid intussen zelf, dan zet dit `resolved_at` en
// toont de app hem niet meer.
//
// De eerste vraag loopt onder de RLS van het lid en raakt alleen de index op
// openstaande meldingen; de koppelingen laden we pas als er iets openstaat.

import { createAdminClient } from "@/lib/supabase/admin";
import { loadMemberIntegrationInputs, stravaCapIsFull } from "@/lib/integrations/load";
import { memberIntegrations } from "@/lib/integrations/member-overview";
import { isNoticeIntegration, noticeTemplate, NOTICE_INTEGRATIONS } from "@/lib/integrations/notices";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export type OpenIntegrationNotice = {
  id: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
};

export async function loadOpenIntegrationNotices(
  supabase: Client,
  profileId: string,
): Promise<OpenIntegrationNotice[]> {
  const { data, error } = await supabase
    .from("integration_notices")
    .select("id, integration, body, created_at")
    .eq("profile_id", profileId)
    .is("seen_at", null)
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(10);
  // Zonder 0307 bestaat de tabel niet: dan gewoon geen melding.
  if (error || !data || data.length === 0) return [];

  const rows = (data as { id: string; integration: string; body: string }[]).filter((row) =>
    isNoticeIntegration(row.integration),
  );
  if (rows.length === 0) return [];

  const admin = createAdminClient();
  const [member] = await loadMemberIntegrationInputs(admin, { profileIds: [profileId] });
  const missing = new Set(
    member
      ? memberIntegrations(member.input)
          .filter((item) => item.missing)
          .map((item) => item.key as string)
      : NOTICE_INTEGRATIONS,
  );

  const resolved = rows.filter((row) => !missing.has(row.integration)).map((row) => row.id);
  if (resolved.length > 0) {
    await admin
      .from("integration_notices")
      .update({ resolved_at: new Date().toISOString() })
      .in("id", resolved)
      .eq("profile_id", profileId)
      .then(
        () => null,
        () => null,
      );
  }

  const open = rows.filter((row) => missing.has(row.integration));
  if (open.length === 0) return [];
  const capFull = open.some((row) => row.integration === "strava") ? await stravaCapIsFull(admin) : false;

  // Per koppeling één melding: is er twee keer verstuurd, dan telt de nieuwste
  // tekst, maar gaan ze allebei op gezien.
  const byIntegration = new Map<string, { ids: string[]; body: string; integration: string }>();
  for (const row of open) {
    const current = byIntegration.get(row.integration);
    if (current) {
      current.ids.push(row.id);
      current.body = row.body;
    } else {
      byIntegration.set(row.integration, { ids: [row.id], body: row.body, integration: row.integration });
    }
  }

  return [...byIntegration.values()].map((entry) => {
    const template = noticeTemplate(entry.integration as (typeof NOTICE_INTEGRATIONS)[number], {
      stravaCapFull: capFull,
    });
    return {
      id: entry.ids.join(","),
      title: template.title,
      body: entry.body,
      href: template.href,
      linkLabel: template.linkLabel,
    };
  });
}
