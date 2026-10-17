// Het bewijsniveau van een kennisartikel, met de korte legenda die bij een
// lijst artikelen staat. Criteria: docs/bewijsniveau-kennisbank.md.

import { MethodLabelBadge } from "@/components/method-label-badge";
import {
  ARTICLE_EVIDENCE,
  ARTICLE_EVIDENCE_LABELS,
  ARTICLE_EVIDENCE_LEGEND,
  type ArticleEvidence,
} from "@/lib/knowledge/evidence";
import { cn } from "@/lib/utils";

const STYLES: Record<ArticleEvidence, string> = {
  sterk: "bg-primary/10 text-primary",
  matig: "bg-secondary text-secondary-foreground",
  beperkt: "border border-dashed text-muted-foreground",
  afgeraden: "bg-rose-100 text-rose-950 dark:bg-rose-400/20 dark:text-rose-100",
};

export function EvidenceBadge({ evidence, className }: { evidence: ArticleEvidence; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[evidence],
        className,
      )}
    >
      {ARTICLE_EVIDENCE_LABELS[evidence]}
    </span>
  );
}

const METHOD_LEGEND = [
  { label: "veelbelovend", text: "duidelijk effect bij fietsers, maar in kleine of korte studies" },
  { label: "experimenteel", text: "effect over weken nog niet aangetoond" },
] as const;

/** Korte legenda bij een lijst artikelen, met alleen de niveaus die erin voorkomen. */
export function EvidenceLegend({
  levels,
  methodLabels = false,
}: {
  levels: Iterable<ArticleEvidence>;
  methodLabels?: boolean;
}) {
  const present = new Set(levels);
  return (
    <dl className="grid gap-x-4 gap-y-1.5 rounded-lg border bg-card p-3 text-xs text-muted-foreground sm:grid-cols-2">
      {ARTICLE_EVIDENCE.filter((level) => present.has(level)).map((level) => (
        <div key={level} className="flex items-start gap-2">
          <dt className="shrink-0">
            <EvidenceBadge evidence={level} />
          </dt>
          <dd className="pt-0.5">{ARTICLE_EVIDENCE_LEGEND[level]}</dd>
        </div>
      ))}
      {methodLabels &&
        METHOD_LEGEND.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <dt className="shrink-0">
              <MethodLabelBadge label={item.label} />
            </dt>
            <dd className="pt-0.5">{item.text}</dd>
          </div>
        ))}
    </dl>
  );
}
