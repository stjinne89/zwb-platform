import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // mp4: de hulpvideo's in public/hulp-video. Een videospeler haalt een
    // bestand in stukken op; zonder deze uitzondering vraagt elk stuk de sessie
    // en het profiel op. De video's tonen alleen demodata.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
