// Welk kennisartikel een standaardworkout uit de bibliotheek onderbouwt.
//
// Een workout krijgt geen eigen bewijsniveau: hij leent het niveau van het
// artikel, zodat er één plek is waar het niveau staat (docs/bewijsniveau-
// kennisbank.md). Een workout zonder artikel dat hem direct onderbouwt, krijgt
// niets. De gewone tempo-, sweet-spot-, drempel-, VO2max-, anaerobe en
// sprintintervallen vallen onder het artikel Intervallen.
//
// Eigen workouts van trainers krijgen ook niets: ZWB weet niet wat erin staat.

import { trainingArticleBySlug, type TrainingArticle } from "@/lib/training/training-library";

type TemplateLike = { form: string; title: string; duration_minutes: number; is_standard: boolean };

/** Vanaf deze lengte is een duurrit een lange rit (docs/lange-ritten-variatie.md). */
const LONG_RIDE_MINUTES = 150;

export function workoutSupportSlug(template: TemplateLike): string | null {
  if (!template.is_standard) return null;
  const title = template.title.toLowerCase();

  if (title.includes("blokweek")) return "blokweek";
  if (/wisselend|aflopend|snelle start/.test(title)) return "vo2max-wisselend";
  if (title.includes("onderhoud") || title.includes("3x3 sprints")) return "sprints-als-onderhoud";
  if (title.includes("laag toerental")) return "lage-cadans";

  switch (template.form) {
    case "test":
      return "ftp-test";
    case "warmup":
      return "warming-up";
    case "herstel":
      return "rustige-ritten";
    case "duur":
      return template.duration_minutes >= LONG_RIDE_MINUTES ? "lange-ritten" : "rustige-ritten";
    case "tempo":
    case "sweetspot":
    case "drempel":
    case "vo2max":
    case "anaeroob":
    case "sprint":
      return "intervallen";
    default:
      return null;
  }
}

export function workoutSupport(template: TemplateLike): TrainingArticle | null {
  const slug = workoutSupportSlug(template);
  return slug ? trainingArticleBySlug(slug) : null;
}
