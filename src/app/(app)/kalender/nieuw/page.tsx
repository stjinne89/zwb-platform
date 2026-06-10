import { EventForm } from "./_form";
import { createClient } from "@/lib/supabase/server";
import { HelpLink } from "@/components/app-ui";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, type, parent_team_id")
    .order("type")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw event</h1>
        <HelpLink href="/hulp#eventbeheer" />
      </header>
      <EventForm teams={teams ?? []} />
    </div>
  );
}
