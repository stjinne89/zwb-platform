import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { NewTeamForm } from "./_form";

export default async function NewTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentUserAccess(supabase);

  if (!access.has("teams.create")) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Je hebt geen recht om teams aan te maken.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw team</h1>
        <p className="mt-1 text-muted-foreground">
          Maak een ZRL-, Ladder-, social- of outdoor-team aan.
        </p>
      </header>
      <NewTeamForm />
    </div>
  );
}
