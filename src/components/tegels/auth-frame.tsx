import type { ReactNode } from "react";
import { tegelsFont } from "./font";

/** Kader van de schermen vóór het inloggen in het design "tegels": de
 * tenuebanen van de schil, het originele logo, één smalle kolom. */
export function TegelsAuthFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-dvh flex-1 flex-col bg-background ${tegelsFont.variable}`}
    >
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="tg-logo tg-logo-lg self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zwb-logo.png" alt="ZWB Cycling Community" />
        </div>
        {children}
      </main>
    </div>
  );
}
