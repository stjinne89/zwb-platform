import { MATERIAAL_SECTIONS } from "../../_components/nav-config";
import { SectionNav } from "../_components/section-nav";

// Eigen tabbalk onder Materiaal, zoals bij Voeding. Geen van beide tabs is de
// index: de pijler zelf stuurt door naar de kennisbank, en een artikel valt
// onder Kennisbank.
export default function MateriaalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SectionNav
        items={MATERIAAL_SECTIONS.map(({ href, label }) => ({ href, label }))}
        exactHref="/zwbeter-worden/materiaal"
      />
      {children}
    </div>
  );
}
