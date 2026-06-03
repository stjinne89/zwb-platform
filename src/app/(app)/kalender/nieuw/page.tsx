import { EventForm } from "./_form";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, type, parent_team_id")
    .order("type")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw event</h1>
        <p className="mt-1 text-muted-foreground">
          Plan een rit, race of social. GPX is optioneel — als je er één
          toevoegt, rekenen we afstand en hoogtemeters automatisch uit.
        </p>
      </header>
      <EventForm teams={teams ?? []} />
    </div>
  );
}
