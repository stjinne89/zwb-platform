import { notFound } from "next/navigation";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";
import { overlayRows, overlayValue } from "@/lib/zrl-live/overlay";
import "./zrl-overlay.css";

// De live teamstand als browserbron voor OBS (livestreams, fase 2): dezelfde
// gegevens als de openbare live stand, op 1920×1080 met een doorzichtige
// achtergrond. ?teams=5 tot 15 bepaalt hoeveel ploegen er staan (standaard 8).

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata() {
  return { title: "ZRL live — overlay", robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZrlOverlayPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const query = (await searchParams) ?? {};
  const outcome = await loadZrlLive(eventId);
  if (outcome.status === "not-found") notFound();

  if (outcome.status !== "ok") {
    return (
      <main className="zrl-overlay" lang="en">
        <AutoRefresh seconds={30} />
      </main>
    );
  }
  const { view } = outcome;
  const { score } = view;
  const wanted = Number(typeof query.teams === "string" ? query.teams : NaN);
  const rows = overlayRows(score.teams, view.ownTeam, Number.isFinite(wanted) ? wanted : 8);
  const started = view.fetchedAt >= view.startAt;

  return (
    <main className="zrl-overlay" lang="en">
      {!score.final && <AutoRefresh seconds={15} />}
      <section className="zrl-overlay-panel">
        <header>
          <span>ZRL LIVE</span>
          <span>{score.final ? "FINAL" : started ? view.subgroupLabel : "START SOON"}</span>
        </header>
        <h1>{view.event.title}</h1>
        {rows.length === 0 ? (
          <p>{score.format === "ttt" ? "Awaiting times" : "Awaiting points"}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>{score.format === "ttt" ? "Time" : "Pts"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((team) => (
                <tr key={team.team} className={team.team === view.ownTeam ? "own" : undefined}>
                  <td>{team.rank}</td>
                  <td>{view.teamLabels[team.team] ?? team.team}</td>
                  <td>{overlayValue(team, score.format)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
