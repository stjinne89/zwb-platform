// Q&A: vragen van leden over de app, met het antwoord (migr. 0254), "Ik ook"
// en de FAQ (migr. 0255). Los van React, zodat de indeling te testen is.

export type QaVisibility = "club" | "bestuur";

type NameRef = { display_name: string | null } | { display_name: string | null }[] | null;

const QA_COLUMNS_0254 =
  "id, profile_id, body, visibility, answer, answered_by, answered_at, created_at, asker:profiles!member_questions_profile_id_fkey(display_name), answerer:profiles!member_questions_answered_by_fkey(display_name)";

/** Beide verwijzingen naar profiles bij naam, want de tabel heeft er twee. */
export const QA_SELECT = `${QA_COLUMNS_0254}, faq_at, asked_count`;
/** Zolang 0255 niet is toegepast: zonder FAQ en teller. */
export const QA_SELECT_0254 = QA_COLUMNS_0254;

export type QuestionRow = {
  id: string;
  profile_id: string;
  body: string;
  visibility: QaVisibility;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  /** Ontbreekt zolang 0255 niet is toegepast. */
  faq_at?: string | null;
  asked_count?: number | null;
  asker: NameRef;
  answerer: NameRef;
};

export type QaItem = {
  id: string;
  askerId: string;
  askerName: string;
  body: string;
  visibility: QaVisibility;
  answer: string | null;
  answererId: string | null;
  /** Null als wie antwoordde zijn account ophief. */
  answererName: string | null;
  answeredAt: string | null;
  createdAt: string;
  mine: boolean;
  faq: boolean;
  /** De vrager plus iedereen die "Ik ook" tikte. */
  askedCount: number;
  /** De kijker tikte "Ik ook". */
  alsoAsked: boolean;
};

function nameOf(ref: NameRef): string | null {
  const single = Array.isArray(ref) ? ref[0] : ref;
  return single?.display_name ?? null;
}

export function toQaItem(
  row: QuestionRow,
  viewerId: string | null,
  alsoAskedIds: ReadonlySet<string> = new Set(),
): QaItem {
  return {
    id: row.id,
    askerId: row.profile_id,
    askerName: nameOf(row.asker) ?? "ZWB'er",
    body: row.body,
    visibility: row.visibility,
    answer: row.answer,
    answererId: row.answered_by,
    answererName: row.answered_by ? nameOf(row.answerer) : null,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    mine: viewerId !== null && row.profile_id === viewerId,
    faq: Boolean(row.faq_at),
    askedCount: Math.max(1, row.asked_count ?? 1),
    alsoAsked: alsoAskedIds.has(row.id),
  };
}

/**
 * De FAQ, het vaakst gestelde eerst; open vragen op volgorde van binnenkomst,
 * zodat de oudste het eerst een antwoord krijgt; beantwoorde vragen buiten de
 * FAQ met het nieuwste antwoord bovenaan.
 */
export function splitQuestions(items: QaItem[]): {
  faq: QaItem[];
  open: QaItem[];
  answered: QaItem[];
} {
  const faq = items
    .filter((item) => item.faq && item.answeredAt !== null)
    .sort((a, b) => b.askedCount - a.askedCount || a.createdAt.localeCompare(b.createdAt));
  const open = items
    .filter((item) => item.answeredAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const answered = items
    .filter((item) => item.answeredAt !== null && !item.faq)
    .sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""));
  return { faq, open, answered };
}

export function questionAnchor(id: string): string {
  return `vraag-${id}`;
}

/** Een antwoord of vraag als één regel platte tekst, voor een keuzelijst. */
export function answerSnippet(answer: string, max = 160): string {
  const text = answer
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
