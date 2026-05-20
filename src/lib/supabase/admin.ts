import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === "YOUR-SERVICE-ROLE-KEY") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY moet een echte service-role key zijn voor automatische sync.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
