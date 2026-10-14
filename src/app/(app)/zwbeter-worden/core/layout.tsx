import { KRACHT_SECTIONS } from "../../_components/nav-config";
import { SectionNav } from "../_components/section-nav";

// Eigen tabbalk onder Core & mobiliteit, net als bij Voeding: in "tegels" heeft
// de pijler kracht maar één onderdeel en toont ZwbeterNav dus zelf geen tabs.
export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionNav items={KRACHT_SECTIONS.map(({ href, label }) => ({ href, label }))} />
      {children}
    </div>
  );
}
