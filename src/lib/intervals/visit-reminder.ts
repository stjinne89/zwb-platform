// "Open intervals.icu even": een gratis intervals.icu-account slaapt in na 90
// dagen zonder bezoek, en dan komen er geen ritten meer binnen. Leden die hun
// ritten via intervals.icu krijgen, openen die site zelf zelden. Daarom een vaste
// herinnering elke 60 dagen (keuze eigenaar, 2026-09-30): een balk op het
// dashboard en één push.
//
// Puur: geen database.

export const VISIT_REMINDER_DAYS = 60;

export type VisitReminderState = {
  created_at: string | null;
  visit_confirmed_at: string | null;
  visit_reminded_at?: string | null;
};

function base(state: VisitReminderState): number | null {
  const time = Date.parse(state.visit_confirmed_at ?? state.created_at ?? "");
  return Number.isFinite(time) ? time : null;
}

/** Of de balk moet staan: 60 dagen na koppelen of na de laatste "Gedaan". */
export function visitReminderDue(state: VisitReminderState, now = new Date()): boolean {
  const from = base(state);
  if (from == null) return false;
  return now.getTime() - from >= VISIT_REMINDER_DAYS * 86400_000;
}

/** Eén push per ronde: alleen als er sinds de laatste "Gedaan" nog geen ging. */
export function visitPushDue(state: VisitReminderState, now = new Date()): boolean {
  if (!visitReminderDue(state, now)) return false;
  const reminded = Date.parse(state.visit_reminded_at ?? "");
  if (!Number.isFinite(reminded)) return true;
  const from = base(state) ?? 0;
  return reminded < from;
}
