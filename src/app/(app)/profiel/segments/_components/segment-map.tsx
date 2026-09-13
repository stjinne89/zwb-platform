"use client";

import { Fragment, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import { useTheme } from "next-themes";
import { type MapCluster, type SegmentDetail, type SegmentItem, type SegmentStatus, STATUS_LABELS } from "@/lib/segments/explorer";
import type { Viewport } from "./segment-explorer";
import "leaflet/dist/leaflet.css";

type Props = { items: SegmentItem[]; clusters: MapCluster[]; selected: string | null; detail: SegmentDetail | null; onSelect: (id: string) => void; onMove: (view: Viewport) => void; visible: boolean; ready: boolean };
const colors: Record<SegmentStatus, string> = { likely: "#b8873d", borderline: "#1f6068", unreachable: "#657a80", unknown: "#777777" };
const darkColors: Record<SegmentStatus, string> = { likely: "#d2a357", borderline: "#6eb3b5", unreachable: "#9bb1b6", unknown: "#a5a5a5" };

function Controls(props: Props) {
  const initialized = useRef(false), lastSelection = useRef<string | null>(null);
  const map = useMapEvents({ moveend: () => {
    const b = map.getBounds();
    const view = { bounds: [Math.max(-90,b.getSouth()),Math.max(-180,b.getWest()),Math.min(90,b.getNorth()),Math.min(180,b.getEast())].map((n) => Number(n.toFixed(5))), zoom: map.getZoom() };
    props.onMove(view);
    try { localStorage.setItem("zwb-segment-map", JSON.stringify({ center: [map.getCenter().lat,map.getCenter().lng], zoom: view.zoom })); } catch { /* optional */ }
  } });
  useEffect(() => {
    if (initialized.current || !props.ready) return;
    initialized.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem("zwb-segment-map") ?? "null");
      if (Array.isArray(saved?.center) && saved.center.length === 2 && saved.center.every(Number.isFinite) && Math.abs(saved.center[0])<=85 && Math.abs(saved.center[1])<=180 && Number.isFinite(saved.zoom)) { map.setView(saved.center, Math.min(18, Math.max(2, saved.zoom))); return; }
    } catch { /* use club extent */ }
    const points: [number,number][] = props.clusters.length ? props.clusters.map((c) => [c.lat,c.lon]) : props.items.flatMap((s) => s.start ? [s.start] : []);
    if (points.length) map.fitBounds(points, { padding: [30,30], maxZoom: 12 });
  }, [props.ready, props.clusters, props.items, map]);
  useEffect(() => { if (props.visible) { const timer = setTimeout(() => map.invalidateSize(), 50); return () => clearTimeout(timer); } }, [props.visible,map]);
  useEffect(() => {
    const detail = props.detail;
    if (!detail || detail.id === lastSelection.current) return;
    lastSelection.current = detail.id;
    if (detail.line.length >= 2) map.fitBounds(detail.line, { padding: [40,40], maxZoom: 16 });
    else if (detail.start) map.setView(detail.start, 15);
  }, [props.detail,map]);
  return <div className="leaflet-top leaflet-right"><div className="leaflet-control"><button type="button" className="rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow" onClick={() => map.locate({ setView: true, maxZoom: 13 })}>Mijn locatie</button></div></div>;
}
function Cluster({ cluster }: { cluster: MapCluster }) {
  const map = useMap();
  return <Marker position={[cluster.lat,cluster.lon]} icon={divIcon({ className: "", html: '<span class="segment-cluster">'+Number(cluster.count)+'</span>', iconSize: [36,36], iconAnchor: [18,18] })} eventHandlers={{ click: () => map.setView([cluster.lat,cluster.lon], Math.min(18,map.getZoom()+2)) }}><Tooltip>{cluster.count} segmenten · klik om in te zoomen</Tooltip></Marker>;
}
export default function SegmentMap(props: Props) {
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === "dark" ? darkColors : colors;
  return <MapContainer className="segment-map w-full rounded-xl border" center={[52.1,5.3]} zoom={7} minZoom={2} maxZoom={18} maxBounds={[[-85,-180],[85,180]]} scrollWheelZoom>
    <TileLayer url={resolvedTheme === "dark" ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' />
    <Controls {...props} />
    {props.clusters.filter((c) => c.count > 1 || !props.items.some((item) => item.start && Math.abs(item.start[0]-c.lat)<0.00001 && Math.abs(item.start[1]-c.lon)<0.00001)).map((c, i) => <Cluster key={i} cluster={c} />)}
    {props.items.map((item) => <Fragment key={item.id}>
      {item.line.length >= 2 && <Polyline positions={item.line} pathOptions={{ color: palette[item.assessment.status], weight: props.selected === item.id ? 7 : 4, opacity: 0.95 }} eventHandlers={{ click: () => props.onSelect(item.id) }}><Tooltip>{item.name} · {STATUS_LABELS[item.assessment.status]}</Tooltip></Polyline>}
      {item.start && <CircleMarker center={item.start} radius={props.selected === item.id ? 7 : 5} pathOptions={{ color: "#fbfbf7", weight: 2, fillColor: palette[item.assessment.status], fillOpacity: 1 }} eventHandlers={{ click: () => props.onSelect(item.id) }}><Tooltip>Start · {item.name}</Tooltip></CircleMarker>}
      {item.line.length >= 2 && <CircleMarker center={item.line[item.line.length-1]} radius={3} pathOptions={{ color: palette[item.assessment.status], fillOpacity: 1 }} eventHandlers={{ click: () => props.onSelect(item.id) }}><Tooltip>Finish · {item.name}</Tooltip></CircleMarker>}
    </Fragment>)}
  </MapContainer>;
}
