// Pure hulpfuncties voor "ZWBieb"; de queries staan bij de pagina's.

export type ThreadReadState = {
  asker_id: string;
  expert_id: string;
  last_author_id: string | null;
  last_message_at: string;
  asker_read_at: string | null;
  expert_read_at: string | null;
};

/**
 * Heeft `userId` iets ongelezen in dit gesprek? Alleen als de laatste
 * schrijver iemand anders was en dat bericht na het eigen leesmoment kwam.
 */
export function isUnreadFor(thread: ThreadReadState, userId: string): boolean {
  if (!thread.last_author_id || thread.last_author_id === userId) return false;
  const readAt =
    thread.asker_id === userId
      ? thread.asker_read_at
      : thread.expert_id === userId
        ? thread.expert_read_at
        : null;
  if (thread.asker_id !== userId && thread.expert_id !== userId) return false;
  if (!readAt) return true;
  return Date.parse(thread.last_message_at) > Date.parse(readAt);
}

export function countUnread(threads: ThreadReadState[], userId: string): number {
  return threads.filter((t) => isUnreadFor(t, userId)).length;
}

export type EventTip = {
  id: string;
  event_id: string | null;
  col_slug: string | null;
  created_at: string;
};

/**
 * Tips voor een eventpagina: wat aan het event (of zijn moederevent) hangt,
 * en wat bij een col op de route staat. Elke tip één keer, nieuwste eerst.
 */
export function tipsForEvent<T extends EventTip>(
  tips: T[],
  { eventIds, colSlugs }: { eventIds: string[]; colSlugs: string[] },
): T[] {
  const events = new Set(eventIds);
  const cols = new Set(colSlugs);
  const seen = new Set<string>();
  return tips
    .filter((tip) => {
      if (seen.has(tip.id)) return false;
      const match =
        (tip.event_id !== null && events.has(tip.event_id)) ||
        (tip.col_slug !== null && cols.has(tip.col_slug));
      if (match) seen.add(tip.id);
      return match;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

const SHORT_DATE = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});
const TIME = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

/** "14:05" voor vandaag, anders "12 okt." (in Nederlandse tijd). */
export function formatMoment(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return SHORT_DATE.format(date) === SHORT_DATE.format(now) ? TIME.format(date) : SHORT_DATE.format(date);
}
