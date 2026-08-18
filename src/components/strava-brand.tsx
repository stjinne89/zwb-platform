/* eslint-disable @next/next/no-img-element -- de officiële Strava-logo's zijn
   SVG's die niet door de image-optimizer heen mogen; next/image zou ze anders
   opnieuw encoderen en dat is een bewerking die de guidelines verbieden. */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Merkonderdelen uit de Strava API Brand Guidelines
 * (https://developers.strava.com/guidelines/). Strava keurt API-aanvragen af
 * als die regels niet zichtbaar zijn nageleefd, dus:
 *
 * - de logo's in /public/strava zijn de officiële bestanden en mogen alleen
 *   geschaald worden — niet hergekleurd, bijgesneden of geanimeerd;
 * - elk scherm dat Strava-data toont, hoort een <PoweredByStrava /> te dragen;
 * - elke verwijzing naar de bronactiviteit gaat via <ViewOnStrava />. De tekst
 *   blijft bewust Engels: "View on Strava" is de voorgeschreven formulering;
 * - koppelen gebeurt met <ConnectWithStrava />, nooit met een eigen knop.
 */

export function PoweredByStrava({ className }: { className?: string }) {
  return (
    <a
      href="https://www.strava.com"
      target="_blank"
      rel="noopener noreferrer"
      // De guidelines eisen dat het Strava-logo losstaat van onze eigen
      // branding en er niet prominenter uitziet, vandaar de bescheiden maat
      // onderaan een sectie.
      className={cn("inline-block shrink-0", className)}
    >
      <img
        src="/strava/powered-by-strava-orange.svg"
        alt="Powered by Strava"
        className="h-5 w-auto dark:hidden"
      />
      <img
        src="/strava/powered-by-strava-white.svg"
        alt="Powered by Strava"
        className="hidden h-5 w-auto dark:block"
      />
    </a>
  );
}

/**
 * Zet het merk onderaan een sectie of pagina die Strava-data toont.
 */
export function StravaAttribution({ className }: { className?: string }) {
  return (
    <div className={cn("mt-3 flex justify-end", className)}>
      <PoweredByStrava />
    </div>
  );
}

export function ConnectWithStrava({
  className,
  reconnect = false,
  size = "default",
}: {
  className?: string;
  /** Bij een scope-uitbreiding koppelt het lid opnieuw met dezelfde knop. */
  reconnect?: boolean;
  /**
   * "compact" is h-7 en staat daarmee gelijk met buttonVariants({ size: "sm" }),
   * voor rijen waar de knop naast gewone knoppen staat. Schalen mag van de
   * guidelines; hertinten of bijsnijden niet.
   */
  size?: "default" | "compact";
}) {
  return (
    <Link
      href="/api/strava/connect"
      className={cn("inline-block shrink-0", className)}
      aria-label={reconnect ? "Opnieuw koppelen met Strava" : "Koppel met Strava"}
    >
      <img
        src="/strava/connect-with-strava-orange.svg"
        alt={reconnect ? "Opnieuw koppelen met Strava" : "Connect with Strava"}
        className={cn("w-auto", size === "compact" ? "h-7" : "h-12")}
      />
    </Link>
  );
}

/**
 * De guidelines vragen dat de link naar de bronactiviteit herkenbaar is door
 * vet, onderstreping óf Strava-oranje. Dat is een keuze uit drie, dus we
 * houden het bij vet in de grijstint van de app — rustiger dan oranje, en nog
 * steeds conform. De tekst zelf ligt wél vast en blijft daarom Engels.
 */
const VIEW_ON_STRAVA_CLASS =
  "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-muted-foreground";

export function ViewOnStrava({
  activityId,
  className,
}: {
  activityId: number | string;
  className?: string;
}) {
  return (
    <a
      href={`https://www.strava.com/activities/${activityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(VIEW_ON_STRAVA_CLASS, "transition hover:text-foreground", className)}
    >
      View on Strava
      <ArrowUpRight className="size-3" />
    </a>
  );
}

/**
 * Zelfde tekst, maar als span — voor rijen die zelf al één grote link naar de
 * activiteit zijn. Een <a> in een <a> is ongeldige HTML.
 */
export function ViewOnStravaLabel({ className }: { className?: string }) {
  return (
    <span className={cn(VIEW_ON_STRAVA_CLASS, className)}>
      View on Strava
      <ArrowUpRight className="size-3" />
    </span>
  );
}
