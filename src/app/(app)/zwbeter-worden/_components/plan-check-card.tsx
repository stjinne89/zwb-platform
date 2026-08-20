// De vraag die volgt op vier ongereden trainingen.
//
// Het schema herzag zichzelf tot nu toe gewoon door bij een lid dat er niets mee
// deed — voor één lid twaalf generaties bij nul gereden trainingen. Die
// herzieningen liggen nu stil (zie planIsIgnored in replan.ts), en dit is wat er
// in de plaats komt: één vraag, met de twee knoppen die hem kunnen beantwoorden.
//
// Zodra het lid weer rijdt of het schema bijwerkt, gaan de herzieningen vanzelf
// weer lopen — het openstaande verzoek blijft al die tijd bewaard.

import Link from "next/link";
import { CircleHelp } from "lucide-react";

export function PlanCheckCard({ missedCount }: { missedCount: number }) {
  return (
    <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <CircleHelp className="size-5" />
        Klopt dit schema nog?
      </h2>
      <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
        Je reed de laatste {missedCount} trainingen niet. Zolang dat zo is werkt je schema zichzelf
        niet meer bij.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/zwbeter-worden/schema#schema-bijwerken"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Schema bijwerken
        </Link>
        <Link
          href="/zwbeter-worden/doelen"
          className="rounded-md border border-amber-600/40 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
        >
          Doel aanpassen
        </Link>
      </div>
    </section>
  );
}
