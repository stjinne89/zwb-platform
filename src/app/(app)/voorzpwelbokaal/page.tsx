import { BokaalShell } from "@/components/bokaal/shell";
import { BokaalBoard, type BoardRace, type PlacedBet } from "@/components/bokaal/board";
import { currentSeason, loadBets, loadBoardRaces, loadPlayer, requireBokaalMember } from "@/lib/bokaal/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { adminAreaPermission } from "@/lib/admin-areas";
import styles from "@/components/bokaal/bokaal.module.css";

export const metadata = { title: "voorZpWelBokaal" };
export const dynamic = "force-dynamic";

async function load() {
  const { client, member } = await requireBokaalMember();
  const season = currentSeason();
  const [player, races, access] = await Promise.all([
    loadPlayer(client, member.id, season),
    loadBoardRaces(client),
    getCurrentUserAccess(client),
  ]);
  const { bets, answers } = await loadBets(client, member.id, races.map((r) => r.id));
  // Eén tijdstip voor server en browser, zodat "bord dicht" bij het laden niet verschilt.
  return { player, races, bets, answers, canManage: access.has(adminAreaPermission("bokaal")), now: Date.now() };
}

export default async function BokaalPage() {
  let data;
  try {
    data = await load();
  } catch (error) {
    return (
      <BokaalShell active="/voorzpwelbokaal">
        <p className={styles.wallText} role="status">{error instanceof Error ? error.message : "voorZpWelBokaal is tijdelijk niet beschikbaar."}</p>
      </BokaalShell>
    );
  }

  const races: BoardRace[] = data.races.map((r) => ({
    id: r.id, category: r.category, eventName: r.event_name, location: r.location,
    startsAt: r.starts_at, board: r.board, bonus: r.bonus,
  }));
  const placed: PlacedBet[] = data.bets.map((b) => ({
    id: b.id, raceId: b.race_id, market: b.market, rider: b.rider_slug, riderName: b.rider_name,
    vs: b.vs_slug, vsName: b.vs_name, odds: b.odds, stake: b.stake,
  }));
  const answers = Object.fromEntries(data.answers.map((a) => [a.race_id, a.choice]));

  return (
    <BokaalShell active="/voorzpwelbokaal" canManage={data.canManage}>
      <BokaalBoard
        races={races}
        placed={placed}
        answers={answers}
        joined={data.player.joined}
        balance={data.player.balance}
        now={data.now}
      />
    </BokaalShell>
  );
}
