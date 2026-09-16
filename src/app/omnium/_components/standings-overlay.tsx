"use client";
import { useEffect, useState } from "react";
import { AutoRefresh } from "./auto-refresh";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import type { PublicStanding } from "@/lib/omnium/public-data";
import "./standings-overlay.css";

export function StandingsOverlay({ title, rows, league, rotateSeconds }: { title: string; rows: PublicStanding[]; league: string | null; rotateSeconds: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!rotateSeconds || league) return;
    const timer = setInterval(() => setIndex((i) => i + 1), rotateSeconds * 1000);
    return () => clearInterval(timer);
  }, [rotateSeconds, league]);
  const available = OMNIUM_LEAGUES.filter((l) => rows.some((r) => r.league === l));
  const leagues = league ? [league] : available.length ? available : [...OMNIUM_LEAGUES];
  const active = leagues[index % leagues.length];
  const visible = rows.filter((r) => r.league === active).sort((a,b) => a.rank - b.rank).slice(0, 12);
  return <main className="omnium-overlay" lang="en"><AutoRefresh seconds={20} />
    <section className="omnium-overlay-panel">
      <header><span>ZWB OMNIUM</span><span>{visible.some((r) => r.isProvisional) ? "PROVISIONAL" : "STANDINGS"}</span></header>
      <h1>{title}</h1><h2>{active}</h2>
      <table><thead><tr><th>#</th><th>Rider</th><th>Pts</th></tr></thead><tbody>{visible.map((r) => <tr key={r.riderId}><td>{r.rank}{r.rankShared ? "=" : ""}</td><td>{r.riderName}</td><td>{r.totalPoints}</td></tr>)}</tbody></table>
      {!visible.length && <p>Awaiting results</p>}
    </section>
  </main>;
}
