import type { ReactNode } from "react";
import { tegelsFontVariables } from "./font";
import { getClub } from "@/lib/club";
import { clubLogoUrl } from "@/lib/club-icons";

/** Kader van de schermen vóór het inloggen in het design "tegels": de
 * tenuebanen van de schil, het originele logo, één smalle kolom. */
export async function TegelsAuthFrame({ children }: { children: ReactNode }) {
  // Het logo van de club (0315), anders het ZWB-logo.
  const { settings } = await getClub();
  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-dvh flex-1 flex-col bg-background ${tegelsFontVariables}`}
    >
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="tg-logo tg-logo-lg self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clubLogoUrl(settings.logoUrl)} alt={settings.logoUrl ? settings.name : "ZWB Cycling Community"} />
        </div>
        {children}
      </main>
    </div>
  );
}
