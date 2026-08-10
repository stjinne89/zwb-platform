// De nachtelijke bijstelling. Tot nu toe werd dat een compleet conceptschema
// naast het lopende schema, dat vervolgens door niemand werd goedgekeurd. Nu is
// het een regel binnen het schema zelf: toepassen of wegklikken.

import { Lightbulb } from "lucide-react";
import { applyAdaptationProposal, dismissAdaptationProposal } from "../_actions";
import { formAction, formatDayMonth } from "./format";
import type { PlanRow } from "./types";

export function AdaptationProposal({ proposal }: { proposal: PlanRow }) {
  const summary = proposal.summary?.split("\n\n")[0] ?? proposal.adaptation_reason;

  return (
    <div className="border-y bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="size-4 shrink-0 text-primary" />
            Voorstel van{" "}
            {formatDayMonth(proposal.adapt_from_date ?? proposal.created_at, false)}
          </p>
          {summary && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{summary}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <form action={formAction(applyAdaptationProposal)}>
            <input type="hidden" name="plan_id" value={proposal.id} />
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Toepassen
            </button>
          </form>
          <form action={formAction(dismissAdaptationProposal)}>
            <input type="hidden" name="plan_id" value={proposal.id} />
            <button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Negeren
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
