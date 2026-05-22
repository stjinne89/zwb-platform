import {
  Activity,
  Award,
  Bike,
  CalendarDays,
  Camera,
  Clock,
  CloudRain,
  Coffee,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Gauge,
  HandHeart,
  HeartHandshake,
  Map,
  Medal,
  Moon,
  Mountain,
  Navigation,
  RefreshCw,
  Route,
  Snowflake,
  Sunrise,
  Sunset,
  Trophy,
  Users,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeIcon = "mountain" | "route" | "heart" | "refresh" | string | null | undefined;
type BadgeColor =
  | "gold"
  | "petrol"
  | "sage"
  | "steel"
  | "bronze"
  | "silver"
  | "platinum"
  | string
  | null
  | undefined;
type BadgeSize = "sm" | "md" | "lg";

const iconMap: Record<string, LucideIcon> = {
  mountain: Mountain,
  route: Route,
  heart: HeartHandshake,
  refresh: RefreshCw,
  activity: Activity,
  award: Award,
  bike: Bike,
  calendar: CalendarDays,
  camera: Camera,
  clock: Clock,
  coffee: Coffee,
  compass: Compass,
  crown: Crown,
  dumbbell: Dumbbell,
  flame: Flame,
  gauge: Gauge,
  hand: HandHeart,
  map: Map,
  medal: Medal,
  moon: Moon,
  navigation: Navigation,
  rain: CloudRain,
  snow: Snowflake,
  sunrise: Sunrise,
  sunset: Sunset,
  trophy: Trophy,
  users: Users,
  waves: Waves,
  wind: Wind,
  wrench: Wrench,
  zap: Zap,
};

const SIZE_PX: Record<BadgeSize, number> = {
  sm: 28,
  md: 44,
  lg: 64,
};

/**
 * ZWB achievement-medaille: gouden ring, petrol-kern, drie chevrons subtiel
 * bovenaan, achievement-icoon centraal, glimm-highlight links-boven.
 * Krijgt z'n betekenis via title (hover/tap).
 */
export function AchievementBadge({
  title,
  icon,
  color,
  size = "md",
  count,
  compact,
  locked,
}: {
  title: string;
  icon?: BadgeIcon;
  color?: BadgeColor;
  size?: BadgeSize;
  count?: number;
  /** Backwards-compat met oude compact-prop → mapped naar size="sm". */
  compact?: boolean;
  /**
   * Locked-state: medaille wordt sterk gedimd weergegeven om "nog niet
   * behaald" aan te duiden. Gebruikt voor de Badge-kast op /profiel.
   */
  locked?: boolean;
}) {
  const effectiveSize: BadgeSize = compact ? "sm" : size;
  const px = SIZE_PX[effectiveSize];
  const IconComp = iconMap[(icon ?? "refresh") as keyof typeof iconMap] ?? RefreshCw;

  // Onique key voor SVG-id zodat meerdere medailles op één pagina niet
  // hun gradients delen (zou clipping breken in sommige browsers).
  const uid = `${(icon ?? "refresh")}-${color ?? "default"}-${effectiveSize}`;

  // Accent-tint van de buitenring: per kleur een net andere goud-shade
  // zodat verschillende badge-types subtiel te onderscheiden zijn.
  const accent = ringAccent(color);

  return (
    <div
      className={cn(
        "relative inline-block leading-none transition-all",
        locked && "opacity-40 grayscale",
      )}
      style={{ width: px, height: px }}
      title={locked ? `${title} - nog niet behaald` : title}
      aria-label={locked ? `${title} (nog niet behaald)` : title}
      role="img"
    >
      <svg
        viewBox="0 0 100 100"
        className="block h-full w-full drop-shadow-sm"
        aria-hidden
      >
        <defs>
          {/* Buitenring met goudgradient */}
          <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent.light} />
            <stop offset="45%" stopColor={accent.mid} />
            <stop offset="100%" stopColor={accent.dark} />
          </linearGradient>
          {/* Binnen-petrol */}
          <radialGradient id={`center-${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#2d5564" />
            <stop offset="100%" stopColor="#0f2a32" />
          </radialGradient>
          {/* Glimm-highlight links-boven */}
          <radialGradient id={`shine-${uid}`} cx="32%" cy="28%" r="42%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Subtiele schaduw onderaan */}
          <radialGradient id={`shadow-${uid}`} cx="50%" cy="80%" r="40%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Buitenring (goud) */}
        <circle cx="50" cy="50" r="48" fill={`url(#gold-${uid})`} />
        {/* Smalle donkere binnenrand voor diepte */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        {/* Petrol kern */}
        <circle cx="50" cy="50" r="41" fill={`url(#center-${uid})`} />
        {/* Schaduw onderaan voor diepte */}
        <circle cx="50" cy="50" r="41" fill={`url(#shadow-${uid})`} />

        {/* ZWB-chevrons subtiel bovenin */}
        <g transform="translate(30, 17) scale(0.20)" opacity="0.7">
          <polygon points="20,10 65,10 50,65 5,65" fill={accent.light} />
          <polygon points="75,10 120,10 105,65 60,65" fill="#7e9aa1" />
          <polygon points="130,10 175,10 160,65 115,65" fill="#0e1a1f" />
        </g>

        {/* Glimm-highlight */}
        <circle cx="50" cy="50" r="48" fill={`url(#shine-${uid})`} pointerEvents="none" />
      </svg>

      {/* Achievement-icoon centraal (Lucide-component over de SVG heen). */}
      <span
        className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2"
        style={{ color: accent.light }}
      >
        <IconComp
          style={{ width: px * 0.4, height: px * 0.4 }}
          strokeWidth={2.4}
          absoluteStrokeWidth
        />
      </span>

      {/* Multiplier-bubble (alleen tonen als >1). */}
      {count !== undefined && count > 1 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-primary font-bold leading-none text-primary-foreground shadow-sm tabular-nums",
            effectiveSize === "sm"
              ? "h-4 min-w-4 px-1 text-[0.6rem]"
              : "h-5 min-w-5 px-1.5 text-[0.65rem]",
          )}
        >
          {count}×
        </span>
      )}
    </div>
  );
}

/** Per ondersteunde kleur een net andere ring-tint voor de buitenring. */
function ringAccent(color: BadgeColor) {
  switch (color) {
    case "bronze":
      return { light: "#e0a878", mid: "#b06d3a", dark: "#5d3517" };
    case "silver":
      return { light: "#e8e8ec", mid: "#a8a8b2", dark: "#5a5a64" };
    case "gold":
      return { light: "#f3d68a", mid: "#d4a84e", dark: "#8a6429" };
    case "platinum":
      return { light: "#dde6ec", mid: "#a8b8c4", dark: "#5d6c76" };
    case "petrol":
      return { light: "#d2c389", mid: "#a08550", dark: "#604725" };
    case "sage":
      return { light: "#dccfa1", mid: "#b09975", dark: "#6f5c3d" };
    case "steel":
    default:
      return { light: "#e8d599", mid: "#b89968", dark: "#7c5e30" };
  }
}
