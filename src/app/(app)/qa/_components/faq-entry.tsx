import { ChevronDown } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { questionAnchor, type QaItem } from "@/lib/qa/data";
import { AnswerForm, FaqButton } from "./question-controls";

/** Eén vraag in de FAQ: zonder naam, het antwoord uitklapbaar. */
export function FaqEntry({ item, canAnswer }: { item: QaItem; canAnswer: boolean }) {
  return (
    <li id={questionAnchor(item.id)} className="scroll-mt-20">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4 font-medium transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span className="flex-1">{item.body}</span>
          <ChevronDown
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="px-4 pb-4">
          <Markdown source={item.answer ?? ""} />
          {canAnswer && (
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <AnswerForm id={item.id} answer={item.answer} />
              <FaqButton id={item.id} faq />
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
