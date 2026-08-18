import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { componentLabel } from "@/lib/maintenance/component-types";
import { EmptyState } from "@/components/app-ui";
import { ImportForm } from "./_components/import-form";
import { TipForm } from "./_components/tip-form";
import { TipList, type TipRow } from "./_components/tip-list";

export default async function CitatenPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("community.manage")) redirect("/dashboard");

  const { data: tips } = await supabase
    .from("maintenance_tips")
    .select("id, component_type, body, source_type, source_name, source_url")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((tips ?? []) as TipRow[]).map((tip) => ({
    ...tip,
    componentLabel: componentLabel(tip.component_type),
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tips en citaten</h1>
        <p className="text-sm text-muted-foreground">
          Tips verschijnen bij het bijbehorende onderdeel in Mijn garage. Een lid
          ziet zijn eigen citaten op zijn profiel en kan ze daar zelf aanpassen of
          verwijderen — zie de{" "}
          <Link href="/voorwaarden" className="underline underline-offset-2">
            gebruikersvoorwaarden
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Uit een groepsapp importeren
        </h2>
        <ImportForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Zelf een tip toevoegen
        </h2>
        <TipForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Wat er nu in staat ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <EmptyState>Nog geen tips.</EmptyState>
        ) : (
          <TipList tips={rows} />
        )}
      </section>
    </div>
  );
}
