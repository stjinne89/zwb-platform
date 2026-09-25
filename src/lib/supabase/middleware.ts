import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PASSWORD_RECOVERY_COOKIE = "zwb-password-recovery";

/**
 * Paden die zonder sessie bereikbaar zijn.
 *
 * Let op bij een nieuwe cron-route: die wordt door een externe dienst aangeroepen
 * zonder cookie, dus zonder een regel hieronder krijgt hij een 307 naar /login en
 * draait de job nooit -- en een cron die een redirect krijgt klaagt niet. De
 * beveiliging van zo'n route zit in checkCronSecret(), niet hier. Elke regel met
 * /api hieronder is zo'n endpoint; zie tests/unit/middleware-public-paths.test.ts,
 * dat controleert dat elke bearer-beveiligde route in deze lijst staat.
 */
const PUBLIC_PATHS = [
  "/login",
  "/wachtwoord-resetten",
  "/welkom",
  "/auth",
  "/privacy",
  "/voorwaarden",
  "/verhaal",
  "/profielen",
  "/live",
  "/omnium",
  "/api/live",
  "/api/team-results/sync",
  "/api/strava/sync",
  "/api/strava/webhook",
  "/api/strava/lifecycle",
  "/api/achievements/finalize",
  "/api/events/reminders",
  "/api/events/scan",
  "/api/training/adaptations/daily",
  "/api/health/integrations",
  "/api/zwblokken/backfill",
  "/api/zwift/events/sync",
  "/api/zrl/freeze",
];

// Paden die ook toegankelijk zijn voor ingelogde-maar-nog-niet-goedgekeurde users.
const PENDING_OK_PATHS = ["/wachten"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPendingOk = PENDING_OK_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    request.cookies.has(PASSWORD_RECOVERY_COOKIE) &&
    pathname !== "/wachtwoord-resetten" &&
    !pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/wachtwoord-resetten";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Approval-gate: ingelogde gebruikers die nog niet goedgekeurd zijn
  // mogen alleen op /wachten (en publieke paden).
  if (user && !isPublic && !isPendingOk) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = "/wachten";
      return NextResponse.redirect(url);
    }
  }

  // Goedgekeurde users die /wachten bezoeken → dashboard.
  if (user && isPendingOk) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_approved) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
