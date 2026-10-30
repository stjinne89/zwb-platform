import { EmptyState, PageHeader } from "@/components/app-ui";
import { UpdateCard } from "@/components/app-updates/update-card";
import { loadPublishedUpdates } from "@/lib/app-updates/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "App-updates" };

/** Wat er elke week in de app veranderd is (0293), nieuwste eerst. */
export default async function UpdatesPage() {
  const updates = await loadPublishedUpdates(await createClient());

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Elke donderdag" title="App-updates" />
      {updates.length === 0 ? (
        <EmptyState>Nog geen updates.</EmptyState>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {updates.map((update) => (
            <UpdateCard key={update.id} id={`week-${update.weekStart}`} update={update} />
          ))}
        </div>
      )}
    </div>
  );
}
