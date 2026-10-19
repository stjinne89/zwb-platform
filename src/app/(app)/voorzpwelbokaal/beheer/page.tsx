import { notFound } from "next/navigation";
import { BackLink } from "@/components/app-ui";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import { currentSeason, requireBokaalMember } from "@/lib/bokaal/server";
import { loadAdmin } from "@/lib/bokaal/admin";
import { BONUS_QUESTIONS } from "@/lib/bokaal/settle";
import { BokaalAdmin, type AdminRace } from "./admin-client";

export const metadata = { title: "voorZpWelBokaal · beheer" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Brussels" });
const TIME = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Brussels" });

async function loadWithClock(season: string) {
  return { data: await loadAdmin(season), now: Date.now() };
}

export default async function BokaalAdminPage() {
  const { client } = await requireBokaalMember();
  const access = await getCurrentUserAccess(client);
  if (!access.has(adminAreaPermission("bokaal"))) notFound();
  const season = currentSeason();
  const { data, now } = await loadWithClock(season);
  const races: AdminRace[] = data.races.map((r) => {
    const start = new Date(r.starts_at);
    return {
      id: r.id,
      category: r.category,
      eventName: r.event_name,
      raceSlug: r.race_slug,
      date: DATE.format(start),
      time: TIME.format(start),
      started: start.getTime() <= now,
      status: r.status,
      riders: r.board.riders.length,
      bonusKey: r.bonus?.key ?? "",
      bets: data.stakes.get(r.id)?.count ?? 0,
      balls: data.stakes.get(r.id)?.balls ?? 0,
    };
  });
  const bonusOptions = Object.entries(BONUS_QUESTIONS).map(([key, q]) => ({ key, label: q.question("m") }));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/voorzpwelbokaal" label="voorZpWelBokaal" />
      <h1 className="text-2xl font-bold">voorZpWelBokaal · beheer</h1>
      <BokaalAdmin season={season} ratings={data.ratings} races={races} bonusOptions={bonusOptions} />
    </div>
  );
}
