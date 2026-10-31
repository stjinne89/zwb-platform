import Link from "next/link";
import {
  Sparkles,
} from "lucide-react";

export function SchemaHelp() {
  return (
    <>
      <section
        id="trainingsschema"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Trainingsdoel en je schema</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een schema begint bij een doel. Daarin leg je vast waar je naartoe
              werkt en hoeveel ruimte je hebt. Het trainingsdeel werkt alleen
              goed met intervals.icu gekoppeld.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article
            id="doeltype"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Doeltype en de laatste weken</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Het doeltype bepaalt hoe je schema eindigt, dus kies het type dat
              bij je plan hoort, niet alleen de naam die het dichtst in de buurt
              komt.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Outdoor event of gran fondo:</strong>{" "}
                één piekdag. In de laatste een tot drie weken (meestal twee) zakt het
                volume geleidelijk 40 tot 60 procent; intensiteit en het aantal
                trainingen blijven gelijk, zodat je fris én scherp aan de start
                staat.
              </li>
              <li>
                <strong className="text-foreground">Basisconditie, FTP of herstel/opbouw:</strong>{" "}
                doorlopende doelen. Er komt geen taper: je bouwt door tot het
                eind, want die laatste weken zijn juist de weken waar je conditie
                van omhoog gaat. De targetdatum is dan geen wedstrijddag maar
                het punt waar je naartoe werkt, in blokken van hooguit twaalf
                weken. Zet je in je jaarplan wél een
                A-doel in die periode, dan wint dat: daar wordt naartoe
                afgebouwd.
              </li>
              <li>
                <strong className="text-foreground">ZRL of Ladder:</strong> een
                reeks races over meerdere weken. Je traint er doorheen; alleen de
                dag vóór een racedag blijft licht.
              </li>
            </ul>
          </article>
          <article
            id="doeltijd"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Een doeltijd voor je gran fondo</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij een gran fondo of outdoor event kun je een doeltijd opgeven.
              Vul je rijtijd in, zonder stops. Kies het parcours: een clubevent
              met een GPX, of je eigen GPX. Van je eigen GPX bewaart het platform
              alleen het hoogteprofiel, geen kaart of coördinaten.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Prognose:</strong> de snelste
                tijd die je met je huidige CP, reserve en duurvermogen op dit
                parcours haalt, gerekend zoals het pacingplan. Wind en stops
                tellen niet mee. Kies je In een groep, dan rekent het met een
                kwart minder luchtweerstand over de hele rit; dat is een schatting.
                Zonder vermoeidheidsdata rekent het zonder verval, en dan is de
                prognose aan de snelle kant.
              </li>
              <li>
                <strong className="text-foreground">Oordeel:</strong> is je
                doeltijd sneller, dan zie je hoeveel CP je nodig hebt. Dat wordt
                afgezet tegen wat redelijk is tot je doeldatum: ongeveer 0,75%
                per week de eerste twaalf weken, daarna minder, hoogstens 12%.
                Dat is een vuistregel. Hoeveel jij vooruitgaat, verschilt sterk
                per persoon en is niet te voorspellen.
              </li>
              <li>
                <strong className="text-foreground">Per stap:</strong> hoeveel
                tijd 1% meer CP of 1 kg minder op dit parcours scheelt. Zo zie je
                waar het parcours om vraagt. Het is geen advies om af te vallen.
              </li>
              <li>
                <strong className="text-foreground">Je steen:</strong> welke
                klasse van je ZWBriljant-steen de doeltijd vraagt, naast de klasse
                die je nu hebt. Bij drempel is dat je beste 20 minuten per kilo,
                zoveel sterker als de doeltijd vraagt; is hij al haalbaar, dan zie
                je hoeveel minder het mag zijn. Bij fitheid is het de geschatte
                belasting van de rit in je doeltijd, gedeeld door zeven: de helft
                van de ZWB&apos;ers met lange ritten reed er minstens één uit die
                zo ver boven hun CTL lag. Dat is een schatting, geen grens.
                Durability staat er niet bij, omdat je steen en de prognose het
                verval anders meten. Sprint, anaeroob en racen beslissen geen
                toertocht. Alleen jij ziet deze regels, je trainer niet.
              </li>
              <li>
                <strong className="text-foreground">Nadruk in je schema:</strong>{" "}
                klimmen of drempel, lange duurritten en duurvermogen laat in de
                rit, afhankelijk van het parcours en je eigen data. Je schema
                gebruikt dat voor de sleutelsessies. Opbouw, uren, herstel en
                taper blijven zoals bij elk doel, en het schema belooft geen
                eindtijd.
              </li>
              <li>
                <strong className="text-foreground">Verloop:</strong> elke week,
                en als je CP of gewicht verandert, komt er een nieuwe prognose
                bij. Doeltijd of groep pas je aan bij het doel; voor een ander
                parcours maak je een nieuw doel.
              </li>
            </ul>
          </article>
          <article
            id="doel-aanpassen"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Een doel aanpassen of verwijderen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Onder Training → Doelen staat bij elk doel Bewerken en
              Verwijderen. Je tijd per dag pas je aan op de schemapagina.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Bewerken:</strong> een
                schema dat al loopt, wordt niet opnieuw gemaakt. Aanpassingen en
                een volgend blok gaan wel uit van je bijgewerkte doel. Kies je
                een doeltype zonder één piekdag, dan gaan de doeltijd en de
                prognoses eraf.
              </li>
              <li>
                <strong className="text-foreground">Verwijderen:</strong> het
                doel en de prognoses gaan weg. Hangt er nog een schema aan, dan
                kan het niet: zonder doel kan dat schema niet meer worden
                bijgewerkt. Je trainer haalt dan eerst het schema weg. Een
                mikpunt op je jaarplan staat daarna weer zonder doel.
              </li>
            </ul>
          </article>
          <article
            id="blokken"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Waarom een schema hooguit twaalf weken loopt</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Een schema is een blok van hooguit twaalf weken, ook als je doel
              verder weg ligt. Ligt je doeldatum binnen die twaalf weken, dan
              eindigt het blok daar. Verder vooruit staat je jaar in het
              jaarplan: als route met mikpunten, niet als uitgewerkte
              trainingen.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              De reden is praktisch. Wat je over vier maanden kunt en wilt
              rijden hangt af van hoe de komende weken gaan: werk, gezin, een
              verkoudheid, een vakantie. Een schema dat nu al tot juli is
              ingevuld, klopt tegen die tijd niet meer en moet toch opnieuw.
              Een blok is kort genoeg om te blijven kloppen en lang genoeg om
              er sterker van te worden.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Loopt je blok bijna af, dan staat in je jaarplan vanaf twee weken
              voor het einde de knop{" "}
              <strong className="text-foreground">Volgend blok klaarzetten</strong>.
              Het nieuwe blok bouwt voort op wat je hebt gereden en loopt weer
              twaalf weken vooruit. Het gaat niet vanzelf: jij kiest of en
              wanneer je verder wilt.
            </p>
            <h4 className="mt-3 text-sm font-medium">Schema of blok</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Een schema hoort bij één doel, bijvoorbeeld je winter of de ZRL,
              en loopt zo lang als dat doel loopt. Een blok is een stuk van
              hooguit twaalf weken daarbinnen: zelfde doel, zelfde opzet. Een
              volgend blok zet je zelf klaar.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Twaalf weken voor een A-doel begint een nieuw schema, speciaal
              naar dat doel toe. Een blok van je lopende schema stopt daar dus
              ook. Vanaf twee weken daarvoor staat in je jaarplan de knop{" "}
              <strong className="text-foreground">Start schema naar …</strong>.
              Daarmee maak je van het mikpunt een trainingsdoel; je trainer zet
              daarna het schema klaar. Een nieuw schema komt altijd van je
              trainer.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Het trainingsdeel werkt alleen goed met intervals.icu gekoppeld.
              Zonder koppeling komt een volgend blok of een bijgewerkt schema
              niet door: het blijft als concept staan en je oude trainingen
              worden niet vervangen. Koppelen doe je bij Training → Doelen.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Een schema dat al langer liep toen dit is ingevoerd, houdt zijn
              oude einddatum.
            </p>
            <h4 className="mt-3 text-sm font-medium">Waar dit op steunt</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Vooral op de coachpraktijk. Hard bewijs voor precies twaalf weken
              is er niet: onderzoek naar trainingsopbouw duurt zelf zelden
              langer dan twaalf weken, en een vergelijking van bloklengtes over
              een heel jaar bij recreanten hebben we niet gevonden.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                Joe Friel, schrijver van The Cyclist&apos;s Training Bible, biedt
                zijn schema&apos;s aan als blokken van twaalf weken: eerst{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://www.trainingpeaks.com/training-plans/cycling/road-cycling/tp-143288/bike-road-racing-base-period-under-50-8-13hpw-power-meter-12-weeks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  basis
                </a>
                , daarna{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://www.trainingpeaks.com/training-plans/cycling/road-cycling/tp-277329/bike-road-racing-build-peak-periods-under-50-12hpw-power-meter-12-weeks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  opbouw en piek
                </a>
                .
              </li>
              <li>
                Een{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://doi.org/10.1123/ijspp.2022-0302"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  overzichtsstudie bij getrainde wielrenners
                </a>{" "}
                vond over acht tot twaalf weken geen bewijs dat één manier van
                periodiseren beter werkt, en weinig onderzoek over een heel
                seizoen.
              </li>
              <li>
                Een{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://doi.org/10.2147/OAJSM.S180408"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  meta-analyse van blokperiodisering
                </a>{" "}
                zag gunstige effecten, maar uit kleine studies van vier tot
                twaalf weken.
              </li>
              <li>
                In een{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8701049"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  studie van acht weken bij amateurtriatleten
                </a>{" "}
                vielen bij vrij trainen meer deelnemers af dan bij een schema
                met structuur.
              </li>
            </ul>
          </article>
          <article
            id="uitgangspunten"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Uitgangspunten: wat je schema meeweegt</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Op het tabblad{" "}
              <Link href="/zwbeter-worden/uitgangspunten" className="underline hover:text-primary">
                Uitgangspunten
              </Link>{" "}
              staat waarop je lopende schema is gemaakt: je doel, je
              beschikbaarheid, wat je reed, je vorm, je herstelwaarden als je
              die deelt, je jaarplan en je vaste afspraken. Het zijn de
              gegevens van het moment waarop die versie van je schema werd
              gemaakt; de datum staat erboven.
            </p>
            <h4 className="mt-3 text-sm font-medium">Persoonlijke voorkeuren</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Bovenaan leg je vast wat de app niet uit je data kan halen: wat
              je motiveert, waar je goed op reageert, wat je liever niet doet.
              Jij en de trainers die je hebt aangewezen kunnen aanvullen. Elke
              voorkeur gaat mee in elk volgend schema, ook in de automatische
              bijwerkingen. In de coachchat doet het vinkje{" "}
              <strong className="text-foreground">Onthoud als voorkeur</strong>{" "}
              hetzelfde met je bericht.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Een voorkeur verschuift de keuzes, maar gaat niet boven je
              herstel, je beschikbaarheid of je vaste afspraken. Kan het schema
              een voorkeur niet volgen, dan staat de reden bij &ldquo;Let
              op&rdquo;. Na toevoegen of weghalen wordt je schema herzien; een
              voorkeur die er nog niet in zit, heeft het label &ldquo;Vanaf de
              volgende herziening&rdquo;.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Je kunt er hooguit twaalf vastleggen. Jij kunt alles weghalen,
              een trainer alleen wat hij zelf schreef. Het bestuur leest ze
              niet.
            </p>
            <h4 className="mt-3 text-sm font-medium">De vaste regels</h4>
            <ul className="mt-1 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Opbouw in golven: twee tot vier opbouwweken, dan een
                herstelweek op ongeveer 60 tot 70% van de week ervoor. De
                weekbelasting groeit met ongeveer 10% per opbouwweek, zonder
                sprongen van meer dan een kwart. Die 10% is een voorzichtige
                keuze, geen bewezen grens; zie{" "}
                <Link href="/zwbeter-worden/kennis/opbouwen" className="underline">
                  Opbouwen
                </Link>
                .
              </li>
              <li>
                Je uren per week zijn de tijd die je hebt, geen doel. Hoe zwaar
                een week wordt, volgt uit je fitheid (CTL): een opbouwweek komt
                niet onder de belasting die je nu aankan. Heb je weinig tijd of
                rijd je vooral binnen, dan worden de trainingen korter en
                intensiever in plaats van langer.
              </li>
              <li>
                Lichter wordt het alleen bij een signaal van overbelasting: een
                sterk negatieve vorm (TSB), een snelle stijging van je
                belasting, een dalende HRV, een hogere rusthartslag, een lage
                readiness, of trainingen die zwaarder uitvielen én zwaar
                voelden.
              </li>
              <li>
                Een afbouw naar een piek komt er alleen bij een doel met één
                piekmoment of een A-doel in je jaarplan; zie{" "}
                <Link href="/hulp/schema#doeltype" className="underline hover:text-primary">
                  doeltype en de laatste weken
                </Link>
                .
              </li>
              <li>
                Vaste afspraken, dagen zonder tijd en rustperiodes liggen vast;
                het schema plant eromheen.
              </li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Deze regels komen uit de coachpraktijk en waar het kan uit
              onderzoek. De bronnen staan bij{" "}
              <Link href="/hulp/schema#blokken" className="underline hover:text-primary">
                de blokken
              </Link>{" "}
              en{" "}
              <Link href="/hulp/schema#jaarplan" className="underline hover:text-primary">
                het jaarplan
              </Link>
              .
            </p>
          </article>
          <article
            id="vergelijken"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Voor trainers: schema&apos;s vergelijken</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Naast de AI maakt ZWB schema&apos;s met een eigen regelmotor. Op
              het trainerstabblad{" "}
              <Link href="/zwbeter-worden/trainer/vergelijken" className="underline hover:text-primary">
                Vergelijken
              </Link>{" "}
              staan per eerder gemaakt schema twee versies naast elkaar, A en
              B, gemaakt uit precies dezelfde gegevens. Eén is van de AI, één
              van de motor; welke van wie is, zie je pas nadat je hebt
              gekozen. Kies A beter, B beter of gelijk, met eventueel een korte
              reden. Een oordeel ligt daarna vast.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Je ziet alleen schema&apos;s van leden die jou als trainer hebben
              aangewezen, gemaakt door Claude vanaf 26 oktober 2026: oudere
              schema&apos;s volgden nog niet dezelfde regels als de motor. Titels,
              samenvattingen en aandachtspunten blijven weg, omdat die de motor
              verraden; je beoordeelt de trainingen zelf. Bij een
              dagaanpassing staat onder de datum wat er gepland was, en
              betekent &ldquo;Ongewijzigd&rdquo; dat die kant de dag liet
              staan. De teller bovenaan toont je aantal oordelen, en na je
              keuze hoe vaak de motor won.
            </p>
          </article>
          <article
            id="jaarplan"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Jaarplan: mikpunten en periodes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je schema is een blok van hooguit twaalf weken. Het jaarplan is
              de laag daarboven: het jaar eromheen, als een weg van boven naar
              beneden. Wat je erin zet stuurt het schema.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">De weg:</strong> asfalt met
                strepen is het stuk waarvoor je schema is uitgewerkt, tot aan
                het geel-donkere hek. Twee stippellijnen daarna: nog geen
                trainingen, alleen de route. Grind is een rustperiode, een
                smalle strook een rustige periode, klimstrepen een
                trainingskamp. Een geblokte streep is een A-doel, een dwarsstreep
                een B-doel. De afstand tussen twee punten zegt niets over het
                aantal dagen; lege maanden staan als één regel.
              </li>
            </ul>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">A-doel:</strong> je piekdag.
                De laatste een tot twee weken gaat het volume omlaag en de
                scherpte blijft. Eén A-doel tegelijk: naar twee pieken binnen
                drie weken toewerken kan niet.
              </li>
              <li>
                <strong className="text-foreground">B-doel:</strong> belangrijk,
                maar je bouwt er gewoon doorheen. Alleen de dag ervóór blijft
                licht.
              </li>
              <li>
                <strong className="text-foreground">C-doel:</strong> je doet mee,
                je opbouw verandert er niet van.
              </li>
              <li>
                <strong className="text-foreground">Rust:</strong> vakantie of
                winterstop. Er wordt niets ingepland, en er begint geen
                opbouwblok dat er doorheen loopt. Duurde het langer dan tien
                dagen, dan begint het schema erna lager en bouwt het in twee
                weken terug op.
              </li>
              <li>
                <strong className="text-foreground">Rustig:</strong> een drukke
                periode. Ongeveer de helft van je normale weekvolume en geen
                zware sleutelsessies.
              </li>
              <li>
                <strong className="text-foreground">Trainingskamp:</strong> dagen
                waarop je veel meer rijdt dan normaal. Je weekplafond geldt dan
                niet: het schema plant lange ritten en volwaardige kwaliteit,
                afgestemd op wat jij aankunt, en bouwt er in de weken
                ervoor naartoe. Hoeveel rust je ervoor en erna krijgt, volgt
                uit je eigen herstelwaarden. Een kamp dat een tot twee weken
                voor een A-doel eindigt past goed: de dagen erna zijn je taper.
                Laat het niet in de laatste week voor een A-doel eindigen. In{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://pubmed.ncbi.nlm.nih.gov/25134000/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  onderzoek bij triatleten
                </a>{" "}
                viel de piek na een zware periode meestal in de eerste twee
                weken van de taper, en een{" "}
                <a
                  className="underline hover:text-primary"
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10171681/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  meta-analyse
                </a>{" "}
                vond winst bij een taper van zeven dagen tot drie weken.
              </li>
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Met het potlood pas je een mikpunt of periode aan: titel, datum,
              prioriteit of soort, en notitie. Verwijderen staat in hetzelfde
              formulier. Verschuif je een mikpunt waar al een doel aan hangt,
              dan schuift de datum van dat doel mee en wordt je schema herzien.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Wringt er iets, dan staat dat in het rood bij het punt waar het
              speelt, met de knop die het oplost: trainingen in een
              rustperiode, twee A-doelen binnen drie weken, een A-doel binnen
              twaalf weken zonder schema, een event midden in je rust, of een
              trainingskamp dat in de laatste week voor een A-doel eindigt.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Clubevents waar je ja of misschien op hebt gezegd staan
              automatisch op de tijdlijn. Alleen een ja wordt een blok in je
              schema (bij de ZRL ook beschikbaar); misschien blijft een aantekening. Je trainer kan je
              jaarplan bekijken maar niet wijzigen.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Wil je zo&apos;n clubevent als mikpunt, tik dan op het vlaggetje
              op die regel, of kies het via Toevoegen bij Mikpunt onder Event; titel en datum
              komen van het event. Met het vlaggetje begint het als C-doel. Het
              event staat dan als één regel met je prioriteit erbij. Met het
              potlood wijzig je de prioriteit en de notitie; de datum volgt het
              event. Mikpunt weghalen haalt alleen het mikpunt weg: het event
              en je aanmelding blijven. Dat geldt alleen voor jouw jaarplan,
              niet voor dat van andere leden.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Max. trainingsuren per week</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dit is het plafond waarbinnen de AI je week vult, samen met de
              dagen die je beschikbaar hebt gemaakt. Zet je 6 uur, dan blijft de
              totale geplande tijd daaronder, ook in een zware blokweek. Het is
              geen streefwaarde: minder plannen mag altijd.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Het zegt niets over wat je aankunt. Reed je vorige week 7,5 uur
              terwijl je plafond op 6 staat, dan wordt de week erna{" "}
              <strong className="text-foreground">niet</strong> afgeremd om dat te
              compenseren. Het schema gaat pas voorzichtiger plannen bij echte
              signalen: een sterk negatieve vorm, een te snelle opbouw, slechte
              herstelwaarden, of trainingen die je zwaar reed én zwaar vond.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Beschikbaarheid per week</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij je schema zet je per weekdag met een schuifbalk hoeveel tijd je
              hebt. Zet een dag op <em>geen</em> en er wordt niets gepland; zet je
              dinsdag op een uur, dan blijft de training van die dag daarbinnen.
              Je vult dat in voor{" "}
              <strong className="text-foreground">deze week</strong> of{" "}
              <strong className="text-foreground">volgende week</strong>; wat je
              onder <strong className="text-foreground">Standaard</strong> zet
              geldt voor elke week die je niet apart invult. Een week met een
              eigen invulling heeft een stip op het tabblad en gaat voor de
              standaard; met <strong className="text-foreground">Terug naar
              standaard</strong> volgt hij weer je standaardweek.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij het opslaan gaat een training op een dag zonder tijd er meteen
              af, en wordt een te lange training ingekort. Daarna werkt het schema
              zichzelf bij op de dagen die nog komen. Dat geldt ook als je een rit
              inplant of je voor een clubevent aan- of afmeldt. Lukt dat niet
              meteen, dan gebeurt het de volgende keer dat je je schema opent, of
              uiterlijk de volgende ochtend.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Beschikbaarheid is een plafond: meer tijd maakt een training niet
              vanzelf langer. Wil je een training langer of korter, gebruik dan{" "}
              <strong className="text-foreground">Duur aanpassen</strong> bij die
              training. De intervallen blijven gelijk; in- en uitrijden en
              duurblokken schuiven mee. Daarna ligt die training vast.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">FTP en gewicht uit intervals.icu</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Zet je onder Profiel &rarr; Fysiek{" "}
              <strong className="text-foreground">Bijhouden vanuit intervals.icu</strong>{" "}
              aan, dan nemen we bij elke sync je eFTP en gewicht over en vervalt
              de handmatige invoer. Die FTP bepaalt ook de targetwatts in je
              workouts.
            </p>
          </article>
          <article id="ftp-test" className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">FTP-test</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je trainer zet een ramptest (40 minuten, oplopend tot je stukgaat)
              of een 20-minutentest (65 minuten, met opener) in je schema. De test
              ligt daarna vast: er wordt omheen gepland en de dag ervoor blijft
              licht. Na afloop vul je op je schemapagina onder{" "}
              <strong className="text-foreground">FTP-test</strong> je resultaat
              in: het hoogste minuutvermogen bij een ramptest, het gemiddelde bij
              een 20-minutentest. Met een intervals.icu-koppeling staat daar al
              het vermogen dat intervals die dag heeft gemeten; klopt het niet,
              typ dan je eigen waarde. ZWB rekent daar je FTP uit (75%
              respectievelijk 95%), zet die in je profiel en werkt de targetwatts
              van de rest van je schema bij. Typte je het verkeerde vermogen in,
              dan pas je de uitslag aan of verwijder je hem bij{" "}
              <strong className="text-foreground">Mijn vermogen</strong> onder
              FTP-tests; je FTP en de targetwatts volgen die correctie.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Een test die niet in je schema stond, vul je in via{" "}
              <strong className="text-foreground">Test invullen</strong>. Voor je
              FTP geldt deze volgorde: je laatste test, dan intervals.icu, dan wat
              je zelf in je profiel invulde. Heb je een test gedaan, dan houdt je
              profiel die uitslag vast, ook als het intervals.icu volgt; de
              volgende test werkt hem weer bij.
            </p>
          </article>
          <article
            id="zonekleuren"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Kleuren van de blokken</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              De blokken kleuren zoals in Zwift, op je FTP: grijs onder 60%,
              blauw tot 76%, groen tot 90%, geel tot 105%, oranje tot 119% en
              rood daarboven. Een blok krijgt de kleur van het midden van zijn
              doel. Een training in de kalender krijgt de kleur van zijn
              kernwerk: het zwaarste niveau waarop je samen minstens vijf minuten
              rijdt, zonder warming-up en cooling-down. Lichtgrijs is rust; een
              gestippeld blokje zonder kleur is een rit zonder vermogen en
              hartslag.
            </p>
          </article>
          <article
            id="trainingsvormen"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Namen van trainingen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Binnen een zone onderscheiden we trainingsvormen: rustige duur
              (61-70% van je FTP), intensieve duur (71-80%), tempo (81-86%) en
              sweet spot (87-89%). Daarboven heet het drempel, VO2max en
              anaeroob. Een training heet naar zijn kernwerk. Intensieve duur loopt
              tot 80% en kleurt daardoor boven 76% al groen, zoals in Zwift. In
              intervals.icu, en zo ook in Zwift en op je fietscomputer, staat
              ZWBeter Worden voor de naam van elke training.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Rustdagen in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Een dag zonder training in je schema is een rustdag. Je mag dan
              helemaal niets doen, of tot 1,5 uur rustig fietsen zonder
              intensiteit: zone 1 tot lage zone 2, praten moet makkelijk gaan.
              De planner rekent die rit niet mee in je weekvolume en remt er de
              dagen erna niet om af. Hersteltrainingen en rustige duurritten
              korter dan 1,5 uur plant de AI niet: die leveren weinig op, en een
              echte rustdag herstelt beter. Een korte rit met intensiteit kan wel.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Clubevents in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij je schema staan de clubevents die binnen de looptijd vallen. Ze
              komen er pas in als je <strong className="text-foreground">Ik doe mee</strong>{" "}
              kiest: dan wordt het event een vast blok, met een duur uit de
              eindtijd of de afstand, en werkt het schema de week eromheen bij:
              geen zware sessie vlak ervoor of erna. De zwaarte hangt af van het
              soort event: een race rekent met wat je bij die duur gemiddeld
              rijdt, een groepsrit in Zwift met 70-80% van je FTP en een
              groepstraining met 80-90%. Kies je{" "}
              <strong className="text-foreground">Nee</strong>, dan verdwijnt het
              uit de lijst en blijft je schema ongemoeid. &apos;Misschien&apos;
              telt als nog niet beslist, dus dat blijft gewoon staan. Bij de
              ZRL is <strong className="text-foreground">Beschikbaar</strong>{" "}
              al genoeg: de raceweek staat dan als race in je schema, ook als de
              captain nog moet opstellen. Word je opgesteld, dan neemt de race
              van je team het over; word je niet opgesteld, dan verdwijnt het
              blok na de race. Via{" "}
              <strong className="text-foreground">Naar het event</strong> bij de
              training in je schema ga je terug naar het event op de kalender.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Zelf een rit inplannen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ga je zelf een rondje rijden of wil je een eigen training doen? Zet
              hem met <strong className="text-foreground">Rit inplannen</strong>{" "}
              in je schema als eigen rit of eigen training, met datum, duur en
              zwaarte. Die rit ligt daarna vast: de planner verplaatst of
              vervangt hem niet, maar zet de rest van de week eromheen en telt de
              belasting mee. Bij een eigen training kun je ook een workout uit de
              bibliotheek kiezen; die komt met zijn blokken in je schema en gaat
              naar intervals.icu. Clubritten en wedstrijden zet je er niet zo in:
              die komen uit de kalender, met{" "}
              <strong className="text-foreground">Ik doe mee</strong>.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Een dag aanpassen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met <strong className="text-foreground">Aanpassen</strong> op de
              trainingspagina geef je door hoeveel tijd je vandaag hebt en hoe je
              je voelt; de AI herschrijft de sessie van vandaag. Die gaat direct
              naar intervals.icu, waar de oude training van die dag verdwijnt,
              en je kunt meteen doorklikken. Je trainer krijgt bericht en kijkt
              achteraf of de rest van de week nog past. Heb je helemaal geen
              tijd, kies dan <strong className="text-foreground">Rustdag</strong>:
              de training van vandaag vervalt en verdwijnt ook uit intervals.icu.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Voorstellen in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Op basis van je laatste ritten kan er iedere ochtend een{" "}
              <strong className="text-foreground">voorstel</strong> in je schema
              verschijnen, bijvoorbeeld om woensdag korter te maken. Het is een
              regel bovenin je schema, geen nieuw programma:{" "}
              <strong className="text-foreground">Toepassen</strong> zet het door
              naar intervals.icu, <strong className="text-foreground">Negeren</strong>{" "}
              laat je schema zoals het was. Doe je niets, dan verdwijnt het voorstel
              vanzelf zodra het over een voorbije dag gaat.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Een training verwijderen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met <strong className="text-foreground">Verwijder</strong> bij een
              geplande training haal je die uit je schema en uit intervals.icu.
              Een voorgestelde training komt daarna niet terug: de planner laat
              die dag vrij. Een eigen rit verdwijnt helemaal en je schema wordt
              eromheen bijgewerkt. Een clubevent zeg je af bij het event zelf.
            </p>
          </article>
          <article
            id="warming-up"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Welke warming-up bij welke wedstrijd</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij een geplande race zet je in Vandaag of in je schema zelf een
              warming-up klaar. Hij staat dan vlak voor de race in intervals.icu,
              en zo in Zwift en op je fietscomputer. Er zijn er vijf. Tijdrit en
              ploegentijdrit (25 minuten) bouwen lang op naar wedstrijdtempo.
              ZRL lang (21 minuten) bereidt je voor op de harde start en de
              sprints van een scratch- of puntenrace; ZRL kort (10 minuten) is
              er voor als je weinig tijd hebt. Lange wedstrijd (12 minuten)
              spaart energie. Elke warming-up eindigt met bursts van 6 seconden
              en een minuut losdraaien ertussen: voluit voor ZRL, een
              versnelling voor de tijdritten. Wees een paar minuten voor de
              start klaar en trap rustig door.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Feedback na een training</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Je RPE, gevoel en opmerking zijn voor je trainer én voor volgende
              bijstellingen van je schema. Een losse zware training verandert
              niet meteen alles; terugkerende signalen en een concrete opmerking
              wegen mee bij de eerstvolgende aanpassing.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Staat je rit in intervals.icu, dan bekijkt de app ook hoe je de
              training uitvoerde: per herhaling het vermogen tegenover het doel,
              hoe ver je op een duurrit in zone 3 of hoger kwam boven wat gepland
              was, en op een lange gelijkmatige rit hoe ver vermogen en hartslag
              uit elkaar liepen. Je trainer ziet daar suggesties uit, alleen als
              er iets opvalt, zoals een eerste herhaling ver boven het doel
              waarna de rest wegzakte, of een herstelrit die zwaar voelde. Hij
              beslist zelf wat hij ermee doet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Klik je in de maandkalender op een training die al geweest is, dan
              zie je de geplande opbouw naast wat je gereden hebt. Ook bij een
              gemiste training blijft zichtbaar wat er stond.
            </p>
            <p
              id="rit-koppelen"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              ZWB koppelt een rit vanzelf aan de training van die dag. Zit dat
              ernaast, kies dan zelf bij{" "}
              <strong className="text-foreground">Hoort bij</strong> welke training
              het was. Dat kan bij een gereden training en bij een rit die als niet
              gepland in de kalender staat, ook nadat je al bevestigd hebt. Je kunt
              kiezen uit trainingen die nog open staan in de week tot en met de
              ritdag; een training die later gepland staat niet, want die blijft in
              je schema staan. Je RPE, gevoel en opmerking verhuizen mee, de
              training waar de rit eerst aan hing telt weer als niet gereden. Kies
              je <strong className="text-foreground">Geen training</strong>, dan
              blijft de rit los staan en koppelt ZWB hem niet opnieuw; wat je bij
              die training had ingevuld vervalt dan. Verwijder je een rit in
              Strava, dan komt de training vanzelf weer vrij en blijft wat je
              invulde staan, zodat je er een andere rit aan kunt hangen.
            </p>
            <p
              id="rit-invoeren"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              Gereden, maar mislukte de opname of is het bestand weg? Klik de
              training aan en kies{" "}
              <strong className="text-foreground">Rit invoeren</strong>. Datum,
              naam en duur staan al ingevuld; vul de starttijd in en wat je weet
              van afstand, hoogtemeters, vermogen en hartslag. De rit hangt meteen
              aan die training. Met vermogen rekent ZWB de TSS met je NP; vul je
              alleen het gemiddelde in, dan valt die iets te laag uit. Zonder
              vermogen komt de TSS uit je hartslag. Zonder spoor tellen cols, ZWB
              Segments en ZWBlokken niet mee. Klopt er iets niet, kies dan{" "}
              <strong className="text-foreground">Ingevoerde rit verwijderen</strong>;
              de training staat daarna weer open.
            </p>
            <p
              id="naleving"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              Het percentage bij <strong className="text-foreground">Volgens plan</strong>,{" "}
              <strong className="text-foreground">Te licht</strong> of{" "}
              <strong className="text-foreground">Te zwaar</strong> is je gereden
              TSS tegenover de geplande: tussen 80 en 115% is volgens plan. Daaronder
              staat per onderdeel een balk: duur, TSS en IF, elk met een percentage.
              Teal is wat je reed tot het plan, goud wat erboven kwam, en de streep
              is het plan. De geplande IF volgt uit de geplande TSS en duur.
              Bij RPE staat de verwachte naast wat je invulde; de verwachte RPE is
              die van het zwaarste deel van de training dat minstens vijf minuten
              duurt, op dezelfde schaal als bij de blokken. RPE telt niet mee in het
              percentage of het oordeel.
            </p>
            <p
              id="tijd-per-zone"
              className="mt-2 scroll-mt-20 text-sm text-muted-foreground"
            >
              Onder de cijfers staat ook per zone een balk met hoeveel minuten je
              reed tegenover de geplande, op je FTP en met de zones van Zwift. Alle
              zones staan op dezelfde schaal, zodat je ziet waar de meeste tijd zat. <strong className="text-foreground">Verdeling</strong>{" "}
              zegt hoeveel van je rit in dezelfde verhouding over de zones lag als
              gepland, los van hoe lang je reed. Die
              tijden komen uit de vermogensmeting in intervals.icu. Dat werkt alleen
              als je rit rechtstreeks van je Garmin, Wahoo of Zwift in intervals.icu
              staat: een rit die via Strava binnenkomt heeft daar geen meting. Dan
              staat er Geen zonedata. Het kan na een rit even duren voordat de
              tijden verschijnen.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Readiness en je apparaat</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Whoop, Oura en Polar sturen een eigen readiness of herstelscore naar
              intervals.icu; die nemen we één op één over. Garmin doet dat niet:
              Body Battery en Training Readiness blijven in Garmin Connect en
              komen niet mee. Voor die horloges rekent ZWB zelf een readiness uit
              je HRV en je rust-hartslag, afgezet tegen je eigen gemiddelde van de
              afgelopen 30 dagen, en je slaapscore. Korte nachten tellen daarna
              apart mee, net als bij de andere apparaten. Zo&apos;n waarde staat in
              de app met <em>berekend door ZWB</em> erbij.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Meet je horloge geen HRV, of is je laatste meting ouder dan een
              week, dan blijft het bewust een streepje. Een herstelscore op alleen
              je rust-hartslag zou vooral meetruis zijn, en dat wil je niet terug
              zien in je trainingsadvies.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
