import {
  Bike,
  Caravan,
  CarFront,
  CloudRain,
  Flag,
  Dumbbell,
  Gauge,
  Lightbulb,
  Luggage,
  MonitorPlay,
  MountainSnow,
  Package,
  Route,
  Ruler,
  Tent,
  Trophy,
  Users,
  Watch,
  Wrench,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import type { TopicKind } from "@/lib/zwbieb/topics";
import { cn } from "@/lib/utils";

// Het icoon van een onderwerp van ZWBieb: een vierkant in de tenuekleur van
// zijn groep, met de schuine baan van het tenue erdoor (globals.css,
// .topic-badge). Lucide waar het een passend icoon heeft; schema, bidon en band
// zijn zelf getekend, in dezelfde lijn.
//
// Groep en icoon horen bij de startlijst (src/lib/zwbieb/topics.ts en 0242).
// Een onderwerp dat een lid zelf toevoegt, heeft er geen: dat krijgt een lamp
// (kennis) of een doos (spullen), in de kleur van materiaal. Spullen staan
// altijd in die kleur.

type Group = "rijden" | "trainen" | "materiaal";

const GROUPS: Record<string, Group> = {
  "zwift-racen": "rijden",
  "zwift-setup": "materiaal",
  vermogensmeters: "trainen",
  "trainen-met-schema": "trainen",
  "data-apps": "trainen",
  "voeding-onderweg": "trainen",
  "kracht-core": "trainen",
  bikefit: "materiaal",
  sleutelen: "materiaal",
  "banden-tubeless": "materiaal",
  gravel: "rijden",
  "bergen-cols": "rijden",
  groepsrijden: "rijden",
  toertochten: "rijden",
  "kleding-weer": "materiaal",
  // 0282: racen buiten, naast zwift-racen op de racetips.
  wegracen: "rijden",
};

type Icon = ComponentType<LucideProps>;

/** Een schema als blokken: de trapjeslijn van een intervaltraining. */
function Intervals(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 19h4v-6h3v6h3V6h3v13h3v-9h4" />
    </svg>
  );
}

/** Een bidon: tuit, dop en een fles met een taille. */
function Bidon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M11 2h2v2h-2z" />
      <rect x="8" y="4" width="8" height="3" rx="1" />
      <path d="M8.5 7 8 11.5q1 1.5 0 3V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5.5q-1-1.5 0-3L15.5 7" />
    </svg>
  );
}

/** Een band met profiel: buitenband, velg en noppen ertussen. */
function Tire(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  );
}

const ICONS: Record<string, Icon> = {
  "zwift-racen": Trophy,
  "zwift-setup": MonitorPlay,
  vermogensmeters: Gauge,
  "trainen-met-schema": Intervals,
  "data-apps": Watch,
  "voeding-onderweg": Bidon,
  "kracht-core": Dumbbell,
  bikefit: Ruler,
  sleutelen: Wrench,
  "banden-tubeless": Tire,
  gravel: Tent,
  "bergen-cols": MountainSnow,
  groepsrijden: Users,
  toertochten: Route,
  "kleding-weer": CloudRain,
  wegracen: Flag,
  fietskoffer: Luggage,
  momentsleutel: Wrench,
  fietsendrager: Bike,
  "dakdrager-zuignap": CarFront,
  werkstandaard: Wrench,
  camper: Caravan,
};


const SIZES = {
  sm: "size-6 [&>svg]:size-3.5",
  md: "size-9 [&>svg]:size-5",
  lg: "size-12 [&>svg]:size-6",
} as const;

export function TopicIcon({
  slug,
  kind,
  className,
}: {
  slug: string;
  kind?: TopicKind;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? (kind === "spullen" ? Package : Lightbulb);
  return <Icon aria-hidden strokeWidth={1.75} className={className} />;
}

export function TopicBadge({
  slug,
  kind,
  size = "md",
  className,
}: {
  slug: string;
  kind?: TopicKind;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? (kind === "spullen" ? Package : Lightbulb);
  return (
    <span
      aria-hidden
      className={cn(
        "topic-badge",
        `topic-${kind === "spullen" ? "materiaal" : (GROUPS[slug] ?? "materiaal")}`,
        SIZES[size],
        className,
      )}
    >
      <Icon strokeWidth={size === "sm" ? 2 : 1.75} />
    </span>
  );
}
