import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

type SearchParams = Promise<{ cat?: string }>;

export default async function MateriaalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { cat } = await searchParams;
  const activeCat =
    cat && CATEGORIES.some((c) => c.value === cat) ? (cat as Category) : null;

  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      "id, slug, title, category, excerpt, tags, created_at, profiles(display_name), post_likes(count), post_comments(count)",
    )
    .order("created_at", { ascending: false });
  if (activeCat) query = query.eq("category", activeCat);

  const { data: posts } = await query;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Materiaal</h1>
          <p className="mt-1 text-muted-foreground">
            Tips, tricks en ervaringen van ZWB&apos;ers.
          </p>
        </div>
        <Link href="/materiaal/nieuw">
          <Button>Nieuwe post</Button>
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/materiaal"
          className={`rounded-full border px-3 py-1 text-xs ${
            activeCat === null ? "bg-foreground text-background" : "hover:bg-secondary"
          }`}
        >
          Alles
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/materiaal?cat=${c.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeCat === c.value
                ? "bg-foreground text-background"
                : "hover:bg-secondary"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {!posts || posts.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {activeCat
            ? `Nog geen posts in ${CATEGORY_LABELS[activeCat]}.`
            : "Nog geen posts. Schrijf de eerste!"}
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const likes = (p.post_likes as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const comments = (p.post_comments as any)?.[0]?.count ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const author = (p.profiles as any)?.display_name ?? "Onbekend";
            return (
              <li key={p.id}>
                <Link
                  href={`/materiaal/${p.slug}`}
                  className="block rounded-lg border bg-card p-4 transition hover:border-foreground/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.title}</p>
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
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                  </div>
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
