// Anonieme Supabase-client zonder cookies, voor de publieke Omnium-pagina's.
//
// Waarom een derde client naast server.ts en admin.ts: de Omnium-pagina's zijn
// bedoeld voor een internationaal veld dat niet inlogt en die links worden
// gedeeld op Zwift, Discord en YouTube. server.ts leest cookies en maakt de
// route daarmee per definitie dynamisch; admin.ts zou de service-role in het
// pad van publiek verkeer zetten. Deze client leest als `anon` en valt dus
// precies binnen de RLS-policies die alleen gepubliceerd materiaal vrijgeven,
// zonder sessie en dus cachebaar.

import { createClient } from "@supabase/supabase-js";

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase-URL en anon key zijn nodig voor publieke pagina's.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
