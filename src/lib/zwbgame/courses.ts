import type { Course, CourseId } from "./types";

/**
 * Courses are built from tiles, in the style of a board-game track: each letter is
 * 250 m of road. Own layouts and names; nothing is copied from an existing game.
 *   v flat · w flat into a headwind · k climb · s steep climb · a descent · b feed zone
 */
export const TILE_METERS = 250;
const TILES: Record<string, { grade: number; wind: number }> = {
  v: { grade: 0, wind: 0.2 },
  w: { grade: 0, wind: 1 },
  k: { grade: 0.055, wind: 0.1 },
  s: { grade: 0.08, wind: 0 },
  a: { grade: -0.045, wind: 0 },
  b: { grade: 0, wind: 0.2 },
};
function build(id: CourseId, name: string, subtitle: string, color: string, icon: Course["icon"], tiles: string): Course {
  const segments: Course["segments"] = [];
  let previous = "";
  [...tiles].forEach((tile, i) => {
    const kind = tile === "b" ? "v" : tile;
    const end = (i + 1) * TILE_METERS;
    if (kind === previous) segments[segments.length - 1].end = end;
    else segments.push({ end, ...TILES[tile] });
    previous = kind;
  });
  const feed = tiles.indexOf("b");
  return { id, name, subtitle, color, icon, tiles, segments, length: tiles.length * TILE_METERS, feedAt: (feed < 0 ? Math.floor(tiles.length / 2) : feed) * TILE_METERS };
}

export const COURSES: Record<CourseId, Course> = {
  polder: build("polder", "Polderkoers", "Wind op kop. Alles op de sprint.", "#d2a95f", "wind", "vvwwwvbvvwwwvvvv"),
  ardennen: build("ardennen", "Ardennenjacht", "Korte hellingen. Lange adem.", "#8fc4cc", "hills", "vvkkavbvkkkavvv"),
  heuvelrug: build("heuvelrug", "Heuvelrug", "Eén klim. Daarna afdalen naar de sprint.", "#b8c98f", "hills", "vvwvkkkbaaavvvvv"),
  alpen: build("alpen", "Alpenfinale", "Spaar in het dal. Win op de top.", "#eef2ee", "mountain", "vvvvabvkkkksss"),
};
export function terrainAt(course: Course, distance: number) {
  return course.segments.find((segment) => distance < segment.end) ?? course.segments[course.segments.length - 1];
}
export function elevationAt(course: Course, distance: number) {
  let start = 0;
  let height = 0;
  for (const segment of course.segments) {
    height += Math.max(0, Math.min(distance, segment.end) - start) * segment.grade;
    start = segment.end;
  }
  return height;
}
