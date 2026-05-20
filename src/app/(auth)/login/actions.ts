"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "E-mail en wachtwoord zijn verplicht." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email) return { ok: false as const, error: "E-mailadres is verplicht." };
  if (!displayName) return { ok: false as const, error: "Naam is verplicht." };
  if (password.length < 8) {
    return { ok: false as const, error: "Wachtwoord moet minimaal 8 tekens zijn." };
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
