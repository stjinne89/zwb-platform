// Strava geeft het activiteiten-leesrecht als `activity:read` of
// `activity:read_all`. Mist beide in de toegekende scope, dan zette het lid het
// vinkje voor activiteiten niet aan en faalt elke activiteiten-call met een 401
// (activity:read_permission missing). Alleen op te lossen door opnieuw te
// koppelen met dat vinkje aan.
export function hasActivityScope(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return /\bactivity:read(_all)?\b/.test(scope);
}
