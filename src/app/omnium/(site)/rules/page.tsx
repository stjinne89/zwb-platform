import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmptyState } from "@/components/app-ui";
import { loadCurrentSeason } from "@/lib/omnium/public-data";

export const revalidate = 300;

export const metadata: Metadata = { title: "Rules" };

// Het reglement komt uit omnium_seasons.rules_md, zodat een regelwijziging een
// beheeractie is en niet een codewijziging. Op de oude statische site stond het
// hard in rules.html, met als gevolg dat het vier edities lang achterliep op de
// rest van de site.
export default async function OmniumRulesPage() {
  const season = await loadCurrentSeason();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {season?.name ?? "ZWB Omnium"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Rules</h1>
      </header>

      {!season?.rulesMd ? (
        <EmptyState>The rules for this season are being finalised.</EmptyState>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {season.rulesMd}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
