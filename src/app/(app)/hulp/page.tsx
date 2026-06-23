import Link from "next/link";
import {
  Bell,
  Bike,
  Cake,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Download,
  Gauge,
  HeartPulse,
  MapPinned,
  Medal,
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
    text: "Koppel Strava of importeer activities.csv via Achievements.",
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
      "Zonder Strava-koppeling kun je activities.csv uit je Strava-export importeren op Achievements.",
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
      "Schrijf na een gereden event een ritverslag; anderen kunnen reageren.",
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
  { href: "/dashboard", name: "Dashboard", text: "Je startscherm: deze week, recente clubritten, ritverslagen en nieuws." },
  { href: "/kalender", name: "Kalender", text: "Alle events — groepsritten, ZRL, Ladder en socials. RSVP met Ja of Misschien." },
  { href: "/samen-fietsen", name: "Samen fietsen", text: "Live kaart van wie er nu rijdt, met livechat. Tracking stel je in via OwnTracks." },
  { href: "/teams", name: "Teams", text: "Teams, rosters en ZRL-/Ladder-standen, inclusief de TTT-planner." },
  { href: "/leden", name: "Leden", text: "Ledenlijst met categorie en badges; filter op regio of categorie." },
  { href: "/achievements", name: "Achievements", text: "Al je badges. Sync Strava, importeer activities.csv of herbereken badges." },
  { href: "/training", name: "Training", text: "Schema's, AI-coach, je ZWBeterWorden-advies en de koppelingen." },
  { href: "/training/vermogen", name: "Mijn vermogen", text: "Je powercurve en de vergelijking met de club." },
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
  "Zie je geen badges? Koppel Strava en start een sync, of importeer activities.csv op Achievements.",
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
        id="strava-import"
        className="scroll-mt-20 rounded-lg border bg-card/90 p-5"
      >
        <header className="flex items-start gap-2">
          <Download className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Strava-export importeren</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Geen plek voor een Strava-koppeling? Importeer je Strava-archief op
              Achievements.
            </p>
          </div>
        </header>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>Vraag op Strava.com je accountdownload aan.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>Pak de download uit en kies activities.csv.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>Upload dat bestand op Achievements met Importeer CSV.</span>
          </li>
        </ol>
        <Link
          href="/achievements"
          className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40"
        >
          <Medal className="size-4 text-primary" />
          Naar Achievements
        </Link>
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
            href="/training/vermogen"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open Mijn vermogen
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
