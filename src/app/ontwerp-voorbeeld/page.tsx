import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { TegelsAgenda, type AgendaRow } from "@/components/tegels/agenda";
import { TegelsLinkGrid } from "@/components/tegels/link-grid";
import { TegelsVandaag } from "@/components/tegels/vandaag";
import { TegelsShell } from "../(app)/_components/tegels-shell";

// Het design "tegels" met voorbeelddata, zonder login. Alleen bij lokaal
// ontwikkelen: in productie bestaat deze pagina niet. Bedoeld om het uiterlijk
// te controleren zonder de productiedatabase; met echte data kijk je via de
// schakelaar in de app zelf.

const SCREENS = ["vandaag", "kalender", "club"] as const;

const PAST: AgendaRow[] = [
  { key: "p1", href: "#", place: "club", day: "di", dayNumber: "6", title: "ZRL ronde 3", sub: "geweest · Zwift" },
  { key: "p2", href: "#", place: "club", day: "za", dayNumber: "10", title: "Clubrit Posbank", sub: "geweest · Velp" },
];

const UPCOMING: AgendaRow[] = [
  { key: "u1", href: "#", place: "zwbeter", day: "ma", dayNumber: "12", title: "Sweet spot 3 × 12 min", sub: "training · 75 min" },
  { key: "u2", href: "#", place: "kalender", day: "di", dayNumber: "13", title: "ZRL ronde 4 · TTT", sub: "Zwift · 5 gaan mee", time: "19:45" },
  { key: "u3", href: "#", place: "zwbeter", day: "wo", dayNumber: "14", title: "Herstelrit", sub: "training · 45 min" },
  { key: "u4", href: "#", place: "kalender", day: "do", dayNumber: "15", title: "Tour Ignite · etappe 3", sub: "Zwift", time: "20:00" },
  { key: "u5", href: "#", place: "vandaag", day: "vr", dayNumber: "16", title: "Verjaardag van Sanne" },
  { key: "u6", href: "#", place: "club", day: "za", dayNumber: "17", title: "Clubrit Veluwezoom", sub: "Rheden · 82 km · 12 gaan mee", time: "09:00" },
  { key: "u7", href: "#", place: "kalender", day: "zo", dayNumber: "18", title: "Sunday Race Club", sub: "MyWhoosh", time: "10:45" },
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
            <TegelsAgenda past={PAST} upcoming={UPCOMING} empty="Geen aankomende events of trainingen." />
          </div>
        ) : scherm === "club" ? (
          <div className="space-y-5">
            <h1 className="tg-display">Club</h1>
            <TegelsLinkGrid
              place="club"
              links={["Leden", "Teams", "Achievements", "Stats", "ZWB Segments", "ZWBlokken", "ZWBgame", "ZWB Omnium", "Sunday Race Club", "Polls"].map(
                (label) => ({ href: `#${label}`, label }),
              )}
            />
          </div>
        ) : (
          <TegelsVandaag
            weekday="maandag"
            date="12 oktober"
            workout={{ title: "Sweet spot 3 × 12 min", when: "vandaag", meta: "75 min · sweet spot" }}
            events={[
              { id: "1", title: "ZRL ronde 4 · TTT", when: "morgen", time: "19:45", place: "kalender" },
              { id: "2", title: "Tour Ignite · etappe 3", when: "do 15 okt", time: "20:00", place: "kalender" },
              { id: "3", title: "Clubrit Veluwezoom", when: "za 17 okt", time: "09:00", place: "club" },
            ]}
            standing={{ href: "#", team: "ZWB B1", competition: "ZRL", position: 3, totalTeams: 12 }}
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
