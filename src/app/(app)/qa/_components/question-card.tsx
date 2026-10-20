import { Lock } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { MemberLink } from "@/components/member-link";
import { questionAnchor, type QaItem } from "@/lib/qa/data";
import { AnswerForm, DeleteQuestionButton, VisibilityButton } from "./question-controls";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    dateStyle: "medium",
    timeZone: "Europe/Amsterdam",
  });
}

export function QuestionCard({ item, canAnswer }: { item: QaItem; canAnswer: boolean }) {
  return (
    <li id={questionAnchor(item.id)} className="scroll-mt-20 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MemberLink id={item.askerId}>{item.askerName}</MemberLink>
        <span>- {formatDate(item.createdAt)}</span>
        {item.visibility === "bestuur" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            <Lock className="size-3" aria-hidden />
            Alleen bestuur
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap font-medium">{item.body}</p>

      {item.answer !== null && item.answeredAt !== null && (
        <div className="mt-3 border-l-2 border-primary/60 pl-3">
          <p className="mb-1 text-xs text-muted-foreground">
            <MemberLink id={item.answererName ? item.answererId : null}>
              {item.answererName ?? "Bestuur"}
            </MemberLink>{" "}
            - {formatDate(item.answeredAt)}
          </p>
          <Markdown source={item.answer} />
        </div>
      )}

      {(canAnswer || item.mine) && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {canAnswer && <AnswerForm id={item.id} answer={item.answer} />}
          {canAnswer && <VisibilityButton id={item.id} visibility={item.visibility} />}
          <DeleteQuestionButton id={item.id} />
        </div>
      )}
    </li>
  );
}
