import Link from "next/link";
import {
  CheckCircle2,
  Mountain,
  Trophy,
} from "lucide-react";

export function RacenHelp() {
  return (
    <>
      <section
        id="racen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Trophy className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWBeter racen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Na een Zwift-race zie je onder ZWBeter racen eerst tips voor
              jezelf, en daaronder de details. Bij een ZRL-race is dat hoe je
              ploeg reed: de plaats in de groep, per renner het vermogen en de
              segmenten, en in een ploegentijdrit waar de ploeg tijd won of
              verloor. Bij een FRR-etappe of een andere Zwift-race is het je
              eigen race: je plek en tijd in je startgroep, wat je per segment
              op de snelste verloor, en de andere ZWB&apos;ers in die race. Je ziet
              de races die je zelf reed of waarvoor je in de opstelling stond.
              Ben je captain of co-captain, dan zie je ook alle ZRL-races van je
              teams, ook van de subteams, met tips voor de ploeg en per renner.
            </p>
          </div>
        </header>

        <div id="racen-tips" className="mt-4 scroll-mt-20 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Racetips</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Onder Racen → Racetips zetten leden hun tips over racen: in Zwift of
            buiten, op de weg en in criteriums. Kies Zwift of Buiten, schrijf je tip
            (hooguit 300 tekens) en plaats hem. Elk lid ziet de tip, met je naam
            erbij. Je kunt je eigen tip later aanpassen of verwijderen. Racetips
            staan ook in de ZWBieb, bij het onderwerp Zwift-racen of Wegracen en
            criteriums, en bij jouw tips op je profiel.
          </p>
        </div>

        <div id="racen-kennis" className="mt-4 scroll-mt-20 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">De kennisbank racen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Onder Racen → Kennisbank staat wat er bekend is over tactiek in een
            Zwift-race: het wiel en je plek in de groep, wat een race vraagt,
            klimmen, aanvallen, ontsnappen, de sprint, de ploegentijdrit en de
            spelregels van Zwift. Dezelfde artikelen staan in de ZWBieb op de plank
            Racetactiek, en de coach kent ze.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Over tactiek in Zwift zelf is weinig onderzoek gepubliceerd. Het meeste
            bewijs komt uit de echte koers: metingen van de slipstream, en analyses
            van ontsnappingen en sprints bij de profs. Voor Zwift geldt dat alleen
            voor zover het spel de natuurkunde nabootst; zo&apos;n advies staat daarom
            op Eerste aanwijzingen. Hoe Zwift rekent (powerups, supertuck, het
            peloton sinds Pack Dynamics 4) komt van Zwift en uit tests van Zwift
            Insider. Dat telt niet als bewijs en staat bij de beperkingen van elk
            artikel.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Waar de cijfers vandaan komen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Alles over de ploeg komt van Zwift: de uitslag van je groep en de
            segmentresultaten. Dat is wat ook in de game en op ZwiftPower staat:
            gemiddeld vermogen, W/kg, het beste vermogen over 1, 5 en 20 minuten,
            en per sprint of klim je W/kg en je plek in de groep. Plaats en tijd
            zijn die van Zwift; de officiële uitslag is die van WTRL. Bekijk je
            een oudere race voor het eerst, dan haalt de app het vermogen nog bij
            Zwift op; dat duurt even.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            In een ploegentijdrit vergelijkt de app je ploeg met de ploeg direct
            voor of achter je in de uitslag. Een stuk loopt tot en met de sprint
            of klim die erbij staat. De tijd van een ploeg is die van de vierde
            renner; wie meer dan 30 seconden na de vierde binnenkwam, staat als
            los. Lukt het niet om de startrijen eenduidig te bepalen, dan staat
            er geen verloop, alleen de uitslag.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">FRR en andere Zwift-races</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Een FRR-tijdslot of een andere Zwift-race uit de kalender staat
            vanzelf in je lijst zodra je hem gereden hebt. Bij FRR zie je ook
            de ZWB&apos;ers in dezelfde etappe over alle tijdsloten, met hun tijd, en
            je plek in het klassement van FRR. Van andere ZWB&apos;ers zie je alleen
            plek en tijd, net als op de site van FRR.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Een race die niet in de kalender staat, open je door de link van
            het Zwift-event te plakken (zwift.com/events/view/…, of de link uit
            ZwiftPower). De app haalt de race alleen op als je in de uitslag
            staat; daarna staat hij in je lijst. Staat de race wel in de
            kalender, dan ga je naar die race.
          </p>
        </div>

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">De tips</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Een tip komt er alleen als de data een gevolg of een afwijking
            laat zien die bij het soort race past, en hij noemt het getal
            waarop hij steunt. Leegrijden op een klim is in een race normaal;
            een tip komt er pas als je de klim te hard begon en ver voor de top
            stilviel, of als een harde start je W′ kostte voor de eerste klim.
            In een ploegentijdrit kijkt de app ook hoe lang je na een klim
            nodig had om te herstellen, waar je loste en op welke klim je het
            meeste vermogen nodig had. In een tijdrit: of je wegzakte in de
            tweede helft, of je een klim onder je eigen kunnen reed terwijl je
            boven nog W′ had, en of er reserve overbleef tegenover je beste van
            90 dagen. Het plan uit de TTT Planner en de kopbeurten uit de
            TTT-bot gebruiken de tips niet; daar zeggen ze dus niets over.
          </p>
        </div>

        <div id="racen-trainer" className="mt-4 scroll-mt-20 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Voor trainers</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Onder Trainer → Races zie je de Zwift-races van het lid met de tips
            die het lid zelf ook ziet, met de eigen rit erbij. Vink aan welke
            tips je wilt doorgeven, pas het bericht aan en stuur het naar de
            coachchat. Bij Beoordelen staan bij een training de suggesties uit
            de uitvoering; Overnemen zet de tekst in het feedbackveld, waar je
            hem aanpast voor je opslaat.
          </p>
        </div>

        <div id="racen-eigen-rit" className="mt-4 scroll-mt-20 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Jouw rit</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Reed je zelf mee en heb je intervals.icu gekoppeld, dan haalt de app
            je eigen rit erbij, per seconde. Die zie alleen jij. Een rit die via
            Strava in intervals.icu kwam, heeft geen bestand per seconde: laat
            Zwift of je fietscomputer dan rechtstreeks naar intervals.icu syncen.
            De app legt het bestand tegen de racetijd aan de hand van je
            vermogen op de segmenten, zodat de stukken kloppen met de race.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Je ziet per stuk vermogen, genormaliseerd vermogen (NP), intensiteit
            (NP gedeeld door je FTP uit je profiel), hartslag en cadans, en je
            beste vermogen in de race naast je beste van de laatste 90 dagen.
            De W′-balans is een model: de app schat je critical power en je
            reserve daarboven (W′) uit je eigen curve van 3 tot 20 minuten, en
            rekent mee hoe die reserve leegloopt boven je critical power en
            herstelt eronder. Bij 0% is je reserve volgens het model op; komt
            hij eronder, dan schat de curve je iets te laag in. Watt per hartslag
            vergelijkt het eerste en het laatste vlakke stuk: daalt die, dan
            liep je hartslag op bij hetzelfde vermogen.
          </p>
        </div>
      </section>

      <section
        id="pacing"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Mountain className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Pacingplan bij een event</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Een verdeling van je vermogen over het parcours, per stuk in w/kg,
              doorgerekend op je CP, je anaerobe reserve en je gewicht.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hoe het plan ontstaat</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Open je de pacingpagina, dan staat er een basisvoorstel: elke klim
                  apart, lange klimmen in begin, midden en slot, en het vlakke deel
                  in stukken van hoogstens 8 km. Met Nieuw voorstel vraag je de AI
                  om het te verbeteren; ook dat voorstel wordt doorgerekend en
                  teruggeschaald als je reserve het niet houdt.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Wil je ergens anders een versnelling leggen, knip een stuk dan op
                  een kilometerpunt (minstens een halve kilometer van de randen) of
                  voeg twee stukken samen; het doel wordt dan het gemiddelde naar
                  afstand. Hoogstens 30 stukken. Verandert de route, dan deelt
                  opnieuw doorrekenen de route opnieuw in en vervallen je eigen
                  knippen.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Verandert je CP, je gewicht of de indeling van de route, dan heet
                  het plan verouderd. Opnieuw doorrekenen kost niets en verandert je
                  plan pas als jij erop drukt.
                </span>
              </li>
            </ul>
          </article>

          <article
            id="pacing-eindtijd"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Gewenste eindtijd</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vul een tijd in als u:mm en kies Plan voor deze tijd. De verdeling van
              je plan blijft hetzelfde; alle doelen gaan samen omhoog of omlaag tot
              de verwachte tijd binnen een halve minuut van je doel ligt.
              Neutralisaties en afdalingen schuiven niet mee. Is je doel sneller dan
              je reserve en je drempel toelaten, dan krijg je het snelste plan dat
              de finish haalt en zie je welke tijd dat is. Het doel blijft bij je
              plan staan, zodat je na een aanpassing ziet hoe ver je ervan af zit.
              Vraag je daarna een nieuw voorstel, dan krijgt de AI je doeltijd mee:
              die kiest waar je harder en zachter rijdt, en het platform zet die
              verdeling daarna weer op je tijd. Wind zit niet in de berekening;
              slipstream alleen bij een Zwift-event (zie Zwift-wedstrijden).
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Zolang het event nog moet komen, zie je ook hoe ver je van je doel
              af zit: het oordeel, hoeveel CP je nodig hebt, welke groei tot het
              event redelijk is, en wat 1% CP of 1 kg scheelt. Dat werkt zoals
              bij een{" "}
              <Link href="/hulp/schema#doeltijd" className="underline underline-offset-2">
                doeltijd voor je gran fondo
              </Link>
              , maar op je eigen plan. Heb je een trainingsdoel met een doeltijd
              voor dit event, dan staat dat eronder.
            </p>
          </article>

          <article
            id="pacing-neutralisatie"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Neutralisatie</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Zet de organisatie een neutralisatie op het event, dan is dat in je
              plan een vast stuk zonder schuifregelaar. Het plan rekent daar met
              ongeveer 30 km/u achter de wagen, en nooit met meer dan 70% van je
              CP. Dat kost je dus geen reserve, maar het werk telt wel mee voor hoe
              vermoeid je later in de rit bent. Komt er een neutralisatie bij of
              verschuift hij, dan wordt je plan verouderd.
            </p>
          </article>

          <article
            id="pacing-afdalingen"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Afdalingen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Een afdaling van minstens een kilometer die gemiddeld 4% of meer daalt,
              is een eigen stuk. Het doel staat standaard op 0: uitrollen. Waar het
              steiler dan 3% daalt rekent het plan dan zonder trappen; op een vlakker
              stukje in de afdaling trap je toch licht door (40% van je CP). Uitrollen
              vult je reserve sneller aan en kost geen werk. Het plan gaat uit van
              hoogstens 79 km/u en houdt geen rekening met bochten of remmen, dus de
              verwachte tijd op een technische afdaling is optimistisch. Wil je toch
              doortrappen, schuif het doel dan omhoog; dat blijft staan zolang de
              afdaling dezelfde is.
            </p>
          </article>

          <article
            id="pacing-zwift"
            className="scroll-mt-20 rounded-md border bg-background p-4 lg:col-span-2"
          >
            <h3 className="text-sm font-semibold">Zwift-wedstrijden</h3>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>
                Bij een Zwift-event rekent het plan met de fysica van Zwift in plaats
                van die van de weg. Onder Opzet kies je het format, je frame met
                upgradeniveau en je wielen; het plan wordt daarna meteen
                opnieuw doorgerekend. Het format staat vooraf op wat het event zegt:
                een event zonder drafting is een tijdrit. Regels van het event tellen
                mee: geen tijdritfiets waar die verboden is, geen powerups als ze uit
                staan, opgelegde wielen en uitgeschakelde upgrades.
              </p>
              <p>
                Fietsen komen uit de snelheidstests van ZwiftInsider: per frame en
                wielset hoeveel sneller of trager je bent op het vlak en op een klim.
                Het plan rekent ook met het wegdek. Op onverhard is een racefiets
                veel trager dan een gravelbike, op asfalt is het omgekeerd; die
                stukken staan als band onder het hoogteprofiel. De wegdekkaart komt
                van ZwiftMap. Je lengte uit je profiel telt mee voor de
                luchtweerstand; zonder lengte rekent het plan met 175 cm, zoals Zwift.
              </p>
              <p>
                Onder Opzet staat ook Snelste fiets: de drie frames die jouw plan op
                deze route het snelst rijden, elk met de wielen die daar het best bij
                passen, en je huidige fiets eronder. Het verschil is de tijd die je
                wint of verliest ten opzichte van wat je nu hebt gekozen. Alle frames
                worden vergeleken op het upgradeniveau dat je bij je frame hebt
                gekozen; een frame dat op dat niveau niet getest is, rijdt op het
                hoogste niveau daaronder. Met Kies zet je die fiets in je opzet en
                wordt het plan opnieuw doorgerekend. Legt het event een frame op, dan
                is er niets te kiezen en staat de lijst er niet.
              </p>
              <p>
                Welke fietsen je in Zwift hebt, kan ZWB niet uit Zwift lezen. Vul ze
                in bij Mijn garage onder Zwift-fietsen: je frames met hun
                upgradeniveau en je wielen. Dan rekent Snelste fiets elk frame uit
                je garage op zijn eigen niveau en elk ander frame op stage 0, wat je
                krijgt als je het koopt; een fiets die je niet hebt, krijgt &quot;niet in
                je garage&quot;. Met Alleen mijn garage zie je alleen wat je nu kunt
                rijden, en een nieuw pacingplan begint met de snelste daarvan. Vink
                je geen wielen aan, dan gaat de app ervan uit dat je ze allemaal hebt. In de
                racebriefing staat onder Snelste fiets dan ook een regel
                Jij: de snelste fiets uit jouw garage, met dezelfde renner en
                hetzelfde vermogen als de rest van de lijst, zodat alleen de fiets
                verschilt.
              </p>
              <p>
                In een wedstrijd kies je per stuk In de groep of Alleen. In de groep
                kost hetzelfde tempo ongeveer een derde minder luchtweerstand; op een
                steile klim scheelt dat weinig. Een wedstrijd krijgt een vaste start
                (de eerste 700 m gaat het veld hard weg) en een sprint over de laatste
                300 m, behalve als de finish op een klim ligt. Tot de sprint houdt het
                plan minstens 20% van je reserve over voor een aanval. Bij een
                ploegentijdrit rekent het plan met je kopbeurten naar ploeggrootte.
              </p>
              <p>
                Per stuk kun je een powerup inzetten die het event uitdeelt. Het plan
                rekent de werking mee vanaf het begin van dat stuk: veer 10% lichter
                30 s, aerohelm 25% minder luchtweerstand 15 s, draft boost meer
                slipstream 40 s (alleen in de groep), stoomwals minder rolweerstand
                30 s, aambeeld zwaarder op een afdaling 15 s. Je weet vooraf niet
                welke powerup je krijgt; zorg dat je plan ook zonder werkt. Hoe groot
                de slipstream en de draft boost precies zijn, maakt Zwift niet bekend:
                dat zijn schattingen.
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
