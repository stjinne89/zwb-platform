import { Bike, Gauge, Mountain, Shield, Zap } from "lucide-react";
import { STAT_SHORT, TIER_LABELS, TYPE_LABELS } from "../engine/cards";
import { STAT_KEYS, type RiderCard, type RiderType } from "../engine/types";
import styles from "./kopman.module.css";
import { Portrait, type Mood } from "./portrait";

export const TYPE_ICONS: Record<RiderType, typeof Zap> = { sprinter: Zap, klimmer: Mountain, klassieker: Shield, tijdrijder: Gauge, allrounder: Bike };

function FrameStar({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-10 -10 20 20" aria-hidden="true" focusable="false">
      <path d="M0 -9 Q1.6 -1.6 9 0 Q1.6 1.6 0 9 Q-1.6 1.6 -9 0 Q-1.6 -1.6 0 -9Z" fill="#ffe14d" stroke="#1b1712" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A rider card as an album plate: the portrait is the plate, the name is the
 * caption. `live` keeps the portrait moving; otherwise it only moves on hover.
 */
export function RiderCardView({ card, kopman, fit, small, mood = "rust", live = false, children }: { card: RiderCard; kopman?: boolean; fit?: number; small?: boolean; mood?: Mood; live?: boolean; children?: React.ReactNode }) {
  const Icon = TYPE_ICONS[card.type];
  return (
    <div className={`${styles.card} ${styles[card.tier]} ${small ? styles.cardSmall : ""}`} aria-label={`${card.first} ${card.last}, ${TYPE_LABELS[card.type]}, ${TIER_LABELS[card.tier]} ${card.overall}`}>
      <div className={styles.plate}>
        <Portrait card={card} mood={mood} live={live} />
        <span className={styles.overall}>{card.overall}</span>
        <span className={styles.cardMeta}><Icon size={small ? 11 : 13} aria-hidden />{small ? null : card.country}</span>
      </div>
      {card.tier === "goud" ? (
        <>
          <FrameStar className={`${styles.frameStar} ${styles.frameStarA}`} />
          <FrameStar className={`${styles.frameStar} ${styles.frameStarB}`} />
        </>
      ) : null}
      <div className={styles.cardName}>
        {kopman ? <span className={styles.kopmanMark}>Kopman</span> : null}
        <small>{card.first}</small>
        <strong>{card.last}</strong>
      </div>
      {fit !== undefined ? <span className={styles.fit} title="Past bij deze koers">{fit}</span> : null}
      {small ? null : (
        <div className={styles.stats}>
          {STAT_KEYS.map((k) => <div key={k}><span>{STAT_SHORT[k]}</span><b>{card.stats[k]}</b></div>)}
        </div>
      )}
      {children}
    </div>
  );
}
