import Link from "next/link";
import { BookOpen, PenLine } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { chapterById } from "@/lib/clubverhaal/chapters";
import { STATUS_LABEL } from "@/lib/clubverhaal/story";
import { loadOwnStories, requireStoryMember } from "@/lib/clubverhaal/server";
import { RemoveStoryButton } from "./_components/story-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clubverhaal" };

/** Je eigen verhalen voor het clubverhaal op /verhaal (0288): open, teruggestuurd en geplaatst. */
export default async function ClubverhaalPage() {
  let guard;
  try {
    guard = await requireStoryMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Je verhalen zijn nu niet te zien."}</EmptyState>;
  }
  const own = await loadOwnStories(guard.client, guard.member.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Het verhaal van ZWB"
        title="Je verhalen"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/verhaal" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <BookOpen className="size-4" aria-hidden />
              Naar het verhaal
            </Link>
            <Link href="/clubverhaal/insturen" className={buttonVariants({ size: "sm" })}>
              <PenLine className="size-4" aria-hidden />
              Verhaal insturen
            </Link>
          </div>
        }
      />
      {own.length === 0 ? (
        <EmptyState>Nog geen verhalen.</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {own.map((story) => (
            <li key={story.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {story.status === "geplaatst" ? (
                      <Link href={`/verhaal/${story.id}`} className="hover:underline">
                        {story.title}
                      </Link>
                    ) : (
                      story.title
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {chapterById(story.chapter).title}
                    {story.happenedYear ? ` · ${story.happenedYear}` : ""}
                  </span>
                </span>
                <span
                  className={
                    story.status === "teruggestuurd"
                      ? "rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                      : story.status === "geplaatst"
                        ? "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {STATUS_LABEL[story.status]}
                </span>
              </div>
              {story.status === "teruggestuurd" && story.reviewNote && (
                <p className="whitespace-pre-line rounded-md bg-amber-500/10 p-3 text-sm">{story.reviewNote}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {story.status !== "geplaatst" && (
                  <Link href={`/clubverhaal/${story.id}/bewerken`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Aanpassen
                  </Link>
                )}
                <RemoveStoryButton storyId={story.id} placed={story.status === "geplaatst"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
