import Link from "next/link";
import type { ReactNode } from "react";
import { Albert_Sans, Jost } from "next/font/google";
import { TegelsTabs } from "./tegels-tabs";

// Alleen het design "tegels" gebruikt deze lettertypes; zonder preload laden ze
// pas als dat design aanstaat. Jost voor koppen, tegels en labels; Albert Sans
// voor lopende tekst.
const albertSans = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
  preload: false,
});
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
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
      className={`app-shell flex min-h-screen flex-col bg-background ${albertSans.variable} ${jost.variable}`}
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-10">{children}</main>
      <TegelsTabs position="bottom" />
      {after}
    </div>
  );
}
