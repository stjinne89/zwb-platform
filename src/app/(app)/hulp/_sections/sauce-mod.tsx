import { CheckCircle2, Download, MonitorSmartphone } from "lucide-react";
import { ModuleGate } from "@/components/club-texts-provider";
import { buttonVariants } from "@/components/ui/button";
import { SAUCE_MOD_DOWNLOAD, SAUCE_MOD_VERSION } from "@/lib/sauce-mod";
import { cn } from "@/lib/utils";

const BULLETS = [
  "Met Sauce for Zwift op je pc toont het venster van deze mod tijdens een ZRL-race de live stand van de renner die je in Zwift bekijkt: de teams, de punten van die renner en de laatste boog. Bij een scratch is de stand tot de finish voorlopig, op de bogen.",
  "Installeren of bijwerken: download het bestand, dubbelklik erop en start Sauce opnieuw. Zet de mod aan bij Instellingen, Mods. Is er een nieuwe versie, dan staat dat onderaan in het venster.",
  "Alleen voor Windows. Installeer je de TTT-bot, dan komt de mod vanzelf mee.",
];

export function SauceModHelp({ id }: { id: string }) {
  return (
    <ModuleGate module="teams">
      <section id={id} className="scroll-mt-20 rounded-lg border bg-card/90 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MonitorSmartphone className="size-5 text-primary" />
          Sauce-mod: live ZRL-stand
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {BULLETS.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <a
          href={SAUCE_MOD_DOWNLOAD}
          download
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-fit")}
        >
          <Download className="size-4" />
          Download versie {SAUCE_MOD_VERSION}
        </a>
      </section>
    </ModuleGate>
  );
}
