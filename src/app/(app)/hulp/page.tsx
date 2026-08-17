import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bike,
  Cake,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Download,
  Dumbbell,
  ExternalLink,
  FileText,
  Gauge,
  Grid3x3,
  HeartPulse,
  MapPinned,
  Medal,
  Monitor,
  Mountain,
  Navigation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  TrendingUp,
  UserCircle,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { HelpSearch } from "./help-search";

const START_STEPS = [
  {
    title: "Maak je profiel compleet",
    text: "Naam, foto, regio, Zwift-ID en zichtbaarheid staan onder Profiel.",
    href: "/profiel",
  },
  {
    title: "Strava-data toevoegen",
    text: "Koppel Strava met activiteitenrecht of importeer je ritten (CSV of GPX) via Achievements.",
    href: "/achievements",
  },
  {
    title: "Zet meldingen aan",
    text: "Voor events, live ritten, badges en trainingsschema's.",
    href: "/profiel#meldingen",
  },
  {
    title: "Bekijk de kalender",
    text: "RSVP met Ja of Misschien als je mee wilt rijden.",
    href: "/kalender",
  },
];

const GUIDES = [
  {
    id: "profiel",
    icon: UserCircle,
    title: "Profiel en ledenlijst",
    bullets: [
      "Je profiel bepaalt wat andere leden mogen zien.",
      "Badges blijven zichtbaar op je profiel en in de ledenlijst.",
      "Onder Mijn fietsen tonen we je fietsen uit Strava (naam + kilometers); zonder Strava voeg je een fiets handmatig toe. Je kiest per fiets of die zichtbaar is en zet er een foto bij.",
      "Bestuur of beheerders keuren nieuwe leden goed.",
    ],
  },
  {
    id: "events",
    icon: CalendarDays,
    title: "Events en RSVP",
    bullets: [
      "Gebruik de kalender voor groepsritten, ZRL, Ladder en socials.",
      "Op eventdagen kan de liveticker deelnemers tonen die live tracken.",
      "GPX, routekaart en hoogteprofiel staan op de eventpagina.",
    ],
  },
  {
    id: "training",
    icon: Bike,
    title: "Training en trainer-toegang",
    bullets: [
      "Koppel intervals.icu voor geplande workouts en trainingsbelasting.",
      "Je doeltype bepaalt of het schema naar één piekdag toewerkt of doorbouwt tot het eind.",
      "Je kiest zelf welke trainer jouw trainingsdata mag zien.",
      "AI maakt conceptschema's; de trainer keurt publicatie goed.",
    ],
  },
  {
    id: "teams",
    icon: Trophy,
    title: "Teams en wedstrijden",
    bullets: [
      "Teams tonen leden, rosterkoppelingen en bekende wedstrijdstanden.",
      "ZRL en Ladder-resultaten worden via bronnen gesynct waar mogelijk.",
      "Ontbrekende brondata kan handmatig worden aangevuld door beheerders.",
    ],
  },
  {
    id: "badges",
    icon: Medal,
    title: "Badges en achievements",
    bullets: [
      "Weekbadges komen uit gesyncte Strava-ritten.",
      "Krijg je een melding over activiteitenrecht? Koppel Strava opnieuw en zet het vinkje voor activiteiten aan.",
      "Zonder Strava-koppeling importeer je op Achievements je hele historie (activities.csv) of één rit (GPX).",
      "Milestone badges blijven permanent op je profiel staan.",
      "Klik op een badge om te zien welke drempel erbij hoort.",
    ],
  },
  {
    id: "onderhoud",
    icon: Wrench,
    title: "Onderhoud van je fiets",
    bullets: [
      "Houd slijtbare onderdelen (ketting, cassette, banden, remblokken …) bij op basis van je Strava-kilometers.",
      "Kies per onderdeel een slijtage-range — enige, normale of hoge slijtage — of vul een eigen kilometerdrempel in.",
      "Je krijgt een melding zodra een onderdeel toe is aan vervanging; op het dashboard zie je wat bijna of over de drempel is.",
    ],
  },
  {
    id: "cols",
    icon: Mountain,
    title: "Cols, segmenten en records",
    bullets: [
      "ZWB herkent cols en segmenten automatisch uit je Strava-ritten.",
      "Je recordtijd komt rechtstreeks van Strava; per segment zie je de ZWB-ranglijst.",
      "Nieuw record niet zichtbaar? Klik op Achievements op 'Badges herberekenen'.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community, polls, media en ritverslagen",
    bullets: [
      "Gebruik Vraag & Aanbod voor spullen, hulpvragen en tips.",
      "Polls verzamelen snelle keuzes vanuit de community.",
      "Media bundelt nieuws, mededelingen, video's en podcasts.",
      "Schrijf na een gereden event een ritverslag met vaste kopjes: voorbereiding, verloop, uitslag en leerpunten. Je hoeft niet alles in te vullen; je eigen uitslag staat er al bij als die bekend is.",
      "Anderen kunnen op je verslag reageren; met Deel stuur je het via WhatsApp door.",
    ],
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy en zichtbaarheid",
    bullets: [
      "Live tracking is per rit opt-in en verdwijnt bij inactiviteit.",
      "Je profielvelden hebben eigen zichtbaarheidsschakelaars.",
      "Trainer-data wordt alleen gedeeld na expliciete toestemming.",
    ],
  },
];

// Volledige wegwijzer: wat doet elke pagina/sectie van de app.
const OVERVIEW: { href: string; name: string; text: string }[] = [
  { href: "/dashboard", name: "Dashboard", text: "Je startscherm: deze week, recente clubritten, ritverslagen en nieuws. Hier synchroniseer je ook je Strava-ritten." },
  { href: "/kalender", name: "Kalender", text: "Alle events — groepsritten, ZRL, Ladder en socials. RSVP met Ja of Misschien." },
  { href: "/samen-fietsen", name: "Samen fietsen", text: "Live kaart van wie er nu rijdt, met livechat. Tracking stel je in via OwnTracks." },
  { href: "/teams", name: "Teams", text: "Teams, rosters en ZRL-/Ladder-standen, inclusief de TTT-planner." },
  { href: "/leden", name: "Leden", text: "Ledenlijst met categorie en badges; filter op regio of categorie." },
  { href: "/achievements", name: "Achievements", text: "Al je badges. Importeer je ritten (CSV/GPX), haal je hele historie op of herbereken badges." },
  { href: "/zwbeter-worden", name: "ZWBeter Worden", text: "Schema's, AI-coach, je ZWBeterWorden-advies, belasting en de koppelingen." },
  { href: "/zwbeter-worden/vermogen", name: "Mijn vermogen", text: "Je powercurve en de vergelijking met de club." },
  { href: "/onderhoud", name: "Onderhoud", text: "Slijtage van je onderdelen op basis van je Strava-kilometers, met een melding bij vervangen." },
  { href: "/profiel/cols", name: "Cols & segmenten", text: "Welke cols en segmenten je deed, met je PR en de ZWB-ranglijst." },
  { href: "/ritverslagen", name: "Ritverslagen", text: "Schrijf een verslag bij een gereden event; anderen reageren." },
  { href: "/community", name: "Community", text: "Mededelingen en clubnieuws." },
  { href: "/polls", name: "Polls", text: "Snelle stemmingen vanuit de club." },
  { href: "/materiaal", name: "Vraag & Aanbod", text: "Spullen, hulpvragen en tips uitwisselen." },
  { href: "/media", name: "Media", text: "Nieuws, nieuwsbrieven, podcasts, video's en Instagram." },
  { href: "/stats", name: "Stats", text: "Clubstatistieken en ranglijsten." },
  { href: "/sponsors", name: "Sponsors", text: "Onze sponsoren en ledenvoordeel." },
  { href: "/profiel", name: "Profiel", text: "Je gegevens, zichtbaarheid, je fietsen, koppelingen (Strava/intervals) en account." },
];

const OWNTRACKS_STEPS = [
  {
    title: "Installeer OwnTracks",
    text: "Download de gratis OwnTracks-app (iOS App Store of Google Play). Andere apps werken niet — wij gebruiken OwnTracks.",
  },
  {
    title: "Maak je koppellink",
    text: "Ga naar Samen fietsen → OwnTracks koppelen. Je krijgt eenmalig een persoonlijke URL te zien — kopieer die meteen (hij wordt maar één keer getoond).",
  },
  {
    title: "Zet OwnTracks op HTTP-modus",
    text: "iPhone: tik op de kaart linksboven op het i-icoon → tandwiel/Instellingen → Mode = Private HTTP. Android: instellingen (tandwiel) → Connection → Mode = Private HTTP. Plak je koppellink in het veld URL.",
  },
  {
    title: "Locatie op 'Altijd toestaan'",
    text: "Geef de app locatietoegang 'Altijd' (niet 'Bij gebruik') én zet nauwkeurige/precieze locatie aan. Zonder 'Altijd' stopt het tracken zodra je scherm uit gaat.",
  },
  {
    title: "Kies de actieve modus tijdens je rit",
    text: "De modusbalk staat bovenin het Kaart-scherm. iPhone: kies 'Actie' — hoge frequentie en nauwkeurigheid (wel meer accuverbruik) voor een strak spoor. 'Significant' (Android: 'Grootte wijzigingen') werkt ook en is aanbevolen voor lager batterijgebruik, maar geeft een minder nauwkeurig spoor. 'Handmatig' en 'Rustig'/'Stop' publiceren geen locaties en geven gaten op de kaart.",
  },
  {
    title: "Rijden en verschijnen",
    text: "Open OwnTracks aan het begin van je rit. Op Samen fietsen verschijn je vanzelf. Met RSVP Ja of Misschien op een event sta je die dag ook op de eventkaart.",
  },
  {
    title: "Stoppen",
    text: "Klaar? Zet de modus terug op iPhone 'Significant' (of 'Rustig'), Android 'Grootte wijzigingen' (of 'Stop'), of stop de koppeling op Samen fietsen. Na 15 min zonder positie verdwijn je sowieso automatisch.",
  },
];

const OWNTRACKS_QUALITY_TIPS = [
  "Zet batterijbesparing/-optimalisatie UIT voor OwnTracks — die schorst de app en veroorzaakt gaten in je spoor.",
  "Sluit OwnTracks niet af (niet 'wegvegen'); laat 'm op de achtergrond draaien tijdens de rit.",
  "iPhone: zet Achtergrond-appvernieuwing aan en 'Precieze locatie' aan voor OwnTracks.",
  "Android: sta 'onbeperkt' accugebruik toe voor OwnTracks en zet 'verwijder app bij niet-gebruik' uit.",
  "Goede mobiele dekking helpt; in tunnels/dekkinggaten kan het bolletje even stilstaan — de kaart herstelt zichzelf zodra er weer data binnenkomt.",
  "Eén nieuwe koppellink maken vervangt de oude meteen; gebruik dat als je tracker gestolen/kwijt is.",
];

const WAHOO_STEPS = [
  {
    title: "Open de Wahoo-instellingen op intervals.icu",
    text: "Ga op intervals.icu naar Settings (instellingen) en scroll naar het Wahoo-blok.",
  },
  {
    title: "Connect to Wahoo",
    text: "Klik op 'Connect to Wahoo', log in met je Wahoo-account en geef toestemming.",
  },
  {
    title: "Zet 'Upload planned workouts' aan",
    text: "Vink het vakje aan om geplande workouts te uploaden. De workouts van de komende 7 dagen gaan dan automatisch naar de Wahoo Cloud.",
  },
  {
    title: "Synchroniseer je ELEMNT",
    text: "De workouts verschijnen op je ELEMNT onder Planned Workouts (sync via wifi of de ELEMNT-app). Geen bestand downloaden nodig.",
  },
];

const ZWIFT_STEPS = [
  {
    title: "Open de Zwift-instellingen op intervals.icu",
    text: "Ga op intervals.icu naar Settings (instellingen) en zoek het Zwift-blok.",
  },
  {
    title: "Connect",
    text: "Klik op 'Connect' en geef toestemming. Log eerst in op het Zwift-account dat je zelf gebruikt.",
  },
  {
    title: "Zet ritten aan bij de workout-types",
    text: "Kies welke types naar Zwift gaan en zorg dat ritten aanstaan. De workouts van de komende week gaan dan automatisch mee.",
  },
  {
    title: "Start Zwift",
    text: "De training van vandaag staat op het beginscherm, of via Workouts → Custom → Intervals.icu.",
  },
];

const ZWIFT_NOTES = [
  "Zet je FTP in Zwift gelijk aan die in ZWB: de blokken gaan als percentage van je FTP mee, dus een afwijkende FTP geeft andere watts.",
  "Alleen vermogen en cadans gaan mee, geen hartslagdoelen.",
  "Alleen de komende week wordt vooruitgestuurd, niet je hele schema.",
  "Je Zwift-ritten komen vanzelf terug in intervals.icu, dus je belasting in ZWB blijft kloppen.",
  "Dag aangepast? Publiceer opnieuw, dan gaat de nieuwe versie bij de volgende sync mee.",
];

const DATA_FRESHNESS_HELP = [
  "Onder Training → Belasting staat per bron wanneer er voor het laatst iets binnenkwam.",
  "Strava-ritten haal je zelf op met Sync op Achievements; nieuwe ritten kunnen tot een half uur duren.",
  "Hersteldata (slaap, HRV, rust-hartslag) komt van je horloge of ring via intervals.icu. ZWB haalt op wat daar staat, maar levert je apparaat niets aan, dan blijft het leeg.",
  "De herstelwaarden zijn gemiddelden over de laatste 7 dagen. Staat je bron langer stil, dan zie je streepjes.",
  "Controleer bij lege hersteldata eerst op intervals.icu of je wellness-koppeling (Garmin, Polar, Oura, Whoop) nog actief is.",
];

const INTERVALS_CONNECT_STEPS = [
  "Open in intervals.icu de API-instellingen.",
  "Kopieer je persoonlijke API-key.",
  "Plak de sleutel in ZWB bij Training en kies Koppelen.",
];

const ADMIN_GUIDES = [
  {
    id: "eventbeheer",
    title: "Events, routes en uitslagen",
    bullets: [
      "Een cover verschijnt op de eventpagina, kalender en bij ritverslagen.",
      "De externe link kan verwijzen naar een route op Strava, Komoot, RideWithGPS of Garmin.",
      "De live timing-link is voor een actuele timingfeed; ZWB toont daaruit alleen herkende leden.",
      "De uitslagenlink wordt gebruikt om klasseringen en tijden van ZWB-leden op te halen.",
      "Een GPX-bestand levert route, afstand, hoogtemeters en startpunt. Een nieuwe upload vervangt de bestaande route.",
    ],
  },
  {
    id: "communitybeheer",
    title: "WhatsApp-groepen",
    bullets: [
      "Plak een WhatsApp-invitelink en kies Ophalen om beschikbare groepsgegevens in te vullen.",
      "Bij bulkimport staat iedere invitelink op een eigen regel; dubbele en ongeldige links worden overgeslagen.",
      "Een groep kan algemeen zijn of aan een team of event worden gekoppeld.",
    ],
  },
  {
    id: "mediabeheer",
    title: "Media en imports",
    bullets: [
      "Gebruik als publicatiedatum de oorspronkelijke datum van het bericht, document of de aflevering.",
      "Beschrijvingen ondersteunen markdown.",
      "Bij podcasts kun je per platform een link toevoegen; RSS is bedoeld voor overige podcast-apps.",
      "Automatische imports kunnen opnieuw worden uitgevoerd: bestaande items worden bijgewerkt.",
      "YouTube- en Instagram-imports werken nadat technisch beheer de bronkoppelingen heeft ingesteld.",
    ],
  },
  {
    id: "rollenbeheer",
    title: "Rollen, rechten en notificaties",
    bullets: [
      "De rechtenmatrix bepaalt per communityrol welke beheeracties zijn toegestaan.",
      "Technische admins behouden altijd volledige toegang.",
      "Een bestuursmelding gaat alleen naar apparaten van leden die aankondigingen hebben ingeschakeld.",
      "De doorkliklink van een melding opent standaard het dashboard.",
    ],
  },
  {
    id: "badgebeheer",
    title: "Achievements beheren",
    bullets: [
      "Ken milestonebadges handmatig toe wanneer een prestatie niet betrouwbaar uit Strava kan worden afgeleid.",
      "Weekbadges blijven via de weekfinalisatie lopen.",
      "Intrekken verwijdert alleen de handmatige toekenning bij het gekozen lid.",
      "Gekoppelde Strava-profielen kunnen automatisch worden bijgewerkt via de beveiligde Strava-synchronisatietaak.",
      "Plan die taak iedere 15 tot 30 minuten. Houd segmentdetails uit de frequente run om binnen de Strava-limieten te blijven.",
      "Laat de planner een POST-verzoek sturen naar /api/strava/sync met STRAVA_SYNC_SECRET als Bearer-token.",
    ],
  },
  {
    id: "stravabeheer",
    title: "Strava-sync beheren",
    bullets: [
      "Gebruik Beheer > Strava-sync om gekoppelde leden zonder ritten in de statistieken te vinden.",
      "Sync een lid handmatig of start de volledige historie voor alle leden die nog niet zichtbaar zijn.",
      "Leden zonder activiteitenrecht moeten zelf opnieuw koppelen en het activiteitenvinkje aanzetten.",
      "Badges + cols herberekenen draait op bestaande ritten en doet geen extra Strava-calls.",
    ],
  },
  {
    id: "ttt-beheer",
    title: "TTT Planner en exports",
    bullets: [
      "Renners zonder Zwift-ID worden als aangepaste renner in het plan opgenomen.",
      "De JSON-export bewaart ook velden die ZWB niet zelf bewerkt.",
      "De tekstexport is bedoeld als leesbare racesheet; de afbeelding als deelbare opstelling.",
    ],
  },
  {
    id: "teambeheer",
    title: "Teams en roosters",
    bullets: [
      "Hoofdteams kunnen onderliggende race-, ladder-, sociale en outdoorteams bevatten.",
      "Teambeheerders kunnen leden, captainrollen en opstellingen per team beheren.",
      "Vermogensdata en wedstrijdresultaten kunnen opnieuw worden opgehaald via de beheeracties bovenaan.",
    ],
  },
];

const TROUBLESHOOTING = [
  "Zie je geen badges? Koppel Strava en start een sync, of importeer activities.csv of een GPX op Achievements.",
  "Strava meldt ontbrekend activiteitenrecht? Koppel opnieuw via Profiel of Achievements en zet het activiteitenvinkje aan.",
  "Verschijn je niet live? Check: OwnTracks op Private HTTP, juiste koppellink, locatie 'Altijd', en de modus actief (iPhone 'Actie', Android 'Beweging').",
  "Bolletje staat stil of viel weg? Meestal een dekkinggat of de app werd geschorst — de kaart pakt het automatisch weer op; controleer batterijoptimalisatie.",
  "Geen trainingen in beeld? Controleer je intervals.icu API-key.",
  "Geen fietsen onder Mijn fietsen of Onderhoud? Koppel je fiets in Strava aan je ritten en draai daarna een Strava-sync.",
  "Mis je rechten? Vraag bestuur of communitybeheer om je rol te controleren.",
  "Werkt iets niet meer zoals vlak na de installatie? Loop de welkomstrondleiding op /welkom opnieuw door.",
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ZWB gids"
        title="Hulp voor leden"
        description="Wat elke pagina doet, hoe je koppelt en live tracking instelt, en wat te doen als iets niet werkt."
      />

      <HelpSearch />

      <section className="rounded-lg border bg-card/90 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Net begonnen of werkt iets niet meer?</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Loop de welkomstrondleiding opnieuw door — die loodst je stap voor
              stap door je profiel, de Strava-/intervals-koppeling en meldingen.
              Handig als iets niet meer werkt zoals vlak na de eerste installatie.
            </p>
            <Link
              href="/welkom"
              className="mt-3 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Open de welkomstrondleiding
            </Link>
          </div>
        </div>
      </section>

      <section
        id="webapp-installeren"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">ZWB als app op je telefoon</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zet de webapp op je beginscherm voor snelle toegang zonder App
              Store of Play Store.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">iPhone of iPad</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Safari.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op Delen.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Zet op beginscherm en daarna Voeg toe.</span>
              </li>
            </ol>
          </article>

          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Android</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open ZWB in Chrome.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Tik op het menu met drie puntjes.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Kies Toevoegen aan startscherm of Installeren.</span>
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {START_STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="jersey-panel rounded-lg border bg-card/90 p-4 transition hover:border-primary/40"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <h2 className="mt-3 font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Wat vind je waar?</h2>
        <p className="text-sm text-muted-foreground">
          Een korte wegwijzer door de app. Tik op een onderdeel om er meteen
          naartoe te gaan.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border bg-card/90 p-3 transition hover:border-primary/40"
            >
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <article
              key={guide.id}
              id={guide.id}
              className="rounded-lg border bg-card/90 p-4 scroll-mt-20"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <Icon className="size-5 text-primary" />
                {guide.title}
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section
        id="externe-profielen"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ExternalLink className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Doorklikken naar je andere profielen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Vul je ID&apos;s in op Profiel en er verschijnen knoppen naar
              ZwiftPower, ZwiftRacing.app, Strava en intervals.icu — op jouw
              profiel en op je ledenprofiel. Per ID kies je zelf of het zichtbaar
              is.
            </p>
          </div>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article
            id="zwift-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Zwift-ID</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in op my.zwift.com en open je profiel: het nummer in de
              adresbalk is je Zwift-ID. Staat ook in je ZwiftPower-adres, achter
              z=. Dit ene nummer verzorgt zowel ZwiftPower als
              ZwiftRacing.app.
            </p>
          </article>

          <article
            id="strava-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">Strava</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open je Strava-profiel in een browser. Het laatste stuk van het
              adres — strava.com/athletes/… — is wat je invult. Zowel het nummer
              als je gebruikersnaam werkt.
            </p>
          </article>

          <article
            id="intervals-id"
            className="scroll-mt-20 rounded-md border bg-background p-4"
          >
            <h3 className="text-sm font-semibold">intervals.icu</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Open intervals.icu in een browser; in de adresbalk staat
              /athlete/i… gevolgd door cijfers. Vul dat i-nummer in. Let op: je
              gegevens daar zijn standaard privé, dus anderen zien alleen wat je
              vrijgeeft.
            </p>
          </article>
        </div>

        <Link
          href="/profiel"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <UserCircle className="size-4 text-primary" />
          Naar je profiel
        </Link>
      </section>

      <section
        id="strava-import"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava-ritten importeren zonder koppeling</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Geen plek voor een Strava-koppeling of wil je die niet gebruiken?
              Upload je ritten dan zelf op Achievements: je hele historie in
              één keer via activities.csv, of losse ritten via GPX.
            </p>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              De koppeling haalt ritten tot vijf jaar terug op. Records als
              langste rit gaan daarom over die periode; met activities.csv haal
              je je volledige historie binnen.
            </p>
          </div>
        </header>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Hele historie (activities.csv)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>
                  Vraag op{" "}
                  <a
                    href="https://www.strava.com/athlete/download_my_account"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Strava.com je accountdownload
                  </a>{" "}
                  aan (Instellingen → Mijn account → Download of verwijder je
                  account → Verzoek je archief).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Strava mailt je (soms pas na een paar uur) een link naar een
                  ZIP-archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Pak de ZIP uit. Het bestand activities.csv staat in de
                  hoofdmap van het archief.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>
                  Upload activities.csv op Achievements met Importeer CSV of
                  GPX.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              De taal van je Strava-account maakt niet uit — Nederlandse,
              Engelse en andere kolomnamen worden herkend. Alleen fietsritten
              (ook virtueel, gravel, MTB en e-bike) worden geïmporteerd; de
              rest wordt automatisch overgeslagen. Opnieuw importeren kan
              altijd, ritten worden niet dubbel geteld.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Eén rit (GPX)</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Open je rit op Strava.com (website, niet de app).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>
                  Klik op het moersleutel-icoon (⋯) links en kies Exporteer
                  GPX.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>
                  Upload het GPX-bestand op Achievements met Importeer CSV of
                  GPX.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Gebruik de GPX van een gereden rit (met tijden), geen route-GPX.
              Afstand, hoogtemeters en rijtijd worden uit het bestand berekend.
              Herhaal dit per rit; dezelfde rit twee keer uploaden is geen
              probleem.
            </p>
          </article>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://www.strava.com/athlete/download_my_account"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Download className="size-4 text-primary" />
            Strava-data downloaden
          </a>
          <Link
            href="/achievements"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Medal className="size-4 text-primary" />
            Naar Achievements
          </Link>
        </div>
      </section>

      <section
        id="strava-rechten"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava opnieuw koppelen</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              ZWB heeft activiteitenrecht nodig om je ritten, badges, cols,
              fietsen en statistieken bij te werken.
            </p>
          </div>
        </header>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>Ga naar Profiel of Achievements en kies Opnieuw koppelen.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>Zet bij Strava het vinkje voor activiteiten aan.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>Start daarna op Achievements een Strava-sync.</span>
          </li>
        </ol>
        <Link
          href="/api/strava/connect"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <Medal className="size-4 text-primary" />
          Strava opnieuw koppelen
        </Link>
      </section>

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
              werkt en hoeveel ruimte je hebt.
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
              bij je plan hoort — niet alleen de naam die het dichtst in de buurt
              komt.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Outdoor event of gran fondo:</strong>{" "}
                één piekdag. De laatste een tot twee weken gaat het volume omlaag
                terwijl de scherpte blijft, zodat je fris aan de start staat.
              </li>
              <li>
                <strong className="text-foreground">Basisconditie, FTP of herstel/opbouw:</strong>{" "}
                doorlopende doelen. Er komt geen taper: je bouwt door tot het
                eind, want die laatste weken zijn juist de weken waar je conditie
                van omhoog gaat. De targetdatum is dan het einde van de
                planperiode, geen wedstrijddag.
              </li>
              <li>
                <strong className="text-foreground">ZRL of Ladder:</strong> een
                reeks races over meerdere weken. Je traint er doorheen; alleen de
                dag vóór een racedag blijft licht.
              </li>
            </ul>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Max. trainingsuren per week</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dit is het plafond waarbinnen de AI je week vult, samen met de
              dagen die je beschikbaar hebt gemaakt. Zet je 6 uur, dan blijft de
              totale geplande tijd daaronder — ook in een zware blokweek. Het is
              geen streefwaarde: minder plannen mag altijd.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Het zegt niets over wat je aankunt. Reed je vorige week 7,5 uur
              terwijl je plafond op 6 staat, dan wordt de week erna{" "}
              <strong className="text-foreground">niet</strong> afgeremd om dat te
              compenseren. Het schema gaat pas voorzichtiger plannen bij echte
              signalen: een sterk negatieve form, een te snelle opbouw, slechte
              herstelwaarden, of trainingen die je zwaar reed én zwaar vond.
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
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Een dag aanpassen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Met <strong className="text-foreground">Aanpassen</strong> op de
              trainingspagina geef je door hoeveel tijd je vandaag hebt en hoe je
              je voelt; de AI herschrijft de sessie van vandaag. Die gaat direct
              naar intervals.icu — de oude training van die dag verdwijnt daar —
              en je kunt meteen doorklikken. Je trainer krijgt bericht en kijkt
              achteraf of de rest van de week nog past. Heb je helemaal geen
              tijd, kies dan <strong className="text-foreground">Rustdag</strong>:
              de training van vandaag vervalt en verdwijnt ook uit intervals.icu.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Readiness en je apparaat</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Whoop, Oura en Polar sturen een eigen readiness of herstelscore naar
              intervals.icu; die nemen we één op één over. Garmin doet dat niet —
              Body Battery en Training Readiness blijven in Garmin Connect en
              komen niet mee. Voor die horloges rekent ZWB zelf een readiness uit
              je HRV, je rust-hartslag en je slaap, telkens afgezet tegen je eigen
              gemiddelde van de afgelopen 30 dagen. Zo&apos;n waarde staat in de
              app met <em>berekend door ZWB</em> erbij.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Meet je horloge geen HRV, of is je laatste meting ouder dan een
              week, dan blijft het bewust een streepje. Een herstelscore op alleen
              je rust-hartslag zou vooral meetruis zijn, en dat wil je niet terug
              zien in je trainingsadvies.
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
              geldt voor elke week die je niet apart invult. Na het opslaan werkt
              het schema zichzelf bij op de dagen die nog komen.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Clubevents in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bij je schema staan de clubevents die binnen de looptijd vallen. Ze
              komen er pas in als je <strong className="text-foreground">Ik doe mee</strong>{" "}
              kiest: dan wordt het event een vast blok, met een duur uit de
              eindtijd of de afstand, en werkt het schema de week eromheen bij —
              geen zware sessie vlak ervoor of erna. Kies je{" "}
              <strong className="text-foreground">Nee</strong>, dan verdwijnt het
              uit de lijst en blijft je schema ongemoeid. &apos;Misschien&apos;
              telt als nog niet beslist, dus dat blijft gewoon staan.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Zelf een rit inplannen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Weet je dat je zaterdag met de club rijdt? Zet hem met{" "}
              <strong className="text-foreground">Rit inplannen</strong> in je
              schema: soort, datum, duur en zwaarte. Die rit ligt daarna vast — de
              planner verplaatst of vervangt hem niet, maar zet de rest van de week
              eromheen en telt de belasting mee. Zo&apos;n rit heeft geen
              blokkenstructuur en dus geen FIT-bestand; hij staat alleen in ZWB.
            </p>
          </article>
          <article className="rounded-md border bg-background p-4">
            <h3 className="text-sm font-semibold">Voorstellen in je schema</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Op basis van je laatste ritten kan er &apos;s nachts een{" "}
              <strong className="text-foreground">voorstel</strong> in je schema
              verschijnen, bijvoorbeeld om woensdag korter te maken. Het is een
              regel bovenin je schema, geen nieuw programma:{" "}
              <strong className="text-foreground">Toepassen</strong> zet het door
              naar intervals.icu, <strong className="text-foreground">Negeren</strong>{" "}
              laat je schema zoals het was. Doe je niets, dan verdwijnt het voorstel
              vanzelf zodra het over een voorbije dag gaat.
            </p>
          </article>
        </div>
      </section>

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
              De hersteltrend vergelijkt je HRV en rusthartslag met je eigen
              baseline en neemt slaap en de meest recente readiness mee.
              Readiness is een dagsignaal uit intervals.icu; HRV, rusthartslag
              en slaap worden als zevendaagse trend bekeken. Een gunstige HRV
              kan daardoor naast een middelmatige readiness staan.
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
      </section>

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
                <Link href="/profiel" className="underline">
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
                verwerkt — meestal binnen een uur.
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
              binnen de gekozen periode. De eigen curve wordt live uit
              intervals.icu geladen.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
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

      <section
        id="core-mobiliteit"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Dumbbell className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Core &amp; mobiliteit</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Korte series van 6 tot 12 minuten die je naast het fietsen doet.
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

        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="text-sm font-semibold">Klachten en grenzen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Deze series zijn algemeen onderhoudswerk, geen behandeling. Stop bij
            pijn. Heb je aanhoudende rug-, knie- of heupklachten, of een
            blessure, ga dan naar een fysiotherapeut of huisarts — ZWB geeft
            daar bewust geen advies over, en de AI-trainer ook niet.
          </p>
          <Link
            href="/zwbeter-worden/core"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Core &amp; mobiliteit
          </Link>
        </div>
      </section>

      <section
        id="owntracks"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <MapPinned className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Live tracking instellen (OwnTracks)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Volg deze stappen één keer goed, dan zie je elkaar betrouwbaar op
              de kaart tijdens een rit.
            </p>
          </div>
        </header>

        <ol className="mt-4 space-y-3">
          {OWNTRACKS_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Voor een strak spoor zonder gaten
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {OWNTRACKS_QUALITY_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Smartphone className="size-4 text-primary" />
                Belangrijkste instellingen
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Mode:</strong> Private HTTP
                </li>
                <li>
                  <strong className="text-foreground">URL:</strong> je
                  persoonlijke koppellink van Samen fietsen
                </li>
                <li>
                  <strong className="text-foreground">Locatie:</strong> Altijd +
                  precies/nauwkeurig
                </li>
                <li>
                  <strong className="text-foreground">Modus tijdens rit:</strong>{" "}
                  iPhone Actie · Android Beweging (strak spoor). Significant /
                  Grootte wijzigingen mag ook: zuiniger, iets minder nauwkeurig.
                </li>
              </ul>
            </div>
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
            >
              <Navigation className="size-4 text-primary" />
              Naar Samen fietsen
            </Link>
          </div>
        </div>
      </section>

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
              Aanmelden doe je onder <strong className="text-foreground">Rijd
              je mee?</strong> — tik op het vak{" "}
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
              net als bij events — mits ze outdoor delen op Samen fietsen.
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
              Rijd je door een blok, dan kleurt het in — voor jou én voor de
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
              <strong className="text-foreground">Zwift en andere
              indoorritten tellen niet mee.</strong> Die spelen zich af in een
              virtuele wereld en zouden een vlek midden op zee opleveren.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Uit privacy-overweging telt het blok waar een rit begint of
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
              Onder de kaart staat per provincie en per Europees land hoeveel
              procent van de blokken je gehad hebt. Ritten buiten Europa kleuren
              wel op de kaart, maar hebben geen gebied in die tabel.
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
        id="onderhoud"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Wrench className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Mijn fietsen en onderhoud</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Zodra je Strava gekoppeld en gesynchroniseerd hebt, kent ZWB je
              fietsen met hun totale kilometerstand. Daarmee toon je je fietsen
              op je profiel en houd je de slijtage van onderdelen bij.
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
                  <strong className="text-foreground">Opnieuw koppelen</strong> —
                  voor je uitrusting hebben we eenmalig extra toestemming nodig.
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
                  Voeg op <strong className="text-foreground">Onderhoud</strong>{" "}
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
                  Vervangen? Klik op <strong className="text-foreground">Vervangen</strong>{" "}
                  — de teller begint opnieuw vanaf de huidige stand.
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/onderhoud"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Wrench className="size-4 text-primary" />
            Naar Onderhoud
          </Link>
          <Link
            href="/profiel#fietsen"
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
          >
            <Bike className="size-4 text-primary" />
            Mijn fietsen
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Zet onder Profiel → Meldingen de optie{" "}
          <strong className="text-foreground">Onderhoud: onderdeel toe aan
          vervanging</strong> aan om hierover een pushmelding te krijgen.
        </p>
      </section>

      <section
        id="fit-export"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">
              Workout op je fietscomputer (Wahoo / Garmin)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Een gepubliceerd schema staat automatisch in intervals.icu. Hoe je
              het op je fietscomputer krijgt, verschilt per merk.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="size-4 text-primary" />
              Wahoo ELEMNT / BOLT / ROAM
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Wahoo importeert geplande workouts <strong>niet</strong> uit een
              los bestand — dan krijg je de melding &ldquo;geen geldige
              GPX&rdquo;, omdat de app het als route probeert te lezen. Geplande
              workouts komen binnen via een koppeling. Koppel intervals.icu één
              keer aan Wahoo, daarna synct het schema vanzelf:
            </p>
            <ol className="mt-3 space-y-3">
              {WAHOO_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Download className="size-4 text-primary" />
                Garmin
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Klik bij de workout op <strong>Download FIT</strong> en
                    importeer het bestand in Garmin Connect (of zet het in de
                    map NewFiles op het toestel).
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Of koppel intervals.icu aan Garmin Connect in de
                    intervals-instellingen, dan synct het schema ook automatisch.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-md border bg-background p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleHelp className="size-4 text-primary" />
                Goed om te weten
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                De <strong>Download FIT</strong>-knop is bedoeld voor Garmin en
                andere apparaten die losse workout-bestanden accepteren. Voor
                Wahoo gebruik je de cloudkoppeling hierboven. Pas je een schema
                aan? Publiceer opnieuw, dan staat de nieuwste versie klaar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="zwift-workout"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Monitor className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Workout in Zwift</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Koppel Zwift één keer aan intervals.icu, daarna staat de training
              van de dag vanzelf in Zwift klaar.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              Zwift koppelen
            </h3>
            <ol className="mt-3 space-y-3">
              {ZWIFT_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CircleHelp className="size-4 text-primary" />
              Goed om te weten
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {ZWIFT_NOTES.map((note) => (
                <li key={note} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="beheer"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Beheer en technische koppelingen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Naslag voor bestuur, communitybeheerders, trainers en teamcaptains.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {ADMIN_GUIDES.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-20 rounded-md border bg-background p-4"
            >
              <h3 className="text-sm font-semibold">{guide.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border bg-card/90 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="size-5 text-primary" />
            Meldingen
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pushmeldingen werken als je browser toestemming geeft en je voorkeuren
            onder Profiel aanstaan.
          </p>
          <Link
            href="/profiel#meldingen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Meldingen instellen
          </Link>
        </article>

        <article className="rounded-lg border bg-card/90 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-primary" />
            Problemen oplossen
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {TROUBLESHOOTING.map((item) => (
              <li key={item} className="flex gap-2">
                <CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
