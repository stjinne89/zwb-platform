import Link from "next/link";
import {
  Bell,
  Bike,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  MapPinned,
  Medal,
  Navigation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/app-ui";

const START_STEPS = [
  {
    title: "Maak je profiel compleet",
    text: "Naam, foto, regio, Zwift-ID en zichtbaarheid staan onder Profiel.",
    href: "/profiel",
  },
  {
    title: "Koppel Strava",
    text: "Nodig voor clubritten, badges en trainingsdata.",
    href: "/profiel#strava",
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
      "Milestone badges blijven permanent op je profiel staan.",
      "Klik op een badge om te zien welke drempel erbij hoort.",
    ],
  },
  {
    id: "community",
    icon: Users,
    title: "Community, polls en Vraag & Aanbod",
    bullets: [
      "Gebruik Vraag & Aanbod voor spullen, hulpvragen en tips.",
      "Polls verzamelen snelle keuzes vanuit de community.",
      "Media bundelt nieuws, mededelingen, video's en podcasts.",
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
    text: "Open OwnTracks → instellingen (i- of tandwiel-icoon) → Connection → Mode = Private HTTP. Plak je koppellink in het veld URL.",
  },
  {
    title: "Locatie op 'Altijd toestaan'",
    text: "Geef de app locatietoegang 'Altijd' (niet 'Bij gebruik') én zet nauwkeurige/precieze locatie aan. Zonder 'Altijd' stopt het tracken zodra je scherm uit gaat.",
  },
  {
    title: "Zet de modus op 'Move' tijdens je rit",
    text: "In OwnTracks → instellingen → monitoring = Move. Dat stuurt regelmatig je positie door. 'Significant' of 'Manual' updaten te weinig en geven gaten op de kaart.",
  },
  {
    title: "Rijden en verschijnen",
    text: "Open OwnTracks aan het begin van je rit. Op Samen fietsen verschijn je vanzelf. Met RSVP Ja of Misschien op een event sta je die dag ook op de eventkaart.",
  },
  {
    title: "Stoppen",
    text: "Klaar? Zet OwnTracks-monitoring terug op 'Significant' of stop de koppeling op Samen fietsen. Na 15 min zonder positie verdwijn je sowieso automatisch.",
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

const TROUBLESHOOTING = [
  "Zie je geen badges? Koppel Strava en start daarna een achievements-sync.",
  "Verschijn je niet live? Check: OwnTracks op Private HTTP, juiste koppellink, locatie 'Altijd', monitoring op 'Move'.",
  "Bolletje staat stil of viel weg? Meestal een dekkinggat of de app werd geschorst — de kaart pakt het automatisch weer op; controleer batterijoptimalisatie.",
  "Geen trainingen in beeld? Controleer je intervals.icu API-key.",
  "Mis je rechten? Vraag bestuur of communitybeheer om je rol te controleren.",
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ZWB gids"
        title="Hulp voor leden"
        description="Korte startgidsen voor profiel, events, live tracking, training en badges."
      />

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
                  <strong className="text-foreground">Monitoring:</strong> Move
                  (tijdens de rit)
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
