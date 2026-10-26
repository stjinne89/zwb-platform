import { Lock } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { MemberLink } from "@/components/member-link";
import { questionAnchor, type QaItem } from "@/lib/qa/data";
import {
  AlsoAskedButton,
  AnswerForm,
  DeleteQuestionButton,
  FaqButton,
  MergeControl,
  VisibilityButton,
} from "./question-controls";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    dateStyle: "medium",
    timeZone: "Europe/Amsterdam",
  });
}

export function QuestionCard({
  item,
  canAnswer,
  mergeOptions = [],
}: {
  item: QaItem;
  canAnswer: boolean;
  /** Clubvragen waar een open vraag mee samen kan, voor wie antwoordt. */
  mergeOptions?: { id: string; label: string }[];
}) {
  const canAlsoAsk = !item.mine && item.visibility === "club";
  const answered = item.answer !== null && item.answeredAt !== null;
  return (
    <li id={questionAnchor(item.id)} className="scroll-mt-20 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MemberLink id={item.askerId}>{item.askerName}</MemberLink>
        <span>- {formatDate(item.createdAt)}</span>
        {item.askedCount > 1 && <span>- {item.askedCount}× gevraagd</span>}
        {item.visibility === "bestuur" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            <Lock className="size-3" aria-hidden />
            Alleen bestuur
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap font-medium">{item.body}</p>

      {answered && (
        <div className="mt-3 border-l-2 border-primary/60 pl-3">
          <p className="mb-1 text-xs text-muted-foreground">
            <MemberLink id={item.answererName ? item.answererId : null}>
              {item.answererName ?? "Bestuur"}
            </MemberLink>{" "}
            - {formatDate(item.answeredAt!)}
          </p>
          <Markdown source={item.answer!} />
        </div>
      )}

      {(canAnswer || item.mine || canAlsoAsk) && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {canAlsoAsk && <AlsoAskedButton id={item.id} alsoAsked={item.alsoAsked} />}
          {canAnswer && <AnswerForm id={item.id} answer={item.answer} />}
          {canAnswer && answered && item.visibility === "club" && (
            <FaqButton id={item.id} faq={item.faq} />
          )}
          {canAnswer && <VisibilityButton id={item.id} visibility={item.visibility} />}
          {canAnswer && !answered && (
            <MergeControl
              id={item.id}
              options={mergeOptions.filter((option) => option.id !== item.id)}
            />
          )}
          {(canAnswer || item.mine) && <DeleteQuestionButton id={item.id} />}
        </div>
      )}
    </li>
  );
}
