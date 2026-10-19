"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { requireBokaalMember } from "@/lib/bokaal/server";
import {
  cancelRace, importChampionships, importEvent, importSeries, refreshBoard, refreshRatings, settleRace, updateRace,
} from "@/lib/bokaal/admin";
import { currentSeason } from "@/lib/bokaal/server";
import { brusselsToIso, eventSlugFrom } from "@/lib/bokaal/cyclingflash";
import { BONUS_KEYS } from "@/lib/bokaal/settle";
import { rateLimitHit } from "@/lib/rate-limit";

export type AdminReply = { ok: true; message: string } | { ok: false; error: string };

async function requireManager() {
  const { client, member } = await requireBokaalMember();
  const access = await getCurrentUserAccess(client);
  if (!access.has(adminAreaPermission("bokaal"))) throw new Error("Geen toegang.");
  return member;
}

// Bescheiden met CyclingFlash: hoogstens 30 ophaalacties per uur per beheerder.
async function politely(memberId: string, html: string | undefined) {
  if (html) return;
  const budget = await rateLimitHit("bokaal-cyclingflash", memberId, 30, 3600);
  if (!budget.allowed) throw new Error("Even wachten: te veel verzoeken naar CyclingFlash dit uur.");
}

async function run(work: () => Promise<string>): Promise<AdminReply> {
  try {
    const message = await work();
    revalidatePath("/voorzpwelbokaal", "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "Ongeldige invoer." };
    return { ok: false, error: error instanceof Error ? error.message : "Mislukt. Probeer opnieuw." };
  }
}

const html = z.string().max(5_000_000).optional().transform((v) => (v && v.trim() ? v : undefined));
const raceId = z.string().uuid();

export async function adminRefreshRatings(input: unknown) {
  return run(async () => {
    const data = z.object({ category: z.enum(["w", "m"]), html }).parse(input);
    const member = await requireManager();
    await politely(member.id, data.html);
    const count = await refreshRatings(data.category, data.html);
    return `${count} ratings opgeslagen.`;
  });
}

export async function adminImportEvent(input: unknown) {
  return run(async () => {
    const data = z.object({ event: z.string().max(300), html }).parse(input);
    const slug = eventSlugFrom(data.event);
    if (!slug) throw new Error("Plak een eventlink van cyclingflash.com.");
    const member = await requireManager();
    await politely(member.id, data.html);
    const count = await importEvent(slug, data.html);
    return `${count} wedstrijden klaargezet als concept.`;
  });
}

const CLOCK = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

export async function adminRefreshBoard(input: unknown) {
  return run(async () => {
    const data = z.object({ raceId, html }).parse(input);
    const member = await requireManager();
    await politely(member.id, data.html);
    const { riders, startsAt, timeChanged } = await refreshBoard(data.raceId, data.html);
    return `Bord bijgewerkt: ${riders} renners${timeChanged ? `, start nu ${CLOCK.format(new Date(startsAt))}` : ""}.`;
  });
}

/** De seizoenskalender per reeks, of de kampioenschappen; elk deel is een eigen verzoek. */
export async function adminImportCalendar(input: unknown) {
  return run(async () => {
    const { part } = z.object({ part: z.enum(["wereldbeker", "superprestige", "hg-cross", "kampioenschappen"]) }).parse(input);
    const member = await requireManager();
    await politely(member.id, undefined);
    const season = currentSeason();
    if (part === "kampioenschappen") {
      const { found, created } = await importChampionships(season);
      return `Kampioenschappen: ${found} gevonden, ${created} wedstrijden nieuw.`;
    }
    const { label, found, created } = await importSeries(part, season);
    return `${label}: ${found} komende wedstrijden, ${created} nieuw.`;
  });
}

export async function adminUpdateRace(input: unknown) {
  return run(async () => {
    const data = z
      .object({
        raceId,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        status: z.enum(["concept", "open"]).optional(),
        bonusKey: z.union([z.enum(BONUS_KEYS as [string, ...string[]]), z.literal("")]).optional(),
      })
      .parse(input);
    await requireManager();
    await updateRace(data.raceId, {
      startsAt: data.date && data.time ? brusselsToIso(data.date, data.time) : undefined,
      status: data.status,
      bonusKey: data.bonusKey,
    });
    return data.status === "open" ? "Op het bord gezet." : data.status === "concept" ? "Van het bord gehaald." : "Opgeslagen.";
  });
}

export async function adminSettleRace(input: unknown) {
  return run(async () => {
    const data = z.object({ raceId, html }).parse(input);
    const member = await requireManager();
    await politely(member.id, data.html);
    const { bets, hits } = await settleRace(data.raceId, data.html);
    return `Afgerekend: ${hits} van ${bets} briefjes raak.`;
  });
}

export async function adminCancelRace(input: unknown) {
  return run(async () => {
    const data = z.object({ raceId }).parse(input);
    await requireManager();
    await cancelRace(data.raceId);
    return "Geannuleerd; alle inzetten zijn terug.";
  });
}
