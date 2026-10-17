import Link from "next/link";
import { MessagesSquare, Settings2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ZwbiebTab = "kennis" | "spullen" | "leeszaal";

export const ZWBIEB_TABS: { tab: ZwbiebTab; href: string; label: string }[] = [
  { tab: "kennis", href: "/zwbieb", label: "Kennis" },
  { tab: "spullen", href: "/zwbieb/spullen", label: "Spullen" },
  { tab: "leeszaal", href: "/zwbieb/leeszaal", label: "Leeszaal" },
];

export function ZwbiebTabs({ current }: { current: ZwbiebTab }) {
  return (
    <nav aria-label="Soort" className="flex flex-wrap gap-2">
      {ZWBIEB_TABS.map((item) => (
        <Link
          key={item.tab}
          href={item.href}
          aria-current={item.tab === current ? "page" : undefined}
          // tg-link tg-club: in "tegels" sage vlakken (de club en de mensen),
          // de actieve als paneel met de gouden lijn.
          className={cn(
            "tg-link tg-club inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm font-medium transition",
            item.tab === current ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** De knoppen in de kop van ZWBieb: gesprekken, meedoen, beheer. */
export function ZwbiebActions({
  unread,
  joined,
  canModerate,
}: {
  unread: number;
  joined: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/zwbieb/gesprekken" className={buttonVariants({ variant: "outline" })}>
        <MessagesSquare />
        Gesprekken{unread > 0 ? ` (${unread})` : ""}
      </Link>
      <Link href="/zwbieb/mijn" className={buttonVariants()}>
        {joined ? "Mijn ZWBieb" : "Doe mee"}
      </Link>
      {canModerate && (
        <Link
          href="/zwbieb/onderwerpen"
          className={buttonVariants({ variant: "ghost" })}
          aria-label="Onderwerpen beheren"
        >
          <Settings2 />
        </Link>
      )}
    </div>
  );
}
