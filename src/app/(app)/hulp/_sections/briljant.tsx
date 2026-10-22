import Link from "next/link";
import { Gem } from "lucide-react";
import { FACET_WEIGHTS, LEVELS, powerAnchors } from "@/lib/briljant/norms";
import { FACETS, FACET_LABELS, FACET_MEASURES } from "@/lib/briljant/score";

const pct = (value: number) => `${(value * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;
const wkg = (value: number) => value.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * ZWBriljant op /hulp (het anker zwbriljant staat in training.tsx): wat de steen laat zien, waar de punten vandaan komen en
 * de formules. Op de pagina zelf staan alleen de waarden (eigenaar, 2026-10-21).
 */
export function BriljantHelp() {
  const man = powerAnchors("m20", "man");
  const vrouw = powerAnchors("m20", "vrouw");
  return (
    <section className="rounded-lg border bg-card/90 p-5">
      <header className="flex items-start gap-2">
        <Gem className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 className="font-semibold">ZWBriljant: je niveau als edelsteen</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Eén score in punten uit zeven onderdelen: vier duren vermogen, durability, fitheid en racen. De vorm van
            je steen is je profiel, de grootte je score, de kleur je klasse.
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article id="zwbriljant-instellen" className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">Zo haal je het meeste uit je steen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Elk onderdeel dat ontbreekt, telt niet mee. Met dit staat alles erin:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">intervals.icu koppelen</strong> in ZWBeter. Daaruit komen sprint,
              anaeroob, VO2max, drempel, fitheid en je hele historie voor de datumkiezer.
            </li>
            <li>
              <strong className="text-foreground">De twee kJ-standen in intervals.icu op 1000 en 2000 kJ</strong>,
              voor durability. Hoe dat moet staat bij{" "}
              <Link href="/hulp/training#vermogen" className="underline underline-offset-2">
                Mijn vermogen
              </Link>
              . Zonder die standen blijft durability leeg.
            </li>
            <li>
              <strong className="text-foreground">Je gewicht bijhouden in intervals.icu.</strong> Alle vermogens
              tellen in W/kg; per maand gebruiken we het gewicht dat daar toen stond.
            </li>
            <li>
              <strong className="text-foreground">Je Zwift-ID op je profiel</strong>, voor racen (je Zwift Racing
              Score).{" "}
              <Link href="/hulp/koppelen#zwift-id" className="underline underline-offset-2">
                Waar vind ik die?
              </Link>
            </li>
            <li>
              <strong className="text-foreground">Je geslacht op je profiel.</strong> Vrouwen hebben eigen
              ijkwaarden; zonder geslacht rekenen we met die voor mannen.
            </li>
            <li>
              <strong className="text-foreground">Strava koppelen</strong>, zodat je ritten binnenkomen. Daaruit komt
              je consistentie.
            </li>
            <li>
              <strong className="text-foreground">Een schema in ZWBeter.</strong> Dan meet consistentie tegen je
              geplande uren; zonder schema tegen je eigen gebruikelijke weekuren.
            </li>
          </ol>
          <Link
            href="/profiel?weergave=bewerken"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Naar je profiel
          </Link>
        </article>

        <article className="rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">De klassen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Namen en kleuren van de vELO-klassen van ZwiftRacing.app, met 100 punten per klasse. Elk onderdeel heeft
            per klasse een eigen ijkwaarde; hieronder die van het drempelvermogen (beste 20 minuten). Koper is alles
            onder de eerste grens. Diamant is zwaar maar haalbaar; daarboven telt de score gewoon door, en de records
            liggen ver boven Diamant.
          </p>
          <table className="mt-3 w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Klasse</th>
                <th className="py-1 font-medium">Vanaf</th>
                <th className="py-1 text-right font-medium">Man</th>
                <th className="py-1 text-right font-medium">Vrouw</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr key={level.n} className="border-t">
                  <td className="py-1">
                    <span className="mr-2 inline-block size-2.5 rotate-45" style={{ background: level.color }} />
                    {level.name}
                  </td>
                  <td className="py-1">{level.n * 100}</td>
                  <td className="py-1 text-right">{level.n === 0 ? "—" : `${wkg(man.levels[level.n - 1])} W/kg`}</td>
                  <td className="py-1 text-right">{level.n === 0 ? "—" : `${wkg(vrouw.levels[level.n - 1])} W/kg`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Vermogen en fitheid volgen de spreiding onder renners: Goud is het gemiddelde, elke klasse een halve
            standaarddeviatie verder, tot Diamant op drie boven het gemiddelde (ongeveer de beste 1 op 1000).
            Inschattingen van ZWB; geen studie koppelt vermogen aan klassen.
          </p>
        </article>

        <article className="rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Onderdelen en gewichten</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {FACETS.map((facet) => (
                <tr key={facet} className="border-t first:border-t-0">
                  <td className="py-1">{FACET_LABELS[facet]}</td>
                  <td className="py-1 text-muted-foreground">
                    {FACET_MEASURES[facet].what} ({FACET_MEASURES[facet].unit})
                  </td>
                  <td className="py-1 text-right tabular-nums">{pct(FACET_WEIGHTS[facet])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted-foreground">
            Vermogen telt samen voor de helft, met 5 minuten het zwaarst: dat voorspelt uitslagen het best. Fitheid
            telt voor 15%, zodat de steen ook laat zien hoe fit je bent. De score telt ze op: een onderdeel zonder gegevens telt voor 0. Met minder dan vier
            onderdelen is er nog geen steen.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nodig: intervals.icu voor vermogen, durability en fitheid, je Zwift-ID voor racen en je ritten voor de
            consistentie.
          </p>
        </article>

        <article className="rounded-md border bg-background p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">Terugkijken en vergelijken</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[11rem_1fr]">
            <dt className="font-medium">Datum</dt>
            <dd className="text-muted-foreground">
              Kies een datum en je ziet je steen van die maand of week, terug tot de eerste maand met CTL in
              intervals.icu. We bewaren alleen punten; de W/kg, CTL en ZRS rekenen we daaruit terug. Je ZRS van toen zoekt
              de wekelijkse job op in je eerdere race-uitslagen bij Zwift; tot dat klaar is, en voor maanden zonder
              score, staat er je huidige ZRS. Durability rekent ook in het verleden met je huidige
              kJ-drempels uit intervals.icu. Met Waarden en Punten wissel je wat de labels tonen.
            </dd>
            <dt className="font-medium">Ik, ZWB en Vergelijken</dt>
            <dd className="text-muted-foreground">
              Bovenaan kies je tussen drie tabbladen. Ik is je eigen steen, met de datum. ZWB is de zaal: een museum
              met alle stenen die je mag zien op een rij sokkels, van laag naar hoog met de recordsteen achteraan.
              Scroll of sleep erlangs; klik op het bordje op een sokkel om die steen los te bekijken. Vergelijken
              zet twee stenen naast elkaar: standaard de jouwe tegen het ZWB-gemiddelde, maar links en rechts kies
              je zelf uit jij, het ZWB-gemiddelde, je mooiste steen (de week met je hoogste score), de records en
              de leden, dus ook twee leden tegen elkaar. Onderin staat in een paar zinnen waar het verschil zit; klik op de
              tweede steen voor de onderdelen naast elkaar. Van anderen zie je alleen punten.
            </dd>
            <dt className="font-medium">Records</dt>
            <dd className="text-muted-foreground">
              De grootste steen: elk onderdeel op de recordwaarde, dus precies Diamant. Profs publiceren hun data
              zelden, dus de records zijn onderbouwde berekeningen; waar de houder bekend is, staat de naam erbij.
            </dd>
            <dt className="font-medium">Delen</dt>
            <dd className="text-muted-foreground">
              Alle leden zien standaard je laatste steen: punten per onderdeel en je consistentie, geen metingen. Zet
              &ldquo;Mijn ZWBriljant-steen delen met leden&rdquo; bij Zichtbaarheid in je profiel uit om hem te
              verbergen; dat werkt meteen. Wie zijn steen verbergt, ziet ook die van andere leden niet; het
              ZWB-gemiddelde en de records blijven.
            </dd>
            <dt className="font-medium">ZWB-gemiddelde</dt>
            <dd className="text-muted-foreground">
              Per onderdeel het gemiddelde van de laatste steen van iedereen met ZWBriljant uit de afgelopen acht
              weken, anoniem en pas vanaf vijf leden.
            </dd>
            <dt className="font-medium">Hier win je het meest</dt>
            <dd className="text-muted-foreground">
              Klik op je score: per onderdeel rekenen we uit wat 5% beter je oplevert (5% minder verval bij
              durability), met de gewichten en je consistentie. Een zwaar onderdeel of een onderdeel net onder een
              grens wint het meest.
            </dd>
          </dl>
        </article>

        <article className="rounded-md border bg-background p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">De formules</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[11rem_1fr]">
            <dt className="font-medium">Punten per onderdeel</dt>
            <dd className="text-muted-foreground">
              Tussen twee grenzen loopt de schaal recht:{" "}
              <code className="rounded bg-muted px-1">
                lage grens + (meting − meting lage grens) ÷ (meting hoge grens − meting lage grens) × 100
              </code>
              . Voorbij Diamant loopt de laatste lijn door. Bij durability is minder verval beter. Racen is één rechte
              lijn: elke ZRS is een punt.
            </dd>
            <dt className="font-medium">Profielscore</dt>
            <dd className="text-muted-foreground">
              De optelling van gewicht × punten per onderdeel, met de gewichten hierboven. Een onderdeel zonder
              gegevens telt voor 0.
            </dd>
            <dt className="font-medium">Consistentie</dt>
            <dd className="text-muted-foreground">
              <code className="rounded bg-muted px-1">R × (0,5 + 0,5 × V) × N</code>, altijd tegen je eigen norm: R is
              het deel van de laatste twaalf weken waarin je minstens 60% van je norm haalde: in TSS als intervals.icu je
              trainingsbelasting geeft, anders in uren (per week wat je schema plande, zonder schema je eigen mediaan;
              niet je beschikbaarheid, want dat is een plafond),
              V = 1 − e<sup>−reeks/12</sup> voor het aantal weken op rij, N het deel
              van je geplande trainingstijd dat je deed. Meer dan je norm telt als gehaald, een geplande herstelweek
              breekt de reeks niet.
            </dd>
            <dt className="font-medium">Score</dt>
            <dd className="text-muted-foreground">
              <code className="rounded bg-muted px-1">profielscore × (0,8 + 0,2 × consistentie)</code>. Helemaal
              consistent houdt je je volle profielscore; zonder ritgegevens telt consistentie niet. Het gouden
              draadmodel om de steen is je steen bij volledige consistentie.
            </dd>
          </dl>
          <Link
            href="/stats/zwbriljant"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open ZWBriljant
          </Link>
        </article>
      </div>
    </section>
  );
}
