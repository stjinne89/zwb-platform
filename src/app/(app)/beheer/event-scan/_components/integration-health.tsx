import { createAdminClient } from "@/lib/supabase/admin";

type Row = {
  source: string;
  ok: boolean;
  detail: string | null;
  checked_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  zwift_feed: "Zwift-feed",
  mywhoosh: "MyWhoosh",
  zwiftpower: "ZwiftPower",
  ladder: "Club-ladder",
  wtrl: "WTRL / ZRL",
  openai: "Training-AI (OpenAI)",
};

// Compact statusoverzicht van de externe integraties, gevoed door
// /api/health/integrations. Toont per bron de laatste status.
export async function IntegrationHealth() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_health")
    .select("source, ok, detail, checked_at")
    .order("checked_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const latest = new Map<string, Row>();
  for (const row of rows) {
    if (!latest.has(row.source)) latest.set(row.source, row);
  }
  const items = [...latest.values()].sort((a, b) =>
    (SOURCE_LABELS[a.source] ?? a.source).localeCompare(
      SOURCE_LABELS[b.source] ?? b.source,
    ),
  );
  const lastChecked = items
    .map((item) => item.checked_at)
    .sort()
    .at(-1);
  const failing = items.filter((item) => !item.ok).length;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Integraties{failing > 0 ? ` — ${failing} probleem` : ""}
        </h2>
        {lastChecked && (
          <span className="text-xs text-muted-foreground">
            {new Date(lastChecked).toLocaleString("nl-NL", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Amsterdam",
            })}
          </span>
        )}
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.source} className="flex items-center gap-2 text-sm">
            <span
              className={`size-2 shrink-0 rounded-full ${
                item.ok ? "bg-emerald-500" : "bg-destructive"
              }`}
              aria-hidden
            />
            <span className="font-medium">
              {SOURCE_LABELS[item.source] ?? item.source}
            </span>
            {item.detail && (
              <span className="min-w-0 truncate text-muted-foreground">
                {item.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
