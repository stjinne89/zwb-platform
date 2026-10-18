import Link from "next/link";
import {
  CalendarDays,
  CircleHelp,
  Gauge,
  HeartPulse,
  Lightbulb,
  MapPinned,
  Monitor,
  Navigation,
  ShieldCheck,
  Trophy,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { HELP_CATEGORIES, type HelpCategoryId } from "@/lib/help-categories";

const ICONS: Record<HelpCategoryId, LucideIcon> = {
  beginnen: Navigation,
  koppelen: Upload,
  club: Users,
  wedstrijden: Trophy,
  "live-volgen": MapPinned,
  training: HeartPulse,
  schema: CalendarDays,
  workouts: Monitor,
  racen: Gauge,
  kennis: Lightbulb,
  problemen: CircleHelp,
  beheer: ShieldCheck,
};

/** De hulpcategorieën als tegels. In het design "tegels" in de kleur van hun
 * soort, zoals op Club; anders als kaarten met icoon en korte omschrijving. */
export function HelpCategoriesGrid({ tegels }: { tegels: boolean }) {
  if (tegels) {
    return (
      <nav aria-label="Hulp per onderwerp">
        <ul className="grid auto-rows-[6.5rem] grid-cols-2 gap-2 md:grid-cols-4">
          {HELP_CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                href={`/hulp/${category.id}`}
                className={`tg-tile tg-${category.tone} h-full !min-h-0 justify-end`}
              >
                <span className="tg-tile-title">{category.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Hulp per onderwerp">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_CATEGORIES.map((category) => {
          const Icon = ICONS[category.id];
          return (
            <li key={category.id}>
              <Link
                href={`/hulp/${category.id}`}
                className="jersey-panel flex h-full gap-3 rounded-lg border bg-card/90 p-4 transition hover:border-primary/40"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-semibold">{category.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{category.text}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
