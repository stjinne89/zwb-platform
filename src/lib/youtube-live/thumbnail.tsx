import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT, type ClubFont } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { thumbnailLines } from "@/lib/youtube-live/broadcast";
import { overlayColors, plainColors, tenueBands, type OverlayMode } from "@/lib/youtube-live/overlay-theme";
import { fitTitle, profileAreaPath, type StreamRoute } from "@/lib/youtube-live/route-facts";

// De thumbnail van een stream op YouTube (2026-11-19): 1280×720, in de kleuren
// en letter van de club, met de tenuebanen van het kader van de OBS-overlay,
// in donker of licht zoals de stream (0345). Links het clublogo, soort en
// wanneer, en de race (bij de ladder de twee ploegen onder elkaar); rechts het
// parcours: naam, afstand, hoogtemeters en waar bekend het hoogteprofiel
// (2026-11-20). Linksonder blijft vrij: daar legt YouTube vóór de start zijn
// kaartje "Live over …". Geen sponsors: op dit formaat onleesbaar. Satori leest
// geen woff2, dus de letters staan als ttf in src/fonts/og
// (next.config: outputFileTracingIncludes).

export { streamRoute, type ThumbnailEvent } from "./event-route";

export const THUMBNAIL_SIZE = { width: 1280, height: 720 } as const;

const PAD_X = 72;
const ROUTE_WIDTH = 372;
const GAP = 56;
const PROFILE_HEIGHT = 120;

const KM = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const METERS = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

async function fontData(font: ClubFont, weight: 400 | 500): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "src", "fonts", "og", `${font}-${weight}.ttf`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/** De thumbnail als ImageResponse (PNG). `origin` maakt een logo-pad absoluut. */
export async function streamThumbnail(input: {
  eventTitle: string;
  eventType: string;
  startAt: string;
  route: StreamRoute;
  theme: OverlayMode;
  origin: string;
}): Promise<ImageResponse> {
  const { settings, texts } = await getClub();
  const colors = plainColors(overlayColors(settings.palette, input.theme));
  const font = settings.font ?? DEFAULT_FONT;
  const [regular, medium] = await Promise.all([fontData(font, 400), fontData(font, 500)]);
  const logoPath = clubLogoUrl(settings);
  const logo = logoPath ? new URL(logoPath, input.origin).toString() : null;
  const { route } = input;
  const lines = thumbnailLines({
    eventTitle: input.eventTitle,
    eventType: input.eventType,
    startAt: input.startAt,
  });

  const hasRoute = Boolean(route.routeName || route.distanceKm);
  const textWidth = THUMBNAIL_SIZE.width - PAD_X * 2 - (hasRoute ? ROUTE_WIDTH + GAP : 0);
  const { matchup } = lines;
  const longest = matchup
    ? (matchup.home.length > matchup.away.length ? matchup.home : matchup.away)
    : lines.title;
  const fit = fitTitle(longest, textWidth, font);
  // Bij de ladder staat elke ploeg op zijn eigen regel.
  const titleSize = matchup && fit.lines === 2 ? Math.min(fit.size, 64) : fit.size;
  const profile = route.profile && route.profile.length > 1 ? profileAreaPath(route.profile, ROUTE_WIDTH, PROFILE_HEIGHT) : null;
  const lapsText = route.laps && route.laps > 1 ? `${route.laps} rondes` : null;

  return new ImageResponse(
    (
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
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- Satori kent alleen <img>
                <img src={logo} height={84} style={{ height: 84 }} alt="" />
              ) : (
                <span style={{ fontSize: 44, fontWeight: 500 }}>{texts.shortName}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 38, fontWeight: 400, color: colors.goldText }}>{lines.status}</span>
            {matchup ? (
              <div style={{ display: "flex", flexDirection: "column", fontSize: titleSize, fontWeight: 500, lineHeight: 1.05 }}>
                <span>{matchup.home}</span>
                <span style={{ fontSize: Math.round(titleSize * 0.5), fontWeight: 400, color: colors.goldText, margin: "4px 0 2px" }}>vs</span>
                <span>{matchup.away}</span>
              </div>
            ) : (
              <span
                style={{
                  fontSize: titleSize,
                  fontWeight: 500,
                  lineHeight: 1.06,
                  textWrap: "balance",
                  whiteSpace: fit.lines === 1 ? "nowrap" : "normal",
                }}
              >
                {lines.title}
              </span>
            )}
          </div>
        </div>

        {hasRoute && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: ROUTE_WIDTH, gap: 18 }}>
            {route.routeName && (
              <span style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.12 }}>{route.routeName}</span>
            )}
            <div style={{ display: "flex", gap: 36, alignItems: "baseline" }}>
              {route.distanceKm && <Figure value={KM.format(route.distanceKm)} unit="km" muted={colors.muted} />}
              {route.elevationM && <Figure value={METERS.format(route.elevationM)} unit="hm" muted={colors.muted} />}
            </div>
            {lapsText && <span style={{ fontSize: 30, color: colors.muted, marginTop: -8 }}>{lapsText}</span>}
            {profile && (
              <svg width={ROUTE_WIDTH} height={PROFILE_HEIGHT} viewBox={`0 0 ${ROUTE_WIDTH} ${PROFILE_HEIGHT}`}>
                <path d={profile} fill={colors.gold} fillOpacity={0.55} />
              </svg>
            )}
          </div>
        )}
      </div>
    ),
    {
      ...THUMBNAIL_SIZE,
      fonts: [
        { name: "Club", data: regular, weight: 400, style: "normal" },
        { name: "Club", data: medium, weight: 500, style: "normal" },
      ],
    },
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

/** De site, voor het logo-adres buiten een verzoek (server action). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
}
