import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { PostKindBadge, PostStatusBadge } from "@/components/post-kind-badge";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  POST_KINDS,
  hasPriceField,
  type Category,
  type PostKind,
} from "@/lib/categories";

type SearchParams = Promise<{ cat?: string; kind?: string }>;

function paramValue<T>(
  overrides: Record<string, string | null | undefined>,
  key: string,
  fallback: T | null,
) {
  return Object.prototype.hasOwnProperty.call(overrides, key)
    ? overrides[key]
    : fallback;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { cat, kind } = await searchParams;
  const activeCat =
    cat && CATEGORIES.some((c) => c.value === cat) ? (cat as Category) : null;
  const activeKind =
    kind && POST_KINDS.some((k) => k.value === kind) ? (kind as PostKind) : null;

  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      "id, slug, title, category, kind, status, price, excerpt, tags, created_at, profiles(display_name), post_likes(count), post_comments(count)",
    )
    .order("created_at", { ascending: false });
  if (activeCat) query = query.eq("category", activeCat);
  if (activeKind) query = query.eq("kind", activeKind);

  const { data: posts } = await query;

  function chipUrl(overrides: { cat?: string | null; kind?: string | null }) {
    const params = new URLSearchParams();
    const c = paramValue(overrides, "cat", activeCat);
    const k = paramValue(overrides, "kind", activeKind);
    if (c) params.set("cat", String(c));
    if (k) params.set("kind", String(k));
    const qs = params.toString();
    return qs ? `/materiaal?${qs}` : "/materiaal";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vraag en Aanbod"
        actions={
          <Link href="/materiaal/nieuw">
            <Button>Nieuw bericht</Button>
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-2" aria-label="Berichttype">
        <Link
          href={chipUrl({ kind: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            activeKind === null ? "bg-foreground text-background" : "hover:bg-secondary"
          }`}
        >
          Alles
        </Link>
        {POST_KINDS.map((k) => (
          <Link
            key={k.value}
            href={chipUrl({ kind: k.value })}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeKind === k.value
                ? "bg-foreground text-background"
                : "hover:bg-secondary"
            }`}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      <nav className="flex flex-wrap gap-2" aria-label="Categorie">
        <Link
          href={chipUrl({ cat: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            activeCat === null
              ? "border-foreground/40 bg-secondary"
              : "hover:bg-secondary"
          }`}
        >
          Alle categorieen
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={chipUrl({ cat: c.value })}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeCat === c.value
                ? "border-foreground/40 bg-secondary"
                : "hover:bg-secondary"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {!posts || posts.length === 0 ? (
        <EmptyState>
          {activeCat || activeKind ? "Geen berichten in deze selectie." : "Geen berichten."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const likes = (p.post_likes as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const comments = (p.post_comments as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const author = (p.profiles as any)?.display_name ?? "Onbekend";
            const postKind = (p.kind ?? "aanbod") as PostKind;
            const showPrice = hasPriceField(postKind) && p.price;
            return (
              <li key={p.id}>
                <Link
                  href={`/materiaal/${p.slug}`}
                  className="block h-full rounded-lg border bg-card p-4 transition hover:border-foreground/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <PostKindBadge kind={postKind} />
                    <PostStatusBadge status={p.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                    {showPrice && (
                      <span className="ml-auto font-semibold tabular-nums">
                        {p.price}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium">{p.title}</p>
                  {p.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.excerpt}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {author} -{" "}
                    {new Date(p.created_at).toLocaleDateString("nl-NL", {
                      dateStyle: "medium",
                    })}
                    {likes > 0 ? ` - ${likes} likes` : ""}
                    {comments > 0 ? ` - ${comments} reacties` : ""}
                  </p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.map((t: string) => (
                        <span
                          key={t}
                          className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs text-secondary-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
