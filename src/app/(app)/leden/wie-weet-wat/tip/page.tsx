import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import { isKnowledgeTopic } from "@/lib/wie-weet-wat/topics";
import { loadMembers } from "@/lib/wie-weet-wat/queries";
import { MemberChip } from "../_components/member-chip";
import { TipForm } from "../_components/tip-form";

type PageProps = {
  searchParams: Promise<{ onderwerp?: string; event?: string; col?: string; bericht?: string }>;
};

/**
 * Een tip plaatsen: los, bij een event of col, of uit een gesprek. Uit een
 * gesprek alleen een bericht van de ander, op diens naam (0240). Het bericht
 * wordt hier op id opgehaald, niet via de URL meegegeven.
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
    // RLS geeft het bericht alleen aan de deelnemers van het gesprek.
    bericht
      ? supabase
          .from("knowledge_messages")
          .select("id, body, author_id, thread_id, knowledge_threads(topic_slug)")
          .eq("id", bericht)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ev = eventRow as { id: string; title: string } | null;
  const co = colRow as { slug: string; name: string } | null;
  const msg = message as {
    id: string;
    body: string;
    author_id: string | null;
    thread_id: string;
    knowledge_threads: { topic_slug: string } | { topic_slug: string }[] | null;
  } | null;
  if (bericht && (!msg || !msg.author_id || msg.author_id === user.id)) notFound();

  const threadTopic = msg
    ? (Array.isArray(msg.knowledge_threads) ? msg.knowledge_threads[0] : msg.knowledge_threads)?.topic_slug
    : undefined;
  const topic = isKnowledgeTopic(onderwerp) ? onderwerp : isKnowledgeTopic(threadTopic) ? threadTopic : null;
  const author = msg?.author_id ? (await loadMembers(supabase, [msg.author_id])).get(msg.author_id) : undefined;

  const back = ev
    ? { href: `/events/${ev.id}`, label: ev.title }
    : msg
      ? { href: `/leden/wie-weet-wat/gesprekken/${msg.thread_id}`, label: "Gesprek" }
      : topic
        ? { href: `/leden/wie-weet-wat?onderwerp=${topic}`, label: "Wie weet wat" }
        : { href: "/leden/wie-weet-wat", label: "Wie weet wat" };

  return (
    <div className="space-y-6">
      <BackLink href={back.href} label={back.label} />
      <PageHeader
        title={msg ? "Bewaar als tip" : "Tip toevoegen"}
        description={[ev?.title, co?.name].filter(Boolean).join(" · ") || undefined}
      />
      <section className="space-y-3 rounded-lg border bg-card p-4">
        {author && <MemberChip member={author} />}
        <TipForm
          topic={topic}
          body={msg?.body ?? ""}
          eventId={ev?.id ?? null}
          colSlug={co?.slug ?? null}
          messageId={msg?.id ?? null}
          returnTo={back.href}
        />
      </section>
    </div>
  );
}
