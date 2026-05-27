import Link from "next/link";
import {
  Bell,
  Bike,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  MapPinned,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle,
  Users,
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
    id: "owntracks",
    icon: MapPinned,
    title: "Samen fietsen met OwnTracks",
    bullets: [
      "Installeer OwnTracks op iOS of Android en kies HTTP mode.",
      "Maak op Samen fietsen een persoonlijke koppellink.",
      "Geef locatiepermissie Altijd en zet batterijoptimalisatie uit.",
      "Met RSVP Ja of Misschien verschijn je automatisch op de eventkaart.",
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

const TROUBLESHOOTING = [
  "Zie je geen badges? Koppel Strava en start daarna een achievements-sync.",
  "Verschijn je niet live? Controleer OwnTracks, locatie Altijd en je RSVP.",
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
