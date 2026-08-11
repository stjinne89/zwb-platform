const NUMERIC_ZWIFT_ID = /^\d+$/;

type ExternalSite = {
  key: string;
  name: string;
  href: string;
};

/**
 * ZwiftPower en ZwiftRacing.app werken beide met het numerieke Zwift-ID.
 * Staat er iets anders in het profielveld, dan levert dit geen links op.
 */
export function zwiftExternalProfiles(
  zwiftId: string | null | undefined,
): ExternalSite[] {
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

function SiteMark({ site }: { site: string }) {
  if (site === "zwiftpower") {
    return (
      <span
        aria-hidden
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#fc6719] text-[10px] font-black tracking-tight text-white"
      >
        ZP
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#1f2b3a] text-[10px] font-black tracking-tight text-[#f43f5e]"
    >
      ZR
    </span>
  );
}

export function ZwiftExternalLinks({
  zwiftId,
  className,
}: {
  zwiftId: string | null | undefined;
  className?: string;
}) {
  const sites = zwiftExternalProfiles(zwiftId);
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
