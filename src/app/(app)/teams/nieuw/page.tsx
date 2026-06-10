import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
import { NewTeamForm } from "./_form";

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const parentTeamIdParam = Array.isArray(params?.parent_team_id)
    ? params?.parent_team_id[0]
    : params?.parent_team_id;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [access, { data: parentTeams }] = await Promise.all([
    getCurrentUserAccess(supabase),
    supabase
      .from("teams")
      .select("id, name")
      .is("parent_team_id", null)
      .order("name"),
  ]);

  if (!access.has("teams.create")) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Je hebt geen recht om teams aan te maken.
      </div>
    );
  }
  const selectedParentTeamId =
    (parentTeams ?? []).some((team) => team.id === parentTeamIdParam)
      ? parentTeamIdParam
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw team</h1>
        <HelpLink href="/hulp#teambeheer" />
      </header>
      <NewTeamForm
        parentTeams={parentTeams ?? []}
        selectedParentTeamId={selectedParentTeamId ?? ""}
      />
    </div>
  );
}
