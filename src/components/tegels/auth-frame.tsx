import type { ReactNode } from "react";
import { tegelsFontVariables } from "./font";
import { getClub } from "@/lib/club";
import { ClubLogo } from "./club-logo";
import { clubCommunity } from "@/lib/club-texts";

/** Kader van de schermen vóór het inloggen in het design "tegels": de
 * tenuebanen van de schil, het originele logo, één smalle kolom. */
export async function TegelsAuthFrame({ children }: { children: ReactNode }) {
  const { settings } = await getClub();
  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-dvh flex-1 flex-col bg-background ${tegelsFontVariables}`}
    >
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="tg-logo tg-logo-lg self-start">
          <ClubLogo large alt={settings.logoUrl ? settings.name : clubCommunity(settings)} />
        </div>
        {children}
      </main>
    </div>
  );
}
