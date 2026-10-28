"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileIdsWithPermission } from "@/lib/auth/permissions";
import { sendNotificationToMembers } from "@/lib/push/send";
import { rateLimitHit } from "@/lib/rate-limit";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import {
  CONGRATS_MAX,
  CONGRATS_PER_HOUR,
  NOTE_MAX,
  NominationError,
  cleanText,
  parseNomination,
} from "@/lib/zwbekers/nomination";
import {
  REVIEW_PERMISSION,
  addCongrats,
  attachPhoto,
  createNomination,
  deleteBeker,
  deleteCongrats,
  photoUploadTarget,
  removePhoto,
  requireBekerMember,
  reviewNomination,
  updateNomination,
} from "@/lib/zwbekers/server";

// Acties van ZWBekers (0286). De tabellen hebben geen schrijfpolicies: alles
// gaat hier langs, na de checks in lib/zwbekers. Pushmeldingen noemen nooit het
// verhaal of de notitie van het bestuur, alleen de titel van de beker.

export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const id = z.string().uuid();

async function run<T>(work: () => Promise<T>): Promise<Reply<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof NominationError) return { ok: false, error: error.message };
    if (error instanceof ZodError) return { ok: false, error: "Er klopt iets niet in het formulier." };
    console.error("[zwbekers]", error);
    return { ok: false, error: "Dat lukte niet. Probeer het opnieuw." };
  }
}

function refresh(bekerId?: string) {
  revalidatePath("/zwbekers");
  revalidatePath("/beheer/zwbekers");
  if (bekerId) revalidatePath(`/zwbekers/${bekerId}`);
  // De plank op profielen.
  revalidatePath("/leden/[id]", "page");
  revalidatePath("/profiel");
}

/** Best effort: een mislukte melding mag de actie niet raken. */
async function notify(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error("[zwbekers] melding faalde:", error);
  }
}

export async function submitNomination(input: unknown): Promise<Reply<{ id: string }>> {
  return run(async () => {
    const { member } = await requireBekerMember();
    const nomination = parseNomination(input, amsterdamDayKey());
    const admin = createAdminClient();
    const bekerId = await createNomination(admin, member.id, nomination);
    await notify(async () => {
      const reviewers = await profileIdsWithPermission(admin, REVIEW_PERMISSION);
      if (reviewers.length === 0) return;
      await sendNotificationToMembers(
        "on_zwbeker_nomination",
        {
          title: "Nieuwe voordracht voor een ZWBeker",
          body: `${member.name} draagt een prestatie voor.`,
          url: "/beheer/zwbekers",
          tag: `zwbeker-${bekerId}`,
        },
        { profileIds: reviewers, excludeProfileId: member.id },
      );
    });
    refresh(bekerId);
    return { id: bekerId };
  });
}

export async function saveNomination(bekerId: string, input: unknown): Promise<Reply<{ id: string }>> {
  return run(async () => {
    const { member } = await requireBekerMember();
    const target = id.parse(bekerId);
    const nomination = parseNomination(input, amsterdamDayKey());
    await updateNomination(createAdminClient(), member.id, target, nomination);
    refresh(target);
    return { id: target };
  });
}

export async function withdrawBeker(bekerId: string): Promise<Reply> {
  return run(async () => {
    const { member, canReview } = await requireBekerMember();
    const target = id.parse(bekerId);
    await deleteBeker(createAdminClient(), member.id, target, canReview);
    refresh(target);
    return undefined;
  });
}

export async function reviewBeker(bekerId: string, decision: "toegekend" | "afgewezen", note: string): Promise<Reply> {
  return run(async () => {
    const { member, canReview } = await requireBekerMember();
    if (!canReview) throw new NominationError("Alleen het bestuur keurt voordrachten.");
    const target = id.parse(bekerId);
    const choice = z.enum(["toegekend", "afgewezen"]).parse(decision);
    const text = cleanText(note ?? "", NOTE_MAX) || null;
    const admin = createAdminClient();
    const result = await reviewNomination(admin, member.id, target, choice, text);
    await notify(async () => {
      const url = `/zwbekers/${target}`;
      if (choice === "toegekend") {
        await sendNotificationToMembers(
          "on_zwbeker_awarded",
          { title: "Je hebt een ZWBeker!", body: `“${result.title}” staat in de prijzenkast.`, url, tag: `zwbeker-${target}` },
          { profileIds: result.winnerIds },
        );
      }
      // Wie voordroeg, hoort de uitslag ook, tenzij hij zelf al een winnaarsmelding kreeg.
      if (result.nominatorId && !(choice === "toegekend" && result.winnerIds.includes(result.nominatorId))) {
        await sendNotificationToMembers(
          "on_zwbeker_awarded",
          choice === "toegekend"
            ? { title: "Je voordracht is toegekend", body: `“${result.title}” staat in de prijzenkast.`, url, tag: `zwbeker-${target}` }
            : { title: "Je voordracht is teruggestuurd", body: "Lees wat het bestuur erbij schreef.", url, tag: `zwbeker-${target}` },
          { profileIds: [result.nominatorId], excludeProfileId: member.id },
        );
      }
    });
    refresh(target);
    return undefined;
  });
}

export async function congratulate(bekerId: string, body: string): Promise<Reply> {
  return run(async () => {
    const { member } = await requireBekerMember();
    const target = id.parse(bekerId);
    const text = cleanText(z.string().max(5000).parse(body), CONGRATS_MAX);
    if (!text) throw new NominationError("Schrijf een felicitatie.");
    const budget = await rateLimitHit("zwbekers-congrats", member.id, CONGRATS_PER_HOUR, 3600);
    if (!budget.allowed) throw new NominationError("Even rustig aan met feliciteren. Probeer het straks weer.");
    await addCongrats(createAdminClient(), member.id, target, text);
    refresh(target);
    return undefined;
  });
}

export async function removeCongrats(congratsId: string): Promise<Reply> {
  return run(async () => {
    const { member, access } = await requireBekerMember();
    const target = id.parse(congratsId);
    const canModerate = access.has("content.moderate_posts") || access.has(REVIEW_PERMISSION);
    const bekerId = await deleteCongrats(createAdminClient(), member.id, target, canModerate);
    refresh(bekerId ?? undefined);
    return undefined;
  });
}

export async function requestPhotoUpload(bekerId: string): Promise<Reply<{ path: string; token: string }>> {
  return run(async () => {
    const { member } = await requireBekerMember();
    const budget = await rateLimitHit("zwbekers-photo", member.id, 20, 3600);
    if (!budget.allowed) throw new NominationError("Even wachten met nog een foto.");
    return photoUploadTarget(createAdminClient(), member.id, id.parse(bekerId));
  });
}

export async function confirmPhoto(bekerId: string, path: string): Promise<Reply> {
  return run(async () => {
    const { member } = await requireBekerMember();
    const target = id.parse(bekerId);
    await attachPhoto(createAdminClient(), member.id, target, z.string().max(300).parse(path));
    refresh(target);
    return undefined;
  });
}

export async function deletePhoto(bekerId: string): Promise<Reply> {
  return run(async () => {
    const { member, canReview } = await requireBekerMember();
    const target = id.parse(bekerId);
    await removePhoto(createAdminClient(), member.id, target, canReview);
    refresh(target);
    return undefined;
  });
}
