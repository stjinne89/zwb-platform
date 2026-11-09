import Link from "next/link";
import { HELP_CATEGORIES } from "@/lib/help-categories";
import { ClubText, ModuleGate } from "@/components/club-texts-provider";

/** De hulpcategorieën als tegels, in de kleur van hun soort, zoals op Club. */
export function HelpCategoriesGrid() {
  return (
    <nav aria-label="Hulp per onderwerp">
      <ul className="grid auto-rows-[6.5rem] grid-cols-2 gap-2 md:grid-cols-4">
        {HELP_CATEGORIES.map((category) => (
          <ModuleGate key={category.id} module={"module" in category ? category.module : null}>
          <li>
            <Link
              href={`/hulp/${category.id}`}
              className={`tg-tile tg-${category.tone} h-full !min-h-0 justify-end`}
            >
              <span className="tg-tile-title"><ClubText text={category.label} /></span>
            </Link>
          </li>
          </ModuleGate>
        ))}
      </ul>
    </nav>
  );
}
