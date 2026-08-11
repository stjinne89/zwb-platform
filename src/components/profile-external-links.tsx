const NUMERIC_ZWIFT_ID = /^\d+$/;
const STRAVA_HANDLE = /^[A-Za-z0-9._-]+$/;

type ExternalSite = {
  key: "zwiftpower" | "zwiftracing" | "strava";
  name: string;
  href: string;
};

/**
 * ZwiftPower en ZwiftRacing.app werken beide met het numerieke Zwift-ID.
 * Staat er iets anders in het profielveld, dan levert dit geen links op.
 */
function zwiftSites(zwiftId: string | null | undefined): ExternalSite[] {
  const id = (zwiftId ?? "").trim();
  if (!NUMERIC_ZWIFT_ID.test(id)) return [];
  return [
    {
      key: "zwiftpower",
      name: "ZwiftPower",
      href: `https://zwiftpower.com/profile.php?z=${id}`,
    },
    {
      key: "zwiftracing",
      name: "ZwiftRacing.app",
      href: `https://www.zwiftracing.app/riders/${id}`,
    },
  ];
}

/**
 * Strava accepteert zowel het atletennummer als de gebruikersnaam in de URL.
 * Een geplakte profiel-URL of een @-prefix wordt teruggebracht tot de handle;
 * alles met spaties of rare tekens levert geen link op.
 */
function stravaSite(stravaId: string | null | undefined): ExternalSite[] {
  let handle = (stravaId ?? "").trim();
  const pasted = handle.match(/strava\.com\/athletes\/([^/?#]+)/i);
  if (pasted) handle = pasted[1];
  handle = handle.replace(/^@/, "");
  if (!STRAVA_HANDLE.test(handle)) return [];
  return [
    {
      key: "strava",
      name: "Strava",
      href: `https://www.strava.com/athletes/${handle}`,
    },
  ];
}

const MARKS: Record<ExternalSite["key"], { label: string; className: string }> = {
  zwiftpower: { label: "ZP", className: "bg-[#fc6719] text-white" },
  zwiftracing: { label: "ZR", className: "bg-[#1f2b3a] text-[#f43f5e]" },
  strava: { label: "S", className: "bg-[#fc4c02] text-white" },
};

function SiteMark({ site }: { site: ExternalSite["key"] }) {
  const mark = MARKS[site];
  return (
    <span
      aria-hidden
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black tracking-tight ${mark.className}`}
    >
      {mark.label}
    </span>
  );
}

export function ProfileExternalLinks({
  zwiftId,
  stravaId,
  className,
}: {
  zwiftId?: string | null;
  stravaId?: string | null;
  className?: string;
}) {
  const sites = [...zwiftSites(zwiftId), ...stravaSite(stravaId)];
  if (sites.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {sites.map((site) => (
        <a
          key={site.key}
          href={site.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${site.name} openen`}
          className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 text-sm font-medium hover:bg-accent"
        >
          <SiteMark site={site.key} />
          {site.name}
        </a>
      ))}
    </div>
  );
}
