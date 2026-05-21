import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  POST_KINDS,
  POST_KIND_LABELS,
  type Category,
  type PostKind,
} from "@/lib/categories";

type SearchParams = Promise<{ cat?: string; kind?: string }>;

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
      "id, slug, title, category, kind, price, excerpt, tags, created_at, profiles(display_name), post_likes(count), post_comments(count)",
    )
    .order("created_at", { ascending: false });
  if (activeCat) query = query.eq("category", activeCat);
  if (activeKind) query = query.eq("kind", activeKind);

  const { data: posts } = await query;

  function chipUrl(overrides: { cat?: string | null; kind?: string | null }) {
    const params = new URLSearchParams();
    const c = overrides.cat ?? activeCat ?? null;
    const k = overrides.kind ?? activeKind ?? null;
    if (c) params.set("cat", c);
    if (k) params.set("kind", k);
    const qs = params.toString();
    return qs ? `/materiaal?${qs}` : "/materiaal";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Vraag en Aanbod
          </h1>
          <p className="mt-1 text-muted-foreground">
            Te koop, te ruil of gezocht — een marktplaats voor en door
            ZWB&apos;ers.
          </p>
        </div>
        <Link href="/materiaal/nieuw">
          <Button>Nieuw item plaatsen</Button>
        </Link>
      </header>

      {/* Type filter — Alles / Aanbod / Vraag */}
      <nav className="flex flex-wrap gap-2">
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
            {k.icon} {k.label}
          </Link>
        ))}
      </nav>

      {/* Categorie filter */}
      <nav className="flex flex-wrap gap-2">
        <Link
          href={chipUrl({ cat: null })}
          className={`rounded-full border px-3 py-1 text-xs ${
            activeCat === null
              ? "border-foreground/40 bg-secondary"
              : "hover:bg-secondary"
          }`}
        >
          Alle categorieën
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
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {activeCat || activeKind
            ? "Geen items in deze selectie."
            : "Nog geen items geplaatst. Wees de eerste!"}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const likes = (p.post_likes as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const comments = (p.post_comments as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const author = (p.profiles as any)?.display_name ?? "Onbekend";
            const postKind = (p.kind ?? "aanbod") as string;
            const isVraag = postKind === "vraag";
            return (
              <li key={p.id}>
                <Link
                  href={`/materiaal/${p.slug}`}
                  className="block h-full rounded-lg border bg-card p-4 transition hover:border-foreground/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                        isVraag
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isVraag ? "🔍" : "💰"} {POST_KIND_LABELS[postKind] ?? postKind}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                    {p.price && (
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
                    {author} ·{" "}
                    {new Date(p.created_at).toLocaleDateString("nl-NL", {
                      dateStyle: "medium",
                    })}
                    {likes > 0 ? ` · ♥ ${likes}` : ""}
                    {comments > 0 ? ` · 💬 ${comments}` : ""}
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
