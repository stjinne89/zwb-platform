import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { loadMembers, loadTopicCatalog, TIP_COLUMNS, type TipRow } from "@/lib/zwbieb/queries";
import { cn } from "@/lib/utils";
import { TipItem } from "@/app/(app)/zwbieb/_components/tip-item";
import { RaceTipForm } from "../_components/race-tip-form";

export const dynamic = "force-dynamic";

// Racetips: tips van leden over Zwift-racen en racen buiten. Het zijn gewone
// tips van ZWBieb (member_tips) onder twee onderwerpen (0282), dus aanpassen,
// verwijderen en de moderatie lopen via de acties van ZWBieb. De eerste tips
// zijn samenvattingen uit Zwift Insider, met de bron in plaats van een lid
// (0283, 0284).

const BASE = "/zwbeter-worden/racen/tips";

const KINDS = [
  { key: "zwift", slug: "zwift-racen", label: "Zwift" },
  { key: "buiten", slug: "wegracen", label: "Buiten" },
] as const;

type PageProps = { searchParams: Promise<{ waar?: string }> };

export default async function RaceTipsPage({ searchParams }: PageProps) {
  const { waar } = await searchParams;
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");

  const catalog = await loadTopicCatalog(supabase);
  // Een onderwerp dat (nog) niet in knowledge_topics staat, valt weg.
  const kinds = KINDS.filter((kind) => catalog.isActive(kind.slug));
  const focus = kinds.find((kind) => kind.key === waar) ?? null;

  const { data } = await supabase
    .from("member_tips")
    .select(TIP_COLUMNS)
    .in("topic_slug", focus ? [focus.slug] : kinds.map((kind) => kind.slug))
    .order("created_at", { ascending: false })
    .limit(200);
  const tips = (data ?? []) as TipRow[];
  const authors = await loadMembers(supabase, [...new Set(tips.map((tip) => tip.profile_id))]);
  const canModerate = access.has("community.manage") || access.has("content.moderate_posts");
  const labelOf = Object.fromEntries(KINDS.map((kind) => [kind.slug, kind.label]));

  const filters = [{ key: null, label: "Alle" }, ...kinds.map(({ key, label }) => ({ key, label }))];

  return (
    <div className="space-y-6">
      {kinds.length > 0 && (
        <RaceTipForm
          kinds={kinds.map(({ slug, label }) => ({ slug, label }))}
          initial={(focus ?? kinds[0]).slug}
        />
      )}
      <section className="space-y-3">
        {kinds.length > 1 && (
          <nav aria-label="Soort race" className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = (focus?.key ?? null) === filter.key;
              return (
                <Link
                  key={filter.label}
                  href={filter.key ? `${BASE}?waar=${filter.key}` : BASE}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm",
                    active ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        )}
        {tips.length === 0 ? (
          <EmptyState>Nog geen racetips.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {tips.map((tip) => (
              <TipItem
                key={tip.id}
                tip={tip}
                author={tip.profile_id ? authors.get(tip.profile_id) : undefined}
                viewerId={user.id}
                canModerate={canModerate}
                topicName={focus ? undefined : labelOf[tip.topic_slug]}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
