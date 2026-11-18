// Welke module bij een melding hoort (0336). Los van send.ts, zodat het zonder
// web-push te testen is.

import type { ModuleKey } from "@/lib/modules";
import type { NotificationTrigger } from "@/lib/push/send";

/**
 * De module waar een melding bij hoort. Wie die module door zijn groepen niet
 * mag gebruiken (0336), krijgt de melding niet: de link erin zou een 404 geven.
 * Meldingen zonder module (events, beheer, koppelingen) gaan naar iedereen.
 */
export const TRIGGER_MODULE: Partial<Record<NotificationTrigger, ModuleKey>> = {
  on_live_started: "samen_fietsen",
  on_zwbeker_nomination: "bekers",
  on_zwbeker_awarded: "bekers",
  on_training_plan: "training",
  on_workout_review: "training",
  on_training_chat: "training",
  on_nutrition_reminder: "training",
  on_knowledge_message: "bibliotheek",
  on_maintenance_due: "garage",
  on_story_submitted: "clubverhaal",
  on_story_reviewed: "clubverhaal",
  on_race_stream_live: "livestream",
};
