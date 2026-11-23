import { Gauge } from "lucide-react";
import { ModuleGate } from "@/components/club-texts-provider";
import { DURATIONS, type PowerWkg } from "@/lib/club-ladder/team-power";
import { courseForRace, racefitScores, type RaceCourse } from "@/lib/teams/zrl-racefit";

// De voorbeelden rekenen met het echte model, zodat de tabellen meelopen als de
// weging verandert. De drie renners zijn verzonnen en hebben geen gewicht.

const EXAMPLE_ROUTES = [
  { label: "Tempus Fugit", title: "Race", zwiftRouteId: 2128890027, laps: 1 },
  { label: "Muir And The Mountain", title: "Race", zwiftRouteId: 2139465450, laps: 1 },
  { label: "Road to Sky", title: "Race", zwiftRouteId: 2663908549, laps: 1 },
  { label: "London Calling (TTT)", title: "Team Time Trial", zwiftRouteId: 2836167073, laps: 1 },
];

const EXAMPLE_RIDERS: Array<{ key: string; label: string; wkg: PowerWkg }> = [
  { key: "sprinter", label: "Sprinter", wkg: { s15: 13.5, m1: 7.6, m5: 4.3, m20: 3.6 } },
  { key: "allrounder", label: "Allrounder", wkg: { s15: 11, m1: 6.8, m5: 4.7, m20: 4 } },
  { key: "klimmer", label: "Klimmer", wkg: { s15: 9, m1: 6, m5: 5.1, m20: 4.4 } },
];

const DURATION_LABELS = { s15: "15 s", m1: "1 min", m5: "5 min", m20: "20 min" } as const;

const STEPS = [
  {
    title: "Je vermogen",
    text: "Je beste W/kg over 15 seconden en 1, 5 en 20 minuten van de laatste 90 dagen. Per duur telt de hoogste van ZwiftRacing (races in Zwift) en intervals.icu (al je ritten). Met Indoor telt uit intervals.icu alleen wat je binnen reed.",
  },
  {
    title: "Wat de route vraagt",
    text: "Elke duur krijgt een percentage, samen 100%. Dat volgt uit de route, het aantal rondes en de soort race.",
  },
  {
    title: "Je gewicht",
    text: "Bij dezelfde W/kg gaat een zwaardere renner harder in de sprint en iets harder bergop. Racefit rekent dat om naar een renner van 75 kg. Op het vlakke blijven 1, 5 en 20 minuten gewone W/kg. Zonder gewicht in je profiel telt je W/kg zoals die is.",
  },
  {
    title: "Het gemiddelde",
    text: "Je vier waarden gaan met die percentages in een gewogen meetkundig gemiddelde. Daarin tellen verhoudingen: 10% beter weegt even zwaar op 4 als op 12 W/kg. Zo drukt de sprint de rest niet weg met zijn hoge getallen.",
  },
];

const ROUTE_RULES = [
  ["Vlak", "Hoe vlakker de route, hoe zwaarder de sprint. Op een helemaal vlakke route is dat ruim de helft."],
  ["Hoogtemeters", "Meer hoogtemeters per kilometer halen gewicht weg bij de sprint en geven het aan 5 minuten, tot 15 meter per kilometer. Alle hoogtemeters van de route tellen, ook die van de klimmen."],
  ["Finish", "Ligt de finish niet bergop, dan krijgt de sprint er een vast deel bij. Op een route met weinig hoogtemeters telt de sprint ook bij een bergop finish nog mee. Een klim aan de finish telt een keer extra."],
  ["Klimmen", "Een klim telt bij de duur die hij kost: duurt hij 3 minuten, dan deels bij 1 en deels bij 5 minuten. Steiler (tot 5%) en meer hoogtemeters (tot 300 m) maken hem zwaarder. Een klim van 1% of minder telt niet."],
  ["Rondes", "Een klim die je elke ronde oprijdt, telt zwaarder, maar niet evenredig: bij vier rondes twee keer zo zwaar als bij één."],
  ["Tijdrit", "Staat Time Trial, TTT of Race of Truth in de titel, dan valt de sprint weg en telt 1 minuut half zo zwaar. Dat gewicht gaat gelijk naar 5 en 20 minuten."],
];

const READING_RULES = [
  "Vergelijk Racefit alleen binnen de lijst van die week. Het is geen zFTP: op een vlakke route ligt het getal hoog door de sprint, dus het zegt niets tegenover een categoriegrens of een andere week.",
  "Het is geen voorspelling van een uitslag.",
  "Ontbreekt een duur, dan telt wat er wel is, tegenover de rest van de lijst. Zonder vermogen staat er een streepje.",
  "Rijden de teams een andere route of een ander aantal rondes, dan geldt in elk teamblok de route van dat team, en bij Niet ingedeeld de route die de meeste teams rijden. Wijs Racefit aan om de route te zien.",
  "Hangt een race nog niet aan zijn Zwift-event, dan leent Racefit de route van een race in dezelfde week en categorie. Racefit staat dan schuin. Een andere categorie telt nooit mee, want A/B en C/D rijden soms een andere route.",
  "Is er nergens een route bekend, dan is er geen kolom Racefit.",
];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const wkg = (value: number | null | undefined, digits = 2) =>
  value == null ? "–" : value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function exampleRows() {
  const riders = EXAMPLE_RIDERS.map((rider) => ({ key: rider.key, wkg: rider.wkg, weightKg: null }));
  return EXAMPLE_ROUTES.flatMap((route) => {
    const course: RaceCourse | null = courseForRace(route);
    if (!course) return [];
    const scores = racefitScores(riders, course);
    const best = Math.max(...EXAMPLE_RIDERS.map((rider) => scores[rider.key] ?? 0));
    return [{ label: route.label, weights: course.weights, scores, best }];
  });
}

const headCell = "px-2 py-1.5 text-right font-medium first:pl-0 first:text-left last:pr-0";
const bodyCell = "px-2 py-1.5 text-right tabular-nums first:pl-0 first:text-left last:pr-0";

export function RacefitHelp({ id }: { id: string }) {
  const rows = exampleRows();
  return (
    <ModuleGate module="teams">
      <section id={id} className="scroll-mt-20 rounded-lg border bg-card/90 p-5">
        <header className="flex items-start gap-2">
          <Gauge className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Racefit</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Eén W/kg per renner die laat zien hoe goed je vermogen past bij de route van die
              week. Captains en beheerders zien het in de teamindeling zodra de route bekend is.
              Wie sterk is op wat deze route vraagt, scoort hoog; een week later kan dat iemand
              anders zijn.
            </p>
          </div>
        </header>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Zo ontstaat het getal</h3>
          <ol className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium text-foreground">{step.title}.</span> {step.text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Hoe de route de percentages bepaalt</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {ROUTE_RULES.map(([term, text]) => (
              <div key={term} className="sm:grid sm:grid-cols-[7rem_1fr] sm:gap-3">
                <dt className="font-medium">{term}</dt>
                <dd className="text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Wat vier routes vragen</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className={headCell}>Route</th>
                    {DURATIONS.map((duration) => (
                      <th key={duration} scope="col" className={`${headCell} whitespace-nowrap`}>
                        {DURATION_LABELS[duration]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className={`${bodyCell} font-normal`}>{row.label}</th>
                      {DURATIONS.map((duration) => (
                        <td key={duration} className={`${bodyCell} text-muted-foreground`}>
                          {percent(row.weights[duration])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Drie renners op die routes</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className={headCell}>Route</th>
                    {EXAMPLE_RIDERS.map((rider) => (
                      <th key={rider.key} scope="col" className={headCell}>{rider.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className={`${bodyCell} font-normal`}>{row.label}</th>
                      {EXAMPLE_RIDERS.map((rider) => {
                        const score = row.scores[rider.key];
                        return (
                          <td
                            key={rider.key}
                            className={`${bodyCell} ${score === row.best ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                          >
                            {wkg(score)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Voorbeeldrenners, in W/kg over 15 s, 1, 5 en 20 min:{" "}
              {EXAMPLE_RIDERS.map(
                (rider) => `${rider.label.toLowerCase()} ${DURATIONS.map((duration) => wkg(rider.wkg[duration], 1)).join(" / ")}`,
              ).join("; ")}
              .
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Zo lees je het</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {READING_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    </ModuleGate>
  );
}
