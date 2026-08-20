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
    title: "FTP-test",
    text: "Je trainer plant de test; jij vult de uitslag in en je FTP volgt.",
    href: "/hulp#ftp-test",
    terms:
      "ftp test ramptest ramp 20 minuten twintig minuten drempel vermogen watt meten uitslag testen targetwatts",
  },
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
    title: "Strava-ritten importeren (CSV of GPX)",
    text: "Importeer je hele historie (activities.csv) of één rit (GPX) op Achievements.",
    href: "/hulp#strava-import",
    terms:
      "strava export csv activities importeren upload bestand geen koppeling limiet gpx een rit losse rit bulk archief taal geen fietsritten gevonden",
  },
  {
    title: "Doorklikken naar je andere profielen",
    text: "Zwift-ID, Strava en intervals.icu invullen voor knoppen naar ZwiftPower, ZwiftRacing.app, Strava en intervals.",
    href: "/hulp#externe-profielen",
    terms:
      "zwiftpower zwiftracing zwift racing app strava intervals icu zwift-id athlete id profiel link knop grijs externe profielen",
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
    href: "/hulp#mijn-garage",
    terms: "fiets fietsen onderhoud ketting cassette banden remblokken slijtage strava",
  },
  {
    title: "Logboek: hoe je je voelt",
    text: "Houd per dag bij hoeveel last je hebt en waarvan. Je schema weegt het mee als signaal; alleen jij ziet wat erin staat.",
    href: "/hulp#logboek",
    terms: "logboek klachten menstruatie cyclus herstel belastbaarheid symptomen privacy",
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
    title: "ZWB als app installeren",
    text: "Zet de webapp op je beginscherm op iOS of Android.",
    href: "/hulp#webapp-installeren",
    terms: "app installeren webapp telefoon beginscherm startscherm ios iphone ipad android chrome safari",
  },
  {
    title: "Trainingsdoel en je schema",
    text: "Max. trainingsuren per week, beschikbare dagen en een dag aanpassen.",
    href: "/hulp#trainingsschema",
    terms: "trainingsdoel doel schema uren per week max uren beschikbare dagen rustdag aanpassen ai",
  },
  {
    title: "Doeltype en de laatste weken",
    text: "Waarom een gran fondo wel een taper krijgt en basisconditie of ZRL niet.",
    href: "/hulp#doeltype",
    terms:
      "doeltype taper piek pieken laatste weken basisconditie base fitness ftp herstel opbouw rebuild zrl ladder gran fondo outdoor event targetdatum afbouwen volume",
  },
  {
    title: "Training en intervals.icu",
    text: "Trainingsdashboard, hersteldata, workouts en trainer-toegang.",
    href: "/hulp#trainingsruimte",
    terms: "training intervals icu herstel form workout trainer vermogen wahoo garmin",
  },
  {
    title: "Core & mobiliteit",
    text: "Korte series naast de fiets, zelf afvinken, los van je trainingsbelasting.",
    href: "/hulp#core-mobiliteit",
    terms:
      "core mobiliteit stabiliteit rug rugpijn onderrug plank stretchen rekken heup hamstring houding zithouding oefeningen serie afvinken",
  },
  {
    title: "ZWBeter Worden-samenvatting in Strava",
    text: "Het blokje dat na een rit onderaan je Strava-omschrijving komt.",
    href: "/hulp#strava-samenvatting",
    terms:
      "strava omschrijving beschrijving samenvatting join ctl gereedscore workout score tss fitness status opnieuw koppelen",
  },
  {
    title: "Workout op fietscomputer",
    text: "FIT-export, Wahoo-koppeling en Garmin-import.",
    href: "/hulp#fit-export",
    terms: "fit export fietscomputer wahoo garmin elemnt bolt roam workout",
  },
  {
    title: "Workout in Zwift",
    text: "Zwift koppelen aan intervals.icu, dan staat je training vanzelf klaar.",
    href: "/hulp#zwift-workout",
    terms:
      "zwift koppelen connect indoor trainer workout training zwo custom intervals icu ftp percentage smart",
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
    title: "ZWBlokken",
    text: "De blokkenkaart: waar heb jij en waar heeft de club al gereden?",
    href: "/hulp#zwblokken",
    terms:
      "zwblokken blokken kaart heatmap verkennen gebied squadrats tegels ontdekken",
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
