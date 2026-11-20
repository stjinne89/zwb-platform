import { ImageResponse } from "next/og";
import { getClub } from "@/lib/club";
import { createAdminClient } from "@/lib/supabase/admin";
import { kopmanSvg } from "@/components/livestream/kopman-figure";
import { defaultKopman, kopmanColors, kopmanFace } from "@/lib/youtube-live/kopman";
import { loadKopman } from "@/lib/youtube-live/kopman-store";
import { tenueInks } from "@/lib/youtube-live/overlay-styles";

// De kopman van een lid als avatar (0349, 2026-11-20): een PNG van 256 px, het
// borstbeeld in rust. De eigen kopman, of zonder eigen kopman de
// standaardkopman (een vrouw bij geslacht vrouw, anders een man). Openbaar,
// net als de overlay: alleen de tekening, geen naam.
//
// Met ?v= (de kopman als gekozen avatar, zie lib/avatar.ts) verandert het
// plaatje nooit en mag het een jaar in de cache. Zonder ?v= (een lid zonder
// foto) een uur: een nieuw gekozen geslacht of kopman is dan snel te zien.

const SIZE = 256;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  if (!UUID.test(profileId)) return new Response("Niet gevonden", { status: 404 });
  const admin = createAdminClient();
  const [own, { data: profile }, { settings }] = await Promise.all([
    loadKopman(admin, profileId),
    admin.from("profiles").select("sex").eq("id", profileId).maybeSingle(),
    getClub(),
  ]);
  if (!profile) return new Response("Niet gevonden", { status: 404 });
  const look = own ?? defaultKopman((profile as { sex?: string | null }).sex);
  const versioned = new URL(request.url).searchParams.has("v");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: SIZE, height: SIZE }}>
        {kopmanSvg({
          face: kopmanFace(look),
          colors: kopmanColors(tenueInks(settings.palette), look),
          mood: "rust",
          uid: "avatar",
          frame: "bust",
          size: SIZE,
        })}
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      headers: {
        "Cache-Control": versioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
