import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { linkLogo, type RaceLink } from "@/lib/events/race-links";

function LinkLogo({ url, className }: { url: string; className?: string }) {
  const logo = linkLogo(url);
  if (!logo) {
    return (
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-md bg-muted", className)}>
        <ArrowUpRight className="size-3.5 text-muted-foreground" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      width={24}
      height={24}
      className={cn("size-6 shrink-0 rounded-md object-contain", className)}
    />
  );
}

export function RaceLinkChips({
  links,
  className,
}: {
  links: RaceLink[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {links.map((link) => (
        <li key={link.key}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${link.label} openen`}
            className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 text-sm font-medium hover:bg-accent"
          >
            <LinkLogo url={link.url} />
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Alles wat je vlak voor en tijdens de race nodig hebt: het pacingplan, de
 * Zwift-links en de links die de beheerder bij de race zette.
 */
export function RaceInfoCard({
  pacingHref,
  racepasses,
  signupUrl,
  zwiftLinks,
  links,
}: {
  pacingHref: string | null;
  /** ZRL: de WTRL-racepass(es) waarmee je je aanmeldt. */
  racepasses: RaceLink[];
  signupUrl: string | null;
  zwiftLinks: RaceLink[];
  links: RaceLink[];
}) {
  const hasActions = Boolean(pacingHref || signupUrl || racepasses.length > 0);
  if (!hasActions && zwiftLinks.length === 0 && links.length === 0) {
    return null;
  }
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Raceinfo
      </h2>
      {hasActions && (
        <div className="flex flex-wrap gap-2">
          {racepasses.map((pass) => (
            <a
              key={pass.key}
              href={pass.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <LinkLogo url={pass.url} className="size-5" />
              {pass.label}
              <ArrowUpRight className="size-3.5" />
            </a>
          ))}
          {pacingHref && (
            <Link
              href={pacingHref}
              className={cn(
                buttonVariants({ size: "sm", variant: racepasses.length > 0 ? "outline" : "default" }),
              )}
            >
              <Gauge className="size-3.5" />
              Pacingplan
            </Link>
          )}
          {signupUrl && (
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "sm", variant: pacingHref ? "outline" : "default" }),
              )}
            >
              Aanmelden op Zwift
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      )}
      <RaceLinkChips links={zwiftLinks} />
      <RaceLinkChips links={links} />
    </section>
  );
}
