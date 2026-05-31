import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const supabase = await createClient();

  // Bewust GEEN log van de queryparams: die bevatten de login-`code` /
  // `token_hash` (geheime eenmalige tokens) en mogen niet in serverlogs belanden.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/confirm] exchangeCodeForSession failed:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("code: " + error.message)}`, request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      console.error("[auth/confirm] verifyOtp failed:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("otp: " + error.message)}`, request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Implicit flow puts tokens in URL fragment — we cannot read those server-side.
  // If we got here, the link contained nothing we recognised.
  console.warn("[auth/confirm] no usable params, falling back to /login");
  return NextResponse.redirect(
    new URL("/login?error=no-token-found-in-link", request.url),
  );
}
