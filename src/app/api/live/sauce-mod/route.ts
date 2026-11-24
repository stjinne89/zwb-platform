import { NextResponse } from "next/server";
import { SAUCE_MOD_HELP, SAUCE_MOD_VERSION } from "@/lib/sauce-mod";

// De nieuwste versie van de Sauce-mod ZWB ZRL Live. De mod draait op de lokale
// Sauce-webserver, daarom CORS voor iedereen; er staat niets persoonlijks in.
export function GET() {
  return NextResponse.json(
    { version: SAUCE_MOD_VERSION, help: SAUCE_MOD_HELP },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } },
  );
}
