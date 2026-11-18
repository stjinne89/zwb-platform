import type { CSSProperties } from "react";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { tegelsFontVariables } from "@/components/tegels/font";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { overlayColors, overlayColorVars } from "@/lib/youtube-live/overlay-theme";
import { overlayRows, overlayValue } from "@/lib/zrl-live/overlay";
import type { ZrlLiveView } from "@/lib/zrl-live/snapshot";
import { loadFooterSponsors } from "@/app/(app)/_components/sponsor-footer";
import { SponsorRotator } from "./sponsor-rotator";
import "./stream-overlay.css";

// De OBS-overlay van een stream (0341), als browserbron op 1920×1080 met een
// doorzichtige achtergrond. De nachtversie van het design tegels, in de kleuren
// en letter van de club. Linksboven de kop met het clublogo en de titel, bij een
// ZRL-race met de stand eronder; linksonder de sponsors. Engels, voor kijkers
// van buiten de club.

export type OverlayStand = {
  view: ZrlLiveView;
  /** Aantal ploegen, 5 tot 15 (?teams=). */
  teams: number;
};

export async function StreamOverlay({
  title,
  status,
  stand,
  refreshSeconds,
}: {
  title: string;
  /** De kleine regel boven de titel, bv. "ZRL live · A". */
  status: string;
  stand: OverlayStand | null;
  /** null: niet meer verversen (de uitslag staat vast). */
  refreshSeconds: number | null;
}) {
  const [{ settings, texts }, sponsors] = await Promise.all([
    getClub(),
    loadFooterSponsors().catch(() => []),
  ]);
  const logo = clubLogoUrl(settings);
  const font = settings.font ?? DEFAULT_FONT;
  const style = {
    ...overlayColorVars(overlayColors(settings.palette)),
    fontFamily: `var(--font-tegels-${font}), system-ui, sans-serif`,
  } as CSSProperties;

  return (
    <main className={`stream-overlay ${tegelsFontVariables}`} style={style} lang="en">
      {refreshSeconds !== null && <AutoRefresh seconds={refreshSeconds} />}
      <section className="stream-overlay-panel">
        <header className="stream-overlay-head">
          <span className="stream-overlay-logo">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={texts.name} />
            ) : (
              <span>{texts.shortName}</span>
            )}
          </span>
          <span className="stream-overlay-titles">
            <span className="stream-overlay-status">{status}</span>
            <h1>{title}</h1>
          </span>
        </header>
        {stand && <StandRows stand={stand} />}
      </section>
      {sponsors.length > 0 && (
        <aside className="stream-overlay-sponsors">
          <span className="stream-overlay-caption">Sponsors</span>
          <SponsorRotator sponsors={sponsors.map(({ name, logoUrl }) => ({ name, logoUrl }))} />
        </aside>
      )}
    </main>
  );
}

function StandRows({ stand }: { stand: OverlayStand }) {
  const { view, teams } = stand;
  const { score } = view;
  const rows = overlayRows(score.teams, view.ownTeam, teams);
  if (rows.length === 0) {
    return <p className="stream-overlay-wait">{score.format === "ttt" ? "Awaiting times" : "Awaiting points"}</p>;
  }
  return (
    <ol className="stream-overlay-stand">
      {rows.map((team) => (
        <li key={team.team} data-own={team.team === view.ownTeam ? "" : undefined}>
          <span className="stream-overlay-rank">{team.rank}</span>
          <span className="stream-overlay-team">{view.teamLabels[team.team] ?? team.team}</span>
          <span className="stream-overlay-value">{overlayValue(team, score.format)}</span>
        </li>
      ))}
    </ol>
  );
}

/** De kleine regel van een ZRL-race. */
export function zrlStatus(view: ZrlLiveView): string {
  if (view.score.final) return "Final";
  if (view.fetchedAt < view.startAt) return "Starts soon";
  return view.subgroupLabel ? `ZRL live · ${view.subgroupLabel}` : "ZRL live";
}

/** ?teams=5 tot 15, standaard 8 (overlayRows begrenst). */
export function wantedTeams(value: string | string[] | undefined): number {
  const n = Number(typeof value === "string" ? value : NaN);
  return Number.isFinite(n) ? n : 8;
}
