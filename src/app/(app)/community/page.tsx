import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { DeleteGroupButton, NewGroupForm } from "./_components/admin-forms";

const CATEGORY_LABELS: Record<string, string> = {
  algemeen: "Algemeen",
  bestuur: "Bestuur",
  zrl: "ZRL",
  ladder: "Ladder",
  outdoor: "Outdoor",
  klassiekers: "Klassiekers",
  social: "Social",
  training: "Training",
  overig: "Overig",
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: groups }, access, { data: teams }, { data: events }] =
    await Promise.all([
      supabase
        .from("whatsapp_groups")
        .select(
          "id, name, description, category, invite_url, display_order, team_id, event_id, teams(name, division), events(title, start_at)",
        )
        .order("display_order")
        .order("name"),
      getCurrentUserAccess(supabase),
      supabase
        .from("teams")
        .select("id, name, type, division")
        .order("name"),
      supabase
        .from("events")
        .select("id, title, start_at, type")
        .order("start_at", { ascending: false })
        .limit(50),
    ]);

  const canManageCommunity = access.has("community.manage");
  const teamOptions = (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    division: t.division,
  }));
  const eventOptions = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    type: e.type,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Community" />

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">WhatsApp-groepen</h2>
        </div>

        {!groups || groups.length === 0 ? (
          <EmptyState>Geen groepen toegevoegd.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const team = (g.teams as any) as { name: string; division: string | null } | null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const event = (g.events as any) as { title: string; start_at: string } | null;
              return (
                <li key={g.id} className="relative">
                  <a
                    href={g.invite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border bg-card p-4 transition hover:border-foreground/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{g.name}</p>
                      {g.category && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                          {CATEGORY_LABELS[g.category] ?? g.category}
                        </span>
                      )}
                    </div>
                    {team && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Team: {team.name}
                        {team.division ? ` (${team.division})` : ""}
                      </p>
                    )}
                    {event && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Event:{" "}
                        {new Date(event.start_at).toLocaleDateString("nl-NL", {
                          day: "2-digit",
                          month: "2-digit",
                        })}{" "}
                        — {event.title}
                      </p>
                    )}
                    {g.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Open in WhatsApp →
                    </p>
                  </a>
                  {canManageCommunity && (
                    <div className="absolute right-2 top-2">
                      <DeleteGroupButton id={g.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canManageCommunity && (
          <NewGroupForm teams={teamOptions} events={eventOptions} />
        )}
      </section>
    </div>
  );
}
