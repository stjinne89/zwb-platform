import { redirect } from "next/navigation";
import { EventForm } from "./_form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { BackLink, HelpLink } from "@/components/app-ui";

export default async function NewEventPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("events.create")) redirect("/kalender");
  const [{ data: teams }, { data: programs }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, type, parent_team_id")
      .order("type")
      .order("name"),
    supabase.from("event_programs").select("id, name").is("archived_at", null).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/kalender" label="Kalender" />
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw event</h1>
        <HelpLink href="/hulp#eventbeheer" />
      </header>
      <EventForm teams={teams ?? []} programs={programs ?? []} />
    </div>
  );
}
