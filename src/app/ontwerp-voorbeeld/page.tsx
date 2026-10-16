import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { TegelsAgenda, type AgendaRow } from "@/components/tegels/agenda";
import { TegelsLinkGrid } from "@/components/tegels/link-grid";
import { TegelsVandaag } from "@/components/tegels/vandaag";
import { seasonWarnings, type SeasonWarningInput } from "@/lib/training/season";
import { TegelsShell } from "../(app)/_components/tegels-shell";
import { SeasonRoad } from "../(app)/zwbeter-worden/jaarplan/_components/season-road";
import { SeasonStand } from "../(app)/zwbeter-worden/jaarplan/_components/season-stand";

// Het design "tegels" met voorbeelddata, zonder login. Alleen bij lokaal
// ontwikkelen: in productie bestaat deze pagina niet. Bedoeld om het uiterlijk
// te controleren zonder de productiedatabase; met echte data kijk je via de
// schakelaar in de app zelf.

const SCREENS = ["vandaag", "kalender", "club", "jaarplan"] as const;

// Een jaar met alles erin: een lopend blok dat bijna afloopt, een vakantie waar
// nog trainingen in staan, een kamp, lege maanden en een A-doel ver weg.
const SEASON: SeasonWarningInput = {
  today: "2026-10-13",
  from: "2026-09-12",
  to: "2027-09-12",
  targets: [
    { id: "t1", title: "Ronde van Vlaanderen Cyclo", targetDate: "2027-03-14", priority: "b", eventId: null, goalId: null, note: null },
    { id: "t2", title: "La Marmotte", targetDate: "2027-07-04", priority: "a", eventId: null, goalId: "g1", note: "Met Jeroen en Sanne" },
    { id: "t3", title: "Clubkampioenschap tijdrit", targetDate: "2026-11-28", priority: "c", eventId: "e3", goalId: null, note: null },
  ],
  periods: [
    { id: "p1", title: "Herfstvakantie", startDate: "2026-10-17", endDate: "2026-10-25", kind: "rust", note: null },
    { id: "p2", title: "Drukke weken op het werk", startDate: "2026-12-07", endDate: "2026-12-18", kind: "rustig", note: null },
    { id: "p3", title: "Trainingskamp Mallorca", startDate: "2027-04-17", endDate: "2027-04-24", kind: "kamp", note: null },
  ],
  plans: [
    { rootId: "r1", title: "Basis winter", startDate: "2026-09-21", endDate: "2026-10-26", status: "published", goalId: "g1" },
  ],
  events: [
    { id: "e1", title: "ZRL ronde 3", type: "zrl", date: "2026-10-15", rsvp: "yes" },
    { id: "e2", title: "Clubrit Veluwezoom", type: "outdoor", date: "2026-11-15", rsvp: "maybe" },
    { id: "e3", title: "Clubkampioenschap tijdrit", type: "outdoor", date: "2026-11-28", rsvp: "yes" },
  ],
  plannedWorkoutDays: ["2026-10-19", "2026-10-21", "2026-10-24"],
};

const PAST: AgendaRow[] = [
  { key: "p1", href: "#", dateKey: "2026-10-06", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "di", dayNumber: "6", title: "ZRL ronde 3", sub: "geweest · Zwift" },
  { key: "p2", href: "#", dateKey: "2026-10-10", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "za", dayNumber: "10", title: "Clubrit Posbank", sub: "geweest · Velp" },
];

const UPCOMING: AgendaRow[] = [
  { key: "u1", href: "#", dateKey: "2026-10-12", color: { bg: "var(--tg-zwbeter)", ink: "var(--tg-paper)" }, day: "ma", dayNumber: "12", title: "Sweet spot 3 × 12 min", sub: "training · 75 min" },
  { key: "u2", href: "#", dateKey: "2026-10-13", color: { bg: "#ea580c", ink: "#ffffff" }, day: "di", dayNumber: "13", title: "ZRL ronde 4 · TTT", sub: "Zwift · 5 gaan mee", time: "19:45" },
  { key: "u3", href: "#", dateKey: "2026-10-14", color: { bg: "var(--tg-zwbeter)", ink: "var(--tg-paper)" }, day: "wo", dayNumber: "14", title: "Herstelrit", sub: "training · 45 min" },
  { key: "u4", href: "#", dateKey: "2026-10-15", color: { bg: "#ea580c", ink: "#ffffff" }, day: "do", dayNumber: "15", title: "Tour Ignite · etappe 3", sub: "Zwift", time: "20:00" },
  { key: "u5", href: "#", dateKey: "2026-10-16", color: { bg: "var(--tg-vandaag)", ink: "var(--tg-ink)" }, day: "vr", dayNumber: "16", title: "Verjaardag van Sanne" },
  { key: "u6", href: "#", dateKey: "2026-10-17", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "za", dayNumber: "17", title: "Clubrit Veluwezoom", sub: "Rheden · 82 km · 12 gaan mee", time: "09:00" },
  { key: "u7", href: "#", dateKey: "2026-10-18", color: { bg: "#ea580c", ink: "#ffffff" }, day: "zo", dayNumber: "18", title: "Sunday Race Club", sub: "MyWhoosh", time: "10:45" },
  { key: "u8", href: "#", dateKey: "2026-11-15", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "zo", dayNumber: "15", title: "Clubrit Veluwezoom", sub: "Rheden · 82 km", time: "09:00" },
  { key: "u9", href: "#", dateKey: "2026-11-28", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "za", dayNumber: "28", title: "Clubkampioenschap tijdrit", sub: "Dronten", time: "13:00" },
  { key: "u10", href: "#", dateKey: "2027-01-03", color: { bg: "#3b82f6", ink: "#ffffff" }, day: "zo", dayNumber: "3", title: "Nieuwjaarsrit", sub: "Zwolle · 60 km", time: "11:00" },
];

export default async function OntwerpVoorbeeldPage({
  searchParams,
}: {
  searchParams: Promise<{ scherm?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { scherm } = await searchParams;

  return (
    <TegelsShell actions={<ThemeToggle />}>
      <div className="space-y-6">
        {scherm === "kalender" ? (
          <div className="space-y-4">
            <h1 className="tg-display">Kalender</h1>
            <TegelsAgenda past={PAST} upcoming={UPCOMING} todayKey="2026-10-12" empty="Geen aankomende events of trainingen." />
          </div>
        ) : scherm === "club" ? (
          <div className="space-y-5">
            <h1 className="tg-display">Club</h1>
            <TegelsLinkGrid
              place="club"
              links={["Leden", "Samen fietsen", "Teams", "Achievements", "Stats", "ZWB Segments", "ZWBlokken", "ZWBgame", "ZWB Omnium", "Sunday Race Club", "Polls"].map(
                (label) => ({ href: `#${label}`, label }),
              )}
            />
          </div>
        ) : scherm === "jaarplan" ? (
          <div className="max-w-2xl space-y-4">
            <h1 className="tg-display">Jaarplan</h1>
            <SeasonStand today={SEASON.today} targets={SEASON.targets} plans={SEASON.plans} />
            <SeasonRoad
              today={SEASON.today}
              from={SEASON.from}
              targets={SEASON.targets}
              periods={SEASON.periods}
              plans={SEASON.plans}
              events={SEASON.events}
              warnings={seasonWarnings(SEASON)}
              editable
            />
          </div>
        ) : (
          <TegelsVandaag
            weekday="maandag"
            date="12 oktober"
            workout={{ title: "Sweet spot 3 × 12 min", when: "vandaag", today: true, meta: "75 min · sweet spot" }}
            events={[
              { id: "1", title: "ZRL ronde 4 · TTT", when: "morgen", time: "19:45", place: "kalender" },
              { id: "2", title: "Tour Ignite · etappe 3", when: "do 15 okt", time: "20:00", place: "kalender" },
              { id: "3", title: "Clubrit Veluwezoom", when: "za 17 okt", time: "09:00", place: "kalender" },
            ]}
            standing={{ href: "#", team: "ZWB B1", competition: "ZRL", position: 3, totalTeams: 12 }}
            live={{ count: 3, riders: "Anna, Bert en Carla" }}
          />
        )}
        <p className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          Voorbeelddata.
          {SCREENS.map((screen) => (
            <Link key={screen} href={`/ontwerp-voorbeeld?scherm=${screen}`} className="underline">
              {screen}
            </Link>
          ))}
        </p>
      </div>
    </TegelsShell>
  );
}
