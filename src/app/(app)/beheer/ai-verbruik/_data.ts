import "server-only";

// De regels voor /beheer/ai-verbruik uit ai_usage (0316), met de namen erbij.

import { AI_TRIGGERS, type AiTrigger, type AiUsageRow } from "@/lib/ai/usage";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000;

export type AiUsageData =
  | { available: true; rows: AiUsageRow[]; names: Map<string, string> }
  /** De tabel bestaat nog niet: migratie 0316 is niet toegepast. */
  | { available: false };

function asTrigger(value: unknown): AiTrigger {
  return AI_TRIGGERS.includes(value as AiTrigger) ? (value as AiTrigger) : "automatic";
}

export async function loadAiUsage(from: string, to: string): Promise<AiUsageData> {
  const admin = createAdminClient();
  const rows: AiUsageRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from("ai_usage")
      .select("profile_id, feature, kind, trigger, cost_usd")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (error) {
      if (offset === 0) return { available: false };
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      rows.push({
        profileId: (row.profile_id as string | null) ?? null,
        feature: row.feature as string,
        kind: (row.kind as string) || (row.feature as string),
        trigger: asTrigger(row.trigger),
        costUsd: row.cost_usd == null ? null : Number(row.cost_usd),
      });
    }
    if ((data ?? []).length < PAGE) break;
  }

  const ids = [...new Set(rows.map((row) => row.profileId).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
    for (const profile of data ?? []) {
      names.set(profile.id as string, (profile.display_name as string | null)?.trim() || "Onbekend lid");
    }
  }
  return { available: true, rows, names };
}
