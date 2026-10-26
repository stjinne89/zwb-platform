import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  CircleHelp,
  MessageCircleQuestionMark,
  Sparkles,
} from "lucide-react";
import {
  QA_HELP,
  TROUBLESHOOTING,
} from "../_data";
import { HelpVideoLink } from "./help-video";

export function ProblemenHelp() {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border bg-card/90 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="size-5 text-primary" />
            Meldingen
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pushmeldingen werken als je browser toestemming geeft en je voorkeuren
            onder Profiel aanstaan.
          </p>
          <Link
            href="/profiel?weergave=bewerken#meldingen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Meldingen instellen
          </Link>
          <HelpVideoLink video="meldingen" className="mt-2 flex w-fit" />
        </article>

        <article
          id="problemen"
          className="scroll-mt-20 rounded-lg border bg-card/90 p-4"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-primary" />
            Problemen oplossen
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {TROUBLESHOOTING.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section id="qa" className="scroll-mt-20 rounded-lg border bg-card/90 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircleQuestionMark className="size-5 text-primary" />
          Q&amp;A: je vraag over de app
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {QA_HELP.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link href="/qa" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
          Naar Q&amp;A
        </Link>
      </section>
    </>
  );
}
