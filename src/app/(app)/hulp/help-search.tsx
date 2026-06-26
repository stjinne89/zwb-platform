"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type HelpResult = {
  title: string;
  text: string;
  href: string;
  terms: string;
};

const HELP_INDEX: HelpResult[] = [
  {
    title: "Strava koppelen",
    text: "OAuth-koppeling voor clubritten, badges, cols, fietsen en trainingscontext.",
    href: "/profiel#strava",
    terms: "strava koppelen sync oauth activiteiten ritten limiet activiteitenrecht opnieuw",
  },
  {
    title: "Strava opnieuw koppelen",
    text: "Los ontbrekend activiteitenrecht op voor ritten, badges en stats.",
    href: "/hulp#strava-rechten",
    terms: "strava opnieuw koppelen activiteitenrecht activity read vinkje toestemming ritten badges stats",
  },
  {
    title: "Strava CSV importeren",
    text: "Importeer activities.csv uit je Strava-export op Achievements.",
    href: "/hulp#strava-import",
    terms: "strava export csv activities importeren upload bestand geen koppeling limiet",
  },
  {
    title: "Badges en achievements",
    text: "Weekbadges, milestone badges en badges herberekenen.",
    href: "/hulp#badges",
    terms: "badges achievements weekbadges milestone herberekenen strava csv",
  },
  {
    title: "Mijn fietsen en onderhoud",
    text: "Fietsen tonen, handmatig toevoegen en slijtage bijhouden.",
    href: "/hulp#onderhoud",
    terms: "fiets fietsen onderhoud ketting cassette banden remblokken slijtage strava",
  },
  {
    title: "Cols, segmenten en records",
    text: "Automatische herkenning, PR's en segmentranglijsten.",
    href: "/hulp#cols",
    terms: "cols segmenten records pr ranglijst alpe ventoux stelvio",
  },
  {
    title: "Live tracking instellen",
    text: "OwnTracks, koppellink, locatie-instellingen en controlemodus.",
    href: "/hulp#owntracks",
    terms: "owntracks live gps locatie tracking samen fietsen kaart",
  },
  {
    title: "Training en intervals.icu",
    text: "Trainingsdashboard, hersteldata, workouts en trainer-toegang.",
    href: "/hulp#trainingsruimte",
    terms: "training intervals icu herstel form workout trainer vermogen wahoo garmin",
  },
  {
    title: "Workout op fietscomputer",
    text: "FIT-export, Wahoo-koppeling en Garmin-import.",
    href: "/hulp#fit-export",
    terms: "fit export fietscomputer wahoo garmin elemnt bolt roam workout",
  },
  {
    title: "Events en RSVP",
    text: "Kalender, routes, GPX, liveticker en aanmelden.",
    href: "/hulp#events",
    terms: "event kalender rsvp route gpx aanmelden liveticker",
  },
  {
    title: "Verjaardagsrondje",
    text: "Een verjaardagsrit plannen en aanmelden bij andere leden.",
    href: "/hulp#verjaardagsrondje",
    terms: "verjaardag verjaardagsrondje aanmelden rit jarig",
  },
  {
    title: "Privacy en zichtbaarheid",
    text: "Profielvelden, live tracking en trainer-data delen.",
    href: "/hulp#privacy",
    terms: "privacy zichtbaarheid profiel live tracking trainer toestemming",
  },
  {
    title: "Beheer",
    text: "Events, achievements, teams, rollen, media en technische koppelingen.",
    href: "/hulp#beheer",
    terms: "beheer admin rollen rechten achievements events teams media notificaties strava sync",
  },
  {
    title: "Strava-sync beheren",
    text: "Leden zonder ritten syncen en badges + cols herberekenen.",
    href: "/hulp#stravabeheer",
    terms: "beheer admin strava sync leden ritten statistieken activiteitenrecht badges cols herberekenen",
  },
  {
    title: "Problemen oplossen",
    text: "Snelle checks voor badges, live tracking, trainingen en rechten.",
    href: "/hulp#problemen",
    terms: "probleem oplossen werkt niet badges live trainingen rechten fout",
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function HelpSearch() {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query.trim());
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return HELP_INDEX.filter((item) =>
      normalize(`${item.title} ${item.text} ${item.terms}`).includes(
        normalizedQuery,
      ),
    ).slice(0, 8);
  }, [normalizedQuery]);

  return (
    <section className="rounded-lg border bg-card/90 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op Strava, badges, OwnTracks..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {normalizedQuery.length >= 2 && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen resultaten.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((result) => (
                <li key={result.href}>
                  <Link
                    href={result.href}
                    className="block rounded-md border bg-background p-3 transition hover:border-primary/40"
                  >
                    <span className="text-sm font-semibold">{result.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {result.text}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
