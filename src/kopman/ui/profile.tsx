import { useId } from "react";
import type { Course } from "../engine/types";
import styles from "./kopman.module.css";

const INK = "#1b1712";
const FEATURE_FILL = { klim: "rgb(255 197 61 / 0.42)", kasseien: "rgb(176 106 52 / 0.32)", grind: "rgb(196 160 78 / 0.34)" } as const;

export type Marker = { distance: number; color: string; size: number; mine?: boolean };
/** Board sectors: dividers, and the current one lit. */
export type Band = { start: number; end: number; active?: boolean };

/** The course drawn as a strip landscape, with climbs, cobbles and gravel marked, and optionally the riders on it. */
export function Profile({ course, markers = [], height = 120, bands = [] }: { course: Course; markers?: Marker[]; height?: number; bands?: Band[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const dots = `pd${uid}`;
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
      <defs>
        <pattern id={dots} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={3} cy={3} r={1.25} fill="#7f9f6c" />
        </pattern>
      </defs>
      <path d={area} fill="#a9c58f" />
      <path d={area} fill={`url(#${dots})`} />
      {course.features.map((f) => (
        <rect key={`${f.name}-${f.start}`} x={x(f.start)} y={0} width={Math.max(2, x(f.end) - x(f.start))} height={height} fill={FEATURE_FILL[f.kind]} />
      ))}
      {bands.filter((b) => b.active).map((b) => <rect key={`a${b.start}`} x={x(b.start)} y={0} width={x(b.end) - x(b.start)} height={height} fill="rgb(255 250 240 / 0.55)" />)}
      {bands.slice(1).map((b) => <line key={`l${b.start}`} x1={x(b.start)} x2={x(b.start)} y1={0} y2={height} stroke={INK} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.55} />)}
      <path d={`M${points.join(" L")}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {markers.map((m, i) => (
        <circle key={i} cx={x(Math.max(0, Math.min(course.length, m.distance)))} cy={y(elevAt(m.distance)) - 4 - (m.mine ? 4 : 0)} r={m.size} fill={m.color} stroke={INK} strokeWidth={m.mine ? 2 : 1.5} />
      ))}
    </svg>
  );
}
