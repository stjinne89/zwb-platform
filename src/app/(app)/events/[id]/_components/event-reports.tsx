"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Trash2, Send, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { WhatsAppShareLink } from "@/components/whatsapp-share-link";
import {
  addReportComment,
  deleteEventReport,
  deleteReportComment,
  saveEventReport,
} from "../../../ritverslagen/_actions";

export type ReportComment = {
  id: string;
  profileId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type EventReport = {
  id: string;
  profileId: string;
  authorName: string;
  bodyMd: string;
  preparationMd: string | null;
  courseMd: string | null;
  resultMd: string | null;
  lessonsMd: string | null;
  createdAt: string;
  comments: ReportComment[];
};

/** Uitslagregel uit event_results, zodat niemand cijfers overtypt. */
export type EventResultLine = {
  position: number | null;
  timeText: string | null;
  category: string | null;
  categoryRank: number | null;
};

const SECTIONS = [
  { key: "preparation", label: "Voorbereiding" },
  { key: "course", label: "Verloop" },
  { key: "result", label: "Uitslag" },
  { key: "lessons", label: "Leerpunten" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
type Draft = Record<SectionKey, string>;

function draftFrom(report: EventReport | null): Draft {
  return {
    preparation: report?.preparationMd ?? "",
    // Verslagen van voor de secties staan volledig in body_md.
    course: report?.courseMd ?? report?.bodyMd ?? "",
    result: report?.resultMd ?? "",
    lessons: report?.lessonsMd ?? "",
  };
}

function resultSummary(result: EventResultLine) {
  return [
    result.position ? `Plaats ${result.position}` : null,
    result.timeText,
    result.category
      ? `${result.category}${result.categoryRank ? ` (${result.categoryRank}e)` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function fmt(value: string) {
  return new Date(value).toLocaleDateString("nl-NL", {
    dateStyle: "medium",
    timeZone: "Europe/Amsterdam",
  });
}

export function EventReports({
  eventId,
  eventTitle,
  currentUserId,
  isAdmin,
  reports,
  myResult,
}: {
  eventId: string;
  eventTitle: string;
  currentUserId: string | null;
  isAdmin: boolean;
  reports: EventReport[];
  myResult?: EventResultLine | null;
}) {
  const router = useRouter();
  const myReport = reports.find((r) => r.profileId === currentUserId) ?? null;
  const [draft, setDraft] = useState<Draft>(() => draftFrom(myReport));
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveEventReport(eventId, draft);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "Opslaan faalde.");
      }
    });
  }

  const showEditor = currentUserId && (editing || !myReport);

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <PencilLine className="size-4" />
        Ritverslagen ({reports.length})
      </h2>

      {/* Eigen verslag schrijven / bewerken */}
      {showEditor && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {myReport ? "Bewerk jouw verslag" : "Schrijf jouw ritverslag"}
          </p>
          {SECTIONS.map((section) => (
            <label key={section.key} className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {section.label}
              </span>
              {section.key === "result" && myResult ? (
                <span className="mb-1 block text-xs text-foreground">
                  {resultSummary(myResult)}
                </span>
              ) : null}
              <textarea
                value={draft[section.key]}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, [section.key]: e.target.value }))
                }
                rows={section.key === "course" ? 5 : 2}
                className={`${FIELD} font-mono`}
              />
            </label>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? "Opslaan…" : myReport ? "Bijwerken" : "Plaatsen"}
            </Button>
            {myReport && editing && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(draftFrom(myReport));
                  setError(null);
                }}
              >
                Annuleer
              </Button>
            )}
          </div>
        </div>
      )}

      {!currentUserId && (
        <p className="text-sm text-muted-foreground">
          Log in om een ritverslag te schrijven.
        </p>
      )}

      {reports.length === 0 && currentUserId && !showEditor && (
        <p className="text-sm text-muted-foreground">
          Nog geen verslagen — schrijf het eerste.
        </p>
      )}

      {/* Alle verslagen */}
      <ul className="space-y-4">
        {reports.map((report) => {
          const mine = report.profileId === currentUserId;
          return (
            <li key={report.id} className="rounded-md border bg-background p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm">
                  <Link
                    href={`/leden/${report.profileId}`}
                    className="font-medium hover:underline"
                  >
                    {report.authorName}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">
                    · {fmt(report.createdAt)}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <WhatsAppShareLink
                    text={`Ritverslag ${eventTitle} — ${report.authorName}`}
                    path={`/events/${eventId}`}
                    label="Deel"
                    className="text-xs text-muted-foreground hover:text-green-700 dark:hover:text-green-300"
                  />
                  {mine && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setDraft(draftFrom(report));
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Bewerk
                    </button>
                  )}
                  {(mine || isAdmin) && (
                    <DeleteButton
                      onDelete={() => deleteEventReport(report.id)}
                      confirmText="Verslag verwijderen?"
                    />
                  )}
                </div>
              </div>
              <Markdown source={report.bodyMd} />

              <CommentThread
                reportId={report.id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                comments={report.comments}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CommentThread({
  reportId,
  currentUserId,
  isAdmin,
  comments,
}: {
  reportId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  comments: ReportComment[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await addReportComment(reportId, body);
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-2">
      {comments.length > 0 && (
        <ul className="space-y-1.5">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
              <p className="min-w-0">
                <Link
                  href={`/leden/${c.profileId}`}
                  className="font-medium hover:underline"
                >
                  {c.authorName}
                </Link>{" "}
                <span className="whitespace-pre-wrap">{c.body}</span>
              </p>
              {(c.profileId === currentUserId || isAdmin) && (
                <DeleteButton
                  onDelete={() => deleteReportComment(c.id)}
                  confirmText="Reactie verwijderen?"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {currentUserId && (
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Reageer…"
            className={`${FIELD} py-1.5`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={add}
            disabled={pending || !body.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function DeleteButton({
  onDelete,
  confirmText,
}: {
  onDelete: () => Promise<unknown>;
  confirmText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title={confirmText}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          await onDelete();
          router.refresh();
        });
      }}
      className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
