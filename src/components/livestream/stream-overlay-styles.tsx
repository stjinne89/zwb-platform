import type { ReactNode } from "react";
import { routeFigures } from "@/lib/youtube-live/overlay-styles";
import { profileAreaPath, profileTopPath, type StreamRoute } from "@/lib/youtube-live/route-facts";
import { kopmanMood, type KopmanColors, type KopmanFace } from "@/lib/youtube-live/kopman";
import { kopmanSvg } from "./kopman-figure";
import { SponsorRotator, type RotatorSponsor } from "./sponsor-rotator";

// De drie eigen stijlen van de OBS-overlay (0346), naast het tegelkader in
// stream-overlay.tsx. Zelfde vakken op dezelfde plek: titel en sponsor in de
// balk boven, parcours en stand in de kolom links, Zwift in het gat op 384,216.
// Gekozen door de eigenaar uit schetsen (2026-11-20). De CSS staat per stijl in
// stream-overlay-<stijl>.css.

export type OverlayParts = {
  logo: string | null;
  clubName: string;
  shortName: string;
  status: string;
  title: string;
  sponsors: RotatorSponsor[];
  route: StreamRoute | null;
  /** De stand bij ZRL, al opgemaakt; dan wordt het parcours compact. */
  stand: ReactNode | null;
  /** De eigen kopman van het lid (0347), alleen bij strip. */
  kopman: { face: KopmanFace; colors: KopmanColors } | null;
};

function Logo({ parts, className }: { parts: OverlayParts; className: string }) {
  return (
    <span className={className}>
      {parts.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={parts.logo} alt={parts.clubName} />
      ) : (
        <span>{parts.shortName}</span>
      )}
    </span>
  );
}

function Profile({ route, width, height, line }: { route: StreamRoute | null; width: number; height: number; line?: boolean }) {
  const points = route?.profile;
  if (!points || points.length < 2) return null;
  return (
    <svg className="ovs-profile" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path className="ovs-profile-area" d={profileAreaPath(points, width, height)} />
      {line && <path className="ovs-profile-line" d={profileTopPath(points, width, height)} />}
    </svg>
  );
}

/** Bij de stand alleen één regel: "22,1 km · 261 hm · 3 rondes". */
function factsLine(f: ReturnType<typeof routeFigures>): string {
  return [f.km && `${f.km} km`, f.hm && `${f.hm} hm`, f.laps].filter(Boolean).join(" · ");
}

// ---------- Rugnummer ----------

const PIN = (
  <svg viewBox="0 0 58 18" aria-hidden>
    <circle cx="7" cy="9" r="5" fill="none" stroke="#b9c1c4" strokeWidth="2.2" />
    <path d="M11 6.5 H50 M11 11.5 H46" stroke="#d5dbdd" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="44" y="3" width="12" height="12" rx="3" fill="#9aa3a7" />
    <circle cx="50" cy="9" r="1.6" fill="#5d676b" />
  </svg>
);

/** Rugnummer: de stof van het tenue, de titel op een rugnummer met vier spelden. */
export function RugnummerOverlay({ parts }: { parts: OverlayParts }) {
  const f = routeFigures(parts.route);
  const compact = Boolean(parts.stand);
  return (
    <>
      <div className="ovr-hem" aria-hidden />
      <header className="ovr-bib">
        <div className="ovr-bib-top">
          <b aria-hidden />
          <span>{parts.status}</span>
        </div>
        <div className="ovr-bib-mid">
          <Logo parts={parts} className="ovr-logo" />
          {parts.title && <h1>{parts.title}</h1>}
        </div>
        <div className="ovr-bib-foot" aria-hidden />
        {["tl", "tr", "bl", "br"].map((corner) => (
          <span key={corner} className={`ovr-pin ovr-pin-${corner}`}>
            {PIN}
          </span>
        ))}
      </header>

      {parts.sponsors.length > 0 && (
        <aside className="ovr-plate">
          <i className="ovr-tie ovr-tie-a" aria-hidden />
          <i className="ovr-tie ovr-tie-b" aria-hidden />
          <span className="ovr-plate-caption">{parts.sponsors.length > 1 ? "Sponsors" : "Sponsor"}</span>
          <SponsorRotator sponsors={parts.sponsors} />
        </aside>
      )}

      <section className="ovr-side" data-compact={compact ? "" : undefined}>
        {f.routeName && <p className="ovr-route">{f.routeName}</p>}
        {compact && factsLine(f) && <p className="ovr-facts">{factsLine(f)}</p>}
        {!compact && (f.km || f.hm) && (
          <div className="ovr-posts">
            {f.km && <Post unit="KM" value={f.km} />}
            {f.hm && <Post unit="HM" value={f.hm} />}
          </div>
        )}
        {!compact && f.laps && <p className="ovr-laps">{f.laps}</p>}
        {!compact && <Profile route={parts.route} width={300} height={92} />}
        {parts.stand}
      </section>
    </>
  );
}

function Post({ unit, value }: { unit: string; value: string }) {
  return (
    <div className="ovr-post">
      <span className="ovr-post-cap">{unit}</span>
      <span className="ovr-post-body">{value}</span>
    </div>
  );
}

// ---------- Zeefdruk ----------

/** De renner van het weekoverzicht (weekoverzicht/prints.tsx), in currentColor. */
function PrintRider({ x }: { x: number }) {
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <g transform={`translate(${x} 128) scale(1.25)`}>
      {[0, 60].map((cx) => (
        <g key={cx}>
          <path
            fillRule="evenodd"
            fill="currentColor"
            d={`M${cx - 16} 0a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Zm2.6 0a13.4 13.4 0 1 0 26.8 0a13.4 13.4 0 1 0 -26.8 0Z`}
          />
          <circle cx={cx} cy={0} r={2.2} fill="currentColor" />
        </g>
      ))}
      <path {...line} strokeWidth={4.6} opacity={0.55} d="M36 -31 L21 1" />
      <path {...line} strokeWidth={6.5} opacity={0.55} d="M19 -33 L36 -31" />
      <path {...line} strokeWidth={2.4} d="M0 0 L24 3 M0 0 L20 -24 M24 3 L19 -27 M20 -24 L51 -25 M24 3 L53 -17 M51 -27 L53 -17 L60 0" />
      <path {...line} strokeWidth={2.4} d="M51 -27 L58 -28 C64 -28 65 -19 60 -17 L57 -18" />
      <path {...line} strokeWidth={3} d="M13 -29 L24 -29" />
      <path {...line} strokeWidth={7} d="M19 -33 L37 -22" />
      <path {...line} strokeWidth={5} d="M37 -22 L28 5" />
      <path {...line} strokeWidth={10} d="M18 -33 C 28 -40, 38 -43, 47 -41" />
      <path {...line} strokeWidth={4.4} d="M46 -41 L52 -31 L58 -28" />
      <circle cx={55} cy={-45} r={5.5} fill="currentColor" />
      <path fill="currentColor" d="M46 -47 C48 -55 60 -57 65 -50 L63 -47 C60 -45 53 -45 49 -45 Z" />
    </g>
  );
}

const STOET = [26, 128, 230];

function RegisterMark({ className }: { className: string }) {
  return (
    <svg className={`ovz-reg ${className}`} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
      <path d="M8 0V16M0 8H16" stroke="currentColor" />
    </svg>
  );
}

/**
 * Zeefdruk: het register van het weekoverzicht. Effen inkten op vezelpapier
 * die over elkaar drukken, één pas uit register (de stoet), twee paskruisjes.
 */
export function ZeefdrukOverlay({ parts }: { parts: OverlayParts }) {
  const f = routeFigures(parts.route);
  const compact = Boolean(parts.stand);
  return (
    <>
      <svg className="ovz-fiber" aria-hidden>
        <filter id="ovz-fiber">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves={3} seed={7} />
          <feColorMatrix values="0 0 0 0 .42  0 0 0 0 .37  0 0 0 0 .27  0 0 0 .42 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ovz-fiber)" />
      </svg>
      <div className="ovz-side-pass" aria-hidden />
      <svg className="ovz-stoet" width="420" height="160" viewBox="0 0 420 160" aria-hidden>
        <g className="ovz-stoet-base">
          {STOET.map((x) => (
            <PrintRider key={x} x={x} />
          ))}
        </g>
        <g className="ovz-stoet-off">
          {STOET.map((x) => (
            <PrintRider key={x} x={x} />
          ))}
        </g>
      </svg>

      <header className="ovz-head">
        <span className="ovz-slot">
          <Logo parts={parts} className="ovz-logo" />
        </span>
        <span className="ovz-titles">
          <span className="ovz-status">{parts.status}</span>
          {parts.title && <h1>{parts.title}</h1>}
        </span>
      </header>

      {parts.sponsors.length > 0 && (
        <aside className="ovz-sponsors">
          <span className="ovz-caption">Sponsors</span>
          <SponsorRotator sponsors={parts.sponsors} />
        </aside>
      )}

      <section className="ovz-side" data-compact={compact ? "" : undefined}>
        {f.routeName && <p className="ovz-route">{f.routeName}</p>}
        {compact && factsLine(f) && <p className="ovz-facts">{factsLine(f)}</p>}
        {!compact && f.km && (
          <p className="ovz-big ovz-km">
            {f.km}
            <small>KM</small>
          </p>
        )}
        {!compact && f.hm && (
          <p className="ovz-big ovz-hm">
            {f.hm}
            <small>HM</small>
          </p>
        )}
        {!compact && f.laps && <p className="ovz-laps">{f.laps}</p>}
        {!compact && (
          <div className="ovz-profile-box">
            <Profile route={parts.route} width={300} height={96} />
          </div>
        )}
        {parts.stand}
      </section>

      <RegisterMark className="ovz-reg-left" />
      <RegisterMark className="ovz-reg-right" />
    </>
  );
}

// ---------- Strip ----------

/**
 * Strip: een bladzijde uit een stripalbum in tenuekleuren. Plaatjes met een
 * dikke inktlijn, vlakke kleuren met rasterpunten, een handletter; Zwift is het
 * grote plaatje. Met een eigen kopman (0347) staat die in een plaatje vóór de
 * titel: de kolom is bij ZRL vol met de stand.
 */
export function StripOverlay({ parts }: { parts: OverlayParts }) {
  const f = routeFigures(parts.route);
  const compact = Boolean(parts.stand);
  return (
    <>
      <div className="ovs-window" aria-hidden />
      {parts.kopman && (
        // De eigen kopman (0347), in de stemming van de race.
        <div className="ovs-panel ovs-kopman" aria-hidden>
          {kopmanSvg({ ...parts.kopman, mood: kopmanMood(parts.status), uid: "overlay", frame: "bust" })}
        </div>
      )}
      <header className="ovs-panel ovs-title">
        <span className="ovs-caption">{parts.status}</span>
        <Logo parts={parts} className="ovs-badge" />
        {parts.title && <h1>{parts.title}</h1>}
      </header>

      {parts.sponsors.length > 0 && (
        <aside className="ovs-panel ovs-sponsors">
          <div className="ovs-card">
            <span className="ovs-card-caption">{parts.sponsors.length > 1 ? "Sponsors" : "Sponsor"}</span>
            <SponsorRotator sponsors={parts.sponsors} />
          </div>
        </aside>
      )}

      <section className="ovs-side" data-compact={compact ? "" : undefined}>
        {(f.routeName || f.km || f.hm) && (
          <div className="ovs-panel ovs-route">
            {f.routeName && <p className="ovs-route-name">{f.routeName}</p>}
            {compact && factsLine(f) && <p className="ovs-facts">{factsLine(f)}</p>}
            {!compact && f.km && (
              <p className="ovs-fig ovs-km">
                {f.km}
                <small>km</small>
              </p>
            )}
            {!compact && f.hm && (
              <p className="ovs-fig ovs-hm">
                {f.hm}
                <small>hm</small>
              </p>
            )}
            {!compact && f.laps && <p className="ovs-laps">{f.laps}</p>}
          </div>
        )}
        {!compact && parts.route?.profile && parts.route.profile.length > 1 && (
          <div className="ovs-panel ovs-profile-panel">
            <Profile route={parts.route} width={324} height={118} line />
          </div>
        )}
        {parts.stand}
      </section>
    </>
  );
}
