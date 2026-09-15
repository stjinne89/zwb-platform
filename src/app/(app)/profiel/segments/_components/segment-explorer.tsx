"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleHelp, Crown, Medal, Minus, Search } from "lucide-react";
import { STATUS_LABELS, formatSegmentTime as time, type SegmentDetail, type SegmentItem, type SegmentPage, type SegmentTarget } from "@/lib/segments/explorer";
import "./segments.css";

const SegmentMap = dynamic(() => import("./segment-map"), { ssr: false, loading: () => <div className="segment-map grid place-items-center rounded-xl bg-muted text-sm">Kaart laden…</div> });
const empty: SegmentPage = { items: [], clusters: [], nextOffset: null };
export type Viewport = { bounds: number[]; zoom: number };
const icons = { likely: Check, borderline: Minus, unreachable: Minus, unknown: CircleHelp };
function Status({ item }: { item: SegmentItem }) {
  const Icon = icons[item.assessment.status];
  return <span className={"segment-status segment-"+item.assessment.status}><Icon size={13} />{STATUS_LABELS[item.assessment.status]}</span>;
}
function localTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }

export function SegmentExplorer() {
  const [target, setTarget] = useState<SegmentTarget>("record");
  const [when, setWhen] = useState(localTime);
  const [q, setQ] = useState("");
  const [own, setOwn] = useState(false);
  const [distance, setDistance] = useState("");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(empty);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<SegmentDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState<"map" | "list">("map");
  const [retry, setRetry] = useState(0);
  const date = new Date(when);
  const selectionQuery = "target="+target+"&when="+encodeURIComponent(Number.isFinite(date.getTime()) ? date.toISOString() : when);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams(selectionQuery);
        params.set("q", q); params.set("own", String(own)); params.set("offset", String(offset));
        if (distance) { const [min, max] = distance.split(":"); params.set("min", min); params.set("max", max); }
        if (grade) params.set("grade", grade);
        if (status) params.set("status", status);
        if (viewport) { params.set("bounds", viewport.bounds.join(",")); params.set("zoom", String(viewport.zoom)); }
        const response = await fetch("/api/segments/explore?"+params, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Ophalen mislukt");
        if (!controller.signal.aborted) setData(result);
      } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Ophalen mislukt"); setData(empty); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [selectionQuery, q, own, offset, distance, grade, status, viewport, retry]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch("/api/segments/explore/"+selected+"?"+selectionQuery, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => { const payload = await r.json(); if (!r.ok) throw new Error(payload.error); return payload; })
      .then((r: SegmentDetail) => {
        if (controller.signal.aborted) return;
        setDetail(r); setDetailError("");
        // Openen kan net een hoogteprofiel hebben opgehaald: lijst en kaart direct bijwerken.
        setData((old) => ({ ...old, items: old.items.map((item) => item.id === r.id ? { ...item, line: r.line, assessment: r.assessment } : item) }));
      })
      .catch((e) => { if (!controller.signal.aborted) setDetailError(e.message); });
    return () => controller.abort();
  }, [selected, selectionQuery, retry]);

  function select(id: string) { setSelected(id); setDetail(null); setDetailError(""); }
  function filter(action: () => void) { setOffset(0); action(); }
  function move(value: Viewport) { setViewport((old) => JSON.stringify(old) === JSON.stringify(value) ? old : value); setOffset(0); }
  const lastUpdated = data.items.map((item) => item.updatedAt).filter(Boolean).sort().at(-1);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex rounded-lg bg-muted p-1" aria-label="Doel">
        {(["record", "podium"] as const).map((value) => { const Icon = value === "record" ? Crown : Medal; return <button key={value} type="button" aria-pressed={target === value} onClick={() => filter(() => setTarget(value))} className={"flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium "+(target === value ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><Icon size={16} />ZWB-{value}</button>; })}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Vertrek<input aria-label="Vertrekmoment" type="datetime-local" className="rounded-md border bg-background px-2 py-1.5 text-foreground" value={when} onChange={(e) => filter(() => setWhen(e.target.value))} /></label>
    </div>
    <div className="flex flex-wrap gap-2">
      <label className="flex min-w-44 flex-1 items-center gap-2 rounded-md border bg-card px-3"><Search size={16} /><input aria-label="Zoek segment" placeholder="Zoek segment" value={q} onChange={(e) => filter(() => setQ(e.target.value))} className="w-full bg-transparent py-2 text-sm outline-none" /></label>
      <select aria-label="Afstand" className="segment-select" value={distance} onChange={(e) => filter(() => setDistance(e.target.value))}><option value="">Alle afstanden</option><option value="0:1000">Tot 1 km</option><option value="1000:5000">1–5 km</option><option value="5000:1000000">Vanaf 5 km</option></select>
      <select aria-label="Helling" className="segment-select" value={grade} onChange={(e) => filter(() => setGrade(e.target.value))}><option value="">Alle hellingen</option><option value="3">Vanaf 3%</option><option value="6">Vanaf 6%</option></select>
      <select aria-label="Haalbaarheid" className="segment-select" value={status} onChange={(e) => filter(() => setStatus(e.target.value))}><option value="">Alle kansen</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"><input type="checkbox" checked={own} onChange={(e) => filter(() => setOwn(e.target.checked))} />Door mij gereden</label>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {Object.entries(STATUS_LABELS).map(([key, label]) => <span key={key} className="flex items-center gap-1.5"><i className={"segment-dot segment-"+key} />{label}</span>)}
      {lastUpdated && <span className="ml-auto">Bijgewerkt {new Date(lastUpdated).toLocaleDateString("nl-NL")}</span>}
    </div>
    <div className="flex gap-2 lg:hidden">{(["map", "list"] as const).map((mode) => <button type="button" key={mode} aria-pressed={mobile === mode} onClick={() => setMobile(mode)} className={"rounded-md border px-4 py-2 text-sm "+(mobile === mode ? "bg-primary text-primary-foreground" : "bg-card")}>{mode === "map" ? "Kaart" : "Lijst"}</button>)}</div>
    {error && <div role="alert" className="rounded-lg border bg-card p-4 text-sm">{error} <button type="button" onClick={() => setRetry((v) => v + 1)} className="ml-2 underline">Opnieuw proberen</button></div>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <div className={mobile === "map" ? "block" : "hidden lg:block"}><SegmentMap items={data.items} clusters={data.clusters} selected={selected} detail={detail} onSelect={select} onMove={move} visible={mobile === "map"} ready={!loading} /><div className="mt-2 text-xs text-muted-foreground" role="status">{loading ? "Segmenten laden…" : data.items.length+" segmenten in deze lijst"}</div></div>
      <section aria-label="Segmentenlijst" aria-busy={loading} className={(mobile === "list" ? "block" : "hidden lg:block")+" segment-list overflow-y-auto rounded-xl border bg-card"}>
        {!data.items.length && !loading && !error && <p className="p-6 text-sm text-muted-foreground">Geen segmenten in deze selectie.</p>}
        <ul className="divide-y">{data.items.map((item) => <li key={item.id} className={selected === item.id ? "bg-primary/5" : ""}>
          <button type="button" onClick={() => select(item.id)} aria-pressed={selected === item.id} className="w-full space-y-3 p-4 text-left hover:bg-muted/50">
            <div className="flex items-start justify-between gap-2"><span className="font-semibold">{item.name}</span><ArrowUpRight size={16} className="shrink-0 text-muted-foreground" /></div>
            <div className="flex gap-3 text-xs text-muted-foreground"><span>{item.distance == null ? "—" : (item.distance / 1000).toFixed(2)+" km"}</span><span>{item.grade == null ? "—" : item.grade.toFixed(1)+"%"}</span><span>{item.riders} ZWB’ers</span></div>
            <div className="flex flex-wrap items-center justify-between gap-2"><Status item={item} /><span className="text-xs tabular-nums text-muted-foreground">{item.rank === 1 ? "♛ ZWB KOM" : item.rank && item.rank <= 3 ? "Podium · #"+item.rank : item.mine ? "Jij "+time(item.mine) : "Record "+time(item.record)}</span></div>
          </button>
        </li>)}</ul>
        <div className="flex justify-between border-t p-3 text-sm"><button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 40))} className="disabled:opacity-30">Vorige</button><button type="button" disabled={data.nextOffset == null || loading} onClick={() => setOffset(data.nextOffset ?? 0)} className="disabled:opacity-30">Volgende</button></div>
      </section>
    </div>
    {selected && <section className="rounded-xl border bg-card p-5" aria-label="Segmentdetails">
      <div className="mb-3 flex justify-between"><h2 className="font-semibold">Segmentdetails</h2><button type="button" onClick={() => { setSelected(null); setDetail(null); }} className="text-sm text-muted-foreground">Sluiten</button></div>
      {detailError ? <p role="alert">{detailError}</p> : !detail ? <p role="status" className="text-sm text-muted-foreground">Laden…</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><a href={"https://www.strava.com/segments/"+detail.id} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xl font-semibold hover:underline">{detail.name}<ArrowUpRight size={18} /></a><Status item={detail} /></div>
        <div className="my-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Jouw tijd", time(detail.mine)], ["ZWB-record", time(detail.record)], [detail.assessment.targetKind === "own" ? "Doel: eigen record" : "Doeltijd", time(detail.assessment.targetSeconds)], ["Verwachte tijd", detail.assessment.fastSeconds == null ? "—" : time(detail.assessment.fastSeconds)+" – "+time(detail.assessment.slowSeconds)]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>)}</div>
        {detail.assessment.reason && <p className="mb-4 text-sm text-muted-foreground">{detail.assessment.reason}</p>}
        <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-semibold">ZWB-klassement</caption><thead className="text-xs text-muted-foreground"><tr><th className="py-2">Positie</th><th>Lid</th><th className="text-right">Tijd</th></tr></thead><tbody>{detail.leaderboard.map((r) => <tr key={r.profileId} className="border-t"><td className="py-2">{r.rank}</td><td>{r.name ?? "ZWB-lid"}{r.rank === 1 && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Crown size={12} />ZWB KOM</span>}{detail.qomIds?.includes(r.profileId) && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Crown size={12} />ZWB QOM</span>}</td><td className="text-right tabular-nums">{time(r.seconds)}</td></tr>)}</tbody></table></div>
      </>}
    </section>}
  </div>;
}
