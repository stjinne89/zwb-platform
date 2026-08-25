"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimitHit, clientIpFromHeaders } from "@/lib/rate-limit";

const TOO_MANY = "Te veel pogingen. Wacht even en probeer het opnieuw.";
const INVALID_LOGIN =
  "E-mail of wachtwoord klopt niet. Gebruik 'Wachtwoord vergeten?' om een nieuw wachtwoord in te stellen.";

async function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000"
  );
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "E-mail en wachtwoord zijn verplicht." };

  const ip = await clientIpFromHeaders();
  if (!(await rateLimitHit("login", ip, 10, 300)).allowed) {
    return { ok: false, error: TOO_MANY };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const invalidCredentials =
      error.code === "invalid_credentials" || error.message === "Invalid login credentials";
    return {
      ok: false,
      error: invalidCredentials ? INVALID_LOGIN : error.message,
    };
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const privacyAccepted = Boolean(formData.get("privacy_accepted"));

  if (!email) return { ok: false as const, error: "E-mailadres is verplicht." };
  if (!displayName) return { ok: false as const, error: "Naam is verplicht." };
  if (password.length < 8) {
    return { ok: false as const, error: "Wachtwoord moet minimaal 8 tekens zijn." };
  }
  if (!privacyAccepted) {
    return {
      ok: false as const,
      error: "Je moet akkoord gaan met de privacyverklaring.",
    };
  }

  const ip = await clientIpFromHeaders();
  if (!(await rateLimitHit("signup", ip, 5, 3600)).allowed) {
    return { ok: false as const, error: TOO_MANY };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // De handle_new_user-trigger in 0001_initial.sql pikt full_name op
      // en zet het op profiles.display_name. Sinds `0137` leest diezelfde
      // trigger ook privacy_accepted en zet daarmee de AVG-toestemming, want
      // die kan hier niet meer worden weggeschreven — zie hieronder.
      data: { full_name: displayName, privacy_accepted: true },
      emailRedirectTo: `${origin}/auth/confirm?next=/welkom`,
    },
  });

  if (error) return { ok: false as const, error: error.message };

  // Beheer laten weten dat er iemand wacht. Stil falend: een registratie mag
  // niet stuklopen op een pushbericht.
  //
  // Dit hing tot 2026-08-25 in een `if (data.user)`, en daar is het al die tijd
  // niet uitgekomen. Staat "Confirm email" aan — bij ons het geval — dan
  // antwoordt GoTrue op /signup met het User-object op het hoogste niveau, en
  // supabase-js leest in `_sessionResponse()` alleen `data.user`. Dat veld
  // bestaat in dat antwoord niet, dus `data.user` is `null` en het hele blok
  // werd overgeslagen: geen melding, en ook geen AVG-toestemming — die stond
  // sinds mei bij álle twaalf leden op leeg. De toestemming loopt daarom nu via
  // de trigger, en de melding heeft het id helemaal niet nodig.
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { profileIdsWithPermission } = await import("@/lib/auth/permissions");
    const { sendNotificationToMembers } = await import("@/lib/push/send");
    const approverIds = await profileIdsWithPermission(
      createAdminClient(),
      "members.approve",
    );
    if (approverIds.length > 0) {
      await sendNotificationToMembers(
        "on_member_pending",
        {
          title: "Nieuw lid wacht op goedkeuring",
          body: `${displayName} heeft zich aangemeld.`,
          url: "/leden",
          // Geen e-mailadres in de tag: die reist mee naar het toestel van de
          // beheerder. De naam staat toch al in de body.
          tag: `member-pending-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        },
        { profileIds: approverIds },
      );
    }
  } catch (err) {
    // Niet kritiek voor de registratie zelf, maar wél loggen. Deze melding is
    // maanden stil weggevallen juist omdat hier niets van te zien was.
    console.error("[signup] melding aan beheer faalde:", err);
  }

  // Met "Confirm email" aan in Supabase: session is null totdat de gebruiker
  // op de bevestigings-link klikt. Met email-confirmation uit: directe sessie.
  if (data.session) {
    redirect("/welkom");
  }

  return { ok: true as const, needsConfirmation: true };
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "E-mailadres ontbreekt." };

  const ip = await clientIpFromHeaders();
  if (!(await rateLimitHit("magiclink", ip, 5, 900)).allowed) {
    return { ok: false, error: TOO_MANY };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "E-mailadres ontbreekt." };

  const ip = await clientIpFromHeaders();
  if (!(await rateLimitHit("password-reset", ip, 5, 900)).allowed) {
    return { ok: false, error: TOO_MANY };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/wachtwoord-resetten`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
