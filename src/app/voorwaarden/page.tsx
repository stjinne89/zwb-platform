import Link from "next/link";
import { BackLink } from "@/components/app-ui";

export const metadata = {
  title: "Gebruikersvoorwaarden — ZWB Cycling",
  description:
    "De afspraken voor het gebruik van het ZWB Cycling-platform: waar het onderhoudsadvies wel en niet voor is, en hoe we omgaan met citaten en tips van leden.",
};

const UPDATED = "18 augustus 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function VoorwaardenPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Gebruikersvoorwaarden</h1>
        <p className="text-sm text-muted-foreground">
          Laatst bijgewerkt: {UPDATED}. Deze voorwaarden gelden voor iedereen die
          het ZWB Cycling-platform gebruikt. Voor gegevensverwerking geldt
          daarnaast de{" "}
          <Link href="/privacy" className="text-primary underline">
            privacyverklaring
          </Link>
          .
        </p>
      </header>

      <Section title="1. Waar dit platform voor is">
        <p>
          Het platform is er voor de leden van ZWB Cycling: kalender, training,
          teams, materiaal en onderling contact. Je account is persoonlijk. Je
          krijgt toegang na goedkeuring door het bestuur en die toegang kan bij
          misbruik worden ingetrokken.
        </p>
      </Section>

      <Section title="2. Mijn garage is een wekker, geen keuring">
        <p>
          Mijn garage rekent op basis van je kilometerstand en de tijd sinds
          montage uit wanneer een onderdeel <em>waarschijnlijk</em> aan vervanging
          toe is. Dat is een geheugensteun, geen technische keuring en geen
          veiligheidsgarantie.
        </p>
        <p>
          De gebruikte intervallen zijn richtwaarden uit vakmedia en
          fabrikantsopgaven. De werkelijke slijtage hangt af van weer, terrein,
          gewicht, onderhoud en materiaalkeuze, en verschilt daarin makkelijk een
          factor tien. Een melding kan dus te vroeg of te laat komen, en het
          uitblijven van een melding zegt niets over de staat van je fiets.
        </p>
        <p>
          Blijf zelf kijken en voelen, en meet waar dat kan: een ketting met een
          kettingmeter, remblokken op dikte. Twijfel je, ga dan naar een
          fietsenmaker. Je blijft zelf verantwoordelijk voor de staat en de
          veiligheid van je fiets. ZWB Cycling is niet aansprakelijk voor schade
          die ontstaat doordat je op het advies in deze module bent afgegaan.
        </p>
      </Section>

      <Section title="3. Tips en citaten">
        <p>
          Bij de onderdelen in Mijn garage staan tips uit drie bronnen: algemene
          onderhoudskennis, samenvattingen van openbaar gepubliceerd advies met
          een verwijzing naar de bron, en uitspraken van ZWB-leden uit de
          clubgroepen. Bij ZWBieb staan tips van leden zelf, per onderwerp
          en soms bij een event of col.
        </p>
        <p>
          Plaats je iets in een ZWB-groepsapp, dan kan het bestuur dat als citaat
          of als tip bij ZWBieb overnemen in het platform, met je naam
          erbij. Je ziet je eigen citaten en tips altijd terug en je kunt ze zelf
          aanpassen of verwijderen — zonder dat je iemand om toestemming hoeft te
          vragen. Verwijder je er een, dan verdwijnt hij meteen uit de app. Je
          kunt ook vragen om helemaal geen citaten of tips van jou op te nemen.
        </p>
        <p>
          Hetzelfde geldt voor een antwoord dat je in een gesprek bij ZWBieb
          geeft: het lid dat je vraag stelde, of aan wie je antwoordde, kan dat
          als tip voor de club bewaren, onder jouw naam. Je krijgt daar een
          melding van en kunt de tip zelf aanpassen of verwijderen.
        </p>
        <p>
          Tips zijn ervaringen van fietsers, geen professioneel advies. Wat voor
          de een werkt, werkt niet per se voor jou.
        </p>
      </Section>

      <Section title="3a. Spullen lenen via ZWBieb">
        <p>
          Bij ZWBieb kun je laten weten welke spullen je wilt uitlenen aan een
          ander ZWB-lid. Wat je afspreekt, regelen jullie samen: ophalen,
          terugbrengen, een vergoeding en wat er gebeurt bij schade of verlies.
          ZWB is geen partij bij die afspraak en is niet aansprakelijk voor de
          spullen.
        </p>
      </Section>

      <Section title="4. Trainingsschema's">
        <p>
          De trainingsschema&apos;s in ZWBeter Worden worden deels automatisch
          opgesteld en door een trainer van de club beoordeeld. Het is
          sportbegeleiding, geen medisch advies. Heb je klachten, gebruik je
          medicatie of twijfel je over je belastbaarheid, overleg dan met een
          arts of sportarts voordat je een schema volgt.
        </p>
      </Section>

      <Section title="5. Wat je zelf plaatst">
        <p>
          Je bent verantwoordelijk voor wat je plaatst: ritverslagen, foto&apos;s,
          tips, berichten, reacties en vragen in Q&amp;A. Plaats geen materiaal waarvan je de rechten niet
          hebt, en geen foto&apos;s van anderen die daar bezwaar tegen hebben. Het
          bestuur kan bijdragen verwijderen die kwetsend zijn, de club schaden of
          in strijd zijn met de wet.
        </p>
      </Section>

      <Section title="6. Gegevens uit gekoppelde diensten">
        <p>
          Koppel je Strava, intervals.icu of Zwift, dan haalt het platform met
          jouw toestemming gegevens uit die dienst op. Je kunt een koppeling op
          elk moment verbreken; wat er daarna met de reeds opgehaalde gegevens
          gebeurt, staat in de{" "}
          <Link href="/privacy" className="text-primary underline">
            privacyverklaring
          </Link>
          . Voor de diensten zelf gelden hun eigen voorwaarden.
        </p>
      </Section>

      <Section title="7. Beschikbaarheid">
        <p>
          Dit platform wordt door vrijwilligers gebouwd en beheerd. We doen ons
          best, maar er is geen garantie dat alles altijd werkt of dat gegevens
          nooit verloren gaan. Bewaar belangrijke gegevens dus ook elders.
        </p>
      </Section>

      <Section title="8. Wijzigingen">
        <p>
          Deze voorwaarden kunnen veranderen als het platform verandert. Bij een
          ingrijpende wijziging melden we dat in de app. De datum bovenaan geeft
          aan wanneer deze tekst voor het laatst is bijgewerkt.
        </p>
      </Section>

      <footer className="border-t pt-6 text-sm">
        <BackLink href="/" label="ZWB Cycling" />
      </footer>
    </main>
  );
}
