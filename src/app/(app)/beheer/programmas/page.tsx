import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { adminAreaPermission } from "@/lib/admin-areas";
import { EmptyState, HelpLink } from "@/components/app-ui";
import {
  NewProgramForm,
  ProgramCard,
  type ProgramRow,
} from "./_components/program-forms";

type LinkedEvent = { id: string; title: string; start_at: string };

export default async function ProgrammasBeheerPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("programmas"))) redirect("/dashboard");

  const [{ data: programs }, { data: links }] = await Promise.all([
    supabase
      .from("event_programs")
      .select("id, slug, name, description, archived_at")
      .order("archived_at", { ascending: true, nullsFirst: true })
      .order("name"),
    supabase
      .from("event_program_links")
      .select("program_id, events(id, title, start_at)"),
  ]);

  const eventsByProgram = new Map<string, LinkedEvent[]>();
  for (const link of links ?? []) {
    const event = (Array.isArray(link.events) ? link.events[0] : link.events) as
      | LinkedEvent
      | null
      | undefined;
    if (!event) continue;
    const list = eventsByProgram.get(link.program_id as string) ?? [];
    list.push(event);
    eventsByProgram.set(link.program_id as string, list);
  }

  const rows: ProgramRow[] = (programs ?? []).map((program) => ({
    id: program.id,
    slug: program.slug,
    name: program.name,
    description: program.description,
    archived: Boolean(program.archived_at),
    events: (eventsByProgram.get(program.id) ?? [])
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .map((event) => ({
        id: event.id,
        title: event.title,
        dateLabel: new Date(event.start_at).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Europe/Amsterdam",
        }),
      })),
  }));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Programma&apos;s</h1>
        <HelpLink href="/hulp#eventbeheer" />
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Nieuw programma
        </h2>
        <NewProgramForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Programma&apos;s ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <EmptyState>Nog geen programma&apos;s.</EmptyState>
        ) : (
          rows.map((program) => <ProgramCard key={program.id} program={program} />)
        )}
      </section>
    </div>
  );
}
