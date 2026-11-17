import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { ClubShortName } from "@/components/club-texts-provider";
import { HELP_CATEGORIES, helpCategory, type HelpCategoryId } from "@/lib/help-categories";
import { SectionNav } from "../../zwbeter-worden/_components/section-nav";
import { HelpSearch } from "../help-search";
import { HELP_SECTIONS } from "../_sections";
import { getMemberModules } from "@/lib/member-modules";

const CATEGORY_LINKS = HELP_CATEGORIES.map((category) => ({
  href: `/hulp/${category.id}`,
  label: category.label,
  module: "module" in category ? category.module : null,
}));

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ categorie: string }>;
}) {
  const { categorie } = await params;
  const category = helpCategory(categorie);
  const view = await getMemberModules();
  // Een categorie van een module die uit staat, of die de groepen van dit lid
  // dicht hebben (0336), bestaat voor dit lid niet. Verborgen is iets anders:
  // de hulp blijft dan te lezen.
  if (!category || (category.module && !view.canUse(category.module))) notFound();
  const links = CATEGORY_LINKS.filter((link) => !link.module || view.canUse(link.module)).map(
    ({ href, label }) => ({ href, label }),
  );
  const Section = HELP_SECTIONS[category.id as HelpCategoryId];

  return (
    <div className="space-y-6">
      <BackLink href="/hulp" label="Hulp" className="-mb-2" />
      <PageHeader eyebrow={<><ClubShortName /> gids</>} title={category.label} />
      <SectionNav items={links} />
      <HelpSearch />
      <div className="space-y-8">
        <Section />
      </div>
    </div>
  );
}
