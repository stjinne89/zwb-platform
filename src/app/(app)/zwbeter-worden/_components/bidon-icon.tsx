import { cn } from "@/lib/utils";
import { bidonLabel } from "./bidon-options";

// Een bidon, hoger naarmate hij groter is: 500 ml klein, 1 l groot. Gevuld met
// sportdrank of met water, vol in de tekstkleur (de gekozen maat) of leeg.
// Zonder hooks, voor de server en de client.

const MIN_ML = 500;
const MAX_ML = 1000;

export function BidonIcon({
  ml,
  fill = "drank",
  className,
}: {
  ml: number;
  fill?: "drank" | "water" | "vol" | "leeg";
  className?: string;
}) {
  const share = Math.min(1, Math.max(0, (ml - MIN_ML) / (MAX_ML - MIN_ML)));
  const height = Math.round(22 + share * 12);
  return (
    <svg
      viewBox="0 0 20 40"
      width={height / 2}
      height={height}
      aria-hidden="true"
      className={cn(
        "shrink-0",
        fill === "drank" ? "text-primary" : fill === "water" ? "text-sky-400" : "text-current",
        className,
      )}
    >
      <rect x="8.5" y="0.5" width="3" height="3" rx="1" fill="currentColor" />
      <rect x="5" y="3.5" width="10" height="5" rx="1.5" fill="currentColor" opacity="0.7" />
      <path
        d="M3 10.5Q3 9 4.5 9H15.5Q17 9 17 10.5V18Q15.5 21 17 24V37Q17 39 15 39H5Q3 39 3 37V24Q4.5 21 3 18Z"
        fill="currentColor"
        fillOpacity={fill === "leeg" ? 0 : fill === "water" ? 0.35 : 0.85}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * De inhoud van een bidonknop: de bidon op zijn maat, met de maat eronder. De
 * drie bidons staan op één lijn, zodat je het verschil in grootte meteen ziet.
 */
export function BidonChoice({ ml, active }: { ml: number; active: boolean }) {
  return (
    <span className="flex flex-col items-center justify-end gap-1 self-stretch">
      <BidonIcon ml={ml} fill={active ? "vol" : "leeg"} />
      <span className="whitespace-nowrap leading-none">{bidonLabel(ml)}</span>
    </span>
  );
}
