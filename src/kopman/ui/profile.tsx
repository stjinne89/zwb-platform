import type { Course } from "../engine/types";
import styles from "./kopman.module.css";

export type Marker = { distance: number; color: string; size: number; mine?: boolean };

/** The course as an elevation profile, with climbs, cobbles and gravel marked, and optionally the riders on it. */
export function Profile({ course, markers = [], height = 120 }: { course: Course; markers?: Marker[]; height?: number }) {
  const width = 600;
  const min = Math.min(...course.elevation);
  const max = Math.max(...course.elevation);
  const range = Math.max(150, max - min);
  const pad = 18;
  const x = (d: number) => (d / course.length) * width;
  const y = (e: number) => height - 4 - ((e - min) / range) * (height - pad - 8);
  const step = Math.max(1, Math.floor(course.elevation.length / 300));
  const points = course.elevation.filter((_, i) => i % step === 0 || i === course.elevation.length - 1).map((e, i, arr) => `${x(i === arr.length - 1 ? course.length : i * step * 100)},${y(e)}`);
  const area = `M0,${height} L${points.join(" L")} L${width},${height} Z`;
  const elevAt = (d: number) => {
    const i = Math.min(course.elevation.length - 1, Math.max(0, Math.round(d / 100)));
    return course.elevation[i];
  };
  return (
    <svg className={styles.profile} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Profiel, ${Math.round(course.length / 1000)} km, ${Math.round(max - min)} m hoogteverschil`}>
      <path d={area} fill="#22374f" />
      {course.features.map((f) => (
        <rect key={`${f.name}-${f.start}`} x={x(f.start)} y={0} width={Math.max(2, x(f.end) - x(f.start))} height={height} fill={f.kind === "klim" ? "rgb(255 197 61 / 0.12)" : f.kind === "kasseien" ? "rgb(201 138 85 / 0.32)" : "rgb(214 186 110 / 0.28)"} />
      ))}
      <path d={`M${points.join(" L")}`} fill="none" stroke="#7fb2e5" strokeWidth={2} />
      {markers.map((m, i) => (
        <circle key={i} cx={x(Math.max(0, Math.min(course.length, m.distance)))} cy={y(elevAt(m.distance)) - 4 - (m.mine ? 4 : 0)} r={m.size} fill={m.color} stroke={m.mine ? "#fff" : "rgb(0 0 0 / 0.5)"} strokeWidth={m.mine ? 2 : 1} />
      ))}
    </svg>
  );
}
