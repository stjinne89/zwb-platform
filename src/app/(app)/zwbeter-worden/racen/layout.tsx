import { RACEN_SECTIONS } from "../../_components/nav-config";
import { SectionNav } from "../_components/section-nav";

// Eigen tabbalk onder Racen. Geen tab telt alleen exact: een race
// (/racen/<id>) hoort bij Jouw races, een artikel (/racen/kennis/<slug>) bij
// Kennisbank.
export default function RacenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionNav items={RACEN_SECTIONS.map(({ href, label }) => ({ href, label }))} exactHref={null} />
      {children}
    </div>
  );
}
