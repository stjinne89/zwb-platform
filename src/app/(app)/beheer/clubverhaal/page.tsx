import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";
import { chapterById } from "@/lib/clubverhaal/chapters";
import { loadReviewQueue } from "@/lib/clubverhaal/server";
import { RemoveStoryButton, StoryReviewPanel } from "../../clubverhaal/_components/story-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clubverhaal plaatsen" };

const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/** Ingestuurde verhalen voor /verhaal plaatsen of terugsturen (0288), en wat er al staat. */
export default async function ClubverhaalBeheerPage() {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("clubverhaal"))) redirect("/dashboard");

  const { open, placed } = await loadReviewQueue(await createClient());

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Clubverhaal</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/verhaal" className="underline underline-offset-2">
            Naar het verhaal
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={sectionTitle}>Te plaatsen ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState>Geen verhalen die wachten.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {open.map((story) => (
              <li key={story.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {chapterById(story.chapter).title}
                    {story.happenedYear ? ` · ${story.happenedYear}` : ""} · door {story.author}
                  </p>
                  <h3 className="text-lg font-semibold">{story.title}</h3>
                  {story.beker && (
                    <p className="text-sm">
                      ZWBeker:{" "}
                      <Link href={`/zwbekers/${story.beker.id}`} className="font-medium hover:underline">
                        {story.beker.title}
                      </Link>
                    </p>
                  )}
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{story.body}</p>
                {story.photos.length > 0 && (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {story.photos.map((photo) => (
                      <li key={photo.id} className="space-y-1">
                        {photo.url && (
                          // eslint-disable-next-line @next/next/no-img-element -- ondertekende url uit een besloten bucket
                          <img src={photo.url} alt={photo.caption ?? ""} className="aspect-[4/3] w-full rounded-md border object-cover" />
                        )}
                        {photo.caption && <p className="text-xs text-muted-foreground">{photo.caption}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <StoryReviewPanel storyId={story.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {placed.length > 0 && (
        <section className="space-y-3">
          <h2 className={sectionTitle}>Geplaatst</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {placed.map((story) => (
              <li key={story.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <Link href={`/verhaal/${story.id}`} className="block truncate font-medium hover:underline">
                    {story.title}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{chapterById(story.chapter).title}</span>
                </span>
                <RemoveStoryButton storyId={story.id} placed />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
