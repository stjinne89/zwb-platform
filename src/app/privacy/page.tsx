import Link from "next/link";
import { BackLink } from "@/components/app-ui";
import { formatPrivacyVersion } from "@/lib/privacy";

export const metadata = {
  title: "Privacyverklaring — ZWB Cycling",
  description:
    "Hoe ZWB Cycling met je persoonsgegevens omgaat: welke data we verwerken, waarom, hoe lang en welke rechten je hebt.",
};

// Uit de versielijst, niet met de hand. Deze regel stond op "31 mei 2026"
// terwijl de tekst sindsdien vier keer inhoudelijk was gewijzigd; met een los
// bijgehouden datum loopt dat vroeg of laat weer uiteen.
const UPDATED = formatPrivacyVersion();

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

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Privacyverklaring</h1>
        <p className="text-sm text-muted-foreground">
          Laatst bijgewerkt: {UPDATED}. Deze verklaring legt uit hoe het
          ZWB Cycling-platform met je persoonsgegevens omgaat, conform de Algemene
          Verordening Gegevensbescherming (AVG/GDPR).
        </p>
      </header>

      <Section title="1. Wie verwerkt je gegevens?">
        <p>
          ZWB Cycling (de wielerclub en haar bestuur) is verwerkings­verantwoordelijke
          voor de gegevens die via dit platform worden verwerkt. Vragen over
          privacy of een verzoek over je gegevens? Mail naar{" "}
          <a href="mailto:info@zwbcycling.nl" className="text-primary underline">
            info@zwbcycling.nl
          </a>
          .
        </p>
      </Section>

      <Section title="2. Welke gegevens we verwerken">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>ZWBgame:</strong> goedgekeurde leden en het clubroster vormen het
            deelnemersveld van dit besloten clubspel. Je naam is zichtbaar bij je
            renner. Voor elk lid leiden we spelkwaliteiten (vlak, klimmen, sprint en
            rennerstype) af uit gegevens die al in het platform staan: FTP en gewicht
            van je profiel en, als je Intervals hebt gekoppeld, je gesynchroniseerde
            vermogenscurve. Klimmen volgt je vermogen per kilo. Clubleden zien in de
            game alleen die afgeleide kwaliteiten, geen watts of gewicht. Zonder FTP
            en gewicht rijd je met een basisprofiel. De Intervals-curve kan
            activiteiten bevatten die je via Strava in Intervals hebt gezet; daarop
            filteren we bij deze afleiding niet. Wellness en medische gegevens worden
            niet gebruikt. Je kunt herkenbare deelname uitschakelen in de
            spelinstellingen; dan kom je niet in het peloton van anderen. Leden zonder
            account kunnen dit via het bestuur doen. Je kunt ook een eigen meting of
            een Intervals-spelprofiel met bevestigde, niet-Strava herkomst opslaan dat
            de platformgegevens vervangt. Daarvan bewaren we afgeleide spelkwaliteiten,
            bron en meetperiode; ingevoerd gewicht en ruwe vermogenswaarden worden niet
            in de game opgeslagen. Een eigen spelprofiel vervalt na 30 dagen, bij
            terugzetten naar platformgegevens en bij ontkoppelen van Intervals. Lopende solo-races staan maximaal zeven dagen
            bruikbaar in je browser, zonder namen of vermogensprofielen. Bij hervatten
            controleren we deelname en toestemming opnieuw. Alleen je eigen laatste
            twintig uitslagen blijven lokaal bewaard totdat je die wist. Browserdata
            op andere apparaten kunnen we niet op afstand wissen.
          </li>
          <li id="voorzpwelbokaal" className="scroll-mt-20">
            <strong>voorZpWelBokaal:</strong> alleen als je zelf op Meedoen tikt.
            Dan bewaren we per seizoen dat je meedoet, je inzetten (renner, soort
            inzet, quotering en aantal ZWBallen) en je antwoorden op de
            bonusvragen. Clubleden zien op de lei je naam met je saldo, hoeveel
            ballen er nog openstaan en hoeveel inzetten raak waren. Je inzetten en
            antwoorden zien andere leden pas vanaf de start van die wedstrijd. De
            quoteringen komen uit de openbare veldritratings, startlijsten en
            uitslagen van CyclingFlash; daar gaan geen gegevens van jou heen. Met
            Stoppen op je briefjes wis je je deelname van dat seizoen, met al je
            inzetten en antwoorden.
          </li>
          <li>
            <strong>Account- en profielgegevens:</strong> naam, e-mailadres,
            profielfoto, regio, ZRL-categorie, Zwift-/Strava-ID, FTP en gewicht
            (voor zover je die invult), biografie en zichtbaarheids­voorkeuren.
            Je fietsen (naam, merk en model, afstand en foto) zien andere leden op
            je profiel, behalve de fietsen die je daar verbergt. Zet je je
            publieke profiel aan, dan zien bezoekers daarvan ze ook.
          </li>
          <li>
            <strong>ZRL-teamgegevens van WTRL:</strong> voor de ZRL-teams nemen
            beheerders van WTRL over wat daar per teamlid staat: naam, Zwift-ID,
            zFTP (in watt en per kilo), zMAP (per kilo) en de status in het team.
            Dat gebeurt ook voor teamleden zonder ZWB-account. Ingelogde leden zien
            deze waarden op de teampagina, met de categorie en de divisie die
            daaruit volgen. Bij een volgende import worden de gegevens van dat team
            vervangen. Staat iemand bij WTRL in een team, dan zetten we hem ook in
            het bijbehorende ZWB-team; zonder ZWB-account komt zijn naam in het
            rooster van dat team, tot hij zijn naam claimt.
          </li>
          <li>
            <strong>TTT-plannen:</strong> een ploegleider kan een plan delen met
            de TTT-bot in Discord via een geheime link. Wie die link heeft, ziet de
            plannaam en per renner naam, Zwift-ID, kopbeurtvermogen en -duur. De
            ploegleider kan de link intrekken.
          </li>
          <li id="racen" className="scroll-mt-20">
            <strong>Analyse van Zwift-races (ZWBeter racen):</strong> na een
            ZRL-race bewaren we uit de uitslag en de segmentresultaten van Zwift
            per renner ook het gemiddelde vermogen, het gewicht, het soort
            vermogensmeter, het beste vermogen over 15 seconden en 1, 5 en 20
            minuten, het finishmoment en per sprint of klim het vermogen. Dat is
            wat Zwift ook in de game en op ZwiftPower laat zien, en het geldt voor
            iedereen in de groep, ook renners zonder ZWB-account en van andere
            clubs. Hartslag nemen we niet over. Wie de race reed of in de
            opstelling stond, de captains van het team en wie teams beheert, zien
            voor de renners van het team vermogen, W/kg, de segmenten en tips per
            renner (die laatste alleen captains en beheerders); het gewicht staat er niet los
            bij, maar volgt uit vermogen en W/kg, net als op ZwiftPower. Plant een
            captain een ploegentijdrit in de TTT Planner, dan ziet die per renner
            van het plan ook diens eerdere ZRL-ploegentijdritten bij andere
            ZWB-teams: W/kg, vermogen op de klimmen en of je loste. Reed je
            zelf mee en heb je intervals.icu gekoppeld, dan halen we bij het
            openen je rit per seconde en je vermogenscurve van de laatste 90 dagen
            op om je eigen rit te analyseren. Die analyse ziet alleen jij, en we
            bewaren haar niet. Bij een FRR-etappe, een andere Zwift-race uit de
            kalender of een race waarvan je de link plakt, bewaren we de uitslag
            en de segmenttijden van je startgroep; vermogen, gewicht en naam alleen
            van ZWB&apos;ers, van anderen alleen plek en tijden. Een geplakte race
            halen we alleen op als je zelf in de uitslag staat. Andere ZWB&apos;ers
            in zo&apos;n race zien jouw plek en tijd, niet je vermogen.
          </li>
          <li id="zwb-ds" className="scroll-mt-20">
            <strong>ZWB DS (live raceoverzicht):</strong> tijdens een Zwift-race
            uit de kalender vragen we bij Zwift van de renners in de startgroep de
            actuele stand op: afstand in de race, snelheid, vermogen, cadans,
            draft, rijtijd en verbruikte energie, met de naam en het gewicht uit
            de startlijst; het gewicht alleen om W/kg te rekenen, het staat
            nergens los. Dat geldt
            ook voor renners zonder ZWB-account en van andere clubs, en het is wat
            Zwift ook in de game laat zien. Alleen ingelogde leden zien het
            overzicht, met W/kg per renner. Hartslag lezen en bewaren we niet. De
            laatste stand per renner bewaren we hooguit zes uur; daarna wissen we
            hem.
          </li>
          <li>
            <strong>Sunday Race Club (MyWhoosh):</strong> doe je mee aan de SRC,
            dan leggen we per maand vast onder welk ZWB-team je rijdt, in welke race
            en in welke categorie je verwacht te rijden, en per zondag of je kunt.
            Na elke race halen we de openbare uitslag van MyWhoosh op. Daaruit
            bewaren we alleen renners onder een ZWB-teamnaam, leden die aan hun
            MyWhoosh-account zijn gekoppeld, en renners met precies de naam van een
            lid (als koppelvoorstel voor een beheerder): naam, MyWhoosh-ID, team,
            categorie, plaats en tijd. Vermogen, gewicht en prijzengeld nemen we
            niet over. Van de andere teams bewaren we alleen teamnaam, teamtijd en
            plaats. Ingelogde leden zien dit op de SRC-pagina en bij de race. Een
            beheerder kan je MyWhoosh-ID aan je profiel koppelen; dat ID staat dan
            op je profiel en kun je daar zelf aanpassen.
          </li>
          <li>
            <strong>Lengte en eigen recepten:</strong> vul je je lengte in, dan
            gebruiken we die om de porties in het receptenboek op jou af te
            stemmen en om in je pacingplan voor een Zwift-event je luchtweerstand
            te berekenen. Je lengte en de recepten die je zelf maakt, zijn alleen voor
            jou zichtbaar. Markeer je een recept als favoriet of als &quot;niet
            voor mij&quot;, dan bewaren we dat; alleen jij ziet het. Stel je een
            eigen recept voor aan de club, dan ziet een beoordelaar het. Na
            goedkeuring ziet elk lid het, met jouw naam erbij. Een dieetfilter
            in het receptenboek wordt niet bewaard.
          </li>
          <li>
            <strong>Eetdagboek (alleen met opt-in):</strong> wat je eet, leggen
            we alleen vast als je Naleving zelf aanzet en daarvoor tekent. We
            bewaren dan per maaltijd de datum, het moment, de producten en de
            hoeveelheden, en rekenen daaruit je koolhydraten en eiwit. Een
            caloriedoel of je gewichtsverloop hoort daar niet bij. Alleen jij
            ziet je eetdagboek, tenzij je je eigen trainer laat meekijken (een
            aparte toestemming die je weer kunt intrekken); andere leden zien het
            nooit. Je
            kunt pauzeren, losse maaltijden verwijderen en alles wissen; zet je
            Naleving uit, dan verwijderen we het hele eetdagboek. Zoek je een
            verpakt product op met de barcode, dan vragen we het op bij Open Food
            Facts; daarbij gaat alleen de barcode mee, niet wie het vraagt. Zet
            je daarnaast &quot;Tekst herkennen&quot; aan (een aparte
            toestemming), dan gaat je omschrijving van een maaltijd naar OpenAI,
            dat herkent wat erin zit en de hoeveelheden schat. We houden alleen
            bij wanneer je de herkenning gebruikte, voor
            de daglimiet. Je eetdagboek staat in je data-export.
          </li>
          <li id="protocollen" className="scroll-mt-20">
            <strong>Protocollen (alleen met opt-in):</strong> start je een
            protocol, zoals hittetraining of een supplement voor een wedstrijd,
            dan teken je daar apart voor. We bewaren welk protocol je volgt, de
            start- of wedstrijddatum en welke taken je per dag afvinkt. Bij een
            supplement zegt dat iets over wat je inneemt, en een protocol als
            collageen bij revalidatie laat zien dat je een blessure hebt. Jij en je eigen
            trainer zien het; het bestuur en andere leden niet. Doses rekent de
            app bij het tonen uit het gewicht in je profiel; die worden niet
            apart opgeslagen. Loopt er een trainingsprotocol (hitte of lage
            cadans), dan gaan de naam en de datums mee naar OpenAI bij elke
            schemageneratie; voedingsprotocollen gaan niet mee.
            Volg je een hitteprotocol en heb je intervals.icu gekoppeld, dan
            kijken we bij je ritten op hittedagen of er een kerntemperatuur van
            een CORE-sensor in staat. Daarvan bewaren we per rit alleen de
            hoogste waarde, hoeveel minuten je op of boven 38,5 °C was, na
            hoeveel minuten je die drempel haalde, hoe lang je reed en hoeveel
            van de rit de sensor mat; niet de meting zelf. Voldoet de rit aan de
            hittesessie, dan vinkt de app hem voor je af; anders legt hij uit
            waarom niet. Dat oordeel rekent de app zelf uit met vaste regels. Jij en je eigen trainer zien die waarden; ze gaan niet
            naar OpenAI.
            Je kunt een protocol altijd stoppen; de gegevens verdwijnen als je
            je account opheft.
          </li>
          <li id="zwbieb" className="scroll-mt-20">
            <strong>ZWBieb, eerst &ldquo;Wie weet wat&rdquo; (alleen met
            opt-in):</strong> doe je mee of stel je een vraag, dan teken je daar
            apart voor. We bewaren de onderwerpen waar je ervaring mee hebt en
            de spullen die je wilt uitlenen, met je korte toelichting, de tips
            die je plaatst en de gesprekken die je voert, met wanneer je ze las.
            Voeg je zelf een onderwerp of spul toe, dan bewaren we ook dat jij
            het toevoegde; de moderatie ziet dat. Onderwerpen, spullen en tips
            zien goedgekeurde clubleden, met je naam erbij; ze staan niet op je
            openbare profiel. Een gesprek zien alleen jij en
            het andere lid, ook het bestuur niet. Vindt het andere lid een
            bericht van jou in jullie gesprek waardevol, dan kan het dat als tip
            voor de club bewaren, onder jouw naam; je eigen berichten bewaar je
            niet zelf. Het bestuur kan een bericht dat je in een clubgroep
            schreef als tip onder je naam zetten (zie de
            gebruikersvoorwaarden), en een tip verbergen. Krijg je een bericht
            of wordt je antwoord als tip bewaard, dan sturen we een pushmelding
            als je die aan hebt staan; die zegt van wie het komt en over welk
            onderwerp, niet wat erin staat. Een tip op jouw naam kun je altijd
            zelf aanpassen of verwijderen. Er gaat
            niets naar OpenAI. Stop je, dan verdwijnen je onderwerpen en spullen; tips en
            gesprekken kun je zelf verwijderen, en alles verdwijnt als je je
            account opheft. Het staat in je data-export.
          </li>
          <li id="qa" className="scroll-mt-20">
            <strong>Q&amp;A, vragen over de app:</strong> stel je een vraag,
            dan bewaren we de tekst, wanneer je hem stelde en voor wie hij is.
            Een vraag voor de club zien goedgekeurde clubleden, met je naam
            erbij, samen met het antwoord. Zet je &ldquo;Alleen voor het
            bestuur&rdquo; aan, dan zien alleen jij en wie vragen mag
            beantwoorden hem. Wie antwoordt, kan een clubvraag ook zo
            afschermen. Bij een antwoord bewaren we wie het schreef en wanneer.
            Wie antwoordt, krijgt een pushmelding dat jij een vraag stelde; jij
            krijgt er een als hij beantwoord is, als je die aan hebt staan. Een
            melding noemt nooit wat er in de vraag of het antwoord staat. Er
            gaat niets naar OpenAI. Tik je &ldquo;Ik ook&rdquo; bij een
            clubvraag, dan bewaren we dat: anderen zien alleen hoe vaak een
            vraag gesteld is, wie antwoordt ziet ook door wie. Stel je een
            vraag die er al staat, dan kan wie antwoordt hem samenvoegen: jouw
            vraag verdwijnt en telt als &ldquo;Ik ook&rdquo; bij de vraag die er
            al stond. Vaak gestelde vragen kunnen met het antwoord in de FAQ
            komen; daar staat geen naam bij. Je vraag en je &ldquo;Ik
            ook&rdquo; kun je altijd zelf verwijderen;
            alles verdwijnt als je je account opheft. Het staat in je
            data-export.
          </li>
          <li>
            <strong>Gezondheids­gerelateerde data (alleen met opt-in):</strong>{" "}
            herstel-/wellnessgegevens uit intervals.icu zoals rusthartslag, HRV,
            slaap en readiness. Deze worden alléén gesynchroniseerd als je daar
            expliciet toestemming voor geeft, en zijn alleen voor jou (en een door
            jou aangewezen trainer) zichtbaar. Zet je de opt-in uit of ontkoppel
            je intervals.icu, dan verwijderen we deze gegevens.
          </li>
          <li>
            <strong>Locatiegegevens tijdens live tracking:</strong> als je een
            live rit start, worden je GPS-positie, snelheid, hoogte en afstand
            gedeeld met ingelogde clubleden, en ook je vermogen en cadans als je
            fietscomputer die meet. Je hartslag alleen als je zelf
            &ldquo;Hartslag delen met leden&rdquo; aanzet op Samen fietsen; zet
            je dat uit, dan wissen we de opgeslagen live-hartslag. De publieke
            eventpagina toont alleen je positie en, bij een koers in rondjes, de
            afstand van je fietscomputer. Dit is per rit opt-in en stopt
            automatisch. Koppel je je
            Garmin, dan ontvangen we bij elke rit de LiveTrack-mail die je zelf
            naar je persoonlijke clubadres laat sturen; uit die mail bewaren we
            alleen de link. Koppel je je Wahoo, dan bewaren we je vaste Live
            Track-link, alleen zichtbaar voor jou, en kijken we daarmee of je
            rijdt zodra iemand de live-kaart opent. Zolang de rit loopt halen we
            je posities op bij Garmin of Wahoo. Stoppen kan op Samen fietsen met
            &ldquo;Koppeling stoppen&rdquo; of &ldquo;Ontkoppelen&rdquo;.
          </li>
          <li>
            <strong>Berichten op je fietscomputer:</strong> de maker van een
            event of een clublid kan je tijdens een rit een kort bericht sturen.
            Dat gaat als melding naar je telefoon en, als je Telegram koppelt,
            via onze Telegram-bot. Bij een Telegram-koppeling bewaren we alleen
            het nummer van je chat met de bot; de tekst van het bericht en de
            naam van de afzender gaan via Telegram naar je toe. Een bericht van
            de organisator staat ook in de livechat van het event; een bericht
            vanaf Samen fietsen bewaren we niet. Uitzetten kan op je profiel,
            ontkoppelen op Samen fietsen of met /stop in Telegram.
          </li>
          <li>
            <strong>Grofmazig bereden gebied (ZWBlokken):</strong> uit je
            Strava-ritten leiden we af in welke vakken van ongeveer anderhalve
            kilometer je gereden hebt. Die kaart is voor clubleden zichtbaar,
            per lid en voor de club samen. Er staan geen routes of tijden in:
            alleen of een vak wel of niet is aangedaan. Het vak waarin een rit
            begint of eindigt telt nooit mee en de eerste en laatste kilometer
            van elke rit laten we buiten beschouwing, zodat je woonadres er niet
            uit af te leiden is. Zwift-ritten kleuren blokken in de
            Zwift-werelden, los van deze kaart. Daar tellen start en einde wel
            mee, want een virtuele wereld is geen echte plek. Andere
            indoorritten blijven volledig buiten ZWBlokken. Clubleden zien ook wie per land en per provincie
            de meeste vakken heeft; die krijgt een titel. Voor een land is dat
            Koning of Koningin als je in je profiel een geslacht hebt opgegeven,
            en anders Vorst. Wie je titel ziet, kan daar dus je opgegeven
            geslacht uit afleiden.
          </li>
          <li>
            <strong>ZWB Segments:</strong> van de segmenten en cols die ZWB heeft
            uitgekozen bewaren we je besttijd, hoe vaak je ze reed en wanneer.
            Andere goedgekeurde leden zien je naam, tijd en positie in de ranglijst
            per segment. Van ritten via intervals.icu en geüploade GPX-bestanden
            meet ZWB die tijd zelf uit het GPS-spoor; hij staat met het label GPS
            in dezelfde ranglijst. Verbreek je je Strava-koppeling, dan vervallen
            je Strava-tijden op de uitgekozen segmenten, tenzij je ervoor kiest je
            ritten te bewaren; cols en eigen GPS-tijden blijven.
          </li>
          <li>
            <strong>Activiteiten- en koppelingsgegevens:</strong> Strava-ritten en
            intervals.icu-trainingsdata, gekoppeld via jouw toestemming. Geef je
            een trainer toegang, dan ziet die je trainingsbelasting (CTL, form),
            je eFTP en je powercurve, ook in W/kg; daarvoor bewaren we bij een
            afgeronde training je gewicht van dat moment. Van een gereden training
            halen we de vermogensmeting uit intervals.icu op en bewaren we
            hoeveel seconden je per zone reed, per herhaling van het schema je
            gemiddelde vermogen, en bij een lange gelijkmatige rit hoe ver
            vermogen en hartslag uit elkaar liepen; niet de meting zelf. Daaruit
            ziet je trainer suggesties voor zijn feedback, en onder Races de tips
            uit je Zwift-races met je eigen rit erbij (die rit bewaren we niet). Hersteldata blijft afgeschermd tot je de
            aparte opt-in aanzet. Je trekt die toegang zelf weer in op de
            trainingspagina.
          </li>
          <li>
            <strong>Ritten via intervals.icu:</strong> heb je geen Strava-koppeling
            maar wel intervals.icu, dan halen we elk uur je fietsritten daar op:
            naam, tijd, afstand, hoogtemeters, vermogen, hartslag, cadans, het
            toestel en een vereenvoudigd GPS-spoor. Net als Strava-ritten tellen
            ze mee voor badges, weekstanden, clubstatistieken, cols, ZWBlokken en
            je trainingsschema, en zien clubleden ze bij de recente ritten en op
            je profiel. Bij een rit van een Garmin noemen we het toestel, omdat
            intervals.icu dat van ons vraagt. Elke 60 dagen herinneren we je eraan
            intervals.icu even te openen; we bewaren wanneer je dat afvinkt.
          </li>
          <li>
            <strong>Zelf geüploade ritten:</strong> upload je activities.csv,
            GPX- of FIT-bestanden, dan bewaren we per rit naam, tijd, afstand en
            hoogtemeters, en bij een GPX of FIT een vereenvoudigd GPS-spoor.
            Vermogen en hartslag uit een FIT-bestand bewaren we niet. Net als
            Strava-ritten tellen ze mee voor badges, weekstanden,
            clubstatistieken, cols, ZWB Segments en ZWBlokken, en zien clubleden
            ze bij de recente ritten en op je profiel.
          </li>
          <li>
            <strong>Doeltijd bij een trainingsdoel:</strong> geef je bij een
            trainingsdoel een doeltijd met een eigen GPX op, dan bewaren we alleen
            het hoogteprofiel (afstand en helling), geen kaart of coördinaten,
            plus de prognoses die we daaruit berekenen.
          </li>
          <li>
            <strong>Coachchat:</strong> in de trainingsruimte kun je vragen stellen
            over je schema en over je trainingsdata. Je vraag, het antwoord van de
            AI-coach en de reacties van je trainer worden bewaard als één doorlopend
            gesprek. Alleen jij en de trainers die jij hebt aangewezen kunnen het
            lezen — het bestuur en communitybeheer niet. Je bericht gaat naar OpenAI
            om het antwoord te maken, samen met je schema, je doel, je belasting, je
            gereden ritten van de laatste drie maanden (met de titel die je er zelf
            aan gaf, duur, afstand, hoogtemeters, vermogen en hartslag), je FTP,
            FTP-tests en vermogenscurve, en je CTL/ATL/TSB uit intervals.icu als je
            die hebt gekoppeld. Je hersteldata gaat alleen mee als je de aparte
            opt-in aan hebt staan. Vink je aan dat een bericht je schema raakt, dan
            gaat de tekst ook mee naar de eerstvolgende schemaherziening. Je eigen berichten kun je verwijderen; het gesprek
            staat verder in je data-export en verdwijnt als je je account opheft.
            Zet er geen gegevens in die je niet met je trainer of met OpenAI wilt
            delen.
          </li>
          <li>
            <strong>Weekoverzicht:</strong> op zondagavond zie je een terugblik
            op je week. We bewaren per week een samenvatting van je ritten,
            schema, belasting, vermogen, teamuitslagen, voedings- en
            corelogboek en clubritten, en of je het overzicht hebt gezien.
            Alleen jij kunt het lezen. Gebruik je ZWBeter voor je training, dan
            gaat die samenvatting zonder je naam naar OpenAI om het oordeel van
            de coach te schrijven, samen met je beschikbaarheid, trainingen en
            events van de week erna. Het staat in je data-export en verdwijnt
            als je je account opheft.
          </li>
          <li>
            <strong>Persoonlijke voorkeuren:</strong> op het tabblad
            Uitgangspunten, of met het vinkje &ldquo;Onthoud als voorkeur&rdquo; in
            de coachchat, kun je vastleggen wat je schema over jou moet weten. De
            trainers die jij hebt aangewezen kunnen dat ook voor jou doen. We
            bewaren de tekst, wie hem schreef en wanneer. Alleen jij en die
            trainers kunnen de voorkeuren lezen — het bestuur en communitybeheer
            niet. Ze gaan mee naar OpenAI bij elke schemageneratie en bij
            antwoorden in de coachchat. Je kunt elke voorkeur weghalen, ook
            een die je trainer schreef; ze staan in je data-export en verdwijnen
            als je je account opheft. Zet er geen gegevens in die je niet met je
            trainer of met OpenAI wilt delen.
          </li>
          <li>
            <strong>Terugschrijven naar Strava:</strong> koppel je Strava met het
            recht om je activiteiten te wijzigen, dan zet ZWB na een rit een
            samenvatting onderaan de omschrijving van die rit. Daarin staan je
            geplande en gedetecteerde trainingstype, de duur, het verschil tussen
            geplande en werkelijke belasting (TSS), je CTL, je gereedscore en je
            fitness-richting. Wie jouw Strava-activiteit kan zien, kan die
            samenvatting dus ook zien. Je onderliggende hersteldata (slaap, HRV,
            hartslag) komt er nooit in — alleen de daaruit berekende score. Je
            eigen tekst in de omschrijving laten we staan, en verwijder je de
            samenvatting, dan zetten we hem niet terug. Wil je dit helemaal niet,
            koppel Strava dan opnieuw zonder het wijzigrecht, of verbreek de
            koppeling.
          </li>
          <li>
            <strong>Agenda-abonnement:</strong> maak je op je profiel een
            agendalink aan, dan leest je agenda-app (zoals Google Agenda, Outlook
            of Apple Agenda) via die link de events waar je ja op zei, de
            teamraces waarvoor je bent opgesteld en je geplande trainingen. Die
            aanbieder bewaart ze dan volgens zijn eigen voorwaarden. Iedereen met
            de link kan hetzelfde lezen, dus deel hem niet. We bewaren de link en
            wanneer hij voor het laatst is opgehaald. Je kunt hem op je profiel
            vervangen of intrekken; bij het opheffen van je account verdwijnt hij.
          </li>
          <li>
            <strong>Door jou geplaatste inhoud:</strong> RSVP&apos;s, chatberichten,
            ritverslagen, reacties, polls en geüploade foto&apos;s.
          </li>
          <li>
            <strong>Openbare Instagram-posts waarin de club is getagd:</strong> tag
            je @zwb_cycling op een foto in een openbare post, dan tonen we die post
            met je Instagram-naam aan ingelogde clubleden op het dashboard en bij
            Media. We halen dit op via Instagram en koppelen het niet aan je
            ZWB-profiel. Haal je de tag of de post weg, of zet je je account op
            privé, dan verdwijnt hij binnen een uur. Het bestuur kan een post ook
            verbergen.
          </li>
          <li>
            <strong>Gezondheidsgegevens (alleen met jouw uitdrukkelijke toestemming):</strong>{" "}
            als je het klachtenlogboek aanzet, leggen we per dag vast hoeveel last
            je hebt, welke klachten je aanvinkt, of het de eerste dag van je
            menstruatie is, en een eventuele notitie. Ook je herstelwaarden uit
            intervals.icu (HRV, rust-hartslag, slaap) vallen hieronder. Het
            geslacht op je profiel is optioneel en kun je leeg laten.
          </li>
        </ul>
      </Section>

      <Section title="3. Waarom en op welke grondslag">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Gezondheidsgegevens: uitdrukkelijke toestemming</strong>{" "}
            (artikel 9 lid 2 sub a AVG). Het klachtenlogboek staat standaard uit
            en verwerkt niets tot jij het zelf aanzet. Alleen jij ziet wat erin
            staat — je trainer en het bestuur niet. Je trainingsschema gebruikt
            er hooguit een samengevat signaal uit (&quot;lagere belastbaarheid deze
            week&quot;), nooit losse klachten. Je kunt je toestemming op elk moment
            intrekken door het logboek uit te zetten.
          </li>
          <li>
            <strong>Uitvoering van het lidmaatschap</strong> (gerechtvaardigd belang
            / overeenkomst): kalender, teams, uitslagen, community en het tonen van
            je profiel aan andere leden.
          </li>
          <li>
            <strong>Toestemming</strong> (art. 6 lid 1a, en art. 9 voor
            gezondheidsdata): wellness-synchronisatie en live tracking gebeuren
            alleen na jouw uitdrukkelijke opt-in. Je kunt die toestemming altijd
            intrekken.
          </li>
          <li>
            <strong>Wettelijke verplichting / beveiliging:</strong> beperkte
            logging en een audit-log voor gevoelige wijzigingen.
          </li>
        </ul>
      </Section>

      <Section title="4. Hoe lang we gegevens bewaren">
        <ul className="list-disc space-y-1 pl-5">
          <li>Live GPS-posities worden na 30 dagen automatisch verwijderd.</li>
          <li>
            Je ZWBlokken worden mee verwijderd als je account wordt verwijderd.
          </li>
          <li>
            Profiel-, activiteiten- en communityinhoud bewaren we zolang je lid
            bent. Bij het verwijderen van je account worden deze gegevens gewist.
          </li>
          <li>
            Je kunt je Strava-koppeling op elk moment verbreken. Je kiest dan
            zelf of we de opgehaalde Strava-ritten, hun segmenttijden en fietsen
            verwijderen of bewaren. Bewaar je ze, dan blijven ze staan zolang je
            lid bent en zien clubleden ze zoals voorheen; wil je ze later alsnog
            weg, vraag het bestuur (zie &ldquo;Je rechten&rdquo;). Badges en
            ZWBlokken blijven in beide gevallen staan. Stap je van Strava over naar intervals.icu,
            dan verdwijnen je Strava-ritten en komen je ritten voortaan via
            intervals.icu.
          </li>
          <li>
            Je kunt ook je intervals.icu-koppeling op elk moment verbreken. We
            halen dan niets nieuws meer op, maar wat al binnen is blijft bewaard
            zolang je lid bent: je ritten, je trainingsbelasting, je tijd per
            zone en de gereedscore bij afgeronde trainingen. Zo blijven je
            historie, je schema en je trainer ermee werken, ook als je later
            opnieuw koppelt. Je herstelwaarden (zoals HRV, rusthartslag en slaap)
            verwijderen we wel, zodra je ontkoppelt of de opt-in uitzet. Wil je
            dat ook de rest weg is, verwijder dan je account of vraag het
            bestuur (zie &ldquo;Je rechten&rdquo;).
          </li>
          <li>
            Het aantal Strava-koppelingen is beperkt. Daarom houden we bij wanneer
            je voor het laatst in de app was. Ben je 90 dagen niet geweest, dan
            verbreken we je Strava-koppeling en ruimen we de opgehaalde ritten op;
            twee weken vooraf krijg je een melding. Badges en ZWBlokken blijven
            staan.
          </li>
          <li>
            Je klachtenlogboek blijft staan zolang jij het bewaart. Je kunt losse
            dagen verwijderen en het logboek uitzetten; bij het verwijderen van je
            account wordt alles gewist.
          </li>
        </ul>
      </Section>

      <Section title="5. Met wie we gegevens delen (verwerkers)">
        <p>
          We verkopen je gegevens nooit. Voor het functioneren van het platform
          gebruiken we dienstverleners die als verwerker optreden:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — database, authenticatie en opslag (hosting
            in de EU).
          </li>
          <li>
            <strong>Netlify</strong> — hosting van de webapplicatie.
          </li>
          <li>
            <strong>Strava</strong> en <strong>intervals.icu</strong> — alleen als
            je deze koppelt, voor je eigen activiteiten- en trainingsdata.
          </li>
          <li>
            <strong>OpenAI</strong> — voor het genereren van concept-trainings­schema&apos;s
            en voor de antwoorden in de coachchat en het oordeel in het weekoverzicht, en als je dat aanzet voor het
            herkennen van een maaltijd uit een omschrijving. Meegestuurd worden relevante
            trainingscontext — waaronder je gereden ritten en je vermogensgegevens —
            en, bij de chat, de tekst die je zelf typt; geen directe
            identificatiegegevens waar vermijdbaar.
          </li>
          <li>
            <strong>Mapbox/OpenStreetMap</strong> (kaarten), <strong>Resend</strong>{" "}
            (e-mail, ook het ontvangen van je LiveTrack-mail), <strong>Telegram</strong>{" "}
            (alleen als je die koppelt, voor berichten op je fietscomputer), <strong>Mollie</strong> (eventuele betalingen),
            web-push-diensten (notificaties), en embeds van YouTube/Spotify.
          </li>
        </ul>
      </Section>

      <Section title="6. Beveiliging">
        <p>
          We beschermen je gegevens met toegangsbeveiliging op rij-niveau
          (RLS), versleuteling at rest van gekoppelde tokens/sleutels,
          beveiligings-headers, bescherming tegen misbruik (rate limiting) en een
          audit-log voor gevoelige wijzigingen. Toegang tot gevoelige data is
          beperkt tot jezelf en, waar van toepassing, een door jou aangewezen
          trainer of een beheerder.
        </p>
      </Section>

      <Section title="7. Je rechten">
        <p>Je hebt op grond van de AVG het recht om:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            je gegevens <strong>in te zien en te downloaden</strong> — via{" "}
            <Link href="/profiel?weergave=bewerken" className="text-primary underline">
              je profiel
            </Link>{" "}
            (&ldquo;Download mijn gegevens&rdquo;);
          </li>
          <li>
            je gegevens te laten <strong>corrigeren</strong> — pas je profiel aan;
          </li>
          <li>
            je account en gegevens te laten <strong>verwijderen</strong> (recht op
            vergetelheid) — via je profiel;
          </li>
          <li>
            <strong>toestemming in te trekken</strong> voor wellness-sync of live
            tracking, en <strong>bezwaar</strong> te maken tegen verwerking.
          </li>
        </ul>
        <p>
          Ook kun je een klacht indienen bij de Autoriteit Persoonsgegevens.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Dit platform gebruikt alleen functionele cookies: om ingelogd te
          blijven, en om te onthouden of je vermogen in watt of in W/kg wilt
          zien. Die laatste bevat alleen die keuze en blijft op je eigen
          apparaat. We gebruiken geen tracking- of advertentiecookies, dus er is
          geen cookietoestemmingsbanner nodig.
        </p>
      </Section>

      <footer className="border-t pt-6 text-sm">
        <BackLink href="/" label="ZWB Cycling" />
      </footer>
    </main>
  );
}
