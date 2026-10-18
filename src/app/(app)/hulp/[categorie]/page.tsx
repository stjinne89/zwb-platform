import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { HELP_CATEGORIES, helpCategory, type HelpCategoryId } from "@/lib/help-categories";
import { SectionNav } from "../../zwbeter-worden/_components/section-nav";
import { HelpSearch } from "../help-search";
import { HELP_SECTIONS } from "../_sections";

const CATEGORY_LINKS = HELP_CATEGORIES.map((category) => ({
  href: `/hulp/${category.id}`,
  label: category.label,
}));

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ categorie: string }>;
}) {
  const { categorie } = await params;
  const category = helpCategory(categorie);
  if (!category) notFound();
  const Section = HELP_SECTIONS[category.id as HelpCategoryId];

  return (
    <div className="space-y-6">
      <BackLink href="/hulp" label="Hulp" className="-mb-2" />
      <PageHeader eyebrow="ZWB gids" title={category.label} />
      <SectionNav items={CATEGORY_LINKS} />
      <HelpSearch />
      <div className="space-y-8">
        <Section />
      </div>
    </div>
  );
}
