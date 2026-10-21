import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Dumbbell,
  ListChecks,
  Utensils,
} from "lucide-react";

export function KennisHelp() {
  return (
    <>
      <section
        id="protocollen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Protocollen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een protocol is iets wat je uitvoert: je start het, krijgt per dag
              taken en vinkt die af. De kennisbank legt uit waarom iets werkt; een
              protocol zegt wat je wanneer doet.
            </p>
          </div>
        </header>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Trainen en voeden</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Bij trainen staan hittetraining (kort voor een warme wedstrijd, of vijf
            weken voor meer hemoglobine), lage cadans bij VO2max en sprints,
            ademspiertraining, een maandelijkse duurtest, kracht op de fiets, twee
            blokweken (drempel of 30/15) en brain endurance training. Bij voeding staan protocollen voor de wedstrijddag
            (cafeïne, natriumbicarbonaat, nitraat, ijsslush, glycerol,
            koolhydraten laden), voor de opbouw (bèta-alanine, creatine,
            darmtraining, met een vervolg naar 150 gram per uur), voor herstel (herstellen na een zware wedstrijd,
            kersensap) en voor je gezondheid (vitamine D in de winter, collageen
            bij revalidatie). Elk protocol noemt hoe sterk het bewijs is, wat het
            niet laat zien en de bronnen. Wat geen protocol kreeg, zoals visolie,
            probiotica of magnesium, staat met de reden in de kennisbank voeding.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Een protocol naar een wedstrijd hangt aan de wedstrijddag: kies een
            mikpunt uit je jaarplan of een datum, en de app rekent terug wanneer je
            begint. Doses staan per kilo lichaamsgewicht; staat je gewicht in je
            profiel, dan rekent de app ze voor je om.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">In je schema</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Op Vandaag staan al je lopende protocollen, met de fase, hoever je
            bent en de taken van vandaag. Hitte en de wedstrijddag staan
            als label in de maandweergave van je schema. Een protocol telt niet mee
            in je trainingsbelasting en gaat niet naar intervals.icu. Bij hitte en
            lage cadans houdt de AI-coach er rekening mee in het volgende schema of
            de volgende aanpassing: warme duurritten op hittedagen, en de cadans in
            de notitie van je VO2max- en sprintblokken.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Bewijsniveau</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Elk kennisartikel en elk protocol zegt hoe gegrond het advies is, in
            alle kennisbanken op dezelfde manier. Stevig onderbouwd: een
            consensusstuk of richtlijn, meerdere meta-analyses, of minstens drie
            onafhankelijke onderzoeksgroepen die het eens zijn. Onderbouwd: meerdere
            studies in dezelfde richting, maar klein of van één groep. Eerste
            aanwijzingen: een paar kleine studies, of het mechanisme klopt.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gepubliceerde metingen in een windtunnel, op een testbank of op de weg
            tellen ook als bewijs. Hooguit onderbouwd is het als het onderzoek alleen
            een tussenmaat meet (zoals een bloedwaarde), niet bij duursporters is
            gedaan, of alleen op een pop, een testbank of in een computermodel.
            Spreken even goede studies elkaar tegen, dan zijn het eerste
            aanwijzingen.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Is de conclusie dat iets niet helpt, dan staat dat in de badge,
            bijvoorbeeld &ldquo;Stevig onderbouwd: geen effect&rdquo;. Schaadt het je
            prestatie, dan staat er &ldquo;nadelig&rdquo;. De AI-coach weegt zijn
            antwoord naar het niveau.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Nieuwe methode</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Sommige workouts, protocollen en kennisartikelen hebben het label Nieuwe
            methode: een methode uit recent onderzoek die geen standaardtraining is.
            Het label zegt niet hoe goed het werkt; dat zegt het bewijsniveau
            ernaast. Het staat bij de workout in je schema en vooraan in de
            beschrijving in intervals.icu en Zwift.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            De AI-coach gebruikt drie van die methodes ook zonder protocol: korte
            sprintsessies als onderhoud in een week met weinig tijd, één rustige
            rit met sprints per week in de rustige weken na je laatste doel van het
            seizoen, en af en toe een VO2max-sessie met een snelle start of
            wisselend vermogen. Bij een blokweek zet de coach vijf of zes sessies
            in één week en daarna zes rustige dagen.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Duurtest</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Volg je de Duurtest, dan plant de AI-coach eens per vier weken een
            training met de titel Duurtest: een uur op 75 % van je FTP. Na de rit
            staat op de protocolpagina hoeveel je hartslag in dat uur wegliep van
            je vermogen (ontkoppeling), met je gemiddelde hartslag en vermogen.
            Lager op hetzelfde vermogen is beter; een grens voor goed of slecht
            bestaat niet, dus vergelijk alleen met jezelf. Maakt je trainer het
            schema, dan noemt je trainer de training ook Duurtest. De
            meting komt uit intervals.icu; een rit die alleen via Strava
            binnenkomt, telt niet mee.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Hitte met een CORE-sensor</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Rijd je een hittesessie met een CORE-sensor, dan leest de app je
            kerntemperatuur uit intervals.icu. Neem de rit op met je fietscomputer
            en laat die rechtstreeks naar intervals.icu syncen. Op een Garmin zet
            je het CORE-dataveld uit Connect IQ op een datascherm. Een Wahoo
            neemt de sensor mee als je hem koppelt; staat je temperatuur bij een
            oudere Wahoo in het veld THb (gekoppeld als Muscle Oxygen), dan leest
            de app hem daar. Een rit die via Strava in
            intervals.icu komt, heeft geen kerntemperatuur. Rijd je op Zwift,
            neem de rit dan ook op je fietscomputer op.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Open daarna Vandaag of het protocol. De app toetst de rit aan de
            hittesessie: lang genoeg gereden (60 minuten voor een warme
            wedstrijd, 50 voor hemoglobine, 30 voor een korte sessie, met vijf
            minuten speling) en lang genoeg op of boven 38,5 °C (30 minuten, 10
            bij een korte sessie). Voldoet de rit, dan vinkt de app de sessie
            af; haal je dat vinkje weg, dan blijft het weg. Voldoet hij niet,
            dan staat erbij waarom en wat je de volgende keer anders kunt doen.
            Mat de sensor minder dan 60% van de rit, dan oordeelt de app niet
            over de minuten; vink de sessie dan zelf af als je weet dat het goed
            ging. Boven 39,5 °C krijg je een waarschuwing. Een heet bad vink je
            zelf af. Startte je je hitteprotocol vóór deze functie er was, stop
            het dan en start het opnieuw; de toestemming noemt de sensor pas
            sinds die tijd. De sensor schat je kerntemperatuur, dus zie de
            waarde als richting.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            ZWB geeft geen medisch advies. Heb je hart- of vaatproblemen, hoge
            bloeddruk, nierproblemen of een andere aandoening, of gebruik je
            medicijnen, overleg dan eerst met je huisarts of een sportarts. Stop
            een hittesessie bij duizeligheid, misselijkheid of hoofdpijn.
            Supplementprotocollen zijn er vanaf 18 jaar; herstellen na een
            wedstrijd en vitamine D in de winter staan voor iedereen open.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Supplementen kunnen verontreinigd zijn met verboden stoffen. Kies een
            batch met het NZVT-keurmerk van de Dopingautoriteit; ZWB noemt geen
            merken. Je eigen trainer ziet welke protocollen je volgt en wat je
            afvinkt.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/zwbeter-worden/protocollen"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open protocollen trainen
            </Link>
            <Link
              href="/zwbeter-worden/voeding/protocollen"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open protocollen voeding
            </Link>
            <Link
              href="/zwbeter-worden/kennis"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open de kennisbank trainen
            </Link>
          </div>
        </div>
      </section>

      <section
        id="voeding"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Utensils className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Voeding</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een kennisbank met bronnen, recepten op maat en elke dag een tip op
              Vandaag. Alles volgt de consensus- en positiestukken over
              sportvoeding, met het UCI-positiestandpunt over wielervoeding
              (2026) als basis.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe je doelen tot stand komen</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Je schema en je ritten van vandaag en morgen bepalen het
                  dagtype: rust, licht, matig, zwaar, lang of wedstrijd. Duur en
                  intensiteit tellen, net als in de richtlijnen.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Koolhydraten gaan per kilo lichaamsgewicht mee met dat dagtype,
                  van 3–5 g/kg op een rustdag tot 8–12 g/kg op een lange dag.
                  Eiwit blijft 1,6–2,1 g/kg. Onderweg reken we per uur, naar de
                  duur van je rit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Er staat nergens een caloriedoel. ZWB geeft bewust geen
                  afvaladvies: te weinig eten bij veel trainen schaadt je
                  gezondheid en je vorm.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Recepten op maat</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Elk ingrediënt heeft een rol. De koolhydraatbron schaalt naar je
                  koolhydraatdoel voor dat moment, de eiwitbron naar je eiwitdoel,
                  en de rest schaalt mee met je lengte, gewicht en leeftijd. Geen
                  onderdeel wordt kleiner dan de helft of groter dan het dubbele.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Zonder gewicht zie je de standaardportie. Je lengte vul je in op
                  je profiel; alleen jij kunt die zien.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De voedingswaarden komen uit het Nederlands
                  Voedingsstoffenbestand (NEVO-online 2025/9.0) van het RIVM.
                  Ontbreekt er een waarde, dan staat er ≥ voor het totaal.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Staat er &quot;Naar:&quot; onder een clubrecept, dan komt het
                  gerecht van die bron. De bereiding is opnieuw beschreven en
                  de waarden zijn met NEVO berekend.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Bij Eigen recept plak je een link naar een recept en tik je
                  Ophalen. Naam, porties, tijd, foto en bereiding komen van de
                  site; elk ingrediënt wordt aan een NEVO-product gekoppeld,
                  met de regel van de site eronder. Controleer product en
                  hoeveelheid: een ui of een scheutje is een schatting. Wat niet
                  te koppelen was, staat als losse regel klaar; tik erop om te
                  zoeken. Werkt een site niet (Allerhande weigert het
                  ophalen), vul het recept dan zelf in.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Onder Delen kies je &quot;Alleen voor mij&quot; of &quot;Alle
                  leden&quot;, en of je naam en avatar erbij staan. Gedeelde
                  recepten van anderen vind je onder &quot;Van leden&quot; en kun
                  je zelf in je menu zetten. Vanzelf in het dagmenu komen ze
                  alleen als je ze als favoriet markeert, omdat ze niet
                  nagekeken zijn zoals de clubrecepten. &quot;Voorstellen als
                  clubrecept&quot; legt een recept voor aan de beoordelaars.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Je menu voor vandaag</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Per moment van de dag krijg je één recept. Rond een rit komen
                  er momenten bij: vooraf, onderweg vanaf een uur rijden, en
                  erna.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De keuze volgt je dag. Op zware dagen koolhydraatrijk en
                  licht verteerbaar, op rustdagen meer eiwit en vezels. Een
                  recept waarvan de portie je doel niet haalt, zakt in de rij.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Recepten die even goed passen, wisselen per dag. Met
                  &quot;Ander recept&quot; blader je door; met het boekje kies je
                  zelf een recept, ook een eigen recept. Vanaf een recept zet je
                  het met &quot;In menu&quot; op een dag tot een week vooruit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Wat je kiest, blijft staan, in het Dagmenu en in Boodschappen.
                  De rest van de week past zich aan: dat recept komt de twee
                  dagen ervoor en erna niet vanzelf terug, en de dag ernaast
                  krijgt waar het kan een andere basis, zoals rijst na pasta.
                  Met de pijl terug laat je het moment weer aan het menu over.
                  Lunch en diner zijn uitwisselbaar.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Haalt het menu je minimum aan koolhydraten of eiwit niet, dan
                  worden de koolhydraat- en eiwitbronnen van de maaltijden en
                  het tussendoortje groter (&quot;Grotere portie&quot;), tot
                  hooguit het dubbele. Kleiner worden ze nooit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Een favoriet komt vaker terug. &quot;Niet voor mij&quot; haalt
                  een recept uit je menu; in het receptenboek vind je het terug
                  onder het filter met die naam.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Boodschappen voor meerdere dagen</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Onder Boodschappen zie je het menu voor één tot zeven dagen
                  vooruit, vanaf vandaag of morgen. Elke dag is hetzelfde menu
                  dat het Dagmenu die dag toont, op basis van je schema zoals
                  het nu staat. Verandert je schema, dan verandert het menu mee.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Wat je hier kiest of wisselt, staat die dag ook in je Dagmenu.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Bij Gezin op je profiel vul je in wie er mee-eet en bij welke
                  maaltijden. Volwassenen en kinderen met een hele portie eten
                  de gewone portie van het recept, een kind met een halve
                  portie de helft. Jouw eigen portie blijft op maat van je
                  training. Rond de rit en voor het slapen eet alleen jij.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Hoeveelheden zijn naar boven afgerond, waar het kan in stuks
                  of sneetjes. Zout, olie, kruiden en ander voorraad staan
                  standaard uit; vink aan wat je mist. Delen en Kopiëren geven
                  één regel per product, zodat een lijstjes-app er losse items
                  van maakt. Een directe koppeling met een supermarkt is er
                  niet.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Labels en delen</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  &quot;Licht verteerbaar&quot; betekent weinig vezels en weinig
                  vet per portie; &quot;vezelrijk&quot; minstens 3 g vezels per
                  100 kcal.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  &quot;Rijk aan&quot; staat er als één portie minstens 30% van
                  de dagelijkse referentie-inname levert, bijvoorbeeld van
                  calcium, ijzer of vitamine D. Een dagtotaal rekenen we niet
                  uit.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Een eigen recept kun je aan de club voorstellen. Na
                  goedkeuring ziet elk lid het, met jouw naam erbij. Tot die tijd
                  zien alleen jij en de beoordelaar het.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold">Naleving</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Op de tab Naleving leg je vast wat je eet. Dat staat uit tot
                  je het zelf aanzet. Alleen jij ziet het.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Invoeren kan op vier manieren: &quot;Gegeten&quot; bij een
                  recept in je dagmenu of het receptenboek, zelf producten
                  zoeken in NEVO met de hoeveelheid erbij, een verpakt product
                  via de barcode, of een eerdere maaltijd opnieuw kiezen. Je
                  kunt tot een week terug invullen.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Een barcode typ je over, of je maakt er een foto van met
                  Scan. Houd de barcode recht en scherp in beeld.
                  Vermeldt de verpakking een portie, dan telt de plusknop er
                  telkens één bij, handig voor gels en repen onderweg. De
                  productgegevens komen van Open Food Facts (ODbL).
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Rijd je die dag een uur of langer, dan zie je ook
                  &quot;Onderweg&quot;: wat je bij &quot;Tijdens de rit&quot;
                  invult, gedeeld door de ritduur, tegen de onderkant van het
                  doel per uur. Eronder staat of je iets na de rit hebt
                  ingevuld.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De balken tellen je koolhydraten en eiwit op tegen de
                  onderkant van je doel voor die dag. Is die gehaald, dan staat
                  er &quot;Gehaald&quot;; een bovengrens is er niet. Calorieën
                  en vet tellen we niet.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Met &quot;Tekst herkennen&quot; (een aparte toestemming)
                  beschrijf je wat je at, liefst met hoeveelheden. Een AI-model
                  benoemt de onderdelen en schat de grammen; de koolhydraten en
                  het eiwit komen daarna uit NEVO. Controleer elke hoeveelheid
                  en kies zo nodig een ander product uit de lijst: grote porties,
                  saus en wat in een stamppot of smoothie zit, worden vaak
                  verkeerd geschat. Dit kan zes keer per 24 uur.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Heb je vandaag al iets ingevuld, dan rekent je dagmenu mee met
                  wat je al at: haal je met de rest van het menu je minimum
                  niet, dan worden de maaltijden die nog komen groter
                  (&quot;Grotere portie&quot;). Kleiner worden ze nooit. Onder &quot;Deze week&quot; zie je per
                  dag of je de onderkant voor koolhydraten (links) en eiwit
                  (rechts) haalde; een dag zonder invoer telt niet mee.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Heb je een trainer, dan kun je die laten meekijken (een
                  aparte toestemming). Je trainer ziet dan per dag wat je at en
                  of je je minimum haalde, maar kan niets wijzigen. Met
                  Herinneringen krijg je &apos;s avonds een pushbericht als er
                  morgen een zware, lange of wedstrijddag staat, of als je
                  vandaag een uur of langer reed en bij &quot;Na de rit&quot;
                  nog niets staat.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Met Pauzeren blijft je eetdagboek staan maar komt er niets
                  bij. &quot;Alles wissen&quot; verwijdert het hele eetdagboek
                  en zet Naleving uit.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Dit is algemene sportvoedingsinformatie, geen medisch of
            diëtistisch advies. Heb je aanhoudende vermoeidheid, vaak blessures,
            een onregelmatige menstruatie, maag- of darmklachten, of wil je
            supplementen gebruiken? Ga dan naar een sportarts of
            sportdiëtist.
          </p>
          <Link
            href="/zwbeter-worden/voeding"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Voeding
          </Link>
        </div>
      </section>

      <section
        id="materiaal"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Bike className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWBeter materiaal</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een kennisbank over materiaal en kleine winsten, en een rekenaar die
              laat zien wat een verandering jou oplevert. ZWB geeft geen
              koopadvies. Merken staan alleen in de rekenaar, met cijfers uit
              onafhankelijke tests.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">De kennisbank</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Over lucht en houding, banden en ketting, binnen fietsen, je fiets
              afstellen en kleine middelen zoals neusstrips. Veel winst geldt alleen
              buiten en op snelheid: op Zwift rekent het spel met je virtuele fiets,
              en tellen vooral een ventilator en een vermogensmeter die klopt.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Veel onderzoek is hier een meting in een windtunnel, op een testbank of
              op de weg. Hoe dat meetelt voor het bewijsniveau, staat hierboven bij
              Protocollen, onder &ldquo;Bewijsniveau&rdquo;.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">De rekenaar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Kies een route, het wegdek, je vermogen en je gewicht. Op de renner
              stel je in wat je nu hebt en wat je straks overweegt: helm, houding,
              fiets, wielen, banden en kleding. Tik op een stip op de renner of op
              een onderdeel eronder. De rekenaar rijdt de route twee keer met
              hetzelfde vermogen en toont het verschil in tijd en in watt, en per
              onderdeel wat dat apart oplevert. De stippellijn is je houding in de
              andere opzet. Het tenue kun je wisselen tussen de winter- en de
              zomereditie; dat verandert de berekening niet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Hij rekent windstil en met een vast vermogen, zoals het pacingplan.
              In een groep rekent hij met 70 % van je luchtweerstand; dat is een
              aanname. Buitenevents met een GPX staan erbij; Zwift-routes niet,
              want daar bepaalt het spel de fysica. De keuzes voor banden gaan over
              asfalt; op gravel is de rolweerstand hoger. Op ruw wegdek maakt de
              bandenspanning niets uit, omdat niet gemeten is wanneer een band
              daar van sneller naar trager omslaat.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Helmen, fietsen, wielen, banden en sokken komen uit onafhankelijke
              tests: windtunneltests van Cyclingnews Labs en de testrol van
              BicycleRollingResistance. Geen cijfers van fabrikanten. Zo&apos;n test
              meet op een pop, een fiets zonder renner of een testrol. De rekenaar
              neemt daarom alleen het verschil met een gewoon product uit dezelfde
              test, zoals een helm met gaten of een gangbare band, en telt dat op
              bij zijn eigen model. In de tabel zie je per product dat verschil
              (CdA of Crr) en wat het jou oplevert op de gekozen route. Het is één
              test per product; een andere test kan een andere volgorde geven.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              De fietsen zijn getest met hun eigen hoge velgen. Kies je een geteste
              fiets, dan tellen andere wielen niet mee en staat er bij Wielen
              &ldquo;Bij de fiets&rdquo;. Voor shirts en broeken is geen
              onafhankelijke test gevonden; daar vul je zelf een percentage in. De
              tekening toont per product de vorm, zonder logo&apos;s of merkkleuren.
            </p>
            <Link
              href="/zwbeter-worden/materiaal/rekenaar"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline"
            >
              Open de rekenaar
            </Link>
          </article>
        </div>
      </section>

      <section
        id="core-mobiliteit"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Dumbbell className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Core &amp; mobiliteit</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Korte series van 6 tot 30 minuten die je naast het fietsen doet.
              Je vinkt ze zelf af; ze tellen niet mee in je trainingsbelasting,
              CTL of naleving.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Wat je ervan mag verwachten</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Meer rompuithoudingsvermogen en houdingscontrole. Dat is wat
                  je nodig hebt om urenlang voorovergebogen te zitten zonder in
                  je onderrug te zakken.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Minder kans op lage rugklachten. Rugpijn komt bij wielrenners
                  veel voor, en renners mét klachten zitten tijdens het rijden
                  meetbaar meer geflecteerd in hun lage rug.
                </span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Geen extra watt.</strong>{" "}
                  Onderzoek naar core-training laat wel duidelijke winst zien op
                  romp-uithoudingsvermogen en balans, maar nauwelijks op kracht
                  en snelheid. Dit is houdings- en belastbaarheidswerk, geen
                  prestatietraining.
                </span>
              </li>
            </ul>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe je het inplant</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Twee tot drie keer per week, en houd het minstens vier weken
                  vol. Korter meten heeft weinig zin; daarom telt het overzicht
                  in blokken van 28 dagen en niet per dag.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Voor de rit</strong> is
                  bewust volledig dynamisch. Lang statisch rekken vlak voor een
                  inspanning kost meetbaar vermogen, dus lange rekhoudingen doe
                  je ná de rit of op een rustdag.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  De AI-trainer plant dit niet in. Off-bike werk hoort niet in
                  je fietsschema, want het heeft geen wattages en zou je
                  belastingcijfers vervuilen.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div
          id="spiergroepen"
          className="mt-4 scroll-mt-20 rounded-md border bg-background p-4"
        >
          <h3 className="text-sm font-semibold">Figuur en spierkaart</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Het figuur laat de beweging zien; tik erop om hem stil te zetten en
            per houding te bladeren. De gekleurde delen zijn de spieren waar de
            oefening om draait, lichter gekleurd is wat meehelpt. Bij een
            rekoefening is dat wat je rekt. De spierkaart bij een serie telt
            alle oefeningen van die serie op. &quot;Deze week getraind&quot; telt
            alleen de core- en krachtseries die je in de afgelopen zeven dagen
            hebt afgevinkt; rekken en losmaken tellen daar niet als training.
          </p>
        </div>

        <div
          id="kracht"
          className="mt-4 scroll-mt-20 rounded-md border bg-background p-4"
        >
          <h3 className="text-sm font-semibold">Krachtreeksen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Naast core en mobiliteit staan er krachtseries: met je eigen gewicht,
            thuis met een dumbbell en band, en zwaar in de sportschool. De series
            met je eigen gewicht zijn bedoeld voor een
            rustdag: je krijgt ze alleen voorgesteld op een dag zonder training of
            rit, minstens drie dagen na je vorige krachtsessie en hooguit twee keer
            per week. Zo zit de spierpijn niet in je volgende sleutelsessie. Ook
            deze series tellen niet mee in je trainingsbelasting.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Van de series met je eigen gewicht mag je geen extra watt
            verwachten. Ze maken je benen en romp belastbaarder en je
            trapbeweging per been stabieler.
          </p>
          <h4 className="mt-4 text-sm font-semibold">Springen voor je botten</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Fietsen belast je botten weinig. De serie Springen voor je botten is
            vijf keer tien sprongen, in een paar minuten. Doe hem drie à vier
            keer per week; hij mag ook op een fietsdag en telt niet mee voor de
            rust tussen krachtsessies. ZWB stelt hem niet uit zichzelf voor.
            Land zacht en stop bij pijn in je knieën of enkels.
          </p>
          <h4 className="mt-4 text-sm font-semibold">Gym: zwaar werk</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            De gymseries volgen het programma uit onderzoek bij goed getrainde
            renners: halve squat, eenbenige leg press, staande heupbuiging en
            kuitheffen, drie sets, twee keer per week. Opbouw 1, 2 en 3 duren
            samen twaalf weken en gaan van tien naar zes herhalingen; de tweede
            sessie van de week doe je zwaarder met minder herhalingen, zoals in
            de ondertitel staat. In het seizoen houdt één onderhoudssessie per
            week vast wat je hebt opgebouwd. In die studies verbeterden
            fietseconomie en het vermogen in een test van 40 minuten, zonder
            dat de renners zwaarder werden. Het bewijs komt uit kleine groepen;
            een overzichtsstudie noemt de zekerheid zelf laag.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Kies een gewicht waarmee de laatste herhaling nog net netjes lukt;
            de app noemt geen kilo&apos;s. In de studies stond er de eerste
            weken een begeleider bij. Heb je nooit met een halterstang
            getraind, laat de techniek dan eerst door een trainer in je
            sportschool bekijken. ZWB stelt deze series nooit uit zichzelf
            voor: je kiest ze zelf, en ze tellen wel mee voor de rust tussen
            twee krachtsessies.
          </p>
          <h4 className="mt-4 text-sm font-semibold">Thuis met gewicht</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Dezelfde vier bewegingen met een dumbbell of kettlebell en een
            weerstandsband. Doe elke set tot je er nog ongeveer twee
            herhalingen over hebt. Met lichtere gewichten groeit de spier
            vergelijkbaar, maar je maximale kracht minder; of dit je sneller
            maakt op de fiets is niet onderzocht.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Klachten en grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Deze series zijn algemeen onderhoudswerk, geen behandeling. Stop bij
            pijn. Heb je aanhoudende rug-, knie- of heupklachten, of een
            blessure, ga dan naar een fysiotherapeut of huisarts. ZWB geeft
            daar bewust geen advies over, en de AI-trainer ook niet.
          </p>
          <Link
            href="/zwbeter-worden/core"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Core &amp; mobiliteit
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Het tabblad heeft vier delen: Vandaag (wat nu past en wat je deze
            week deed), Series, Oefeningen en de Kennisbank. In de kennisbank
            staat per onderwerp wat het onderzoek laat zien, wat het niet laat
            zien en welke bronnen erachter zitten; bij een serie staat een link
            naar de artikelen die hem onderbouwen.
          </p>
          <Link
            href="/zwbeter-worden/core/kennis"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open de kennisbank
          </Link>
        </div>
      </section>

      <section
        id="logboek"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <h2 className="text-lg font-semibold">Logboek: hoe je je voelt</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Onder ZWBeter Worden staat een logboek waarin je per dag bijhoudt
          hoeveel last je hebt en waarvan: buikpijn, slecht geslapen, stemming,
          darmen. Je kunt er ook de eerste dag van je menstruatie markeren; de
          cycluslengte volgt dan vanzelf. De vragen zijn daarop geschreven, dus
          het logboek staat alleen bij leden met{" "}
          <strong className="text-foreground">Vrouw</strong> bij geslacht in hun
          profiel. Een versie voor mannen kan later volgen.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Het logboek staat standaard uit en doet niets tot je het zelf aanzet.
          Alleen jij ziet wat erin staat: je trainer niet en het bestuur niet.
          Het schema krijgt hooguit een samengevat signaal mee, nooit losse
          klachten.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Waarom klachten en geen cyclusfase? Onderzoek naar trainen per
          cyclusfase levert wisselende en zwakke uitkomsten op, terwijl klachten
          wél samenhangen met wat je die week aankunt. En niet iedereen heeft
          een natuurlijke cyclus; zo werkt het ook zonder.
        </p>
      </section>
    </>
  );
}
