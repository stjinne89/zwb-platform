"use client";

// De inhoud van de popup bij een aangeklikt blok: wie is hier geweest, in
// volgorde van wie er als eerste was.

import Link from "next/link";

export type Rider = {
  id: string;
  name: string;
  avatar: string | null;
  since: string;
};

/** Zelfde initialen-fallback als de ledenlijst. */
function initials(name: string): string {
  const parts = name
    .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function BlockRiders({
  riders,
  loading,
}: {
  riders: Rider[] | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Laden…</p>;
  }
  if (!riders || riders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Hier is nog niemand geweest.
      </p>
    );
  }

  return (
    <div className="min-w-[13rem]">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {riders.length === 1 ? "1 lid" : `${riders.length} leden`}
      </p>
      <ul className="space-y-1.5">
        {riders.map((rider) => (
          <li key={rider.id} className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {rider.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rider.avatar}
                  alt=""
                  width={28}
                  height={28}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials(rider.name)
              )}
            </span>
            <span className="min-w-0">
              <Link
                href={`/leden/${rider.id}`}
                className="block truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {rider.name}
              </Link>
              <span className="block text-[11px] text-muted-foreground">
                sinds {dateFmt.format(new Date(rider.since))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
