import { PageHeader } from "@/components/app-ui";
import { SectionNav } from "../../zwbeter-worden/_components/section-nav";

// ZRL-beheer: de racekalender en de WTRL-teams onder één menu-item. Tot
// 2026-10-13 waren dat twee losse beheerschermen met hetzelfde recht.
const TABS = [
  { href: "/beheer/zrl", label: "Kalender" },
  { href: "/beheer/zrl/teams", label: "WTRL-teams" },
];

export default function ZrlBeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader title="ZRL-beheer" />
      <SectionNav items={TABS} />
      {children}
    </div>
  );
}
