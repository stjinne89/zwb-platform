import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Gauge,
  HeartPulse,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  DATA_FRESHNESS_HELP,
  INTERVALS_CONNECT_STEPS,
} from "../_data";
import { BriljantHelp } from "./briljant";
import { GuideCards } from "./guide-cards";

export function TrainingHelp() {
  return (
    <>
      <GuideCards ids={["training"]} />

      <section
        id="trainingsruimte"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <HeartPulse className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              Form, herstel en je ZWBeterWorden-advies
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Deze waarden beantwoorden verschillende vragen. Daarom kunnen ze
              van elkaar afwijken zonder dat de data fout is. ZWB voegt ze samen
              in één praktisch advies:{" "}
              <strong className="text-foreground">ZWBeterWorden</strong>, met vijf
              niveaus van &ldquo;doe niks&rdquo; tot topvorm.
            </p>
          </div>
        </header>

        <div className="mt-5 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">intervals.icu koppelen</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {INTERVALS_CONNECT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-foreground">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href="https://intervals.icu/settings#api"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open intervals.icu API-instellingen
          </a>
        </div>

        <div className="mt-5 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Data blijft achter of komt niet binnen</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {DATA_FRESHNESS_HELP.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/zwbeter-worden/belasting"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Bekijk wanneer je data voor het laatst is opgehaald
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" />
              Form
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Form is de trainingsbalans uit intervals.icu:
              <strong className="text-foreground"> CTL min ATL</strong>. CTL is
              je belasting over langere tijd en ATL je recente belasting.
              Negatief betekent dus dat je recent relatief veel hebt getraind.
              Het zegt niet rechtstreeks hoe je hebt geslapen of hoe je lichaam
              vandaag reageert.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HeartPulse className="size-4 text-primary" />
              Hersteltrend en readiness
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De hersteltrend vergelijkt het gemiddelde van je HRV en
              rusthartslag over de laatste week met je eigen normale band: wat
              je de dertig dagen daarvoor gewoon was, met een marge die past bij
              hoe sterk jouw metingen schommelen. Slaap, de readiness van vandaag
              en hoe je je ritten van de laatste dagen beoordeelde, wegen mee.
              Readiness is een dagsignaal uit intervals.icu; HRV, rusthartslag
              en slaap worden als zevendaagse trend bekeken. Een gunstige HRV
              kan daardoor naast een middelmatige readiness staan. Meer in de
              kennisbank:{" "}
              <Link href="/zwbeter-worden/kennis/herstel-meten" className="underline">
                Herstel meten
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Is de readiness van vandaag nog niet binnen, dan zie je de laatste
              meting met de datum erbij, maar die telt niet mee in je advies. Pas
              je je training van vandaag aan, dan haalt ZWB eerst je nieuwste
              hersteldata op. Heb je vandaag al gereden, dan komt er geen tweede
              training op die dag bij.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Als je hersteldata deelt, gebruikt ZWB slaap, HRV en rusthartslag
              uit intervals.icu voor trainingsplanning. Alleen jij en je trainer
              zien deze data.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-primary" />
              ZWBeterWorden
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ZWB combineert belasting en herstel tot één advies in vijf
              niveaus. Een sterk negatieve Form of readiness van 50 of lager duwt
              je naar een laag niveau (rust/herstel). Readiness 51-69 telt als
              matig. Pas wanneer belasting én herstel gunstig zijn, klim je naar
              de hoogste niveaus met ruimte voor kwaliteit.
            </p>
          </article>
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-semibold">DOE NIKS</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Je bent aan het overtrainen, geef je partner even wat aandacht
              ofzo.
            </p>
          </div>
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3">
            <p className="text-sm font-semibold">RICHT OP HERSTEL</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ga maar lekker vogeltjes kijken.
            </p>
          </div>
          <div className="rounded-md border border-zwb-petrol/50 bg-zwb-petrol/10 p-3">
            <p className="text-sm font-semibold">ALLEEN DUUR</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Je mag wel gaan fietsen, maar geen heftige intervallen.
            </p>
          </div>
          <div className="rounded-md border border-zwb-teal/50 bg-zwb-teal/10 p-3">
            <p className="text-sm font-semibold">FRIS GENOEG</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ga er maar lekker op uit en blokjes mogen ook, vergeet de chocomelk
              niet na afloop.
            </p>
          </div>
          <div className="rounded-md border border-zwb-gold/50 bg-zwb-gold/10 p-3">
            <p className="text-sm font-semibold">BETER WORDT HET NIET</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Alles mag, probeer die andere ZWB&apos;ers er vandaag maar vanaf te
              rijden.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Voorbeeld:</strong> Form -14,
          readiness 66 en een goede HRV-trend betekent niet dat je volledig fris
          bent. De HRV is positief, maar recente trainingsbelasting en
          middelmatige readiness houden je in het middensegment. Je
          ZWBeterWorden-advies wordt dan niveau 3 &ldquo;ALLEEN DUUR&rdquo;.
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Coachchat</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Snap je niet waarom er vandaag negentig minuten staat terwijl je twee
            uur hebt? Vraag het in de coachchat. De coach kent je schema, je doel
            en de &ldquo;Let op&rdquo;-regels die bij je schema horen, en legt uit
            waarom er staat wat er staat. Hij verandert zelf niets.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hij kent ook je trainingsdata: je laatste ritten met hun belasting, je
            belasting per week, je FTP, FTP-tests en vermogenscurve, wat je van je
            schema werkelijk reed, en je CTL, ATL en TSB als je intervals.icu hebt
            gekoppeld. Vragen als &ldquo;hoeveel reed ik de afgelopen maand?&rdquo;
            of &ldquo;was zaterdag zwaar genoeg?&rdquo; kunnen dus ook. Wat nog niet
            uit Strava binnen is, ziet hij niet. Intensiteit (IF) rekenen we alleen
            uit bij een echte vermogensmeter; zonder meter komt de belasting (TSS)
            uit je hartslag, als je intervals.icu hebt gekoppeld. Elke rit rekent
            met de FTP die op die dag gold, dus een nieuwe FTP verandert de
            belasting van eerdere ritten niet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Vragen over trainen, voeding of kracht beantwoordt hij met de
            kennisbanken van ZWB, met een link naar het artikel waar zijn antwoord
            op steunt. Zegt de kennisbank er niets over, dan zegt hij dat erbij.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Vink je <strong className="text-foreground">Dit raakt mijn schema</strong>{" "}
            aan, dan vraagt je bericht een herziening aan en gaat de tekst mee naar
            de volgende versie van je schema. Handig voor dingen die de app niet
            kan zien: een week ziek geweest, een doel dat verschuift.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Met <strong className="text-foreground">Onthoud als voorkeur</strong>{" "}
            leg je je bericht blijvend vast: het gaat dan in elk volgend schema
            mee. Zie{" "}
            <Link href="/hulp/schema#uitgangspunten" className="underline hover:text-primary">
              uitgangspunten
            </Link>
            .
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Het gesprek blijft staan en de trainers die jij hebt aangewezen lezen
            het terug en kunnen erin reageren. Het bestuur niet. Over pijn,
            blessures of ziekte geeft de coach geen advies; daarvoor ga je naar je
            trainer of een arts.
          </p>
          <Link
            href="/zwbeter-worden/coach"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open de coachchat
          </Link>
        </div>

      </section>

      <section
        id="vermogen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Zap className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn vermogen en de powercurve</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              De powercurve toont je beste gemiddelde vermogen voor iedere duur
              binnen de gekozen periode. Je eigen curve komt live uit
              intervals.icu.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article
            id="watt-wkg"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Watt, W/kg of % FTP</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met de knop Watt / W/kg / % FTP bovenaan ZWBeter Worden kies je hoe
              vermogen overal in de trainingsruimte staat: je FTP, de
              testuitslagen, de doelen in de blokken en het vermogen van gereden
              trainingen. De keuze geldt op dit apparaat. W/kg rekent met het
              gewicht uit je profiel; staat daar niets, dan blijft het watt. Een
              training die je vanaf september 2026 afrondt, onthoudt je gewicht
              van die dag; oudere trainingen en testuitslagen rekenen met je
              huidige gewicht. De doelen in de blokken rekenen we om met de FTP
              uit je profiel, welke vorm de training zelf ook gebruikt; staat
              daar geen FTP, dan zie je het doel zoals het is opgeschreven.
              % FTP geldt alleen voor die doelen: je FTP, testuitslagen en
              gereden vermogen staan dan in watt. Bekijkt je trainer jouw
              schema, dan rekent die met jouw gewicht en FTP.
            </p>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">De grafiek gebruiken</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Kies 6 weken of 90 dagen voor je recente vorm, of all-time voor
                  je beste vermogens uit je volledige Intervals-historie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Beweeg over de lijn voor de exacte duur en waarde. Watt toont
                  je beste absolute vermogen. Voor je eigen W/kg-lijn gebruikt
                  ZWB het historische W/kg-record dat Intervals voor die duur
                  heeft opgeslagen, dus met het gewicht rond die prestatie.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Korte duren zeggen meer over sprint en punch; 5-20 minuten
                  over VO2max, klimmen en tijdritvermogen.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Vergelijken met ZWB</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De ZWB-mediaan en ledenkeuze gebruiken de volledige
              gesynchroniseerde 90-daagse powercurve van leden met een
              voltooide intervals.icu-koppeling. Daardoor vergelijk je niet
              alleen 15s, 30s, 1m, 2m, 5m, 10m en 20m, maar de hele lijn.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Profielen die nog niet opnieuw zijn gesynchroniseerd na deze
              uitbreiding vallen tijdelijk terug op die zeven vaste waarden.
              Na een nieuwe sync wordt hun volledige curve opgeslagen. Alleen
              ingelogde ZWB-leden kunnen deze vergelijking zien.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Volledig gesynchroniseerde W/kg-curves gebruiken de historische
              W/kg-records van Intervals per duur. Oude fallback-profielen
              gebruiken tot hun volgende sync het laatst gesynchroniseerde
              gewicht.
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Vermogen na arbeid (kJ)</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Onder de curve staat een schuifje. Links staat je verse curve,
            rechts je vermogen nadat je in een rit een bepaalde hoeveelheid
            arbeid hebt geleverd. Zo zie je hoeveel vermogen je overhoudt als je
            moe wordt.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            De standen komen uit je eigen intervals.icu-instellingen. Zet ze op
            1000 en 2000 kJ: open intervals.icu, ga naar Power, klik boven de
            powercurve op de knoppen met &quot;? kJ&quot; en vul 1000 en 2000
            in. Intervals rekent de curves daarna door; dat duurt een paar
            minuten.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Iedereen die 1000 en 2000 kJ gebruikt, vergelijkt in dezelfde stand
            met de ZWB-mediaan en met andere leden. Wie andere waarden of niets
            heeft ingesteld, doet in die stand niet mee aan de vergelijking.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Klik na het instellen op Mijn vermogen op &quot;Mijn waarden
            ophalen&quot;, zodat je vermoeide curves ook in de clubvergelijking
            terechtkomen.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">
            Waarom Watt en W/kg niet altijd dezelfde rit tonen
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Intervals houdt per duur twee records bij: het hoogste absolute
            vermogen en het hoogste vermogen per kilogram. Een iets lager
            Watt-record bij een lager lichaamsgewicht kan dus je beste W/kg
            zijn. Daarom kunnen de Watt- en W/kg-lijn voor dezelfde duur naar
            verschillende activiteiten verwijzen.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Waarom de lijn altijd daalt</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Een maximaal gemiddeld vermogen kan bij een langere duur nooit hoger
            zijn dan bij een kortere duur. ZWB verwijdert daarom ongeldige losse
            punten uit de API-respons en maakt minieme afrondingssprongen vlak.
            Een echte prestatie blijft zichtbaar, maar een technische piek of
            dip hoort niet in de curve.
          </p>
          <Link
            href="/zwbeter-worden/vermogen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Mijn vermogen
          </Link>
        </div>
      </section>

      <div id="zwbriljant" className="scroll-mt-20">
        <BriljantHelp />
      </div>

      <section
        id="strava-samenvatting"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              ZWBeter Worden-samenvatting in je Strava-omschrijving
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Na een rit zet ZWB automatisch een blokje onderaan de omschrijving
              van die rit op Strava. Je ziet in één oogopslag wat er gepland
              stond, wat je er werkelijk van maakte en hoe je ervoor staat.
            </p>
          </div>
        </header>

        <div className="mt-5 rounded-md border bg-background p-4">
          <pre className="overflow-x-auto whitespace-pre text-xs text-muted-foreground">
{`📊 ZWBeter Worden
Gepland: 3x10 min drempel
Geplande duur: 75 min
Gedetecteerd type: Drempel
Workout score: +8% (82 vs 76 TSS)
📈 Progressie
CTL: 49,9
Gereedscore: 72 (niveau 4 – FRIS GENOEG)
Fitness-status: Verbeterend`}
          </pre>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Wat je ervoor moet doen</h3>
            <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                1. Koppel Strava opnieuw via{" "}
                <Link href="/profiel?weergave=bewerken" className="underline">
                  je profiel
                </Link>{" "}
                en laat het vinkje staan waarmee ZWB je activiteiten mag
                bijwerken. Zonder dat recht blijft de omschrijving leeg.
              </li>
              <li>
                2. Koppel intervals.icu op de{" "}
                <Link href="/zwbeter-worden/doelen" className="underline">
                  Doelen-pagina
                </Link>
                . Daar komen de belasting, CTL en gereedscore vandaan.
              </li>
              <li>
                3. Zet een schema klaar. Zonder geplande workout blijven
                &ldquo;Gepland&rdquo; en &ldquo;Workout score&rdquo; op
                &ldquo;-&rdquo;.
              </li>
            </ol>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Goed om te weten</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                Je eigen tekst blijft staan; de samenvatting komt eronder.
              </li>
              <li>
                Haal je de samenvatting weg, dan zetten we hem niet terug.
              </li>
              <li>
                Het blokje verschijnt pas als intervals.icu je rit heeft
                verwerkt, meestal binnen een uur.
              </li>
              <li>
                Wie jouw Strava-rit kan zien, ziet ook deze samenvatting. Je
                slaap- en HRV-data komen er nooit in, alleen de score die daaruit
                volgt.
              </li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
