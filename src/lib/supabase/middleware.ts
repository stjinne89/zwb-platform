import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";

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
  "/api/frr/sync",
  "/api/src/sync",
  "/api/intervals/rides/sync",
  "/api/instagram/sync",
  "/api/briljant/weekly",
  // Geen cron: de Discord-bot haalt hier een plan op met het deeltoken in het pad.
  "/api/ttt/plan",
  // Geen cron: agenda-apps halen het abonnement op met het token in het pad.
  "/api/agenda",
  // Telegram roept de bot-webhook aan; de route controleert het geheim zelf.
  "/api/telegram/webhook",
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

  // Lokaal gecontroleerd in plaats van bij de Auth-server (session-user.ts); een
  // verlopen sessie wordt hier nog steeds ververst en in de cookies teruggezet.
  const user = await getSessionUser(supabase);

  const pathname = request.nextUrl.pathname;
  // Het designvoorbeeld met voorbeelddata (app/ontwerp-voorbeeld) is er alleen bij
  // lokaal ontwikkelen; in productie bestaat de pagina niet en geldt deze regel niet.
  const isDevPreview =
    process.env.NODE_ENV !== "production" && pathname.startsWith("/ontwerp-voorbeeld");
  const isPublic = isDevPreview || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
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
