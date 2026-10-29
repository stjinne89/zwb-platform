"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileIdsWithPermission } from "@/lib/auth/permissions";
import { sendNotificationToMembers } from "@/lib/push/send";
import { rateLimitHit } from "@/lib/rate-limit";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { SUBMITS_PER_HOUR, StoryError, cleanCaption, cleanNote, parseStory } from "@/lib/clubverhaal/story";
import {
  REVIEW_PERMISSION,
  attachPhoto,
  createStory,
  deleteStory,
  photoUploadTarget,
  requireStoryMember,
  reviewStory,
  updateStory,
} from "@/lib/clubverhaal/server";

// Acties van het clubverhaal (0288). De tabellen hebben geen schrijfpolicies:
// alles gaat hier langs, na de checks in lib/clubverhaal. Pushmeldingen noemen
// nooit de tekst of de notitie van het bestuur, alleen de titel.

export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const id = z.string().uuid();

async function run<T>(work: () => Promise<T>): Promise<Reply<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof StoryError) return { ok: false, error: error.message };
    if (error instanceof ZodError) return { ok: false, error: "Er klopt iets niet in het formulier." };
    console.error("[clubverhaal]", error);
    return { ok: false, error: "Dat lukte niet. Probeer het opnieuw." };
  }
}

function refresh(storyId?: string) {
  revalidatePath("/clubverhaal");
  revalidatePath("/beheer/clubverhaal");
  revalidatePath("/verhaal");
  if (storyId) revalidatePath(`/verhaal/${storyId}`);
  revalidatePath("/zwbekers/[id]", "page");
}

/** Best effort: een mislukte melding mag de actie niet raken. */
async function notify(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error("[clubverhaal] melding faalde:", error);
  }
}

const thisYear = () => Number(amsterdamDayKey().slice(0, 4));

export async function submitStory(input: unknown): Promise<Reply<{ id: string }>> {
  return run(async () => {
    const { member } = await requireStoryMember();
    const story = parseStory(input, thisYear());
    const budget = await rateLimitHit("clubverhaal-submit", member.id, SUBMITS_PER_HOUR, 3600);
    if (!budget.allowed) throw new StoryError("Even wachten met nog een verhaal.");
    const admin = createAdminClient();
    const storyId = await createStory(admin, member.id, story);
    await notify(async () => {
      const reviewers = await profileIdsWithPermission(admin, REVIEW_PERMISSION);
      if (reviewers.length === 0) return;
      await sendNotificationToMembers(
        "on_story_submitted",
        {
          title: "Nieuw verhaal voor het clubverhaal",
          body: `${member.name} stuurde een verhaal in.`,
          url: "/beheer/clubverhaal",
          tag: `clubverhaal-${storyId}`,
        },
        { profileIds: reviewers, excludeProfileId: member.id },
      );
    });
    refresh(storyId);
    return { id: storyId };
  });
}

export async function saveStory(storyId: string, input: unknown): Promise<Reply<{ id: string }>> {
  return run(async () => {
    const { member } = await requireStoryMember();
    const target = id.parse(storyId);
    await updateStory(createAdminClient(), member.id, target, parseStory(input, thisYear()));
    refresh(target);
    return { id: target };
  });
}

export async function removeStory(storyId: string): Promise<Reply> {
  return run(async () => {
    const { member, canReview } = await requireStoryMember();
    const target = id.parse(storyId);
    await deleteStory(createAdminClient(), member.id, target, canReview);
    refresh(target);
    return undefined;
  });
}

export async function reviewClubStory(storyId: string, decision: "geplaatst" | "teruggestuurd", note: string): Promise<Reply> {
  return run(async () => {
    const { member, canReview } = await requireStoryMember();
    if (!canReview) throw new StoryError("Alleen het bestuur plaatst verhalen.");
    const target = id.parse(storyId);
    const choice = z.enum(["geplaatst", "teruggestuurd"]).parse(decision);
    const text = cleanNote(z.string().max(5000).parse(note ?? ""));
    const result = await reviewStory(createAdminClient(), member.id, target, choice, text);
    if (result.authorId && result.authorId !== member.id) {
      const authorId = result.authorId;
      await notify(() =>
        sendNotificationToMembers(
          "on_story_reviewed",
          choice === "geplaatst"
            ? { title: "Je verhaal staat in het clubverhaal", body: `“${result.title}” is geplaatst.`, url: `/verhaal/${target}`, tag: `clubverhaal-${target}` }
            : { title: "Je verhaal is teruggestuurd", body: "Lees wat het bestuur erbij schreef.", url: "/clubverhaal", tag: `clubverhaal-${target}` },
          { profileIds: [authorId] },
        ),
      );
    }
    refresh(target);
    return undefined;
  });
}

export async function requestStoryPhotoUpload(storyId: string): Promise<Reply<{ path: string; token: string }>> {
  return run(async () => {
    const { member } = await requireStoryMember();
    const budget = await rateLimitHit("clubverhaal-photo", member.id, 40, 3600);
    if (!budget.allowed) throw new StoryError("Even wachten met nog een foto.");
    return photoUploadTarget(createAdminClient(), member.id, id.parse(storyId));
  });
}

export async function confirmStoryPhoto(storyId: string, path: string, caption: string): Promise<Reply> {
  return run(async () => {
    const { member } = await requireStoryMember();
    const target = id.parse(storyId);
    const text = cleanCaption(z.string().max(1000).parse(caption ?? ""));
    await attachPhoto(createAdminClient(), member.id, target, z.string().max(300).parse(path), text);
    refresh(target);
    return undefined;
  });
}
