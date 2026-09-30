import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { accessForUser } from "@/lib/auth/permissions";

// Eén keer per request in plaats van in elke laag opnieuw.
//
// Een klik op het dashboard vroeg de gebruiker vijf keer op bij Supabase Auth
// (middleware, layout, page en twee keer via getCurrentUserAccess), elke keer een
// netwerkrondje, en haalde profiel en rolrechten dubbel op. React cache() deelt de
// uitkomst tussen layout en page binnen dezelfde render; buiten een render (server
// actions, route handlers) doet hij niets en gedraagt dit zich als voorheen.

export const getRequestUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getRequestAccess = cache(async () => {
  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  return accessForUser(supabase, user);
});
