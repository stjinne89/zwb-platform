// De feedback van de trainer, zoals het lid hem leest. Een pad naar een
// kennisbankartikel in de tekst (de suggesties zetten er een bij) wordt een link
// met de titel van het artikel; de rest blijft platte tekst.

import type { ReactNode } from "react";
import Link from "next/link";
import { trainingArticleBySlug } from "@/lib/training/training-library";

const ARTICLE_PATH = /\/zwbeter-worden\/kennis\/([a-z0-9-]+)/g;

export function TrainerFeedbackText({ text, className = "" }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(ARTICLE_PATH)) {
    const article = trainingArticleBySlug(match[1]);
    if (!article) continue;
    parts.push(text.slice(last, match.index));
    parts.push(
      <Link key={match.index} href={match[0]} className="text-primary underline underline-offset-2">
        {article.title}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));

  return (
    <p className={`rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm whitespace-pre-line ${className}`}>
      {parts}
    </p>
  );
}
