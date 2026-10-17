// Grenzen van ZWBieb. De lengtes staan ook als check in 0239 en 0242; de
// daglimiet bewaakt de trigger knowledge_threads_before_insert.

export const MAX_TOPICS_PER_MEMBER = 6;
/** Spullen die je uitleent, los van de kennisonderwerpen. */
export const MAX_ITEMS_PER_MEMBER = 15;
/** Nieuwe onderwerpen of spullen per lid per dag; ook in de trigger van 0242. */
export const TOPICS_PER_DAY = 5;
export const TOPIC_NOTE_MAX = 140;
export const TIP_MIN = 3;
export const TIP_MAX = 300;
export const MESSAGE_MAX = 2000;
export const QUESTION_MAX = 1000;
export const KNOWLEDGE_QUESTIONS_PER_DAY = 10;
