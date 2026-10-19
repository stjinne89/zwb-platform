import { setDesign } from "../_actions/design";
import type { Design } from "@/lib/design";

/** Zet het oude design aan of uit voor deze browser. Alleen zichtbaar voor
 * wie het mag; de layout bepaalt dat. */
export function DesignSwitch({ design }: { design: Design }) {
  const next = design === "tegels" ? "klassiek" : "tegels";
  return (
    <form action={setDesign} className="mt-10 flex justify-center">
      <input type="hidden" name="design" value={next} />
      <button
        type="submit"
        className="min-h-11 rounded-md border bg-card px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {design === "tegels" ? "Oude design bekijken" : "Terug naar het nieuwe design"}
      </button>
    </form>
  );
}
