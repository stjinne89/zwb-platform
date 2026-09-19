import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { SeasonPlanner } from "./_components/season-planner";
import { SeasonCreateForm } from "./_components/season-create-form";
import { SeasonRules } from "./_components/season-rules";
import { EditionList, type EditionRow } from "./_components/edition-list";

export const dynamic = "force-dynamic";

type SeasonRow = {
  id: string;
  slug: string;
  name: string;
  is_current: boolean;
  published_at: string | null;
  rules_md: string | null;
};

export default async function OmniumBeheerPage({
  searchParams,
}: {
  searchParams: Promise<{ seizoen?: string }>;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("omnium.manage")) redirect("/dashboard");

  const { seizoen } = await searchParams;

  const { data: seasonRows } = await supabase
    .from("omnium_seasons")
    .select("id, slug, name, is_current, published_at, rules_md")
    .order("slug", { ascending: false });
  const seasons = (seasonRows ?? []) as SeasonRow[];

  const active =
    seasons.find((season) => season.slug === seizoen) ??
    seasons.find((season) => season.is_current) ??
    seasons[0] ??
    null;

  const { data: editionRows } = active
    ? await supabase
        .from("omnium_editions")
        .select(
          "id, number, slug, title, subtitle, starts_at, status, published_at, youtube_url, omnium_edition_events(discipline, route_name, zwift_event_id)",
        )
        .eq("season_id", active.id)
        .order("number")
    : { data: null };

  const editions = ((editionRows ?? []) as unknown as EditionRow[]) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Beheer"
        title="ZWB Omnium"
        description="Seizoenen plannen, edities vullen en publiceren."
      />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Seizoenen
        </h2>
        {seasons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {seasons.map((season) => (
              <Link
                key={season.id}
                href={`/beheer/omnium?seizoen=${season.slug}`}
                className={
                  season.id === active?.id
                    ? "rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium"
                    : "rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {season.name}
                {season.is_current && " ·"}
                {!season.published_at && " (concept)"}
              </Link>
            ))}
          </div>
        )}
        <SeasonCreateForm />
      </section>

      {!active ? (
        <EmptyState>Maak eerst een seizoen aan.</EmptyState>
      ) : (
        <>
          <div className="flex gap-4"><Link href="/beheer/omnium/prijzen" className="underline">Prijzen</Link><Link href="/beheer/omnium/renners" className="underline">Renners samenvoegen</Link></div>
          <SeasonRules key={active.id} seasonId={active.id} initial={active.rules_md ?? ""} />
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Seizoen plannen
            </h2>
            <SeasonPlanner
              seasonId={active.id}
              seasonSlug={active.slug}
              isPublished={Boolean(active.published_at)}
              isCurrent={active.is_current}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Edities ({editions.length})
            </h2>
            {editions.length === 0 ? (
              <EmptyState>Nog geen edities. Plan het seizoen hierboven.</EmptyState>
            ) : (
              <EditionList editions={editions} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
