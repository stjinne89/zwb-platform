"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { ok: false as const, error: "Wachtwoord moet minimaal 8 tekens zijn." };
  }

  if (password !== confirmPassword) {
    return { ok: false as const, error: "De wachtwoorden komen niet overeen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Deze resetlink is verlopen of al gebruikt. Vraag een nieuwe resetlink aan.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false as const, error: error.message };

  redirect("/dashboard");
}
