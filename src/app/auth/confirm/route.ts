import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AUTH_LINK_STORAGE_MISSING = "auth-link-storage-missing";
const AUTH_LINK_INVALID = "auth-link-invalid";
const AUTH_LINK_MISSING = "auth-link-missing";

function redirectToLoginWithError(request: NextRequest, error: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
  );
}

function isPkceVerifierMissing(error: { code?: string; message?: string; name?: string }) {
  return (
    error.code === "pkce_code_verifier_not_found" ||
    error.name === "AuthPKCECodeVerifierMissingError" ||
    error.message?.includes("PKCE code verifier not found")
  );
}

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
      console.error("[auth/confirm] exchangeCodeForSession failed:", {
        code: error.code,
        name: error.name,
        status: error.status,
      });
      return redirectToLoginWithError(
        request,
        isPkceVerifierMissing(error) ? AUTH_LINK_STORAGE_MISSING : AUTH_LINK_INVALID,
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      console.error("[auth/confirm] verifyOtp failed:", {
        code: error.code,
        name: error.name,
        status: error.status,
      });
      return redirectToLoginWithError(request, AUTH_LINK_INVALID);
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Implicit flow puts tokens in URL fragment — we cannot read those server-side.
  // If we got here, the link contained nothing we recognised.
  console.warn("[auth/confirm] no usable params, falling back to /login");
  return redirectToLoginWithError(request, AUTH_LINK_MISSING);
}
