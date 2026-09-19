import type { Metadata } from "next";
import Link from "next/link";
import { ZwbMark } from "@/components/zwb-logo";

// De publieke Omnium-sectie is Engelstalig: het deelnemersveld is
// internationaal en logt niet in. De rest van het platform blijft Nederlands,
// net als de beheerschermen. Geen i18n-laag; alleen lang="en" op deze sectie,
// zodat schermlezers en vertalers het juiste doen op een pagina binnen een
// verder Nederlandstalig document.
export const metadata: Metadata = {
  title: {
    default: "ZWB Omnium",
    template: "%s — ZWB Omnium",
  },
  description:
    "Four events, one morning. The ZWB Omnium is a monthly Zwift racing series.",
};

const NAV = [
  { href: "/omnium", label: "Home" },
  { href: "/omnium/register", label: "Register" },
  { href: "/omnium/rules", label: "Rules" },
  { href: "/omnium/standings", label: "Standings" },
];

export default function OmniumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="flex min-h-screen flex-col">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/omnium" className="flex items-center gap-2">
            <ZwbMark className="h-7 w-auto" />
            <span className="text-sm font-semibold tracking-wide">OMNIUM</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <span>ZWB Cycling</span>
          <span>
            Results are published per edition. Questions about your data?{" "}
            <Link href="/privacy" className="underline">
              Privacy statement
            </Link>
            .
          </span>
        </div>
      </footer>
    </div>
  );
}
