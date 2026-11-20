import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT, type ClubFont } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { thumbnailLines } from "@/lib/youtube-live/broadcast";
import {
  overprint,
  printInks,
  routeFigures,
  styleHasModes,
  tenueInks,
  type OverlayStyle,
  type PrintInks,
  type TenueInks,
} from "@/lib/youtube-live/overlay-styles";
import { overlayColors, plainColors, tenueBands, type OverlayColors, type OverlayMode } from "@/lib/youtube-live/overlay-theme";
import { fitTitle, profileAreaPath, profileTopPath, type StreamRoute } from "@/lib/youtube-live/route-facts";

// De thumbnail van een stream op YouTube (2026-11-19): 1280×720, in de kleuren
// en letter van de club, in de stijl van de overlay (0346): tegels in donker of
// licht (0345), rugnummer, zeefdruk in donker of licht, of strip. Links het
// clublogo, soort en wanneer, en de race (bij de ladder de twee ploegen onder
// elkaar); rechts het parcours: naam, afstand, hoogtemeters en waar bekend het
// hoogteprofiel (2026-11-20). Linksonder blijft vrij: daar legt YouTube vóór
// de start zijn kaartje "Live over …". Geen sponsors: op dit formaat
// onleesbaar. Satori leest geen woff2, dus de letters staan als ttf in
// src/fonts/og (next.config: outputFileTracingIncludes).

export { streamRoute, type ThumbnailEvent } from "./event-route";

export const THUMBNAIL_SIZE = { width: 1280, height: 720 } as const;

const PAD_X = 72;
const ROUTE_WIDTH = 372;
const GAP = 56;
const PROFILE_HEIGHT = 120;

const METERS = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700 | 800 | 900; style: "normal" };

async function ttf(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "src", "fonts", "og", `${file}.ttf`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/** De letters per stijl: de clubletter, of die van zeefdruk en strip. */
async function styleFonts(look: OverlayStyle, font: ClubFont): Promise<Font[]> {
  const f = async (name: string, file: string, weight: Font["weight"]): Promise<Font> => ({
    name,
    data: await ttf(file),
    weight,
    style: "normal",
  });
  if (look === "zeefdruk") {
    return Promise.all([f("Stencil", "stencil-900", 900), f("Club", "karla-500", 500), f("Club", "karla-800", 800)]);
  }
  if (look === "strip") {
    return Promise.all([f("Club", "shantell-500", 500), f("Club", "shantell-700", 700)]);
  }
  return Promise.all([f("Club", `${font}-400`, 400), f("Club", `${font}-500`, 500)]);
}

type ThumbData = {
  colors: OverlayColors;
  tenue: TenueInks;
  print: PrintInks;
  mode: OverlayMode;
  font: ClubFont;
  logo: string | null;
  shortName: string;
  lines: ReturnType<typeof thumbnailLines>;
  route: StreamRoute;
  hasRoute: boolean;
  textWidth: number;
};

/** De thumbnail als ImageResponse (PNG). `origin` maakt een logo-pad absoluut. */
export async function streamThumbnail(input: {
  eventTitle: string;
  eventType: string;
  startAt: string;
  route: StreamRoute;
  theme: OverlayMode;
  look?: OverlayStyle;
  origin: string;
}): Promise<ImageResponse> {
  const look = input.look ?? "tegels";
  const mode = styleHasModes(look) ? input.theme : "dark";
  const { settings, texts } = await getClub();
  const font = settings.font ?? DEFAULT_FONT;
  const logoPath = clubLogoUrl(settings);
  const { route } = input;
  const hasRoute = Boolean(route.routeName || route.distanceKm);
  const data: ThumbData = {
    colors: plainColors(overlayColors(settings.palette, mode)),
    tenue: tenueInks(settings.palette),
    print: printInks(mode),
    mode,
    font,
    logo: logoPath ? new URL(logoPath, input.origin).toString() : null,
    shortName: texts.shortName,
    lines: thumbnailLines({ eventTitle: input.eventTitle, eventType: input.eventType, startAt: input.startAt }),
    route,
    hasRoute,
    textWidth: THUMBNAIL_SIZE.width - PAD_X * 2 - (hasRoute ? ROUTE_WIDTH + GAP : 0),
  };
  const body =
    look === "rugnummer"
      ? rugnummer(data)
      : look === "zeefdruk"
        ? zeefdruk(data)
        : look === "strip"
          ? strip(data)
          : tegels(data);
  return new ImageResponse(body, { ...THUMBNAIL_SIZE, fonts: await styleFonts(look, font) });
}

/** De titel, of bij de ladder de twee ploegen onder elkaar met "vs". */
function Title({
  data,
  width,
  font,
  range,
  vs,
  style,
}: {
  data: ThumbData;
  width: number;
  font: string;
  range?: { max: number; min: number };
  vs: string;
  style?: Record<string, string | number>;
}) {
  const { matchup, title } = data.lines;
  const longest = matchup ? (matchup.home.length > matchup.away.length ? matchup.home : matchup.away) : title;
  const fit = fitTitle(longest, width, font, range);
  const size = matchup && fit.lines === 2 ? Math.min(fit.size, (range?.min ?? 64)) : fit.size;
  if (matchup) {
    return (
      <div style={{ display: "flex", flexDirection: "column", fontSize: size, lineHeight: 1.05, ...style }}>
        <span>{matchup.home}</span>
        <span style={{ fontSize: Math.round(size * 0.5), color: vs, margin: "4px 0 2px" }}>vs</span>
        <span>{matchup.away}</span>
      </div>
    );
  }
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1.06,
        textWrap: "balance",
        whiteSpace: fit.lines === 1 ? "nowrap" : "normal",
        ...style,
      }}
    >
      {title}
    </span>
  );
}

function ProfileSvg({ route, width, height, fill, opacity = 1, line }: { route: StreamRoute; width: number; height: number; fill: string; opacity?: number; line?: string }) {
  if (!route.profile || route.profile.length < 2) return null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={profileAreaPath(route.profile, width, height)} fill={fill} fillOpacity={opacity} />
      {line && (
        <path d={profileTopPath(route.profile, width, height)} fill="none" stroke={line} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}

function LogoImage({ data, height }: { data: ThumbData; height: number }) {
  return data.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- Satori kent alleen <img>
    <img src={data.logo} height={height} style={{ height }} alt="" />
  ) : (
    <span style={{ fontSize: Math.round(height * 0.52), fontWeight: 500 }}>{data.shortName}</span>
  );
}

// ---------- Tegels ----------

function tegels(data: ThumbData): ReactElement {
  const { colors, route, hasRoute, textWidth, lines } = data;
  const f = routeFigures(route);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        gap: GAP,
        padding: `60px ${PAD_X}px 104px`,
        backgroundColor: colors.ground,
        backgroundImage: tenueBands(colors),
        color: colors.text,
        fontFamily: "Club",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: textWidth }}>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 24px 12px",
              background: colors.paper,
              color: colors.ink,
              borderRadius: 18,
              border: `4px solid ${colors.gold}`,
            }}
          >
            <LogoImage data={data} height={84} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 38, fontWeight: 400, color: colors.goldText }}>{lines.status}</span>
          <Title data={data} width={textWidth} font={data.font} vs={colors.goldText} style={{ fontWeight: 500 }} />
        </div>
      </div>

      {hasRoute && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: ROUTE_WIDTH, gap: 18 }}>
          {f.routeName && <span style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12 }}>{f.routeName}</span>}
          <div style={{ display: "flex", gap: 36, alignItems: "baseline" }}>
            {f.km && <Figure value={f.km} unit="km" muted={colors.muted} />}
            {route.elevationM && <Figure value={METERS.format(route.elevationM)} unit="hm" muted={colors.muted} />}
          </div>
          {f.laps && <span style={{ fontSize: 30, color: colors.muted, marginTop: -8 }}>{f.laps}</span>}
          <ProfileSvg route={route} width={ROUTE_WIDTH} height={PROFILE_HEIGHT} fill={colors.gold} opacity={0.55} />
        </div>
      )}
    </div>
  );
}

/** Een groot licht cijfer met de eenheid erachter, zoals op de tegels. */
function Figure({ value, unit, muted }: { value: string; unit: string; muted: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 76, fontWeight: 400, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 30, color: muted }}>{unit}</span>
    </div>
  );
}

// ---------- Rugnummer ----------

const PIN = (rotate: number, flip: boolean, pos: Record<string, number>) => (
  <svg
    width={70}
    height={22}
    viewBox="0 0 58 18"
    style={{ position: "absolute", transform: `rotate(${rotate}deg)${flip ? " scaleX(-1)" : ""}`, ...pos }}
  >
    <circle cx="7" cy="9" r="5" fill="none" stroke="#b9c1c4" strokeWidth="2.2" />
    <path d="M11 6.5 H50 M11 11.5 H46" stroke="#d5dbdd" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="44" y="3" width="12" height="12" rx="3" fill="#9aa3a7" />
    <circle cx="50" cy="9" r="1.6" fill="#5d676b" />
  </svg>
);

function jersey(t: TenueInks): string {
  const band = (angle: number, from: number, to: number, color: string) =>
    `linear-gradient(${angle}deg, transparent 0%, transparent ${from}%, ${color} ${from}%, ${color} ${to}%, transparent ${to}%)`;
  return [
    band(132, 20, 33, t.teal),
    band(149, 35, 47, `${t.sage}6b`),
    band(28, 46, 60, "rgba(255, 255, 255, 0.05)"),
    band(156, 61.5, 65, t.gold),
  ].join(", ");
}

function rugnummer(data: ThumbData): ReactElement {
  const { tenue: t, route, hasRoute, textWidth, lines } = data;
  const f = routeFigures(route);
  const inner = textWidth - 88;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        gap: GAP,
        padding: `56px ${PAD_X}px 104px`,
        backgroundColor: t.petrol,
        backgroundImage: jersey(t),
        color: t.paper,
        fontFamily: "Club",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: textWidth }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            background: t.paper,
            color: t.ink,
            transform: "rotate(-1deg)",
            boxShadow: "0 18px 26px -12px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              height: 58,
              padding: "0 44px",
              background: t.petrol,
              color: t.paper,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 7, background: t.gold, flexShrink: 0 }} />
            <span>{lines.status}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "30px 44px 34px" }}>
            <div style={{ display: "flex" }}>
              <LogoImage data={data} height={72} />
            </div>
            <Title data={data} width={inner} font={data.font} range={{ max: 84, min: 56 }} vs={t.teal} style={{ fontWeight: 500 }} />
          </div>
          <div style={{ display: "flex", height: 16 }}>
            <div style={{ flex: 1, background: t.gold }} />
            <div style={{ flex: 1, background: t.teal }} />
          </div>
          {PIN(-24, false, { left: 4, top: 4 })}
          {PIN(22, true, { right: 4, top: 4 })}
          {PIN(16, false, { left: 6, bottom: 12 })}
          {PIN(-18, true, { right: 6, bottom: 12 })}
        </div>
      </div>

      {hasRoute && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: ROUTE_WIDTH, gap: 22 }}>
          {f.routeName && <span style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12 }}>{f.routeName}</span>}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
            {f.km && <ThumbPost t={t} unit="KM" value={f.km} />}
            {f.hm && <ThumbPost t={t} unit="HM" value={f.hm} />}
          </div>
          {f.laps && <span style={{ fontSize: 30, opacity: 0.75 }}>{f.laps}</span>}
          <ProfileSvg route={route} width={ROUTE_WIDTH} height={100} fill={t.gold} opacity={0.9} />
        </div>
      )}
    </div>
  );
}

function ThumbPost({ t, unit, value }: { t: TenueInks; unit: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 168, boxShadow: "0 14px 18px -12px rgba(0, 0, 0, 0.65)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          height: 54,
          paddingBottom: 4,
          background: t.gold,
          color: t.ink,
          borderRadius: "84px 84px 0 0",
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: 3,
        }}
      >
        {unit}
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 20px", background: t.paper, color: t.ink, fontSize: 72, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ---------- Zeefdruk ----------

function riderPaths(x: number, color: string, opacity = 1): ReactElement {
  const line = { fill: "none", stroke: color, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <g transform={`translate(${x} 128) scale(1.25)`} opacity={opacity}>
      {[0, 60].map((cx) => (
        <path
          key={cx}
          fillRule="evenodd"
          fill={color}
          d={`M${cx - 16} 0a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Zm2.6 0a13.4 13.4 0 1 0 26.8 0a13.4 13.4 0 1 0 -26.8 0Z`}
        />
      ))}
      <path {...line} strokeWidth={2.4} d="M0 0 L24 3 M0 0 L20 -24 M24 3 L19 -27 M20 -24 L51 -25 M24 3 L53 -17 M51 -27 L53 -17 L60 0" />
      <path {...line} strokeWidth={2.4} d="M51 -27 L58 -28 C64 -28 65 -19 60 -17 L57 -18" />
      <path {...line} strokeWidth={7} d="M19 -33 L37 -22" />
      <path {...line} strokeWidth={5} d="M37 -22 L28 5" />
      <path {...line} strokeWidth={10} d="M18 -33 C 28 -40, 38 -43, 47 -41" />
      <path {...line} strokeWidth={4.4} d="M46 -41 L52 -31 L58 -28" />
      <circle cx={55} cy={-45} r={5.5} fill={color} />
      <path fill={color} d="M46 -47 C48 -55 60 -57 65 -50 L63 -47 C60 -45 53 -45 49 -45 Z" />
    </g>
  );
}

function zeefdruk(data: ThumbData): ReactElement {
  const { print: p, mode, route, hasRoute, textWidth, lines } = data;
  const f = routeFigures(route);
  // Satori drukt niet over elkaar: de mengkleuren zijn uitgerekend.
  const slot = mixToward(p.paper, p.cyan, 0.6);
  const seam = overprint(slot, p.gold, mode);
  const day = printInks("light");
  const onGold = day.ink;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        gap: GAP,
        padding: `56px ${PAD_X}px 104px`,
        backgroundColor: p.paper,
        color: p.ink,
        fontFamily: "Club",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: textWidth }}>
        <div style={{ display: "flex", alignItems: "stretch", alignSelf: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 230, padding: "22px 0", background: slot }}>
            {/* Het logo op licht papier, ook op donker: het logo is gemaakt voor licht. */}
            <div style={{ display: "flex", padding: "8px 14px 6px", background: day.paper, border: `2px solid ${day.ink}`, color: day.ink }}>
              <LogoImage data={data} height={62} />
            </div>
          </div>
          <div style={{ width: 16, background: seam }} />
          <div style={{ display: "flex", alignItems: "center", padding: "0 34px", width: textWidth - 246, background: p.gold, color: onGold, fontSize: 22, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1.25, textTransform: "uppercase", textWrap: "balance" }}>
            {lines.status}
          </div>
        </div>
        <Title
          data={data}
          width={textWidth}
          font="stencil"
          range={{ max: 112, min: 72 }}
          vs={p.soft}
          style={{ fontFamily: "Stencil", fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}
        />
      </div>

      {hasRoute && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: ROUTE_WIDTH, gap: 6 }}>
          <svg width={330} height={150} viewBox="0 0 330 150" style={{ marginBottom: 10 }}>
            {[20, 120, 220].map((x) => riderPaths(x, p.gold))}
            <g transform="translate(3 -2)">{[20, 120, 220].map((x) => riderPaths(x, p.cyan, 0.85))}</g>
          </svg>
          {f.routeName && <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>{f.routeName}</span>}
          {f.km && <StencilFigure value={f.km} unit="KM" size={120} />}
          {f.hm && <StencilFigure value={f.hm} unit="HM" size={72} />}
          {f.laps && <span style={{ fontSize: 26, fontWeight: 500, color: p.soft }}>{f.laps}</span>}
          <div style={{ display: "flex", borderBottom: `2px solid ${p.ink}`, marginTop: 8 }}>
            <ProfileSvg route={route} width={ROUTE_WIDTH} height={92} fill={p.gold} />
          </div>
        </div>
      )}
      <RegMark color={p.ink} left={14} top={352} />
      <RegMark color={p.ink} left={1250} top={352} />
    </div>
  );
}

function StencilFigure({ value, unit, size }: { value: string; unit: string; size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, fontFamily: "Stencil", fontWeight: 900 }}>
      <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: Math.round(size * 0.42), lineHeight: 1, paddingBottom: Math.round(size * 0.1) }}>{unit}</span>
    </div>
  );
}

/** Een inkt op een deel van zijn dekking over het papier, als effen kleur. */
function mixToward(paper: string, ink: string, amount: number): string {
  const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [a, b] = [ch(paper), ch(ink)];
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function RegMark({ color, left, top }: { color: string; left: number; top: number }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" style={{ position: "absolute", left, top, opacity: 0.5 }}>
      <circle cx="8" cy="8" r="4.5" fill="none" stroke={color} />
      <path d="M8 0V16M0 8H16" stroke={color} />
    </svg>
  );
}

// ---------- Strip ----------

const WOBBLE = "14px 10px 15px 11px";

function strip(data: ThumbData): ReactElement {
  const { tenue: t, route, hasRoute, textWidth, lines } = data;
  const f = routeFigures(route);
  const dots = (color: string) => `radial-gradient(circle, ${color} 1.8px, transparent 2.4px)`;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        gap: 28,
        padding: "34px 34px 104px",
        backgroundColor: t.page,
        color: t.ink,
        fontFamily: "Club",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 26,
          flex: 1,
          padding: "70px 40px 40px",
          backgroundColor: t.petrol,
          backgroundImage: dots("rgba(255, 255, 255, 0.22)"),
          backgroundSize: "9px 9px",
          border: `6px solid ${t.ink}`,
          borderRadius: WOBBLE,
          color: t.paper,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -6,
            top: -6,
            display: "flex",
            padding: "8px 22px 7px 26px",
            background: t.gold,
            color: t.ink,
            border: `5px solid ${t.ink}`,
            borderRadius: "11px 5px 14px 4px",
            fontSize: 24,
            fontWeight: 700,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {lines.status}
        </div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              padding: "10px 18px 8px",
              background: t.paper,
              color: t.ink,
              border: `5px solid ${t.ink}`,
              borderRadius: WOBBLE,
              transform: "rotate(-2deg)",
            }}
          >
            <LogoImage data={data} height={64} />
          </div>
        </div>
        <Title
          data={data}
          width={textWidth - 120}
          font="shantell"
          range={{ max: 80, min: 52 }}
          vs={t.gold}
          style={{ fontWeight: 700, WebkitTextStroke: `9px ${t.ink}`, paintOrder: "stroke fill" }}
        />
      </div>

      {hasRoute && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: ROUTE_WIDTH + 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "flex-end",
              gap: 4,
              padding: "26px 28px",
              backgroundColor: t.teal,
              backgroundImage: dots("rgba(255, 255, 255, 0.22)"),
              backgroundSize: "9px 9px",
              border: `6px solid ${t.ink}`,
              borderRadius: WOBBLE,
              color: t.paper,
            }}
          >
            {f.routeName && <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.12, marginBottom: 10 }}>{f.routeName}</span>}
            {f.km && <HandFigure value={f.km} unit="km" size={92} ink={t.ink} />}
            {f.hm && <HandFigure value={f.hm} unit="hm" size={60} ink={t.ink} />}
            {f.laps && <span style={{ fontSize: 28, fontWeight: 500 }}>{f.laps}</span>}
          </div>
          {route.profile && route.profile.length > 1 && (
            <div style={{ display: "flex", height: 150, overflow: "hidden", background: t.page, border: `6px solid ${t.ink}`, borderRadius: WOBBLE, alignItems: "flex-end" }}>
              <ProfileSvg route={route} width={ROUTE_WIDTH + 8} height={124} fill={t.gold} line={t.ink} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HandFigure({ value, unit, size, ink }: { value: string; unit: string; size: number; ink: string }) {
  const stroke = { WebkitTextStroke: `${Math.round(size / 11)}px ${ink}`, paintOrder: "stroke fill" } as const;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, fontWeight: 700 }}>
      <span style={{ fontSize: size, lineHeight: 1, ...stroke }}>{value}</span>
      <span style={{ fontSize: Math.round(size * 0.4), lineHeight: 1, paddingBottom: Math.round(size * 0.08), ...stroke }}>{unit}</span>
    </div>
  );
}

/** De site, voor het logo-adres buiten een verzoek (server action). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
}
