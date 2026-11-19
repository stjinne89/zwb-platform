import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routes as zwiftRoutes } from "zwift-data";
import { getClub } from "@/lib/club";
import { DEFAULT_FONT, type ClubFont } from "@/lib/club-theme";
import { clubLogoUrl } from "@/lib/club-icons";
import { thumbnailLines } from "@/lib/youtube-live/broadcast";
import { overlayColors, plainColors } from "@/lib/youtube-live/overlay-theme";

// De thumbnail van een stream op YouTube (2026-11-19): 1280×720, in de
// nachtkleuren en letter van de club, zoals de OBS-overlay. Het clublogo, de
// race, wanneer, en de route. Geen sponsors: op dit formaat onleesbaar, en ze
// staan al in de overlay. Satori leest geen woff2, dus de letters staan als ttf
// in src/fonts/og (next.config: outputFileTracingIncludes).

export const THUMBNAIL_SIZE = { width: 1280, height: 720 } as const;

async function fontData(font: ClubFont, weight: 400 | 500): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), "src", "fonts", "og", `${font}-${weight}.ttf`));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export type ThumbnailEvent = {
  title: string;
  start_at: string;
  zwift_route_id: number | null;
  laps: number | null;
  parent_event_id: string | null;
};

/** De route van de race, of die van zijn raceweek (zoals bij klaarzetten). */
export async function thumbnailRoute(
  admin: SupabaseClient,
  event: ThumbnailEvent,
): Promise<{ routeName: string | null; laps: number | null }> {
  let routeId = event.zwift_route_id;
  let laps = event.laps;
  if (!routeId && event.parent_event_id) {
    const { data } = await admin
      .from("events")
      .select("zwift_route_id, laps")
      .eq("id", event.parent_event_id)
      .maybeSingle();
    const parent = data as { zwift_route_id: number | null; laps: number | null } | null;
    routeId = parent?.zwift_route_id ?? null;
    laps = laps ?? parent?.laps ?? null;
  }
  const routeName = routeId ? zwiftRoutes.find((r) => r.id === Number(routeId))?.name ?? null : null;
  return { routeName, laps };
}

/** De thumbnail als ImageResponse (PNG). `origin` maakt een logo-pad absoluut. */
export async function streamThumbnail(input: {
  eventTitle: string;
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
    startAt: input.startAt,
    routeName: input.routeName,
    laps: input.laps,
    clubName: texts.name,
  });
  const titleSize = lines.title.length > 60 ? 68 : lines.title.length > 36 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: colors.head,
          backgroundImage: "linear-gradient(118deg, transparent 0%, transparent 64%, rgba(255,255,255,0.1) 64%, rgba(255,255,255,0.1) 81%, transparent 81%)",
          color: colors.headText,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 36, fontWeight: 400, color: colors.gold }}>{lines.status}</span>
          <span style={{ fontSize: titleSize, fontWeight: 500, lineHeight: 1.08, textWrap: "balance" }}>{lines.title}</span>
          <span style={{ fontSize: 36, fontWeight: 400, opacity: 0.8 }}>{lines.detail}</span>
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
