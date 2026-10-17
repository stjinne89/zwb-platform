"use server";

import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/auth/request";
import { zwiftEventIdFromInput } from "@/lib/zrl-analysis/activity";
import { calendarEventForZwift } from "@/lib/zrl-analysis/load";

export type OpenRaceState = { error: string | null };

/** Een geplakte Zwift-link openen: de race uit de kalender als die er is, anders de eigen analyse. */
export async function openZwiftRace(_prev: OpenRaceState, formData: FormData): Promise<OpenRaceState> {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const id = zwiftEventIdFromInput(String(formData.get("link") ?? ""));
  if (!id) return { error: "Dat is geen link naar een Zwift-event." };
  const calendarId = await calendarEventForZwift(id);
  redirect(calendarId ? `/zwbeter-worden/racen/${calendarId}` : `/zwbeter-worden/racen/zwift/${id}`);
}
