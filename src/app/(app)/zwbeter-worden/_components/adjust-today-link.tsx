// Een wijziging overdag wordt pas 's nachts in het schema verwerkt (replan.ts).
// Raakt hij vandaag, dan is "Pas vandaag aan" de weg om de training van vandaag
// meteen te laten aanpassen. Die laat het nachtverzoek staan, dus de herziening
// van de nacht trekt de dagen erna daarna recht.

import Link from "next/link";

/** Anker van AdjustTodayForm op ZWBeter Vandaag. `?aanpassen=1` klapt hem open. */
export const ADJUST_TODAY_ANCHOR = "vandaag-aanpassen";

/** Amsterdamse dag als "YYYY-MM-DD", in de browser. */
export function todayKeyAmsterdam(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

export function AdjustTodayLink() {
  return (
    <Link
      href={`/zwbeter-worden?aanpassen=1#${ADJUST_TODAY_ANCHOR}`}
      className="font-medium underline underline-offset-2"
    >
      Pas vandaag aan
    </Link>
  );
}
