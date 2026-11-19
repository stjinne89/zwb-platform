import type { CSSProperties } from "react";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { tegelsFontVariables } from "@/components/tegels/font";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { overlayColors, overlayColorVars, tenueBands } from "@/lib/youtube-live/overlay-theme";
import { overlayRows, overlayValue } from "@/lib/zrl-live/overlay";
import type { ZrlLiveView } from "@/lib/zrl-live/snapshot";
import { loadFooterSponsors } from "@/app/(app)/_components/sponsor-footer";
import { SponsorRotator } from "./sponsor-rotator";
import "./stream-overlay.css";

// De OBS-overlay van een stream (0341), als browserbron op 1920×1080. Sinds
// 2026-11-19 een kader om het Zwift-beeld: een balk boven (216px) en een kolom
// links (384px), met de tenuebanen van de app op nachtpetrol. Zwift staat er
// rechtsonder in, op 80% (1536×864 op 384, 216), zodat niets meer over de HUD
// van Zwift valt. Boven de titeltegel en de sponsors; links route en afstand,
// en bij ZRL de stand. Bij de ladder blijft de kolom vrij voor het Sauce-venster.

/** Waar het Zwift-beeld in het kader staat; ook op /hulp. */
export const ZWIFT_WINDOW = { x: 384, y: 216, width: 1536, height: 864 } as const;

export type OverlayStand = {
  view: ZrlLiveView;
  /** Aantal ploegen, 5 tot 15 (?teams=). */
  teams: number;
};

export async function StreamOverlay({
  title,
  status,
  info = [],
  stand,
  refreshSeconds,
}: {
  title: string;
  /** De kleine regel boven de titel, bv. "Live · Club Ladder". */
  status: string;
  /** Route en afstand, bovenin de kolom links. */
  info?: string[];
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
  const colors = overlayColors(settings.palette);
  const style = {
    ...overlayColorVars(colors),
    "--ov-bands": tenueBands(colors),
    fontFamily: `var(--font-tegels-${font}), system-ui, sans-serif`,
  } as CSSProperties;

  return (
    <main className={`stream-overlay ${tegelsFontVariables}`} style={style} lang="nl">
      {refreshSeconds !== null && <AutoRefresh seconds={refreshSeconds} />}
      <div className="stream-overlay-frame stream-overlay-frame-top" aria-hidden />
      <div className="stream-overlay-frame stream-overlay-frame-side" aria-hidden />
      <div className="stream-overlay-window" aria-hidden />

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
          {title && <h1>{title}</h1>}
        </span>
      </header>

      {sponsors.length > 0 && (
        <aside className="stream-overlay-sponsors">
          <span className="stream-overlay-caption">Sponsors</span>
          <SponsorRotator sponsors={sponsors.map(({ name, logoUrl }) => ({ name, logoUrl }))} />
        </aside>
      )}

      <section className="stream-overlay-side">
        {info.length > 0 && (
          <p className="stream-overlay-info">
            {info.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        )}
        {stand && <StandRows stand={stand} />}
      </section>
    </main>
  );
}

function StandRows({ stand }: { stand: OverlayStand }) {
  const { view, teams } = stand;
  const { score } = view;
  const rows = overlayRows(score.teams, view.ownTeam, teams);
  if (rows.length === 0) {
    return <p className="stream-overlay-wait">{score.format === "ttt" ? "Wacht op tijden" : "Wacht op punten"}</p>;
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
  if (view.score.final) return "Uitslag · ZRL";
  if (view.fetchedAt < view.startAt) return "Begint zo · ZRL";
  return view.subgroupLabel ? `Live · ZRL ${view.subgroupLabel}` : "Live · ZRL";
}

/**
 * ?teams=5 tot 15, standaard 15: de kolom links heeft er sinds het kader
 * (2026-11-19) ruimte voor. overlayRows begrenst de onderkant.
 */
export function wantedTeams(value: string | string[] | undefined): number {
  const n = Number(typeof value === "string" ? value : NaN);
  return Number.isFinite(n) ? Math.min(n, 15) : 15;
}
