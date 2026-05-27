import Link from "next/link";
import Image from "next/image";
export type SponsorCardData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description_md: string | null;
  tier: "hoofd" | "sub" | "team" | "web" | "vriend";
};

const TIER_SIZES: Record<SponsorCardData["tier"], string> = {
  hoofd: "min-h-32 sm:min-h-44",
  sub: "min-h-28 sm:min-h-36",
  team: "min-h-24 sm:min-h-32",
  web: "min-h-20 sm:min-h-28",
  vriend: "min-h-16 sm:min-h-20",
};

const TIER_TEXT: Record<SponsorCardData["tier"], string> = {
  hoofd: "text-2xl sm:text-3xl",
  sub: "text-xl sm:text-2xl",
  team: "text-lg sm:text-xl",
  web: "text-base sm:text-lg",
  vriend: "text-sm",
};

function Initials({ name }: { name: string }) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "");
  return <span>{parts.join("")}</span>;
}

export function SponsorCard({ sponsor }: { sponsor: SponsorCardData }) {
  const sizeClass = TIER_SIZES[sponsor.tier];
  const textClass = TIER_TEXT[sponsor.tier];

  const showFallbackName = !sponsor.logo_url;

  const inner = (
    <div
      className={`group flex h-full flex-col items-center justify-center rounded-lg border bg-card p-4 transition hover:border-foreground/40 hover:shadow-md ${sizeClass}`}
    >
      <div className="flex flex-1 items-center justify-center">
        {sponsor.logo_url ? (
          <Image
            src={sponsor.logo_url}
            alt={`Logo ${sponsor.name}`}
            width={240}
            height={120}
            className="max-h-24 w-auto object-contain sm:max-h-32"
            unoptimized
          />
        ) : (
          <div
            className={`flex aspect-square h-16 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground sm:h-20 ${textClass}`}
          >
            <Initials name={sponsor.name} />
          </div>
        )}
      </div>
      {showFallbackName && (
        <p className={`mt-3 text-center font-semibold ${textClass}`}>
          {sponsor.name}
        </p>
      )}
    </div>
  );

  if (sponsor.website_url) {
    return (
      <Link
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Bezoek website van ${sponsor.name}`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
