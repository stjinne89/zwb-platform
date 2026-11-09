import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AUTH_LINK_STORAGE_MISSING = "auth-link-storage-missing";
const AUTH_LINK_INVALID = "auth-link-invalid";
const AUTH_LINK_MISSING = "auth-link-missing";
const PASSWORD_RECOVERY_COOKIE = "zwb-password-recovery";

const OTP_TYPES: readonly EmailOtpType[] = [
  "email",
  "recovery",
  "signup",
  "invite",
  "magiclink",
  "email_change",
];

function redirectToLoginWithError(request: NextRequest, error: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
    303,
  );
}

function isPkceVerifierMissing(error: { code?: string; message?: string; name?: string }) {
  return (
    error.code === "pkce_code_verifier_not_found" ||
    error.name === "AuthPKCECodeVerifierMissingError" ||
    error.message?.includes("PKCE code verifier not found")
  );
}

/** Alleen een pad binnen de eigen site; `next` komt uit een link en is dus invoer. */
function safeNext(raw: string | null | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/dashboard";
  }
  return raw;
}

function otpType(raw: string | null | undefined): EmailOtpType {
  return OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : "email";
}

function redirectAfterAuth(request: NextRequest, next: string, isPasswordRecovery: boolean) {
  const response = NextResponse.redirect(new URL(next, request.url), 303);

  if (isPasswordRecovery) {
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
      httpOnly: true,
      maxAge: 15 * 60,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

/**
 * Een e-maillink komt hier binnen als GET.
 *
 * Een `token_hash` wordt bij een GET bewust níet verzilverd. Mailscanners
 * (Outlook/Hotmail Safe Links, virusscanners) openen elke link in een mail vóór
 * de ontvanger dat doet. Werd het token hier meteen gebruikt, dan logde de
 * scanner in en kreeg het lid zelf "link verlopen" — zo kwam een lid met een
 * hotmail-adres op 2026-11-09 niet meer binnen. De GET stuurt daarom door naar
 * /auth/doorgaan, waar het lid op een knop drukt; die knop POST hieronder.
 *
 * De `code`-flow (PKCE) kan niet zo: dat token heeft Supabase zelf al
 * verzilverd voordat de browser hier komt.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const type = otpType(searchParams.get("type"));
  const isPasswordRecovery = type === "recovery" || next === "/wachtwoord-resetten";

  // Bewust GEEN log van de queryparams: die bevatten de login-`code` /
  // `token_hash` (geheime eenmalige tokens) en mogen niet in serverlogs belanden.
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
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
    return redirectAfterAuth(request, next, isPasswordRecovery);
  }

  const token_hash = searchParams.get("token_hash");
  if (token_hash) {
    const url = new URL("/auth/doorgaan", request.url);
    url.searchParams.set("token_hash", token_hash);
    url.searchParams.set("type", type);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  // Implicit flow puts tokens in URL fragment — we cannot read those server-side.
  // If we got here, the link contained nothing we recognised.
  console.warn("[auth/confirm] no usable params, falling back to /login");
  return redirectToLoginWithError(request, AUTH_LINK_MISSING);
}

/** De knop op /auth/doorgaan: pas hier wordt het eenmalige token gebruikt. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token_hash = String(form?.get("token_hash") ?? "");
  if (!token_hash) return redirectToLoginWithError(request, AUTH_LINK_MISSING);

  const next = safeNext(String(form?.get("next") ?? ""));
  const type = otpType(String(form?.get("type") ?? ""));
  const isPasswordRecovery = type === "recovery" || next === "/wachtwoord-resetten";

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", {
      code: error.code,
      name: error.name,
      status: error.status,
    });
    return redirectToLoginWithError(request, AUTH_LINK_INVALID);
  }
  return redirectAfterAuth(request, next, isPasswordRecovery);
}
