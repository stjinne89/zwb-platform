import type { Course, CourseId } from "./types";

export const COURSES: Record<CourseId, Course> = {
  polder: {
    id: "polder", name: "Polderkoers", subtitle: "Wind op kop. Alles op de sprint.", color: "#d2a95f", length: 10000,
    segments: [{ end: 2200, grade: 0, wind: 0.3 }, { end: 4300, grade: 0.008, wind: 1 }, { end: 6200, grade: -0.008, wind: -0.2 }, { end: 8000, grade: 0, wind: 0.8 }, { end: 10000, grade: 0, wind: 0.1 }],
  },
  ardennen: {
    id: "ardennen", name: "Ardennenjacht", subtitle: "Korte hellingen. Lange adem.", color: "#8fc4cc", length: 9000,
    segments: [{ end: 1800, grade: 0, wind: 0.2 }, { end: 2900, grade: 0.045, wind: 0.1 }, { end: 4100, grade: -0.04, wind: 0 }, { end: 5400, grade: 0.055, wind: 0.3 }, { end: 6800, grade: -0.035, wind: 0 }, { end: 7900, grade: 0.02, wind: 0.4 }, { end: 9000, grade: 0, wind: 0.1 }],
  },
  alpen: {
    id: "alpen", name: "Alpenfinale", subtitle: "Spaar in het dal. Win op de top.", color: "#eef2ee", length: 7800,
    segments: [{ end: 2200, grade: 0, wind: 0.4 }, { end: 3500, grade: 0.025, wind: 0.2 }, { end: 4400, grade: -0.035, wind: 0 }, { end: 6200, grade: 0.055, wind: 0.1 }, { end: 7800, grade: 0.07, wind: 0.1 }],
  },
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
