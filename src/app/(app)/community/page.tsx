import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import {
  AnnouncementAdminActions,
  DeleteGroupButton,
  NewAnnouncementForm,
  NewGroupForm,
} from "./_components/admin-forms";

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

  const [{ data: groups }, { data: announcements }, { data: me }, { data: teams }] = await Promise.all([
    supabase
      .from("whatsapp_groups")
      .select("id, name, description, category, invite_url, display_order, team_id, teams(name, division)")
      .order("display_order")
      .order("name"),
    supabase
      .from("announcements")
      .select("id, title, body_md, pinned, created_at, profiles(display_name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
    supabase
      .from("teams")
      .select("id, name, type, division")
      .order("name"),
  ]);

  const isAdmin = me?.is_admin ?? false;
  const teamOptions = (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    division: t.division,
  }));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Community</h1>
        <p className="mt-1 text-muted-foreground">
          Mededelingen van ZWB en links naar onze WhatsApp-groepen.
        </p>
      </header>

      {/* Announcements */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Mededelingen</h2>
        </div>
        {!announcements || announcements.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Nog geen mededelingen.
          </p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const author = (a.profiles as any)?.display_name ?? "Bestuur";
              return (
                <li
                  key={a.id}
                  className={`rounded-lg border bg-card p-4 ${
                    a.pinned ? "border-foreground/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {a.pinned && (
                          <span
                            className="mr-2 text-foreground/60"
                            aria-label="vastgepind"
                          >
                            📌
                          </span>
                        )}
                        {a.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {author} ·{" "}
                        {new Date(a.created_at).toLocaleString("nl-NL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <div className="mt-3">
                        <Markdown source={a.body_md} />
                      </div>
                    </div>
                    {isAdmin && (
                      <AnnouncementAdminActions id={a.id} pinned={a.pinned} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {isAdmin && <NewAnnouncementForm />}
      </section>

      {/* WhatsApp groups */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">WhatsApp-groepen</h2>
          <p className="text-xs text-muted-foreground">
            Klik op een groep om in WhatsApp te openen
          </p>
        </div>

        {!groups || groups.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Nog geen groepen toegevoegd.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const team = (g.teams as any) as { name: string; division: string | null } | null;
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
                    {g.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Open in WhatsApp →
                    </p>
                  </a>
                  {isAdmin && (
                    <div className="absolute right-2 top-2">
                      <DeleteGroupButton id={g.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isAdmin && <NewGroupForm teams={teamOptions} />}
      </section>
    </div>
  );
}
