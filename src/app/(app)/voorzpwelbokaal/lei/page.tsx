import { BokaalShell } from "@/components/bokaal/shell";
import { currentSeason, loadStandings, requireBokaalMember } from "@/lib/bokaal/server";
import { formatBalls } from "@/lib/bokaal/rules";
import { cn } from "@/lib/utils";
import styles from "@/components/bokaal/bokaal.module.css";

export const metadata = { title: "De lei · voorZpWelBokaal" };
export const dynamic = "force-dynamic";

export default async function LeiPage() {
  let data;
  try {
    const { client, member } = await requireBokaalMember();
    const season = currentSeason();
    data = { me: member.id, season, standings: await loadStandings(client, season) };
  } catch (error) {
    return (
      <BokaalShell active="/voorzpwelbokaal/lei">
        <p className={styles.wallText} role="status">{error instanceof Error ? error.message : "De lei is tijdelijk niet beschikbaar."}</p>
      </BokaalShell>
    );
  }

  return (
    <BokaalShell active="/voorzpwelbokaal/lei">
      <div style={{ maxWidth: 640 }}>
        <div className={styles.board}>
          <div className={styles.slate}>
            <header className={cn(styles.boardHead, styles.chalk)}>
              <h2>De lei</h2>
              <span className={styles.when}>Seizoen {data.season.replace("-", "–")}</span>
            </header>
            {data.standings.length === 0 ? (
              <p className={cn(styles.emptyBoard, styles.chalk)}>Nog niemand op de lei.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={cn(styles.table, styles.chalk)}>
                  <thead>
                    <tr><th>#</th><th>Lid</th><th className={styles.num}>Saldo</th><th className={styles.num}>Open</th><th className={styles.num}>Raak</th></tr>
                  </thead>
                  <tbody>
                    {data.standings.map((s, i) => (
                      <tr key={s.profile_id} className={s.profile_id === data.me ? styles.me : undefined}>
                        <td>{i > 0 && data.standings[i - 1].balance === s.balance ? "" : i + 1}</td>
                        <td>{s.display_name ?? "Lid"}</td>
                        <td className={styles.num}>{formatBalls(s.balance)}</td>
                        <td className={styles.num}>{s.open_stake || ""}</td>
                        <td className={styles.num}>{s.bets ? `${s.hits}/${s.bets}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className={styles.ledge} aria-hidden="true" />
      </div>
    </BokaalShell>
  );
}
