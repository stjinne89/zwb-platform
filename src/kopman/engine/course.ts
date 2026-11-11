import { STAT_KEYS, GRID, type Climb, type Course, type RaceDef, type RiderCard, type Stats } from "./types";
import { clamp, hashSeed, rng } from "./rng";
import { climbById, sectorById } from "./world";

const cache = new Map<string, Course>();

/** A climb only gets a descent when enough flat road follows; otherwise the race finishes (nearly) on top. */
const DESCENT_MIN_FLAT_KM = 2.5;

/**
 * The far side of a climb, for races that do not name one. Like a real descent it is
 * not the climb in reverse: it loses 70-100% of the height, mostly over a gentler and
 * longer road, and takes its length out of the flat road that follows.
 */
function descentAfter(def: RaceDef, index: number, climb: Climb, flatKm: number) {
  const random = rng(hashSeed("afdaling", def.id, index));
  const height = climb.km * 10 * climb.pct * (0.7 + random() * 0.3);
  let pct = clamp(climb.pct * (0.45 + random() * 0.45), 2.5, 9);
  let km = height / (pct * 10);
  const room = flatKm * 0.7;
  if (km > room) { km = room; pct = Math.min(9, height / (km * 10)); }
  return { km, pct };
}

/** Lays a race out on a 100 m grid: gradient, surface and elevation per cell. */
export function buildCourse(def: RaceDef): Course {
  const hit = cache.get(def.id);
  if (hit) return hit;
  const grades: number[] = [];
  const surfaces: Course["surfaces"] = [];
  const features: Course["features"] = [];
  const cells = (km: number) => Math.max(1, Math.round((km * 1000) / GRID));
  const descend = (km: number, pct: number) => {
    for (let i = 0, n = cells(km); i < n; i++) { grades.push(-pct / 100); surfaces.push("asfalt"); }
  };
  let carved = 0;
  def.items.forEach((item, index) => {
    const start = grades.length * GRID;
    if (item.kind === "vlak") {
      const n = cells(item.km - carved);
      carved = 0;
      // Gentle rolling roads, averaging flat.
      for (let i = 0; i < n; i++) { grades.push(0.006 * Math.sin((2 * Math.PI * (grades.length % 40)) / 40)); surfaces.push("asfalt"); }
    } else if (item.kind === "daal") {
      descend(item.km, item.pct);
    } else if (item.kind === "klim") {
      const climb = climbById.get(item.climb);
      if (!climb) throw new Error(`Onbekende klim: ${item.climb}`);
      const n = cells(climb.km);
      // Whole waves of steeper and easier ramps, so the average stays the real one.
      const waves = Math.max(1, Math.round(climb.km));
      for (let i = 0; i < n; i++) {
        grades.push((climb.pct / 100) * (1 + 0.22 * Math.sin((2 * Math.PI * waves * (i + 0.5)) / n)));
        surfaces.push(climb.surface ?? "asfalt");
      }
      features.push({ name: climb.name, start, end: grades.length * GRID, kind: "klim" });
      const next = def.items[index + 1];
      if (next?.kind === "vlak" && next.km >= DESCENT_MIN_FLAT_KM) {
        const down = descentAfter(def, index, climb, next.km);
        descend(down.km, down.pct);
        carved = down.km;
      }
    } else {
      const sector = sectorById.get(item.sector);
      if (!sector) throw new Error(`Onbekende sector: ${item.sector}`);
      const n = cells(sector.km);
      for (let i = 0; i < n; i++) { grades.push(0); surfaces.push(sector.surface); }
      features.push({ name: sector.name, start, end: grades.length * GRID, kind: sector.surface });
    }
  });
  const elevation = [40];
  for (const g of grades) elevation.push(elevation[elevation.length - 1] + g * GRID);
  const course: Course = { id: def.id, length: grades.length * GRID, grades, surfaces, elevation, features, tt: def.kind === "tijdrit" };
  cache.set(def.id, course);
  return course;
}

export const cellAt = (course: Course, distance: number) => clamp(Math.floor(distance / GRID), 0, course.grades.length - 1);
export const gradeAt = (course: Course, distance: number) => course.grades[cellAt(course, distance)];
export const surfaceAt = (course: Course, distance: number) => course.surfaces[cellAt(course, distance)];
export function elevationAt(course: Course, distance: number) {
  const i = cellAt(course, distance);
  return course.elevation[i] + course.grades[i] * (distance - i * GRID);
}

/** What a course asks of a rider: a weight per stat. */
export function courseWeights(course: Course): Stats {
  if (course.tt) return { vlak: 0.25, klim: 0.05, sprint: 0, tijdrit: 0.7, kasseien: 0, afdalen: 0 };
  let gain = 0, cobbles = 0, descent = 0;
  course.grades.forEach((g, i) => {
    if (g > 0.02) gain += g * GRID;
    if (course.surfaces[i] !== "asfalt") cobbles += GRID;
    if (g <= -0.03) descent += GRID;
  });
  const lastClimb = [...course.features].reverse().find((f) => f.kind === "klim");
  const uphill = lastClimb ? course.length - lastClimb.end < 2500 : false;
  const late = lastClimb ? course.length - lastClimb.end < 12000 : false;
  const hills = clamp(gain / 1600, 0, 1);
  const w: Stats = {
    vlak: 0.25,
    klim: 0.05 + hills * 0.7 + (uphill ? 0.15 : 0),
    sprint: uphill ? 0.05 : late ? 0.2 : 0.55 * (1 - hills),
    tijdrit: 0.05,
    kasseien: clamp(cobbles / 7000, 0, 1) * 0.55,
    afdalen: clamp(descent / 20000, 0, 1) * 0.2,
  };
  const total = STAT_KEYS.reduce((sum, k) => sum + w[k], 0);
  return Object.fromEntries(STAT_KEYS.map((k) => [k, w[k] / total])) as Stats;
}

/** How well a rider suits a course, on the same 0-99 scale as the stats. */
export function fitFor(card: RiderCard, weights: Stats) {
  return Math.round(STAT_KEYS.reduce((sum, k) => sum + card.stats[k] * weights[k], 0));
}

export function courseKind(course: Course) {
  const w = courseWeights(course);
  if (course.tt) return "Tijdrit";
  if (w.kasseien > 0.2) return "Kasseien";
  if (w.klim > 0.5) return "Bergop";
  if (w.klim > 0.25) return "Heuvels";
  return "Vlak";
}
