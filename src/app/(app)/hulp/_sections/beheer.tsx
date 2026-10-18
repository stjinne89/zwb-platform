import {
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  ADMIN_GUIDES,
} from "../_data";

export function BeheerHelp() {
  return (
    <>
      <section
        id="beheer"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Beheer en technische koppelingen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Naslag voor bestuur, communitybeheerders, trainers en teamcaptains.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {ADMIN_GUIDES.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-20 rounded-md border bg-background p-4"
            >
              <h3 className="text-sm font-semibold">{guide.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
