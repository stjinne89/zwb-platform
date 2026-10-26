import Link from "next/link";
import {
  Bike,
  Cake,
  ChartNoAxesColumn,
  CheckCircle2,
  Grid3x3,
  Wrench,
} from "lucide-react";
import { GuideCards } from "./guide-cards";

export function ClubHelp() {
  return (
    <>
      <GuideCards ids={["profiel", "privacy", "badges", "cols", "onderhoud", "community", "zwbieb"]} />

      <section
        id="verjaardagsrondje"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Cake className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Verjaardagsrondje en aanmelden</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deel je je verjaardag, dan kun je een verjaardagsrondje plannen met
              datum, tijd, startplek en een GPX-route. Andere leden melden zich
              daar aan.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Onder <strong className="text-foreground">Rijd je
              mee?</strong> tik je op het vak{" "}
              <strong className="text-foreground">Rijdt mee</strong>,{" "}
              <strong className="text-foreground">Misschien</strong> of{" "}
              <strong className="text-foreground">Niet</strong>. Je keuze is
              meteen zichtbaar en je kunt later wisselen.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Op de dag van het rondje verschijnen de aangemelde renners
              (Rijdt mee of Misschien) live op de kaart en het hoogteprofiel,
              net als bij events, mits ze outdoor delen op Samen fietsen.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Alleen de jarige beheert het rondje zelf; aanmelden kan elk
              goedgekeurd lid.
            </span>
          </li>
        </ul>
      </section>

      <section
        id="zwblokken"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Grid3x3 className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWBlokken</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              De kaart is verdeeld in blokken van ongeveer anderhalve kilometer.
              Rijd je door een blok, dan kleurt het in, voor jou én voor de
              club. Zo zie je in één oogopslag welke hoeken je nog nooit gehad
              hebt.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              De blokken komen uit je Strava-ritten. Zonder Strava-koppeling
              blijft je eigen laag leeg; de clubkaart zie je wel.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Zwift-ritten staan onder
              Zwift, los van de kaart buiten.</strong> Per Zwift-wereld kleuren
              blokken van ongeveer 600 meter in, en wie de meeste blokken in een
              wereld heeft, draagt daar de titel. Staan leden gelijk, bijvoorbeeld
              omdat meerdere leden een wereld helemaal gereden hebben, dan wint
              wie daar de meeste kilometers reed. Het percentage gaat over de
              wegen die we van die wereld kennen: rijdt iemand een nieuwe weg,
              dan kan het iets zakken. Een Climb Portal levert geen blokken op:
              die klim ligt buiten de kaart van de wereld. Andere
              indoorplatforms, zoals MyWhoosh, Rouvy en FulGaz, tellen niet mee.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Om je privacy telt het blok waar een rit begint of
              eindigt nooit mee, en laten we ook de eerste en laatste kilometer
              van elke rit buiten beschouwing. Je woonadres komt dus niet als
              opgelicht blok op de kaart.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Hoe donkerder een clubblok, hoe meer verschillende leden er
              geweest zijn. De goudkleurige blokken zijn die van het lid dat je
              in de kiezer hebt staan.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Tik op een blok om te zien welke leden er geweest zijn, met de
              datum waarop ze er voor het eerst reden.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Onder de kaart staat per Europees land hoeveel procent van de
              blokken je gehad hebt, en per provincie in Nederland, België,
              Luxemburg, Duitsland (deelstaten) en Frankrijk (regio&apos;s).
              Ritten buiten Europa kleuren wel op de kaart, maar hebben geen
              gebied in die tabel.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Wie in een land de meeste
              blokken heeft, is er Koning of Koningin; in een provincie
              Gouverneur.</strong> Het gaat om verschillende blokken, niet om
              kilometers: steeds hetzelfde rondje levert niets op. Bij een gelijk
              aantal houdt wie dat aantal het eerst had de titel. Koning of
              Koningin volgt het geslacht in je profiel; staat dat niet ingevuld,
              dan word je Vorst.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Nieuwe ritten komen erbij zodra de Strava-sync gedraaid heeft,
              meestal binnen een half uur.
            </span>
          </li>
        </ul>

        <div className="mt-4">
          <Link
            href="/zwblokken"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Grid3x3 className="size-4 text-primary" />
            Naar ZWBlokken
          </Link>
        </div>
      </section>

      <section
        id="mijn-statistieken"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ChartNoAxesColumn className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn statistieken</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Onder Stats &rarr; Ik staat je eigen ritgeschiedenis: per week,
              maand of jaar, over de laatste 12 maanden tot alles wat je ooit
              gekoppeld hebt. Alleen jij ziet deze pagina.
            </p>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Kies je eigen tegels.</strong>{" "}
              Met Tegels aanpassen zet je tegels aan of uit en zet je ze in je
              eigen volgorde. Je keuze geldt op al je apparaten. Wijs of tik op
              de titel van een tegel voor een korte uitleg, met een link naar
              het artikel in de kennisbank als dat er is.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Club werkt hetzelfde.</strong>{" "}
              Onder Stats &rarr; Club staan dezelfde grafieken en een eigen
              tegelkeuze, opgeteld over alle leden, met ook het aantal actieve
              leden, de kilometers per actief lid (zo zie je of de club meer
              rijdt of vooral groeit) en de ranglijst (op km, uren of
              hoogtemeters; je eigen plek staat in goud). Kies bovenin een maand of jaar om de totalen, de
              ranglijst, disciplines en regio&apos;s op die periode te zetten.
              De clubcijfers worden elke tien minuten bijgewerkt.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Zo lees je een grafiek.</strong>{" "}
              Het grote cijfer bovenaan hoort bij de laatste periode; schuif
              met je vinger of muis over de grafiek en het cijfer loopt mee. Goud
              is de periode waar je naar kijkt en je beste punt. Een streepje
              over een staaf is dezelfde periode een jaar eerder, de
              stippellijn is je gemiddelde, en een gestreepte staaf is een
              periode die nog loopt.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Alles komt uit je ritten op het platform: via Strava, intervals.icu
              of je eigen upload. Bij een upload (CSV, GPX of FIT) bewaren we
              geen vermogen of hartslag, dus die ritten tellen alleen mee voor
              kilometers, uren en hoogtemeters.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Vermogen</strong> toont per
              periode je hoogste en je gemiddelde NP (genormaliseerd vermogen)
              van ritten van minstens twintig minuten met een echte
              vermogensmeter, met je FTP van dat moment als stippellijn. Strava
              schat het vermogen van ritten zonder meter; die schatting telt hier
              niet mee. Een rit met een NP boven 1,2 keer je FTP is een meetfout
              (bijvoorbeeld een verkeerd gekalibreerde trainer) en telt ook niet.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Watt per hartslag</strong> is
              je NP gedeeld door je gemiddelde hartslag, alleen over rustige
              duurritten (tot 85% van je FTP): een race geeft bij hetzelfde hart
              een andere verhouding. Een periode met minder dan twee van die
              ritten blijft leeg. Stijgt de lijn, dan trap je bij dezelfde
              hartslag meer watt: een teken dat je duurvermogen groeit.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Fitheid</strong> is je CTL
              (fitheid, gemiddelde belasting over zes weken), ATL (vermoeidheid,
              over een week) en vorm (het verschil). Heb je intervals.icu
              gekoppeld, dan zie je de waarden van intervals, die ook ritten
              zonder vermogensmeter op hartslag meetellen. Zonder koppeling
              rekenen we ze zelf uit de TSS van je ritten met vermogensmeter.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              De vergelijking met vorig jaar bij Totalen gaat over precies
              dezelfde periode een jaar eerder. Had je toen minder dan drie
              ritten, dan staat er geen pijltje: een percentage zegt dan niets.
              Staat een rit dubbel op het platform (via twee koppelingen), dan
              telt hij één keer.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Met intervals.icu komt er meer
              bij.</strong> intervals.icu kent je hele vermogensmeting, ook van
              ritten die via Strava binnenkwamen. Daaruit tonen we
              Piekvermogen (je beste 5 seconden, 1, 5 en 20 minuten per maand of
              jaar), CP en W&prime; (je kritisch vermogen en je anaerobe reserve,
              per periode berekend uit je beste inspanningen tussen 2 en 20
              minuten), eFTP en gewicht, en je powercurve per jaar over elkaar.
              W/kg rekent met je gewicht van toen. Een week is voor deze tegels
              te kort; per week tonen ze maanden. Zonder koppeling staan ze bij
              Tegels aanpassen op slot.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Tijd per zone, W&prime;bal en
              duurvermogen</strong> rekent intervals.icu uit je meting per rit.
              Dat kan alleen bij ritten die rechtstreeks in intervals.icu staan
              (via Garmin, Wahoo of Zwift); een rit die via Strava binnenkwam
              heeft die gegevens daar niet. Daarom staat onder de tegel hoeveel
              ritten meetellen. De zones zijn je eigen zones uit intervals.icu.
              W&prime;bal toont per periode hoe diep je je anaerobe reserve in
              één rit leegtrok, met je totale arbeid boven FTP als staven.
              Duurvermogen is je decoupling (hoeveel je hartslag ten opzichte van
              je vermogen opliep, alleen ritten van minstens anderhalf uur; lager
              is beter) naast je efficiency factor.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Herstel</strong> (rust-HR,
              HRV en slaap door de tijd) zie je alleen als je de herstel-opt-in
              op ZWBeter Worden aan hebt staan.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Een maand zonder harde inspanningen tussen 2 en 20 minuten heeft
              geen geloofwaardige CP en W&prime;. Die blijft leeg in plaats van
              een dip te tonen die er niet was.
            </span>
          </li>
        </ul>

        <div className="mt-4">
          <Link
            href="/stats/ik"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <ChartNoAxesColumn className="size-4 text-primary" />
            Naar Mijn statistieken
          </Link>
        </div>
      </section>

      <section
        id="mijn-garage"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Wrench className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn fietsen en onderhoud</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zodra je Strava gekoppeld en gesynchroniseerd hebt, kent ZWB je
              fietsen met hun totale kilometerstand. Daarmee toon je je fietsen
              op je profiel en houd je de slijtage van onderdelen bij. Onder
              Zwift-fietsen vul je in welke frames en wielen je in Zwift hebt;
              zie{" "}
              <Link href="/hulp/racen#pacing-zwift" className="underline underline-offset-2">
                pacing in Zwift
              </Link>
              .
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="size-4 text-primary" />
              Fietsen op je profiel
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Naam en kilometers komen rechtstreeks uit Strava (
                  <em>Mijn uitrusting</em>). Koppel daar je fiets aan je ritten,
                  anders blijft de lijst leeg.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Geen fietsen na een sync? Klik op je profiel bij Strava op{" "}
                  <strong className="text-foreground">Opnieuw koppelen</strong>.
                  Voor je uitrusting hebben we eenmalig extra toestemming nodig.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Geen Strava? Voeg met{" "}
                  <strong className="text-foreground">Fiets handmatig
                  toevoegen</strong> zelf een fiets toe met naam, merk/model en
                  eventueel afstand. Handmatige fietsen tonen we wel op je
                  profiel, maar doen niet mee in de onderhoudsfunctie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Onder <strong className="text-foreground">Mijn fietsen</strong>{" "}
                  op je profiel kies je per fiets of die zichtbaar is en zet je
                  er een eigen foto bij. Virtuele fietsen staan standaard aan;
                  gearchiveerde fietsen standaard uit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Zichtbare fietsen verschijnen ook op je ledenprofiel, zodat
                  clubgenoten zien waarop je rijdt.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="size-4 text-primary" />
              Slijtage bijhouden
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Voeg in <strong className="text-foreground">Mijn garage</strong>{" "}
                  een onderdeel toe (ketting, cassette, banden, remblokken …) en
                  kies een slijtage-range: <em>enige</em>, <em>normale</em> of{" "}
                  <em>hoge</em> slijtage. Elke range heeft een richt-aantal
                  kilometers dat je mag overschrijven met een eigen drempel.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De gereden kilometers van een onderdeel = de stand van de fiets
                  nu min de stand bij montage. Monteer je een al gebruikt
                  onderdeel, vul dan &ldquo;al gereden km&rdquo; in.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De balk kleurt groen, oranje (bijna) en rood (toe aan
                  vervanging). Onderdelen die opvallen verschijnen ook op je
                  dashboard.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Vervangen? Klik op <strong className="text-foreground">Vervangen</strong>;
                  de teller begint dan opnieuw vanaf de huidige stand.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/mijn-garage"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Wrench className="size-4 text-primary" />
            Naar Mijn garage
          </Link>
          <Link
            href="/profiel?weergave=bewerken#fietsen"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Bike className="size-4 text-primary" />
            Mijn fietsen
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Zet onder Profiel → Meldingen de optie{" "}
          <strong className="text-foreground">Mijn garage: onderdeel toe aan
          vervanging</strong> aan om hierover een pushmelding te krijgen.
        </p>
      </section>
    </>
  );
}
