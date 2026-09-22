import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { BackLink, PageHeader } from "@/components/app-ui";
import { EditionForm, type EditionPartRow } from "./_components/edition-form";
import { ZwiftStartlist } from "../_components/zwift-startlist";

export const dynamic = "force-dynamic";

export default async function OmniumEditiePage({
  params,
}: {
  params: Promise<{ editie: string }>;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("omnium.manage")) redirect("/dashboard");

  const { editie } = await params;

  const { data: edition } = await supabase
    .from("omnium_editions")
    .select(
      "id, number, slug, title, subtitle, intro_md, youtube_url, starts_at, preshow_at, published_at, status, recon_event_id",
    )
    .eq("id", editie)
    .maybeSingle();
  if (!edition) notFound();

  const { data: partRows } = await supabase
    .from("omnium_edition_events")
    .select(
      "id, discipline, order_index, title, starts_at, duration_minutes, break_minutes, route_name, route_url, world, distance_km, laps, zwift_event_id, sprint_count, drafting",
    )
    .eq("edition_id", editie)
    .neq("discipline", "recon")
    .order("order_index");

  const startLabel = new Date(edition.starts_at as string).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

  return (
    <div className="space-y-6">
      <BackLink href="/beheer/omnium" label="Omnium" />
      <PageHeader
        eyebrow={`Editie ${edition.number as number}`}
        title={edition.title as string}
        description={startLabel}
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/beheer/omnium/${editie}/uitslagen`} className="underline">
              Uitslagen
            </Link>
          </div>
        }
      />

      <ZwiftStartlist editionId={editie} parts={(partRows ?? []).map((p) => ({ id: p.id as string, title: p.title as string }))} />
      <EditionForm
        editionId={edition.id as string}
        startAtIso={edition.starts_at as string}
        published={Boolean(edition.published_at)}
        initial={{
          title: edition.title as string,
          subtitle: (edition.subtitle as string | null) ?? "",
          slug: edition.slug as string,
          introMd: (edition.intro_md as string | null) ?? "",
          youtubeUrl: (edition.youtube_url as string | null) ?? "",
        }}
        parts={(partRows ?? []) as unknown as EditionPartRow[]}
      />
    </div>
  );
}
