// Het bewijsniveau van een kennisartikel of protocol, met de korte legenda die
// bij een lijst artikelen staat. Beleid: docs/beoordelingsbeleid-bewijsniveau.md.

import { MethodLabelBadge } from "@/components/method-label-badge";
import {
  ARTICLE_CONCLUSIONS,
  ARTICLE_CONCLUSION_LABELS,
  ARTICLE_CONCLUSION_LEGEND,
  ARTICLE_EVIDENCE,
  ARTICLE_EVIDENCE_LEGEND,
  evidenceText,
  type ArticleConclusion,
  type ArticleEvidence,
} from "@/lib/knowledge/evidence";
import { cn } from "@/lib/utils";

const STYLES: Record<ArticleEvidence, string> = {
  sterk: "bg-primary/10 text-primary",
  matig: "bg-secondary text-secondary-foreground",
  beperkt: "border border-dashed text-muted-foreground",
};

export function EvidenceBadge({
  evidence,
  conclusion,
  className,
}: {
  evidence: ArticleEvidence;
  /** "geen effect" of "nadelig", bij een artikel dat zegt dat iets niet helpt. */
  conclusion?: ArticleConclusion | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[evidence],
        className,
      )}
    >
      {evidenceText(evidence, conclusion)}
    </span>
  );
}

/** Korte legenda bij een lijst artikelen, met alleen wat erin voorkomt. */
export function EvidenceLegend({
  levels,
  conclusions = [],
  methodLabels = false,
}: {
  levels: Iterable<ArticleEvidence>;
  conclusions?: Iterable<ArticleConclusion | null | undefined>;
  methodLabels?: boolean;
}) {
  const present = new Set(levels);
  const presentConclusions = new Set(conclusions);
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
      {ARTICLE_CONCLUSIONS.filter((conclusion) => presentConclusions.has(conclusion)).map((conclusion) => (
        <div key={conclusion} className="flex items-start gap-2">
          <dt className="shrink-0 px-2 pt-0.5 font-medium text-foreground">{ARTICLE_CONCLUSION_LABELS[conclusion]}</dt>
          <dd className="pt-0.5">{ARTICLE_CONCLUSION_LEGEND[conclusion]}</dd>
        </div>
      ))}
      {methodLabels && (
        <div className="flex items-start gap-2">
          <dt className="shrink-0">
            <MethodLabelBadge label="veelbelovend" />
          </dt>
          <dd className="pt-0.5">geen standaardtraining; hoe onderbouwd, zegt het niveau ernaast</dd>
        </div>
      )}
    </dl>
  );
}
