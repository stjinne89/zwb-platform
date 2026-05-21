import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { PostKindBadge, PostStatusBadge } from "@/components/post-kind-badge";
import {
  CATEGORY_LABELS,
  hasPriceField,
  type PostKind,
  type PostStatus,
} from "@/lib/categories";
import { LikeButton } from "./_components/like-button";
import { CommentForm } from "./_components/comment-form";
import { DeleteCommentButton, DeletePostButton } from "./_components/delete-buttons";
import { StatusSelect } from "./_components/status-select";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, slug, title, category, kind, status, price, body_md, tags, created_at, updated_at, author_id, profiles(display_name)",
    )
    .eq("slug", slug)
    .single();

  if (!post) notFound();

  const [{ data: likes }, { data: comments }, { data: me }] = await Promise.all([
    supabase.from("post_likes").select("profile_id").eq("post_id", post.id),
    supabase
      .from("post_comments")
      .select("id, body, created_at, author_id, profiles(display_name)")
      .eq("post_id", post.id)
      .order("created_at"),
    user
      ? supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const liked = !!(likes ?? []).find((l) => l.profile_id === user?.id);
  const likeCount = likes?.length ?? 0;
  const isAdmin = me?.is_admin ?? false;
  const isAuthor = user?.id === post.author_id;
  const canManage = isAdmin || isAuthor;
  const postKind = (post.kind ?? "aanbod") as PostKind;
  const showPrice = hasPriceField(postKind) && post.price;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authorName = (post.profiles as any)?.display_name ?? "Onbekend";

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/materiaal"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Terug naar Vraag en Aanbod
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PostKindBadge kind={postKind} />
          <PostStatusBadge status={post.status} />
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          {showPrice && (
            <span className="ml-auto text-lg font-semibold tabular-nums">
              {post.price}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          {authorName} -{" "}
          {new Date(post.created_at).toLocaleDateString("nl-NL", {
            dateStyle: "long",
          })}
        </p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.map((t: string) => (
              <span
                key={t}
                className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs text-secondary-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </header>

      <Markdown source={post.body_md} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <LikeButton
          postId={post.id}
          slug={post.slug}
          initialLiked={liked}
          initialCount={likeCount}
        />
        <div className="flex items-center gap-3">
          {canManage && (
            <StatusSelect
              postId={post.id}
              slug={post.slug}
              initialStatus={(post.status ?? "open") as PostStatus}
            />
          )}
          {canManage && <DeletePostButton postId={post.id} />}
        </div>
      </div>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reacties ({comments?.length ?? 0})
        </h2>

        {!comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen reacties. Deel je antwoord, tip of interesse.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const name = (c.profiles as any)?.display_name ?? "Onbekend";
              const own = c.author_id === user?.id;
              return (
                <li key={c.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {name} -{" "}
                        {new Date(c.created_at).toLocaleString("nl-NL", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                    {(own || isAdmin) && (
                      <DeleteCommentButton commentId={c.id} slug={post.slug} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {user && <CommentForm postId={post.id} slug={post.slug} />}
      </section>
    </article>
  );
}
