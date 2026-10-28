"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { BekerDesign } from "@/lib/zwbekers/design";
import { briljantSans, briljantSerif } from "@/components/briljant/fonts";
import { BekerIcon } from "./beker-icon";
import styles from "./zwbekers.module.css";

const TrophyScene = dynamic(() => import("./trophy-scene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Beker poetsen…</div>,
});

/** Eén beker op zijn sokkel in de galerij; zonder WebGL het plaatje. */
export function TrophyPreview({ design, className }: { design: BekerDesign; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${styles.root} ${briljantSerif.variable} ${briljantSans.variable} ${className ?? ""}`}>
      <div className={styles.preview}>
        {failed ? (
          <div className={styles.fallback}>
            <BekerIcon design={design} />
          </div>
        ) : (
          <TrophyScene design={design} onFailed={() => setFailed(true)} />
        )}
      </div>
    </div>
  );
}
