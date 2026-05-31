"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimitHit, clientIpFromHeaders } from "@/lib/rate-limit";

const TOO_MANY = "Te veel pogingen. Wacht even en probeer het opnieuw.";

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
  if (error) return { ok: false, error: error.message };

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
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // De handle_new_user-trigger in 0001_initial.sql pikt full_name op
      // en zet het op profiles.display_name.
      data: { full_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) return { ok: false as const, error: error.message };

  // AVG-toestemming vastleggen op het (door de trigger aangemaakte) profiel.
  if (data.user) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient()
        .from("profiles")
        .update({ privacy_accepted_at: new Date().toISOString() })
        .eq("id", data.user.id);
    } catch {
      // niet kritiek voor de registratie zelf
    }
  }

  // Met "Confirm email" aan in Supabase: session is null totdat de gebruiker
  // op de bevestigings-link klikt. Met email-confirmation uit: directe sessie.
  if (data.session) {
    redirect("/dashboard");
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
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
