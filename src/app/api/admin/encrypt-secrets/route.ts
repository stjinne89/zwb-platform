import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, isEncrypted } from "@/lib/crypto/secrets";

// Eenmalige backfill (F4): versleutelt bestaande plaintext-geheimen at rest.
// Alleen aanroepbaar door een ingelogde beheerder. Idempotent: al versleutelde
// rijen worden overgeslagen. Draai dit één keer na het zetten van
// TOKEN_ENCRYPTION_KEY.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Niet ingelogd." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "Alleen beheerders." }, { status: 403 });
  }
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return NextResponse.json(
      { ok: false, error: "TOKEN_ENCRYPTION_KEY is niet ingesteld." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  let intervalsEncrypted = 0;
  let stravaEncrypted = 0;

  const { data: intervalsRows } = await admin
    .from("intervals_connections")
    .select("profile_id, api_key");
  for (const row of intervalsRows ?? []) {
    if (row.api_key && !isEncrypted(row.api_key)) {
      await admin
        .from("intervals_connections")
        .update({ api_key: encryptSecret(row.api_key) })
        .eq("profile_id", row.profile_id);
      intervalsEncrypted++;
    }
  }

  const { data: stravaRows } = await admin
    .from("strava_connections")
    .select("profile_id, access_token, refresh_token");
  for (const row of stravaRows ?? []) {
    const patch: Record<string, string> = {};
    if (row.access_token && !isEncrypted(row.access_token)) {
      patch.access_token = encryptSecret(row.access_token);
    }
    if (row.refresh_token && !isEncrypted(row.refresh_token)) {
      patch.refresh_token = encryptSecret(row.refresh_token);
    }
    if (Object.keys(patch).length > 0) {
      await admin.from("strava_connections").update(patch).eq("profile_id", row.profile_id);
      stravaEncrypted++;
    }
  }

  return NextResponse.json({ ok: true, intervalsEncrypted, stravaEncrypted });
}
