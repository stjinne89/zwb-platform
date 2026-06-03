"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ZwbMark } from "@/components/zwb-logo";

type Chapter = {
  id: string;
  era: string;
  title: string;
  body: string;
  stat: string;
  label: string;
  background: string;
  riderCount: number;
  kit: {
    name: string;
    primary: string;
    secondary: string;
    accent: string;
    sleeve: string;
    shorts: string;
    text: string;
    motif: "blank" | "comic" | "bands" | "modern";
  };
};

const chapters: Chapter[] = [
  {
    id: "basis",
    era: "Het begin",
    title: "Eerst gewoon rijden",
    body:
      "De basis is simpel: een renner, een fiets en zin om samen harder te rijden. Nog geen uitgesproken shirt, wel al het begin van herkenning.",
    stat: "1 renner, 1 idee",
    label: "Blanco shirt",
    background: "linear-gradient(140deg, #f4f0e9 0%, #f8f7f2 54%, #dde7e3 100%)",
    riderCount: 1,
    kit: {
      name: "Blanco",
      primary: "#f8f7f2",
      secondary: "#ffffff",
      accent: "#cfd8d3",
      sleeve: "#f8f7f2",
      shorts: "#1e2544",
      text: "#10252d",
      motif: "blank",
    },
  },
  {
    id: "anders",
    era: "Indoor jaren",
    title: "Net effe anders",
    body:
      "Daarna kwam het eerste echte clubgevoel: felblauw, roze en de grote Z. Niet subtiel, wel precies herkenbaar genoeg om elkaar in het peloton te vinden.",
    stat: "Zwift, Discord, koersdrang",
    label: "Z-shirt",
    background: "linear-gradient(140deg, #f4f0e9 0%, #f7f4ee 52%, #d7e9ff 100%)",
    riderCount: 2,
    kit: {
      name: "Net effe anders",
      primary: "#2563eb",
      secondary: "#91c8ee",
      accent: "#f05a8b",
      sleeve: "#1d4ed8",
      shorts: "#1e2544",
      text: "#f7f4ee",
      motif: "comic",
    },
  },
  {
    id: "team",
    era: "Teamfase",
    title: "Van losse rijders naar ploeg",
    body:
      "De stijl werd strakker, de groep serieuzer. Het VBTM/Tactic-shirt markeert de periode waarin ZWB meer team, meer competitie en meer structuur kreeg.",
    stat: "ZRL, teams, afspraken",
    label: "VBTM kit",
    background: "linear-gradient(140deg, #f8f7f2 0%, #efe7d5 48%, #c5d6d5 100%)",
    riderCount: 4,
    kit: {
      name: "VBTM",
      primary: "#ffffff",
      secondary: "#0f5963",
      accent: "#b99453",
      sleeve: "#2e7780",
      shorts: "#111111",
      text: "#ffffff",
      motif: "bands",
    },
  },
  {
    id: "nu",
    era: "ZWB nu",
    title: "Een club met eigen ritme",
    body:
      "Het huidige shirt voelt volwassen: sponsorstructuur, vaste lijnen en een herkenbare identiteit. Daaromheen groeit het platform mee met trainingen, badges, live tracking, events en teams.",
    stat: "Platform, community, toekomst",
    label: "Hage kit",
    background: "linear-gradient(140deg, #fbfaf5 0%, #e7ece7 44%, #0d4e5c 100%)",
    riderCount: 7,
    kit: {
      name: "Hage",
      primary: "#f8f7f2",
      secondary: "#0d5360",
      accent: "#b8873d",
      sleeve: "#ffffff",
      shorts: "#111519",
      text: "#0d5360",
      motif: "modern",
    },
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getChapterTitle(chapter: Chapter) {
  return chapter.id === "basis" ? "Eerst gewoon rijden" : chapter.title;
}

function useScrollStory() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? clamp(window.scrollY / max) : 0);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}

function StoryRider({
  chapter,
  progress,
}: {
  chapter: Chapter;
  progress: number;
}) {
  const roadShift = progress * -240;
  const groundY = 430;
  const riderAssetBottom = 178 * 1.28;
  const riders = [
    { x: 255, scale: 1, opacity: 1 },
    { x: 96, scale: 0.78, opacity: 0.78 },
    { x: 418, scale: 0.76, opacity: 0.74 },
    { x: 28, scale: 0.58, opacity: 0.48 },
    { x: 560, scale: 0.58, opacity: 0.46 },
    { x: 170, scale: 0.5, opacity: 0.36 },
    { x: 690, scale: 0.5, opacity: 0.34 },
  ]
    .slice(0, chapter.riderCount)
    .map((rider) => ({
      ...rider,
      y: groundY - riderAssetBottom * rider.scale,
    }));

  return (
    <svg
      viewBox="0 0 980 520"
      role="img"
      aria-label={`Wielrenners in ${chapter.label}`}
      className="h-full w-full drop-shadow-[0_22px_26px_rgba(0,0,0,0.14)]"
    >
      <defs>
        <linearGradient id="story-road" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f9f6ef" />
          <stop offset="100%" stopColor="#d7d1c4" />
        </linearGradient>
        <pattern id="road-dashes" width="84" height="18" patternUnits="userSpaceOnUse">
          <rect x="0" y="7" width="38" height="4" rx="2" fill="rgba(255,255,255,0.9)" />
        </pattern>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#111827" floodOpacity="0.22" />
        </filter>
      </defs>

      <g opacity="0.65" transform={`translate(${roadShift % 84} 0)`}>
        <rect x="-120" y="430" width="1220" height="34" fill="url(#road-dashes)" />
      </g>
      <ellipse cx="500" cy="456" rx="395" ry="25" fill="#111827" opacity="0.09" />

      <g filter="url(#soft-shadow)">
        {riders
          .slice()
          .reverse()
          .map((rider, index) => (
            <StickCyclist
              key={`${chapter.id}-${index}`}
              kit={chapter.kit}
              x={rider.x}
              y={rider.y}
              scale={rider.scale}
              opacity={rider.opacity}
              featured={index === riders.length - 1}
            />
          ))}
      </g>
    </svg>
  );
}

function StickCyclist({
  kit,
  x,
  y,
  scale,
  opacity,
  featured,
}: {
  kit: Chapter["kit"];
  x: number;
  y: number;
  scale: number;
  opacity: number;
  featured: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <g transform="scale(1.28)">
        <image
          href="/story/riders/cyclist-base.svg"
          x="0"
          y="0"
          width="202.96"
          height="202.96"
          opacity="0.94"
        />
        <JerseyOverlay kit={kit} featured={featured} />
      </g>
    </g>
  );
}

function JerseyOverlay({ kit, featured }: { kit: Chapter["kit"]; featured: boolean }) {
  const strokeWidth = featured ? 1.9 : 1.4;

  const jersey = (
    <g stroke="#101820" strokeLinejoin="round" strokeWidth={strokeWidth}>
      <path
        d="M61 55 C73 46 91 43 114 48 L143 54 C151 56 157 62 161 72 L151 91 C132 86 112 80 95 75 C81 71 69 69 58 69Z"
        fill={kit.primary}
      />
      <path
        d="M62 67 C83 70 111 78 153 89 L145 105 C121 99 94 91 74 83 C65 79 61 74 62 67Z"
        fill={kit.secondary}
        opacity="0.94"
      />
      <path
        d="M144 58 C155 63 164 72 170 82 L163 95 C154 85 144 78 133 74Z"
        fill={kit.sleeve}
      />
    </g>
  );

  if (kit.motif === "blank") {
    return (
      <g>
        {jersey}
        <path d="M72 61 L142 74" stroke={kit.accent} strokeWidth={featured ? 2.6 : 2} opacity="0.9" />
      </g>
    );
  }
  if (kit.motif === "comic") {
    return (
      <g>
        {jersey}
        <path
          d="M91 57 L99 51 L103 61 L114 57 L111 69 L121 76 L109 78 L108 90 L98 82 L88 91 L90 78 L78 76 L88 68 L84 57Z"
          fill="#facc15"
          stroke="#171717"
          strokeWidth={featured ? 1.6 : 1.2}
        />
        <text x="99" y="77" textAnchor="middle" fontSize={featured ? 12 : 10} fontWeight="900" fill="#ec407a">
          Z
        </text>
      </g>
    );
  }
  if (kit.motif === "bands") {
    return (
      <g>
        {jersey}
        <path d="M65 65 L150 57 L158 70 L72 79Z" fill={kit.accent} opacity="0.95" />
        <path d="M72 79 L158 71 L150 90 L86 88Z" fill="#1f6068" opacity="0.9" />
        <text x="107" y="73" textAnchor="middle" fontSize={featured ? 8 : 6.5} fontWeight="800" fill="#ffffff">
          VBTM
        </text>
      </g>
    );
  }
  if (kit.motif === "modern") {
    return (
      <g>
        {jersey}
        <path d="M65 63 L152 56 L160 73 L73 82Z" fill={kit.accent} opacity="0.95" />
        <path d="M73 81 L160 73 L149 92 L86 88Z" fill="#6e8582" opacity="0.78" />
        <text x="108" y="76" textAnchor="middle" fontSize={featured ? 9 : 7} fontWeight="900" fill={kit.text}>
          Hage
        </text>
      </g>
    );
  }
  return null;
}

export function StoryExperience() {
  const progress = useScrollStory();
  const scaled = progress * (chapters.length - 1);
  const activeIndex = clamp(Math.round(scaled), 0, chapters.length - 1);
  const chapter = chapters[activeIndex];
  const chapterTitle = getChapterTitle(chapter);
  const chapterProgress = scaled - Math.floor(scaled);

  const stageStyle = useMemo(
    () => ({
      background: chapter.background,
    }),
    [chapter.background],
  );

  return (
    <main className="min-h-screen bg-[#f4efe7] text-[#15222a]">
      <section className="relative min-h-[520vh]">
        <div className="sticky top-0 flex min-h-screen overflow-hidden" style={stageStyle}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(90deg,#111_1px,transparent_1px),linear-gradient(#111_1px,transparent_1px)] [background-size:120px_120px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-[32rem] bg-[#101820] opacity-15 [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)]" />

          <header className="absolute left-5 top-5 z-20 flex items-center gap-3 md:left-8 md:top-7">
            <Link
              href="/verhaal"
              className="inline-flex items-center gap-3 rounded-md bg-white/76 px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white"
            >
              <ZwbMark className="h-6 w-20" />
              <span>Story</span>
            </Link>
          </header>

          <ChapterArrow direction="prev" index={activeIndex} />
          <ChapterArrow direction="next" index={activeIndex} />

          <div className="relative z-10 grid min-h-screen w-full grid-rows-[auto_1fr_auto] px-5 py-20 md:px-10 lg:grid-cols-[minmax(300px,0.62fr)_1.38fr] lg:grid-rows-1 lg:items-center lg:py-10">
            <div className="max-w-xl self-end lg:self-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b8873d]">
                {chapter.era}
              </p>
              <h1 className="mt-3 text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-7xl xl:text-8xl">
                Het verhaal van ZWB
              </h1>
              <p className="mt-5 max-w-md text-base font-medium leading-7 text-[#253640]">
                Scroll door de shirts, de ritten en de momenten die van een losse groep rijders een herkenbare community maakten.
              </p>
            </div>

            <div className="relative min-h-[42vh] self-center lg:min-h-[72vh]">
              <div className="absolute inset-x-0 top-1/2 h-[min(56vw,34rem)] -translate-y-1/2">
                <StoryRider chapter={chapter} progress={progress} />
              </div>
              <div className="absolute bottom-8 right-4 hidden w-56 rounded-md bg-white/72 p-3 text-xs shadow-sm backdrop-blur md:block">
                <div className="font-bold uppercase tracking-[0.16em] text-[#b8873d]">
                  Kit evolution
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-[#0d5360]"
                    style={{ width: `${Math.max(8, progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 font-semibold">{chapter.label}</p>
              </div>
            </div>

            <div className="relative z-10 -mt-10 max-w-xl self-start rounded-md border border-black/10 bg-white/82 p-5 shadow-sm backdrop-blur lg:absolute lg:bottom-14 lg:left-[min(44vw,34rem)] lg:mt-0 lg:w-[28rem]">
              <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-3">
                <span className="font-mono text-xs text-black/55">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d5360]">
                  {chapter.stat}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">
                {chapterTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-black/68 md:text-base">
                {chapter.body}
              </p>
              <div className="mt-4 flex gap-1">
                {chapters.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-label={`Ga naar ${getChapterTitle(item)}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex ? "w-12 bg-[#0d5360]" : "w-5 bg-black/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-center text-xs font-bold uppercase tracking-[0.26em] text-black/45 md:block"
            style={{ opacity: 1 - clamp(chapterProgress * 2) }}
          >
            Scroll verder
          </div>
        </div>

        {chapters.map((item) => (
          <section
            key={item.id}
            id={item.id}
            className="h-screen scroll-mt-0"
            aria-label={getChapterTitle(item)}
          />
        ))}
      </section>

      <section className="bg-[#101820] px-5 py-20 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.75fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b8873d]">
              Volgende iteratie
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              Van prototype naar echte story
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-white/72 md:text-base">
            <p>
              Dit prototype gebruikt gestileerde vectorrenners. De volgende stap is de shirts en fietsposes preciezer tekenen op basis van de aangeleverde referenties.
            </p>
            <p>
              Daarna kunnen echte fotohoofdstukken, ledenquotes en mijlpalen worden toegevoegd zonder de scrollbasis opnieuw te bouwen.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-md bg-white px-4 py-2 text-sm font-bold text-[#101820] transition hover:bg-[#f2eadc]"
            >
              Naar ZWB
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ChapterArrow({
  direction,
  index,
}: {
  direction: "prev" | "next";
  index: number;
}) {
  const target =
    direction === "prev"
      ? chapters[Math.max(0, index - 1)]
      : chapters[Math.min(chapters.length - 1, index + 1)];
  const disabled =
    (direction === "prev" && index === 0) ||
    (direction === "next" && index === chapters.length - 1);

  return (
    <a
      href={`#${target.id}`}
      aria-label={direction === "prev" ? "Vorige hoofdstuk" : "Volgende hoofdstuk"}
      className={`absolute top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full text-white transition md:inline-flex ${
        direction === "prev" ? "left-6" : "right-6"
      } ${disabled ? "pointer-events-none opacity-25" : "opacity-80 hover:bg-white/15 hover:opacity-100"}`}
    >
      {direction === "prev" ? (
        <ChevronLeft className="size-9" />
      ) : (
        <ChevronRight className="size-9" />
      )}
    </a>
  );
}
