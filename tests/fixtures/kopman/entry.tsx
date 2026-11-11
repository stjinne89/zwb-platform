import { createRoot } from "react-dom/client";
import { pool } from "../../../src/kopman/engine/cards";
import { ITEMS } from "../../../src/kopman/engine/items";
import { RIDER_TYPES } from "../../../src/kopman/engine/types";
import { ItemCardView, SlotTile } from "../../../src/kopman/ui/item-card";
import { KopmanApp } from "../../../src/kopman/ui/kopman-app";
import { faceOf, Portrait, type Mood } from "../../../src/kopman/ui/portrait";
import { RiderCardView } from "../../../src/kopman/ui/rider-card";
import styles from "../../../src/kopman/ui/kopman.module.css";
import "./reset.css";

const MOODS: Mood[] = ["rust", "aanval", "limiet", "zege"];

// `?portretten` shows a sheet of portraits in every mood, to judge them up close.
function PortraitSheet() {
  const riders = RIDER_TYPES.map((type, i) => pool().pool.filter((c) => c.type === type)[i * 3 + 1]);
  const gold = pool().pool.filter((c) => c.tier === "goud").slice(0, 3);
  return (
    <div style={{ padding: 12, display: "grid", gap: 12, background: "#0c141d", minHeight: "100vh" }}>
      {riders.map((card) => (
        <div key={card.id} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {MOODS.map((mood) => (
            <div key={mood} style={{ border: "2px solid #1b1712", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
              <Portrait card={card} mood={mood} />
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 220px))", gap: 10 }}>
        {gold.map((card) => <RiderCardView key={card.id} card={card} live mood="zege" />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, maxWidth: 820 }}>
        {(["brons", "zilver", "goud"] as const).flatMap((tier) => pool().pool.filter((c) => c.tier === tier).slice(0, 2)).map((card) => <RiderCardView key={card.id} card={card} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxWidth: 440 }}>
        {MOODS.map((mood) => (
          <div key={mood} style={{ border: "2px solid #1b1712", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
            <Portrait card={pool().pool.find((c) => faceOf(c).glasses === 2 && c.tier === "goud")!} mood={mood} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {MOODS.map((mood, i) => (
          <div key={mood} style={{ width: 52, height: 52, border: "2px solid #1b1712", borderRadius: 8, overflow: "hidden" }}>
            <Portrait card={riders[i]} mood={mood} crop />
          </div>
        ))}
      </div>
      <div style={{ width: 150 }}>
        <RiderCardView card={pool().pool.find((c) => c.last === "Van Leeuwen" || c.last === "van Leeuwen") ?? pool().pool[0]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 100px))", gap: 8 }}>
        {(["brons", "zilver", "goud"] as const).flatMap((tier) => pool().pool.filter((c) => c.tier === tier && c.last.length > 9).slice(0, 2)).slice(0, 5).map((card, i) => <RiderCardView key={card.id} card={card} small live kopman={i === 0} />)}
      </div>
    </div>
  );
}

// `?materiaal` shows every equipment and staff card, and the slot tiles of the team screen.
function ItemSheet() {
  return (
    <div className={styles.app} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {ITEMS.map((item) => <ItemCardView key={item.id} id={item.id} live />)}
      </div>
      <div className={styles.panel}>
        <div className={styles.slotGrid}>{ITEMS.filter((x) => x.tier === "zilver").map((x) => <SlotTile key={x.id} slot={x.slot} item={x} />)}<SlotTile slot="frame" /></div>
      </div>
    </div>
  );
}

const query = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(query.has("portretten") ? <PortraitSheet /> : query.has("materiaal") ? <ItemSheet /> : <KopmanApp />);
