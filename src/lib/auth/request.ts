import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { accessForUser } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session-user";

// Eén keer per request in plaats van in elke laag opnieuw.
//
// Een klik op het dashboard vroeg de gebruiker vijf keer op bij Supabase Auth
// (middleware, layout, page en twee keer via getCurrentUserAccess), elke keer een
// netwerkrondje, en haalde profiel en rolrechten dubbel op. Sinds 2026-10-01 is de
// gebruiker zelf geen netwerkrondje meer (session-user.ts); de rechten nog wel. React cache() deelt de
// uitkomst tussen layout en page binnen dezelfde render; buiten een render (server
// actions, route handlers) doet hij niets en gedraagt dit zich als voorheen.

export const getRequestUser = cache(async () => getSessionUser(await createClient()));

export const getRequestAccess = cache(async () => {
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  return accessForUser(supabase, user);
});
