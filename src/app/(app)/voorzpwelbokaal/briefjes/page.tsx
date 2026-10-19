import { BokaalShell, BallRack } from "@/components/bokaal/shell";
import { currentSeason, loadHistory, loadPlayer, requireBokaalMember } from "@/lib/bokaal/server";
import { boardName, CATEGORY_LABEL, formatBalls, formatOdd, MARKET_LABEL } from "@/lib/bokaal/rules";
import { cn } from "@/lib/utils";
import styles from "@/components/bokaal/bokaal.module.css";
import { LeaveBokaal } from "./leave";

export const metadata = { title: "Briefjes · voorZpWelBokaal" };
export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" });

export default async function BriefjesPage() {
  let data;
  try {
    const { client, member } = await requireBokaalMember();
    const season = currentSeason();
    const [player, history] = await Promise.all([loadPlayer(client, member.id, season), loadHistory(client, member.id, season)]);
    data = { player, ...history };
  } catch (error) {
    return (
      <BokaalShell active="/voorzpwelbokaal/briefjes">
        <p className={styles.wallText} role="status">{error instanceof Error ? error.message : "Je briefjes zijn tijdelijk niet beschikbaar."}</p>
      </BokaalShell>
    );
  }

  return (
    <BokaalShell active="/voorzpwelbokaal/briefjes">
      <div className={styles.history}>
        {data.player.joined && (
          <div className={styles.slip}>
            <div className={styles.slipHead}><span>Saldo</span><span>{formatBalls(data.player.balance)} ZWBallen</span></div>
            <BallRack free={data.player.balance} label={`${formatBalls(data.player.balance)} op het rek`} />
          </div>
        )}
        {data.races.length === 0 && <p className={styles.wallText}>Nog geen briefjes dit seizoen.</p>}
        {data.races.map((race) => {
          const bets = data.bets.filter((b) => b.race_id === race.id);
          const answer = data.answers.find((a) => a.race_id === race.id);
          const podium = (race.result ?? []).filter((r) => r.pos != null && r.pos <= 3).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
          const paid = bets.reduce((a, b) => a + (b.payout ?? 0), 0) + (answer?.correct ? 1 : 0);
          return (
            <section key={race.id} className={styles.slip} aria-label={`${race.event_name} ${CATEGORY_LABEL[race.category]}`}>
              <h2 className={styles.raceTitle}>{race.event_name} · {CATEGORY_LABEL[race.category]} · {DAY.format(new Date(race.starts_at))}</h2>
              {podium.length > 0 && <p className={styles.podium}>{podium.map((r) => `${r.pos}. ${boardName(r.name)}`).join("  ")}</p>}
              {race.status === "geannuleerd" && <p className={styles.podium}>Geannuleerd</p>}
              <ul className={styles.lines}>
                {bets.map((b) => (
                  <li key={b.id} className={cn(styles.line, b.outcome === "mis" && styles.lost)}>
                    <div className={styles.what}>
                      <b>{boardName(b.rider_name)}</b> {MARKET_LABEL[b.market]}{b.vs_name ? ` v. ${boardName(b.vs_name)}` : ""} · {formatOdd(b.odds)}
                      <div className={styles.meta}>inzet {b.stake}{b.outcome === "open" ? ` · uitbetaling ${formatBalls(b.stake * b.odds)}` : ""}</div>
                    </div>
                    <span />
                    {b.outcome === "raak" && <span className={styles.stamp}>+{formatBalls(b.payout ?? 0)}</span>}
                    {b.outcome === "terug" && <span className={styles.stamp}>Terug</span>}
                  </li>
                ))}
                {answer && race.bonus && (
                  <li className={cn(styles.line, answer.correct === false && styles.lost)}>
                    <div className={styles.what}>
                      <b>Bonus</b> {race.bonus.options[answer.choice]}
                      <div className={styles.meta}>
                        {race.bonus.answer != null && answer.correct === false ? `goed was: ${race.bonus.options[race.bonus.answer]}` : "goed is 1 bal"}
                      </div>
                    </div>
                    <span />
                    {answer.correct && <span className={styles.stamp}>+1 bal</span>}
                  </li>
                )}
              </ul>
              {race.status === "afgerekend" && (
                <div className={styles.totals}>
                  <div className={styles.big}><span>Uitbetaald</span><span>{formatBalls(paid)}</span></div>
                </div>
              )}
            </section>
          );
        })}
        {data.player.joined && <LeaveBokaal />}
      </div>
    </BokaalShell>
  );
}
