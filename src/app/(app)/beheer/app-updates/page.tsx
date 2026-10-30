import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { UpdateCard } from "@/components/app-updates/update-card";
import { buttonVariants } from "@/components/ui/button";
import { adminAreaPermission } from "@/lib/admin-areas";
import { loadAllUpdates } from "@/lib/app-updates/queries";
import { PUBLISH_WEEKDAY, isPublished, upcomingWeekStart } from "@/lib/app-updates/schedule";
import { getRequestAccess } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/weekly-review/period";
import { DeleteUpdateButton, UpdateForm, type UpdateFormValues } from "./_components/update-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "App-updates schrijven" };

const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/** De wekelijkse app-updates schrijven (0293). Verschijnen gaat vanzelf op donderdag 17:00. */
export default async function AppUpdatesBeheerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("appUpdates"))) redirect("/dashboard");

  const [{ week }, updates] = await Promise.all([searchParams, loadAllUpdates(await createClient())]);
  const editing = updates.find((update) => update.weekStart === week) ?? null;
  const thursdayOf = (weekStart: string) => addDays(weekStart, PUBLISH_WEEKDAY - 1);

  const initial: UpdateFormValues = editing
    ? {
        day: thursdayOf(editing.weekStart),
        summary: editing.summary,
        changes: editing.changes.join("\n"),
        fixes: editing.fixes.join("\n"),
      }
    : { day: thursdayOf(upcomingWeekStart()), summary: "", changes: "", fixes: "" };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">App-updates</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/updates" className="underline underline-offset-2">
            Naar de updates
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={sectionTitle}>{editing ? "Aanpassen" : "Nieuwe update"}</h2>
        <UpdateForm initial={initial} editing={Boolean(editing)} />
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitle}>Geschreven ({updates.length})</h2>
        {updates.length === 0 ? (
          <EmptyState>Nog geen updates.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {updates.map((update) => (
              <li key={update.id} className="space-y-2">
                <UpdateCard update={update} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-auto text-xs text-muted-foreground">
                    {isPublished(update.publishAt) ? "Verschenen" : "Klaar, verschijnt donderdag 17:00"}
                  </span>
                  <Link
                    href={`/beheer/app-updates?week=${update.weekStart}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Aanpassen
                  </Link>
                  <DeleteUpdateButton id={update.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
