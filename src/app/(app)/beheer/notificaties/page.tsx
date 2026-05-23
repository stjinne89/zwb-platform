import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { BroadcastForm } from "./_components/broadcast-form";

export default async function BroadcastPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("community.manage")) redirect("/dashboard");

  const [{ count: subCount }, { count: optInCount }] = await Promise.all([
    supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("notification_preferences")
      .select("*", { count: "exact", head: true })
      .eq("on_admin_broadcast", true),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Notificaties versturen
        </h1>
        <p className="text-sm text-muted-foreground">
          Stuur een push-melding naar alle leden die de aankondigingen-
          optie hebben aanstaan.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Actieve subscriptions:</span>{" "}
          <strong>{subCount ?? 0}</strong>
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">
            Leden die aankondigingen willen ontvangen:
          </span>{" "}
          <strong>{optInCount ?? 0}</strong>
        </p>
      </section>

      <BroadcastForm />
    </div>
  );
}
