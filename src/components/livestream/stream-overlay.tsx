import type { CSSProperties } from "react";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { tegelsFontVariables } from "@/components/tegels/font";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { overlayColors, overlayColorVars, tenueBands, type OverlayMode } from "@/lib/youtube-live/overlay-theme";
import { printInks, styleHasModes, tenueInks, type OverlayStyle } from "@/lib/youtube-live/overlay-styles";
import type { StreamRoute } from "@/lib/youtube-live/route-facts";
import { kopmanColors, kopmanFace, type KopmanLook } from "@/lib/youtube-live/kopman";
import { overlayRows, overlayValue } from "@/lib/zrl-live/overlay";
import type { ZrlLiveView } from "@/lib/zrl-live/snapshot";
import type { LadderOverlayRow } from "@/lib/club-ladder/live";
import { loadFooterSponsors } from "@/app/(app)/_components/sponsor-footer";
import { overlayHand, overlayStencil, overlayText } from "./fonts";
import { OverlaySponsors } from "./sponsor-rotator";
import { RugnummerOverlay, StripOverlay, ZeefdrukOverlay, type OverlayParts } from "./stream-overlay-styles";
import "./stream-overlay.css";
import "./stream-overlay-rugnummer.css";
import "./stream-overlay-zeefdruk.css";
import "./stream-overlay-strip.css";

// De OBS-overlay van een stream (0341), als browserbron op 1920×1080. Sinds
// 2026-11-19 een kader om het Zwift-beeld: een balk boven (216px) en een kolom
// links (384px), met de tenuebanen van de app op nachtpetrol. Zwift staat er
// rechtsonder in, op 80% (1536×864 op 384, 216), zodat niets meer over de HUD
// van Zwift valt. Boven de titeltegel en de sponsors; links route en afstand,
// en bij ZRL de stand. Bij de ladder sinds 2026-11-25 ook: de score en de tien
// renners bij de laatste boog (club-ladder/live.ts); wie daar het Sauce-venster
// wil, zet de stand uit.
// Sinds 2026-11-20 in donker (nachtpetrol) of licht (crème), per stream (0345),
// en in een van vier stijlen (0346): tegels (dit kader), rugnummer, zeefdruk
// of strip (stream-overlay-styles.tsx). Donker of licht geldt bij tegels en
// zeefdruk. Sinds 0348 op de resolutie van het OBS-canvas van het lid. Sinds
// 0359 ook ultrawide: Zwift over de volle breedte, met een balk boven (titel en
// sponsors) en een balk onder (route en stand) in plaats van de kolom links.
// Sinds 0373 met een webcamgat: linksonder in de kolom, of links in de balk
// onder bij ultrawide. Het gat is doorzichtig, met de lijn van de stijl erom.

/** Waar het Zwift-beeld in het kader staat, bij 1920×1080 (andere maten: overlay-size.ts). */
export const ZWIFT_WINDOW = { x: 384, y: 216, width: 1536, height: 864 } as const;

export type OverlayStand =
  | {
      kind?: "zrl";
      view: ZrlLiveView;
      /** Aantal ploegen, 5 tot 15 (?teams=). */
      teams: number;
    }
  | {
      kind: "ladder";
      /** De score en de renners, al afgekapt (ladderOverlayRows). */
      rows: LadderOverlayRow[];
    };

export async function StreamOverlay({
  title,
  status,
  info = [],
  theme = "dark",
  look = "tegels",
  route = null,
  stand,
  kopman = null,
  scale = 1,
  hole = null,
  cam = null,
  refreshSeconds,
}: {
  title: string;
  /** De kleine regel boven de titel, bv. "Live · Club Ladder". */
  status: string;
  /** Route en afstand, bovenin de kolom links (tegels). */
  info?: string[];
  theme?: OverlayMode;
  /** De stijl van de stream (0346). */
  look?: OverlayStyle;
  /** Het parcours los, voor de andere stijlen. */
  route?: StreamRoute | null;
  stand: OverlayStand | null;
  /** De eigen kopman van het lid (0347); alleen bij strip te zien. */
  kopman?: KopmanLook | null;
  /** De resolutie van de stream als deel van 1920 (0348): het hele kader schaalt mee. */
  scale?: number;
  /** Ultrawide (0359): het gat over de volle breedte, in de maat van het ontwerp. */
  hole?: { top: number; height: number } | null;
  /** De webcam (0373): het gat linksonder, in de maat van het ontwerp. */
  cam?: { width: number; height: number } | null;
  /** null: niet meer verversen (de uitslag staat vast). */
  refreshSeconds: number | null;
}) {
  const [{ settings, texts }, sponsors] = await Promise.all([
    getClub(),
    loadFooterSponsors().catch(() => []),
  ]);
  const logo = clubLogoUrl(settings);
  const font = settings.font ?? DEFAULT_FONT;
  const mode = styleHasModes(look) ? theme : "dark";
  const colors = overlayColors(settings.palette, mode);
  const style = {
    ...overlayColorVars(colors),
    ...styleVars(look, settings.palette, mode),
    "--ov-bands": tenueBands(colors),
    "--ov-club-font": `var(--font-tegels-${font}), system-ui, sans-serif`,
    // Zeefdruk en strip hebben hun eigen letter (in hun CSS).
    ...(look === "tegels" || look === "rugnummer" ? { fontFamily: `var(--font-tegels-${font}), system-ui, sans-serif` } : {}),
    // Ontworpen op 1920×1080; zoom schaalt ook de opmaak, dus de pagina wordt
    // precies het gekozen formaat (OBS draait op Chromium).
    ...(scale !== 1 ? { zoom: scale } : {}),
    ...(hole ? { "--ov-top": `${hole.top}px`, "--ov-hole-h": `${hole.height}px` } : {}),
    ...(cam ? { "--ov-cam-w": `${cam.width}px`, "--ov-cam-h": `${cam.height}px` } : {}),
  } as CSSProperties;
  const layout = hole ? "wide" : undefined;
  const rotator = sponsors.map(({ name, logoUrl, overlayFixed }) => ({ name, logoUrl, overlayFixed }));

  if (look !== "tegels") {
    const parts: OverlayParts = {
      logo,
      clubName: texts.name,
      shortName: texts.shortName,
      status,
      title,
      sponsors: rotator,
      route,
      wide: Boolean(hole),
      stand: stand ? <StandRows stand={stand} /> : null,
      kopman: look === "strip" && kopman ? { face: kopmanFace(kopman), colors: kopmanColors(tenueInks(settings.palette), kopman) } : null,
    };
    const fonts = `${tegelsFontVariables} ${overlayStencil.variable} ${overlayText.variable} ${overlayHand.variable}`;
    return (
      <main className={`stream-overlay ${fonts}`} style={style} lang="nl" data-style={look} data-theme={mode} data-layout={layout} data-cam={cam ? "" : undefined}>
        {refreshSeconds !== null && <AutoRefresh seconds={refreshSeconds} />}
        <div className="stream-overlay-frame stream-overlay-frame-top" aria-hidden />
        <div className="stream-overlay-frame stream-overlay-frame-side" aria-hidden />
        {cam && <div className="stream-overlay-cam" aria-hidden />}
        {look === "rugnummer" && <RugnummerOverlay parts={parts} />}
        {look === "zeefdruk" && <ZeefdrukOverlay parts={parts} />}
        {look === "strip" && <StripOverlay parts={parts} />}
      </main>
    );
  }

  return (
    <main className={`stream-overlay ${tegelsFontVariables}`} style={style} lang="nl" data-style="tegels" data-theme={theme} data-layout={layout} data-cam={cam ? "" : undefined}>
      {refreshSeconds !== null && <AutoRefresh seconds={refreshSeconds} />}
      <div className="stream-overlay-frame stream-overlay-frame-top" aria-hidden />
      <div className="stream-overlay-frame stream-overlay-frame-side" aria-hidden />
      <div className="stream-overlay-window" aria-hidden />
      {cam && <div className="stream-overlay-cam" aria-hidden />}

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
          <OverlaySponsors sponsors={rotator} />
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

/** De inkten van de andere stijlen als --ovr-*, --ovz-* en --ovs-*. */
function styleVars(look: OverlayStyle, palette: Parameters<typeof tenueInks>[0], mode: OverlayMode): Record<string, string> {
  if (look === "zeefdruk") {
    const p = printInks(mode);
    return {
      "--ovz-paper": p.paper,
      "--ovz-ink": p.ink,
      "--ovz-soft": p.soft,
      "--ovz-cyan": p.cyan,
      "--ovz-gold": p.gold,
      "--ovz-sage": p.sage,
    };
  }
  if (look === "rugnummer" || look === "strip") {
    const t = tenueInks(palette);
    return {
      "--tn-petrol": t.petrol,
      "--tn-teal": t.teal,
      "--tn-sage": t.sage,
      "--tn-gold": t.gold,
      "--tn-paper": t.paper,
      "--tn-page": t.page,
      "--tn-ink": t.ink,
    };
  }
  return {};
}

function StandRows({ stand }: { stand: OverlayStand }) {
  if (stand.kind === "ladder") return <LadderRows rows={stand.rows} />;
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

/** De ladder: de twee ploegen met de score, dan de renners met hun punten. */
function LadderRows({ rows }: { rows: LadderOverlayRow[] }) {
  if (rows.length === 0) return <p className="stream-overlay-wait">Wacht op de eerste boog</p>;
  return (
    <ol className="stream-overlay-stand">
      {rows.map((row) => (
        <li key={row.key} data-own={row.own ? "" : undefined} data-kind={row.kind}>
          <span className="stream-overlay-rank">{row.rank}</span>
          <span className="stream-overlay-team">{row.label}</span>
          <span className="stream-overlay-value">{row.value}</span>
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
 * (2026-11-19) ruimte voor. overlayRows begrenst de onderkant. Ultrawide
 * (0359) toont er hooguit 10, in twee rijen in de balk onder.
 */
export function wantedTeams(value: string | string[] | undefined): number {
  const n = Number(typeof value === "string" ? value : NaN);
  return Number.isFinite(n) ? Math.min(n, 15) : 15;
}
