import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
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
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Notificaties versturen
        </h1>
        <HelpLink href="/hulp#rollenbeheer" />
      </header>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Apparaten met meldingen:</span>{" "}
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
