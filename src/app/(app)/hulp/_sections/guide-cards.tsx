import { CheckCircle2 } from "lucide-react";
import { GUIDES } from "../_data";
import { ClubText, ModuleGate } from "@/components/club-texts-provider";
import { HELP_ANCHOR_MODULES } from "@/lib/help-categories";

/** Een aantal korte gidsen als kaarten, in de volgorde van `ids`. */
export function GuideCards({ ids }: { ids: readonly string[] }) {
  const guides = ids.flatMap((id) => GUIDES.filter((guide) => guide.id === id));
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {guides.map((guide) => {
        const Icon = guide.icon;
        return (
          <ModuleGate key={guide.id} module={HELP_ANCHOR_MODULES[guide.id]}>
          <article
            id={guide.id}
            className="rounded-lg border bg-card/90 p-4 scroll-mt-20"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon className="size-5 text-primary" />
              <ClubText text={guide.title} />
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {guide.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span><ClubText text={bullet} /></span>
                </li>
              ))}
            </ul>
          </article>
          </ModuleGate>
        );
      })}
    </section>
  );
}
