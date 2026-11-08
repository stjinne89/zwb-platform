"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ImageSegmenter, NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import {
  KNIE_ONDERIN,
  beoordeel,
  cadans,
  hoek,
  knieBuiging,
  maskerPixels,
  mediaan,
  mmPerPixel,
  naarCsv,
  pixelsNaarM2,
  rompHoek,
  uiterstenPerOmwenteling,
  veelhoekOppervlak,
  type Monster,
  type Oordeel,
  type Punt,
} from "@/lib/houding/meting";
import { laadPose, laadSelfie, POSE_PUNTEN, type Kant, type Rekenaar } from "@/lib/houding/vision";

type Modus = "voor" | "zij";
type Masker = "pose" | "selfie";
type Klik = "geen" | "stuur" | "hand";

/** Hoe vaak we een beeld doorrekenen; meer kost batterij en warmte. */
const BEELDEN_PER_SECONDE = 15;
const KNIE_VENSTER_MS = 15_000;
const STAAND_MS = 3_000;

type Live = {
  oppervlak: number | null;
  procent: number | null;
  knieNu: number | null;
  knieOnder: number | null;
  knieBoven: number | null;
  heupBoven: number | null;
  romp: number | null;
  elleboog: number | null;
  cadans: number | null;
  verwerkt: number;
};

const LEEG: Live = {
  oppervlak: null,
  procent: null,
  knieNu: null,
  knieOnder: null,
  knieBoven: null,
  heupBoven: null,
  romp: null,
  elleboog: null,
  cadans: null,
  verwerkt: 0,
};

type Bevroren = {
  modus: Modus;
  /** Wat het model op dit beeld zag. */
  oppervlak: number | null;
  knie: number | null;
  punten: Punt[];
};

type LogRij = Record<string, string | number | null>;

function rond(v: number | null | undefined, d = 1) {
  return v === null || v === undefined || !Number.isFinite(v) ? "–" : v.toFixed(d).replace(".", ",");
}

function tijdNu() {
  return new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function kiesKant(lm: NormalizedLandmark[]): Kant {
  const zicht = (k: Kant) => {
    const p = POSE_PUNTEN[k];
    return [p.heup, p.knie, p.enkel].reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0);
  };
  return zicht("links") >= zicht("rechts") ? "links" : "rechts";
}

const OORDEEL: Record<Oordeel, string> = {
  binnen: "binnen",
  rand: "op de rand van",
  lager: "meer gestrekt dan",
  hoger: "meer gebogen dan",
};

/**
 * Houding meten uit live video. `proef`: de meetproef voor beheer, met de
 * schaal van het stuur, de keuze van het masker, nameten met de hand en CSV.
 * Zonder: de bèta voor leden, met alleen relatieve maten en richtwaarden.
 */
export function HoudingMeting({ proef = false }: { proef?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Het kale beeld dat het model zag, zonder lijnen erop; om na te meten.
  const schoonRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const selfieRef = useRef<ImageSegmenter | null>(null);
  const rafRef = useRef<number | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  // Instellingen die de lus leest zonder opnieuw te starten.
  const modusRef = useRef<Modus>("voor");
  const maskerRef = useRef<Masker>("pose");
  const toonMaskerRef = useRef(true);
  const schaalRef = useRef<number | null>(null);
  const bevrorenRef = useRef(false);

  // Reeksen.
  const oppervlakRef = useRef<Monster[]>([]);
  const perSecondeRef = useRef<Monster[]>([]);
  const knieRef = useRef<Monster[]>([]);
  const heupRef = useRef<Monster[]>([]);
  const rompRef = useRef<Monster[]>([]);
  const elleboogRef = useRef<Monster[]>([]);
  const laatsteRef = useRef<{ oppervlak: number | null; knie: number | null; punten: Punt[] }>({
    oppervlak: null,
    knie: null,
    punten: [],
  });
  const staandMetenRef = useRef<{ tot: number; waarden: number[] } | null>(null);
  const verwerktRef = useRef<number[]>([]);
  const basisRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const [modus, setModus] = useState<Modus>("voor");
  const [masker, setMasker] = useState<Masker>("pose");
  const [toonMasker, setToonMasker] = useState(true);
  const [status, setStatus] = useState<"uit" | "laden" | "aan">("uit");
  const [fout, setFout] = useState<string | null>(null);
  const [rekenaar, setRekenaar] = useState<Rekenaar | null>(null);
  /** "achter", "voor" of een deviceId uit de lijst. */
  const [camera, setCamera] = useState<string>("achter");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [camInfo, setCamInfo] = useState<string | null>(null);
  const [stuurMm, setStuurMm] = useState(420);
  const [stuurPunten, setStuurPunten] = useState<Punt[]>([]);
  const [klik, setKlik] = useState<Klik>("geen");
  const [handPunten, setHandPunten] = useState<Punt[]>([]);
  const [bevroren, setBevroren] = useState<Bevroren | null>(null);
  const [live, setLive] = useState<Live>(LEEG);
  const [basis, setBasis] = useState<number | null>(null);
  const [staand, setStaand] = useState<number | null>(null);
  const [staandBezig, setStaandBezig] = useState(false);
  const [notitie, setNotitie] = useState("");
  const [log, setLog] = useState<LogRij[]>([]);
  const [grafiek, setGrafiek] = useState<Monster[]>([]);
  const [gekopieerd, setGekopieerd] = useState(false);

  const schaal = stuurPunten.length === 2 ? mmPerPixel(stuurPunten[0], stuurPunten[1], stuurMm) : null;

  // De lus leest instellingen uit refs, zodat hij niet opnieuw hoeft te starten.
  useLayoutEffect(() => {
    modusRef.current = modus;
    maskerRef.current = masker;
    toonMaskerRef.current = toonMasker;
    bevrorenRef.current = bevroren !== null;
    basisRef.current = basis;
    schaalRef.current = schaal;
  });

  // ---- tekenen ---------------------------------------------------------------

  const tekenPunten = useCallback((ctx: CanvasRenderingContext2D, punten: Punt[], kleur: string) => {
    ctx.strokeStyle = kleur;
    ctx.fillStyle = kleur;
    ctx.lineWidth = 3;
    ctx.beginPath();
    punten.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    for (const p of punten) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const tekenOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (schoonRef.current) ctx.drawImage(schoonRef.current, 0, 0);
    if (modus === "voor" && stuurPunten.length > 0) tekenPunten(ctx, stuurPunten, "#f5b301");
    if (handPunten.length > 0) {
      tekenPunten(ctx, modus === "voor" && handPunten.length > 2 ? [...handPunten, handPunten[0]] : handPunten, "#ff3b6b");
    }
  }, [handPunten, modus, stuurPunten, tekenPunten]);

  // Bij een bevroren beeld de klikpunten opnieuw tekenen.
  useEffect(() => {
    if (bevroren) tekenOverlay();
  }, [bevroren, tekenOverlay]);

  // ---- analyse per beeld ------------------------------------------------------

  const analyseer = useCallback(
    (nu: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const pose = poseRef.current;
      if (!video || !canvas || !ctx || !pose) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      const schoon = (schoonRef.current ??= document.createElement("canvas"));
      if (schoon.width !== vw || schoon.height !== vh) {
        schoon.width = vw;
        schoon.height = vh;
      }
      schoon.getContext("2d")?.drawImage(video, 0, 0, vw, vh);
      ctx.drawImage(schoon, 0, 0);

      const isVoor = modusRef.current === "voor";
      let maskData: Float32Array | null = null;
      let mw = 0;
      let mh = 0;
      let landmarks: NormalizedLandmark[] | undefined;

      if (isVoor && maskerRef.current === "selfie" && selfieRef.current) {
        const res = selfieRef.current.segmentForVideo(video, nu);
        const m = res.confidenceMasks?.[0];
        if (m) {
          maskData = m.getAsFloat32Array();
          mw = m.width;
          mh = m.height;
        }
        res.close();
      } else {
        const res = pose.detectForVideo(video, nu);
        landmarks = res.landmarks[0];
        const m = res.segmentationMasks?.[0];
        if (isVoor && m) {
          maskData = m.getAsFloat32Array();
          mw = m.width;
          mh = m.height;
        }
        res.close();
      }

      let oppervlak: number | null = null;
      if (isVoor && maskData && mw && mh) {
        const pixels = maskerPixels(maskData) * ((vw * vh) / (mw * mh));
        // Leden vergelijken alleen met hun basis; daarvoor is geen schaal nodig.
        const s = schaalRef.current;
        oppervlak = !proef ? pixels : s ? pixelsNaarM2(pixels, s) : null;
        if (toonMaskerRef.current) {
          const mc = (maskCanvasRef.current ??= document.createElement("canvas"));
          if (mc.width !== mw || mc.height !== mh) {
            mc.width = mw;
            mc.height = mh;
          }
          const mctx = mc.getContext("2d");
          if (mctx) {
            const img = mctx.createImageData(mw, mh);
            for (let i = 0; i < maskData.length; i++) {
              if (maskData[i] > 0.5) {
                img.data[i * 4] = 0;
                img.data[i * 4 + 1] = 200;
                img.data[i * 4 + 2] = 180;
                img.data[i * 4 + 3] = 110;
              }
            }
            mctx.putImageData(img, 0, 0);
            ctx.drawImage(mc, 0, 0, vw, vh);
          }
        }
        if (oppervlak !== null) {
          oppervlakRef.current.push({ t: nu, v: oppervlak });
          if (oppervlakRef.current.length > BEELDEN_PER_SECONDE * 10) oppervlakRef.current.shift();
        }
      }

      let knie: number | null = null;
      let punten: Punt[] = [];
      if (!isVoor && landmarks) {
        const kant = kiesKant(landmarks);
        const p = POSE_PUNTEN[kant];
        const px = (i: number): Punt => ({ x: landmarks![i].x * vw, y: landmarks![i].y * vh });
        const [schouder, elleboog, pols, heup, kniePt, enkel] = [
          px(p.schouder),
          px(p.elleboog),
          px(p.pols),
          px(p.heup),
          px(p.knie),
          px(p.enkel),
        ];
        knie = knieBuiging(heup, kniePt, enkel);
        punten = [heup, kniePt, enkel];
        const tot = nu - KNIE_VENSTER_MS;
        const voegToe = (reeks: Monster[], v: number) => {
          reeks.push({ t: nu, v });
          while (reeks.length && reeks[0].t < tot) reeks.shift();
        };
        voegToe(knieRef.current, knie);
        voegToe(heupRef.current, hoek(schouder, heup, kniePt));
        voegToe(rompRef.current, rompHoek(heup, schouder));
        voegToe(elleboogRef.current, hoek(schouder, elleboog, pols));
        const staandMeten = staandMetenRef.current;
        if (staandMeten && nu <= staandMeten.tot) staandMeten.waarden.push(knie);
        tekenPunten(ctx, [schouder, elleboog, pols], "#7cc4ff");
        tekenPunten(ctx, [schouder, heup, kniePt, enkel], "#00c8b4");
      }

      laatsteRef.current = { oppervlak, knie, punten };
      if (isVoor && stuurPunten.length > 0) tekenPunten(ctx, stuurPunten, "#f5b301");
      verwerktRef.current.push(nu);
      while (verwerktRef.current.length && verwerktRef.current[0] < nu - 2000) verwerktRef.current.shift();
    },
    [proef, stuurPunten, tekenPunten],
  );

  // ---- de lus -----------------------------------------------------------------

  const analyseerRef = useRef(analyseer);
  useLayoutEffect(() => {
    analyseerRef.current = analyseer;
  });

  const startLus = useCallback(() => {
    let vorige = 0;
    const lus = () => {
      rafRef.current = requestAnimationFrame(lus);
      const nu = performance.now();
      if (bevrorenRef.current || nu - vorige < 1000 / BEELDEN_PER_SECONDE) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      vorige = nu;
      try {
        analyseerRef.current(nu);
      } catch (e) {
        setFout(e instanceof Error ? e.message : String(e));
      }
    };
    rafRef.current = requestAnimationFrame(lus);
  }, []);

  // Vier keer per seconde de cijfers bijwerken.
  useEffect(() => {
    if (status !== "aan") return;
    const id = window.setInterval(() => {
      const nu = performance.now();
      const opp = mediaan(oppervlakRef.current.filter((m) => m.t > nu - 3000).map((m) => m.v));
      const b = basisRef.current;
      const knie = uiterstenPerOmwenteling(knieRef.current);
      const heup = uiterstenPerOmwenteling(heupRef.current);
      const recent = (r: Monster[]) => mediaan(r.filter((m) => m.t > nu - 5000).map((m) => m.v));
      const laatste10 = (r: Monster[]) => mediaan(r.slice(-10).map((m) => m.v));
      setLive({
        oppervlak: opp,
        procent: opp !== null && b ? ((opp - b) / b) * 100 : null,
        knieNu: mediaan(knieRef.current.filter((m) => m.t > nu - 500).map((m) => m.v)),
        knieOnder: laatste10(knie.minima),
        knieBoven: laatste10(knie.maxima),
        heupBoven: laatste10(heup.minima),
        romp: recent(rompRef.current),
        elleboog: recent(elleboogRef.current),
        cadans: cadans(knie.minima),
        verwerkt: verwerktRef.current.length / 2,
      });
      // Eén punt per seconde voor de vermoeidheidsgrafiek.
      if (opp !== null) {
        const t = (nu - startRef.current) / 1000;
        const reeks = perSecondeRef.current;
        if (!reeks.length || t - reeks[reeks.length - 1].t >= 1) {
          reeks.push({ t, v: opp });
          if (reeks.length > 3600) reeks.shift();
          setGrafiek([...reeks]);
        }
      }
      const s = staandMetenRef.current;
      if (s && nu > s.tot) {
        setStaand(mediaan(s.waarden));
        staandMetenRef.current = null;
        setStaandBezig(false);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  const knieGecorrigeerd = live.knieOnder !== null && staand !== null ? live.knieOnder - staand : null;

  // ---- camera ----------------------------------------------------------------

  const vraagWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        wakeRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Geweigerd (bijv. energiebesparing); de meting werkt ook zonder.
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    setStatus("uit");
  }, []);

  const start = useCallback(async (keuze: string) => {
    setFout(null);
    setStatus("laden");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Deze browser geeft geen toegang tot de camera.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(keuze === "achter"
            ? { facingMode: { ideal: "environment" } }
            : keuze === "voor"
              ? { facingMode: { ideal: "user" } }
              : { deviceId: { exact: keuze } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const settings = stream.getVideoTracks()[0]?.getSettings();
      setCamInfo(
        settings ? `${settings.width}×${settings.height}, ${Math.round(settings.frameRate ?? 0)} fps` : null,
      );
      const apparaten = await navigator.mediaDevices.enumerateDevices();
      setCameras(apparaten.filter((d) => d.kind === "videoinput"));
      if (!poseRef.current) {
        const { model, rekenaar: r } = await laadPose();
        poseRef.current = model;
        setRekenaar(r);
      }
      if (maskerRef.current === "selfie" && !selfieRef.current) {
        selfieRef.current = (await laadSelfie()).model;
      }
      startRef.current = performance.now();
      await vraagWakeLock();
      setStatus("aan");
      startLus();
    } catch (e) {
      stop();
      setFout(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  }, [startLus, stop, vraagWakeLock]);

  // Een andere camera kiezen terwijl hij aan staat: de oude stroom eerst stoppen
  // (iOS geeft maar één camera tegelijk) en met de nieuwe opnieuw beginnen.
  function kiesCamera(keuze: string) {
    setCamera(keuze);
    if (streamRef.current) {
      stop();
      void start(keuze);
    }
  }

  // Selfie-model pas laden als het gekozen wordt.
  useEffect(() => {
    if (masker !== "selfie" || selfieRef.current || status !== "aan") return;
    let weg = false;
    laadSelfie()
      .then(({ model }) => {
        if (weg) model.close();
        else selfieRef.current = model;
      })
      .catch((e) => setFout(String(e)));
    return () => {
      weg = true;
    };
  }, [masker, status]);

  // Het camerarecht (Permissions-Policy) hoort bij het document. Kwam je hier via
  // een link binnen de app, dan geldt nog de header van de vorige pagina
  // (camera=()) en weigert de browser zonder te vragen. Dan één keer volledig laden.
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav && new URL(nav.name).pathname !== window.location.pathname) window.location.reload();
  }, []);

  // Wake lock valt weg als het tabblad verborgen is; daarna opnieuw vragen.
  useEffect(() => {
    const opnieuw = () => {
      if (document.visibilityState === "visible" && streamRef.current) void vraagWakeLock();
    };
    document.addEventListener("visibilitychange", opnieuw);
    return () => document.removeEventListener("visibilitychange", opnieuw);
  }, [vraagWakeLock]);

  useEffect(
    () => () => {
      stop();
      poseRef.current?.close();
      selfieRef.current?.close();
    },
    [stop],
  );

  // ---- reeksen wissen bij een wissel van modus -------------------------------

  const wisReeksen = useCallback(() => {
    oppervlakRef.current = [];
    perSecondeRef.current = [];
    knieRef.current = [];
    heupRef.current = [];
    rompRef.current = [];
    elleboogRef.current = [];
    startRef.current = performance.now();
    setGrafiek([]);
    setBasis(null);
    setLive(LEEG);
  }, []);

  // ---- klikken op het beeld ---------------------------------------------------

  function beeldPunt(e: React.PointerEvent<HTMLCanvasElement>): Punt {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  function opKlik(e: React.PointerEvent<HTMLCanvasElement>) {
    if (klik === "stuur") {
      const p = beeldPunt(e);
      setStuurPunten((oud) => {
        const nieuw = oud.length >= 2 ? [p] : [...oud, p];
        if (nieuw.length === 2) setKlik("geen");
        return nieuw;
      });
    } else if (klik === "hand" && bevroren) {
      const p = beeldPunt(e);
      setHandPunten((oud) => (bevroren.modus === "zij" && oud.length >= 3 ? oud : [...oud, p]));
    }
  }

  // ---- bevriezen en met de hand nameten ---------------------------------------

  function bevries() {
    // Meteen, zodat de lus geen nieuw beeld meer neemt voordat React rendert.
    bevrorenRef.current = true;
    const l = laatsteRef.current;
    setBevroren({ modus, oppervlak: l.oppervlak, knie: l.knie, punten: l.punten });
    setHandPunten([]);
    setKlik("hand");
  }

  function hervat() {
    setBevroren(null);
    setHandPunten([]);
    setKlik("geen");
  }

  const handWaarde: number | null = (() => {
    if (!bevroren) return null;
    if (bevroren.modus === "zij") {
      return handPunten.length === 3 ? knieBuiging(handPunten[0], handPunten[1], handPunten[2]) : null;
    }
    return handPunten.length >= 3 && schaal ? pixelsNaarM2(veelhoekOppervlak(handPunten), schaal) : null;
  })();

  function legControleVast() {
    if (!bevroren || handWaarde === null) return;
    const model = bevroren.modus === "zij" ? bevroren.knie : bevroren.oppervlak;
    setLog((oud) => [
      ...oud,
      {
        tijd: tijdNu(),
        soort: bevroren.modus === "zij" ? "controle knie (°)" : "controle oppervlak (m²)",
        notitie,
        model,
        hand: handWaarde,
        verschil: model !== null ? model - handWaarde : null,
        verschil_pct: model !== null && handWaarde ? ((model - handWaarde) / handWaarde) * 100 : null,
      },
    ]);
    hervat();
  }

  function legLiveVast() {
    if (!proef) {
      setLog((oud) => [
        ...oud,
        modus === "voor"
          ? { Tijd: tijdNu(), Notitie: notitie, "T.o.v. basis (%)": live.procent }
          : {
              Tijd: tijdNu(),
              Notitie: notitie,
              "Knie onderin (°)": knieGecorrigeerd,
              "Romp (°)": live.romp,
              "Elleboog (°)": live.elleboog,
              Cadans: live.cadans,
            },
      ]);
      return;
    }
    setLog((oud) => [
      ...oud,
      modus === "voor"
        ? {
            tijd: tijdNu(),
            soort: "voor",
            notitie,
            oppervlak_m2: live.oppervlak,
            tov_basis_pct: live.procent,
            stuur_mm: stuurMm,
            masker,
          }
        : {
            tijd: tijdNu(),
            soort: "zij",
            notitie,
            knie_onder: live.knieOnder,
            knie_onder_min_staand: live.knieOnder !== null && staand !== null ? live.knieOnder - staand : null,
            knie_boven: live.knieBoven,
            heup_boven: live.heupBoven,
            romp: live.romp,
            elleboog: live.elleboog,
            cadans: live.cadans,
            staand,
          },
    ]);
  }

  async function kopieer() {
    const csv = naarCsv(log);
    try {
      await navigator.clipboard.writeText(csv);
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      setFout("Kopiëren lukte niet.");
    }
  }

  function bewaarCsv() {
    const blob = new Blob([`﻿${naarCsv(log)}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `houding-meetproef-${new Date().toISOString().slice(0, 16).replace(":", "")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---- weergave ---------------------------------------------------------------

  const knieOordeel = knieGecorrigeerd !== null ? beoordeel(knieGecorrigeerd, KNIE_ONDERIN) : null;
  const bereik = `${KNIE_ONDERIN.min}–${KNIE_ONDERIN.max}°`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border p-0.5">
          {(["voor", "zij"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={modus === m ? "default" : "ghost"}
              onClick={() => {
                setModus(m);
                wisReeksen();
                hervat();
              }}
            >
              {m === "voor" ? "Vooraanzicht" : "Zijaanzicht"}
            </Button>
          ))}
        </div>
        {status === "aan" ? (
          <Button size="sm" variant="outline" onClick={stop}>
            Camera uit
          </Button>
        ) : (
          <Button size="sm" onClick={() => void start(camera)} disabled={status === "laden"}>
            {status === "laden" ? "Laden…" : "Camera aan"}
          </Button>
        )}
        <select
          className="h-7 rounded-md border bg-background px-2 text-sm"
          value={camera}
          onChange={(e) => kiesCamera(e.target.value)}
          aria-label="Camera"
          disabled={status === "laden"}
        >
          <option value="achter">Achtercamera</option>
          <option value="voor">Voorcamera</option>
          {cameras.map((c, i) => (
            <option key={c.deviceId || i} value={c.deviceId}>
              {c.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {[camInfo, rekenaar, status === "aan" ? `${rond(live.verwerkt, 0)} beelden/s` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      {fout ? <p className="text-sm text-destructive">{fout}</p> : null}

      <div className="relative overflow-hidden rounded-lg border bg-black">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          onPointerDown={opKlik}
          className={`block h-auto w-full ${klik !== "geen" ? "cursor-crosshair" : ""}`}
          style={{ touchAction: klik !== "geen" ? "none" : undefined }}
        />
        {status !== "aan" ? (
          <div className="absolute inset-0 grid min-h-48 place-items-center text-sm text-white/70">
            {status === "laden" ? "Camera en model laden…" : "Camera uit"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {modus === "voor" ? (
          <>
            {proef ? (
              <>
                <label className="flex items-center gap-1 text-sm">
                  Stuur
                  <input
                    type="number"
                    inputMode="numeric"
                    className="h-7 w-20 rounded-md border bg-background px-2"
                    value={stuurMm}
                    onChange={(e) => setStuurMm(Number(e.target.value) || 0)}
                  />
                  mm
                </label>
                <Button
                  size="sm"
                  variant={klik === "stuur" ? "default" : "outline"}
                  onClick={() => {
                    setStuurPunten([]);
                    setKlik("stuur");
                  }}
                >
                  {klik === "stuur" ? "Klik beide stuureinden" : schaal ? "Stuur opnieuw" : "Stuur aanklikken"}
                </Button>
                <select
                  className="h-7 rounded-md border bg-background px-2 text-sm"
                  value={masker}
                  onChange={(e) => setMasker(e.target.value as Masker)}
                  aria-label="Masker"
                >
                  <option value="pose">Masker: pose</option>
                  <option value="selfie">Masker: selfie</option>
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={toonMasker} onChange={(e) => setToonMasker(e.target.checked)} />
                  Tonen
                </label>
              </>
            ) : null}
            <Button size="sm" variant="outline" disabled={live.oppervlak === null} onClick={() => setBasis(live.oppervlak)}>
              Basis
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={status !== "aan" || staandBezig}
            onClick={() => {
              staandMetenRef.current = { tot: performance.now() + STAAND_MS, waarden: [] };
              setStaandBezig(true);
            }}
          >
            {staandBezig ? "Stil staan…" : staand !== null ? `Staand ${rond(staand)}°` : "Staand meten"}
          </Button>
        )}
      </div>

      {!proef ? (
        modus === "voor" ? (
          <dl className="grid grid-cols-2 gap-2">
            <Cijfer
              label="T.o.v. basis"
              waarde={live.procent !== null ? `${live.procent > 0 ? "+" : ""}${rond(live.procent)} %` : "–"}
            />
            <Cijfer label="Tijd" waarde={`${rond(grafiek.length ? grafiek[grafiek.length - 1].t / 60 : 0, 0)} min`} />
          </dl>
        ) : (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Cijfer
              label="Knie onderin"
              waarde={`${rond(knieGecorrigeerd)}°`}
              sub={knieOordeel ? `${OORDEEL[knieOordeel]} ${bereik}` : staand === null ? "meet eerst staand" : bereik}
            />
            <Cijfer label="Romp" waarde={`${rond(live.romp)}°`} />
            <Cijfer label="Elleboog" waarde={`${rond(live.elleboog)}°`} />
            <Cijfer label="Cadans" waarde={`${rond(live.cadans, 0)} omw/min`} />
          </dl>
        )
      ) : modus === "voor" ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cijfer label="Oppervlak" waarde={schaal ? `${rond(live.oppervlak, 3)} m²` : "stuur aanklikken"} />
          <Cijfer label="Basis" waarde={basis !== null ? `${rond(basis, 3)} m²` : "–"} />
          <Cijfer label="T.o.v. basis" waarde={live.procent !== null ? `${live.procent > 0 ? "+" : ""}${rond(live.procent)} %` : "–"} />
          <Cijfer label="Schaal" waarde={schaal ? `${rond(schaal, 2)} mm/px` : "–"} />
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cijfer label="Knie nu" waarde={`${rond(live.knieNu)}°`} />
          <Cijfer label="Knie onderin" waarde={`${rond(live.knieOnder)}°`} />
          <Cijfer label="Min. staand" waarde={`${rond(knieGecorrigeerd)}°`} />
          <Cijfer label="Knie bovenin" waarde={`${rond(live.knieBoven)}°`} />
          <Cijfer label="Heup bovenin" waarde={`${rond(live.heupBoven)}°`} />
          <Cijfer label="Romp" waarde={`${rond(live.romp)}°`} />
          <Cijfer label="Elleboog" waarde={`${rond(live.elleboog)}°`} />
          <Cijfer label="Cadans" waarde={`${rond(live.cadans, 0)} omw/min`} />
        </dl>
      )}

      {modus === "voor" && grafiek.length > 1 ? <Grafiek reeks={grafiek} basis={basis} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-7 min-w-40 flex-1 rounded-md border bg-background px-2 text-sm"
          placeholder="Notitie, bijv. zadel P, beugel"
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={status !== "aan" || bevroren !== null} onClick={legLiveVast}>
          Leg vast
        </Button>
        {!proef ? null : bevroren ? (
          <>
            <span className="text-sm">
              {bevroren.modus === "zij"
                ? `Klik heup, knie, enkel (${handPunten.length}/3)`
                : `Klik de omtrek van de renner (${handPunten.length})`}
            </span>
            <Button size="sm" variant="outline" onClick={() => setHandPunten((p) => p.slice(0, -1))} disabled={!handPunten.length}>
              Ongedaan
            </Button>
            <Button size="sm" onClick={legControleVast} disabled={handWaarde === null}>
              Vergelijk
            </Button>
            <Button size="sm" variant="ghost" onClick={hervat}>
              Hervat
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={status !== "aan"} onClick={bevries}>
            Bevries en meet na
          </Button>
        )}
      </div>

      {bevroren ? (
        <p className="text-sm text-muted-foreground">
          Model {bevroren.modus === "zij" ? `${rond(bevroren.knie)}°` : `${rond(bevroren.oppervlak, 3)} m²`} · hand{" "}
          {bevroren.modus === "zij" ? `${rond(handWaarde)}°` : `${rond(handWaarde, 3)} m²`}
        </p>
      ) : null}

      {log.length > 0 ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            {proef ? (
              <>
                <Button size="sm" variant="outline" onClick={() => void kopieer()}>
                  {gekopieerd ? "Gekopieerd" : "Kopieer CSV"}
                </Button>
                <Button size="sm" variant="outline" onClick={bewaarCsv}>
                  Bewaar CSV
                </Button>
              </>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setLog([])}>
              Wissen
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {[...new Set(log.flatMap((r) => Object.keys(r)))].map((k) => (
                    <th key={k} className="px-2 py-1 text-left font-medium">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((r, i) => (
                  <tr key={i} className="border-t">
                    {[...new Set(log.flatMap((x) => Object.keys(x)))].map((k) => (
                      <td key={k} className="px-2 py-1 tabular-nums">
                        {typeof r[k] === "number" ? rond(r[k] as number, proef ? 3 : 1) : (r[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Cijfer({ label, waarde, sub }: { label: string; waarde: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{waarde}</dd>
      {sub ? <dd className="text-xs text-muted-foreground">{sub}</dd> : null}
    </div>
  );
}

/** Oppervlak per seconde, als procent van de basis (of van het eerste punt). */
function Grafiek({ reeks, basis }: { reeks: Monster[]; basis: number | null }) {
  const ref = basis ?? reeks[0].v;
  const pct = reeks.map((m) => ({ t: m.t, v: ((m.v - ref) / ref) * 100 }));
  const tMax = Math.max(60, pct[pct.length - 1].t);
  const grens = Math.max(5, ...pct.map((p) => Math.abs(p.v)));
  const B = 600;
  const H = 140;
  const x = (t: number) => (t / tMax) * B;
  const y = (v: number) => H / 2 - (v / grens) * (H / 2 - 6);
  return (
    <figure className="rounded-lg border bg-card p-2">
      <svg viewBox={`0 0 ${B} ${H}`} className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="Oppervlak in de tijd">
        <line x1={0} x2={B} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.25} />
        <polyline
          fill="none"
          stroke="var(--color-primary, #0aa)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          points={pct.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")}
        />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>0 min</span>
        <span>±{rond(grens, 0)} %</span>
        <span>{rond(tMax / 60, 0)} min</span>
      </figcaption>
    </figure>
  );
}
