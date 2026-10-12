import Link from "next/link";
import type { ReactNode } from "react";
import { Barlow_Semi_Condensed } from "next/font/google";
import { TegelsTabs } from "./tegels-tabs";

// Alleen het design "tegels" gebruikt dit lettertype; zonder preload laadt het
// pas als dat design aanstaat. Door de eigenaar gekozen uit een proef van vijf.
const tegelsFont = Barlow_Semi_Condensed({
  variable: "--font-tegels",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  preload: false,
});

/** De schil van het design "tegels": het originele logo bovenin, de vijf
 * plekken onderin (telefoon) of bovenin (breed scherm). */
export function TegelsShell({
  before,
  back,
  actions,
  children,
  after,
}: {
  before?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-screen flex-col bg-background ${tegelsFont.variable}`}
    >
      {before}
      <header className="relative">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 pt-3 md:gap-6">
          <Link
            href="/dashboard"
            className="tg-logo flex shrink-0 items-center"
            aria-label="ZWB Cycling Community"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/zwb-logo.png" alt="" />
          </Link>
          {back}
          <TegelsTabs position="top" />
          <div className="flex-1 md:hidden" />
          <div className="flex items-center gap-2">{actions}</div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-5">{children}</main>
      <TegelsTabs position="bottom" />
      {after}
    </div>
  );
}
