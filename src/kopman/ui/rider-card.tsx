import { Bike, Gauge, Mountain, Shield, Zap } from "lucide-react";
import { STAT_SHORT, TIER_LABELS, TYPE_LABELS } from "../engine/cards";
import { STAT_KEYS, type RiderCard, type RiderType } from "../engine/types";
import styles from "./kopman.module.css";

export const TYPE_ICONS: Record<RiderType, typeof Zap> = { sprinter: Zap, klimmer: Mountain, klassieker: Shield, tijdrijder: Gauge, allrounder: Bike };

export function RiderCardView({ card, kopman, fit, small, children }: { card: RiderCard; kopman?: boolean; fit?: number; small?: boolean; children?: React.ReactNode }) {
  const Icon = TYPE_ICONS[card.type];
  return (
    <div className={`${styles.card} ${styles[card.tier]} ${small ? styles.cardSmall : ""}`} aria-label={`${card.first} ${card.last}, ${TYPE_LABELS[card.type]}, ${TIER_LABELS[card.tier]} ${card.overall}`}>
      {kopman ? <span className={styles.kopmanMark}>KOPMAN</span> : null}
      <div className={styles.cardTop}>
        <span className={styles.overall}>{card.overall}</span>
        <span className={styles.cardMeta}><Icon size={small ? 14 : 16} aria-hidden />{card.country}</span>
      </div>
      <div className={styles.cardName}><small>{card.first}</small><strong>{card.last}</strong></div>
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
