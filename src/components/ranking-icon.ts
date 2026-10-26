import {
  CalendarCheck,
  Clock,
  Gem,
  House,
  type LucideIcon,
  Mountain,
  RefreshCw,
  Route,
  Sun,
  Timer,
  Users,
} from "lucide-react";
import type { RankingIcon } from "@/lib/rankings/rankings";

/** Het icoon per ranglijst, voor ZWB Rankings en Rider of the month. */
export const RANKING_ICONS: Record<RankingIcon, LucideIcon> = {
  clock: Clock,
  route: Route,
  mountain: Mountain,
  refresh: RefreshCw,
  timer: Timer,
  sun: Sun,
  home: House,
  calendar: CalendarCheck,
  users: Users,
  gem: Gem,
};
