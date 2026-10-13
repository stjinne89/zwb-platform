import { VOEDING_SECTIONS } from "../../_components/nav-config";
import { SectionNav } from "../_components/section-nav";

// Eigen tabbalk onder Voeding, in beide designs: in "tegels" heeft de pijler
// voeden maar één onderdeel en toont ZwbeterNav dus zelf geen tabs.
export default function VoedingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionNav items={VOEDING_SECTIONS.map(({ href, label }) => ({ href, label }))} />
      {children}
    </div>
  );
}
