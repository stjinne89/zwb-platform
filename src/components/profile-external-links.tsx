import Link from "next/link";

// De logo's in public/logos/ komen van de sites zelf (favicon/logo) en staan
// lokaal, zodat we niets hotlinken.

const NUMERIC_ZWIFT_ID = /^\d+$/;
const STRAVA_HANDLE = /^[A-Za-z0-9._-]+$/;
const INTERVALS_ID = /^i\d+$/i;

type SiteKey = "zwiftpower" | "zwiftracing" | "strava" | "intervals";

type Site = {
  key: SiteKey;
  name: string;
  logo: string;
  /** Uitleg op /hulp voor wie het bijbehorende ID nog niet ingevuld heeft. */
  help: string;
  /** null zolang het ID ontbreekt of niet bruikbaar is voor een URL. */
  href: string | null;
};

/**
 * ZwiftPower en ZwiftRacing.app werken beide met het numerieke Zwift-ID.
 * Staat er iets anders in het profielveld, dan levert dat geen link op.
 */
function zwiftId(raw: string | null | undefined): string | null {
  const id = (raw ?? "").trim();
  return NUMERIC_ZWIFT_ID.test(id) ? id : null;
}

/**
 * Strava accepteert zowel het atletennummer als de gebruikersnaam in de URL.
 * Een geplakte profiel-URL of een @-prefix wordt teruggebracht tot de handle;
 * alles met spaties of rare tekens levert geen link op.
 */
function stravaHandle(raw: string | null | undefined): string | null {
  let handle = (raw ?? "").trim();
  const pasted = handle.match(/strava\.com\/athletes\/([^/?#]+)/i);
  if (pasted) handle = pasted[1];
  handle = handle.replace(/^@/, "");
  return STRAVA_HANDLE.test(handle) ? handle : null;
}

/**
 * intervals.icu gebruikt een athlete-ID in de vorm i141441. Een geplakte
 * profiel-URL wordt teruggebracht tot dat ID.
 */
function intervalsId(raw: string | null | undefined): string | null {
  let id = (raw ?? "").trim();
  const pasted = id.match(/intervals\.icu\/athlete\/([^/?#]+)/i);
  if (pasted) id = pasted[1];
  return INTERVALS_ID.test(id) ? id.toLowerCase() : null;
}

function buildSites({
  zwift,
  strava,
  intervals,
}: {
  zwift: string | null;
  strava: string | null;
  intervals: string | null;
}): Site[] {
  return [
    {
      key: "zwiftpower",
      name: "ZwiftPower",
      logo: "/logos/zwiftpower.png",
      help: "/hulp#zwift-id",
      href: zwift ? `https://zwiftpower.com/profile.php?z=${zwift}` : null,
    },
    {
      key: "zwiftracing",
      name: "ZwiftRacing.app",
      logo: "/logos/zwiftracing.png",
      help: "/hulp#zwift-id",
      href: zwift ? `https://www.zwiftracing.app/riders/${zwift}` : null,
    },
    {
      key: "strava",
      name: "Strava",
      logo: "/logos/strava.png",
      help: "/hulp#strava-id",
      href: strava ? `https://www.strava.com/athletes/${strava}` : null,
    },
    {
      key: "intervals",
      name: "intervals.icu",
      logo: "/logos/intervals.png",
      help: "/hulp#intervals-id",
      href: intervals ? `https://intervals.icu/athlete/${intervals}/activities` : null,
    },
  ];
}

const CHIP =
  "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium";

export function ProfileExternalLinks({
  zwiftId: zwiftIdRaw,
  stravaId,
  intervalsId: intervalsIdRaw,
  /**
   * Toont ontbrekende koppelingen als grijze knop naar /hulp. Alleen zinvol op
   * je eigen profiel — op andermans profiel valt er niets in te vullen.
   */
  showInactive = false,
  className,
}: {
  zwiftId?: string | null;
  stravaId?: string | null;
  intervalsId?: string | null;
  showInactive?: boolean;
  className?: string;
}) {
  const sites = buildSites({
    zwift: zwiftId(zwiftIdRaw),
    strava: stravaHandle(stravaId),
    intervals: intervalsId(intervalsIdRaw),
  }).filter((site) => site.href !== null || showInactive);

  if (sites.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {sites.map((site) =>
        site.href ? (
          <a
            key={site.key}
            href={site.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${site.name} openen`}
            className={`${CHIP} bg-background hover:bg-accent`}
          >
            <SiteLogo site={site} />
            {site.name}
          </a>
        ) : (
          <Link
            key={site.key}
            href={site.help}
            title={`${site.name} instellen`}
            className={`${CHIP} border-dashed bg-muted/40 text-muted-foreground hover:text-foreground`}
          >
            <SiteLogo site={site} inactive />
            {site.name}
          </Link>
        ),
      )}
    </div>
  );
}

function SiteLogo({ site, inactive }: { site: Site; inactive?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={site.logo}
      alt=""
      width={24}
      height={24}
      className={`size-6 shrink-0 rounded-md object-contain ${
        inactive ? "opacity-40 grayscale" : ""
      }`}
    />
  );
}
