import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { bokaalFontVariables } from "./fonts";
import styles from "./bokaal.module.css";

const PAGES = [
  { href: "/voorzpwelbokaal", label: "Bord" },
  { href: "/voorzpwelbokaal/briefjes", label: "Briefjes" },
  { href: "/voorzpwelbokaal/lei", label: "De lei" },
] as const;

/** De cafémuur met het emaille bord; elke pagina van voorZpWelBokaal hangt hieraan. */
export function BokaalShell({ active, canManage = false, children }: { active: string; canManage?: boolean; children: ReactNode }) {
  const pages = canManage ? [...PAGES, { href: "/voorzpwelbokaal/beheer", label: "Beheer" }] : PAGES;
  return (
    <div className={cn(styles.root, bokaalFontVariables)}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.sign}>
            <h1>
              voor<b>Z</b>p<b>W</b>el<wbr />
              <b>B</b>okaal
            </h1>
          </div>
          <nav className={styles.nav} aria-label="voorZpWelBokaal">
            {pages.map((page) => (
              <Link key={page.href} href={page.href} aria-current={page.href === active ? "page" : undefined}>
                {page.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}

const RINGS = [
  "M10,27 C9,11 35,5 55,6 C81,7 95,16 93,29 C91,42 65,47 45,45 C22,43 6,37 9,24 C11,16 23,10 32,9",
  "M88,20 C80,7 50,4 32,7 C13,10 5,21 8,32 C11,43 38,47 58,45 C80,43 95,34 92,22 C90,14 80,9 70,8",
];

/** Een krijtcirkel rond een aangetikte quotering of antwoord. */
export function ChalkRing({ variant = 0, draw = false, placed = false }: { variant?: number; draw?: boolean; placed?: boolean }) {
  return (
    <svg
      className={cn(styles.ring, draw && styles.ringDraw, placed && styles.ringPlaced)}
      viewBox="0 0 100 52"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path pathLength={1} d={RINGS[variant % 2]} />
    </svg>
  );
}

/** Een krijtstreep onder de actieve tab. */
export function ChalkUnderline() {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2,6 C20,3 40,8 60,5 S90,4 98,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Het rek met ZWBallen; toont er hoogstens tien. */
export function BallRack({ free, label }: { free: number; label: string }) {
  const shown = Math.max(0, Math.min(10, Math.floor(free)));
  return (
    <div className={styles.rack} aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={cn(styles.ball, i >= shown && styles.spent)} />
      ))}
      <span className={styles.rackLabel}>{label}</span>
    </div>
  );
}
