import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import { isKnowledgeTopic } from "@/lib/wie-weet-wat/topics";
import { TipForm } from "../_components/tip-form";

type PageProps = {
  searchParams: Promise<{ onderwerp?: string; event?: string; col?: string; bericht?: string }>;
};

/**
 * Een tip plaatsen: los, bij een event of col, of uit een eigen bericht in een
 * gesprek. Dat laatste alleen met je eigen woorden; het bericht wordt hier
 * opgehaald op id en auteur, niet via de URL meegegeven.
 */
export default async function TipPage({ searchParams }: PageProps) {
  const { onderwerp, event, col, bericht } = await searchParams;
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");

  const [{ data: eventRow }, { data: colRow }, { data: message }] = await Promise.all([
    event
      ? supabase.from("events").select("id, title").eq("id", event).maybeSingle()
      : Promise.resolve({ data: null }),
    col
      ? supabase.from("cols").select("slug, name").eq("slug", col).maybeSingle()
      : Promise.resolve({ data: null }),
    bericht
      ? supabase
          .from("knowledge_messages")
          .select("body, thread_id")
          .eq("id", bericht)
          .eq("author_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ev = eventRow as { id: string; title: string } | null;
  const co = colRow as { slug: string; name: string } | null;
  const msg = message as { body: string; thread_id: string } | null;

  const back = ev
    ? { href: `/events/${ev.id}`, label: ev.title }
    : msg
      ? { href: `/leden/wie-weet-wat/gesprekken/${msg.thread_id}`, label: "Gesprek" }
      : isKnowledgeTopic(onderwerp)
        ? { href: `/leden/wie-weet-wat?onderwerp=${onderwerp}`, label: "Wie weet wat" }
        : { href: "/leden/wie-weet-wat", label: "Wie weet wat" };

  return (
    <div className="space-y-6">
      <BackLink href={back.href} label={back.label} />
      <PageHeader title="Tip toevoegen" description={[ev?.title, co?.name].filter(Boolean).join(" · ") || undefined} />
      <section className="rounded-lg border bg-card p-4">
        <TipForm
          topic={isKnowledgeTopic(onderwerp) ? onderwerp : null}
          body={msg?.body ?? ""}
          eventId={ev?.id ?? null}
          colSlug={co?.slug ?? null}
          returnTo={back.href}
        />
      </section>
    </div>
  );
}
