import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/wachtwoord-resetten",
  "/welkom",
  "/auth",
  "/privacy",
  "/verhaal",
  "/profielen",
  "/live",
  "/api/live",
  "/api/team-results/sync",
  "/api/strava/sync",
  "/api/achievements/finalize",
  "/api/events/reminders",
  "/api/training/adaptations/daily",
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
