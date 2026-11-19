import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT, type ClubFont } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { thumbnailLines } from "@/lib/youtube-live/broadcast";
import { overlayColors, plainColors, tenueBands } from "@/lib/youtube-live/overlay-theme";

// De thumbnail van een stream op YouTube (2026-11-19): 1280×720, in de
// nachtkleuren en letter van de club, met de tenuebanen van het kader van de
// OBS-overlay. Het clublogo, soort en wanneer, de race (bij de ladder de twee
// ploegen onder elkaar) en de route. Geen sponsors: op dit formaat onleesbaar, en ze
// staan al in de overlay. Satori leest geen woff2, dus de letters staan als ttf
// in src/fonts/og (next.config: outputFileTracingIncludes).

export const THUMBNAIL_SIZE = { width: 1280, height: 720 } as const;

async function fontData(font: ClubFont, weight: 400 | 500): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "src", "fonts", "og", `${font}-${weight}.ttf`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export { thumbnailRoute, type ThumbnailEvent } from "./event-route";

/** De thumbnail als ImageResponse (PNG). `origin` maakt een logo-pad absoluut. */
export async function streamThumbnail(input: {
  eventTitle: string;
  eventType: string;
  startAt: string;
  routeName: string | null;
  laps: number | null;
  origin: string;
}): Promise<ImageResponse> {
  const { settings, texts } = await getClub();
  const colors = plainColors(overlayColors(settings.palette));
  const font = settings.font ?? DEFAULT_FONT;
  const [regular, medium] = await Promise.all([fontData(font, 400), fontData(font, 500)]);
  const logoPath = clubLogoUrl(settings);
  const logo = logoPath ? new URL(logoPath, input.origin).toString() : null;
  const lines = thumbnailLines({
    eventTitle: input.eventTitle,
    eventType: input.eventType,
    startAt: input.startAt,
    routeName: input.routeName,
    laps: input.laps,
    clubName: texts.name,
  });
  const { matchup } = lines;
  const longest = matchup ? Math.max(matchup.home.length, matchup.away.length) : lines.title.length;
  const titleSize = matchup
    ? longest > 22 ? 72 : longest > 14 ? 84 : 96
    : longest > 60 ? 68 : longest > 36 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px 64px",
          backgroundColor: colors.ground,
          backgroundImage: tenueBands(colors),
          color: colors.text,
          fontFamily: "Club",
        }}
      >
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 40, fontWeight: 400, color: colors.gold }}>{lines.status}</span>
          {matchup ? (
            <div style={{ display: "flex", flexDirection: "column", fontSize: titleSize, fontWeight: 500, lineHeight: 1.05 }}>
              <span>{matchup.home}</span>
              <span style={{ fontSize: Math.round(titleSize * 0.5), fontWeight: 400, color: colors.gold, margin: "6px 0 4px" }}>vs</span>
              <span>{matchup.away}</span>
            </div>
          ) : (
            <span style={{ fontSize: titleSize, fontWeight: 500, lineHeight: 1.08, textWrap: "balance" }}>{lines.title}</span>
          )}
          <span style={{ fontSize: 40, fontWeight: 400, color: colors.muted }}>{lines.detail}</span>
        </div>
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

/** De site, voor het logo-adres buiten een verzoek (server action). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
}
