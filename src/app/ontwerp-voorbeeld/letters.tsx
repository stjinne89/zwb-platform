import type { CSSProperties } from "react";
import {
  Barlow_Semi_Condensed,
  Red_Hat_Display,
  Schibsted_Grotesk,
  Sofia_Sans,
} from "next/font/google";

// Letterproef voor het design "tegels": dezelfde tegels in vijf letters, om er
// één te kiezen. Alleen op de voorbeeldpagina; de gekozen letter komt daarna in
// tegels-shell.tsx.

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], preload: false });
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  preload: false,
});
const redHat = Red_Hat_Display({ subsets: ["latin"], preload: false });
const sofia = Sofia_Sans({ subsets: ["latin"], preload: false });

const OPTIONS: Array<{ name: string; note: string; family: string; stretch: string }> = [
  {
    name: "1. Archivo",
    note: "De huidige: zakelijk en strak, koppen smaller gezet.",
    family: "var(--font-tegels), system-ui, sans-serif",
    stretch: "88%",
  },
  {
    name: "2. Schibsted Grotesk",
    note: "Rustig en eigentijds, met iets meer karakter in de letters.",
    family: `${schibsted.style.fontFamily}, system-ui, sans-serif`,
    stretch: "100%",
  },
  {
    name: "3. Barlow Semi Condensed",
    note: "Smal en sportief, zoals op wegborden en rugnummers.",
    family: `${barlow.style.fontFamily}, system-ui, sans-serif`,
    stretch: "100%",
  },
  {
    name: "4. Red Hat Display",
    note: "Geometrisch en modern, ronde vormen.",
    family: `${redHat.style.fontFamily}, system-ui, sans-serif`,
    stretch: "100%",
  },
  {
    name: "5. Sofia Sans",
    note: "Slank en elegant, het lichtst van de vijf.",
    family: `${sofia.style.fontFamily}, system-ui, sans-serif`,
    stretch: "100%",
  },
];

export function Letterproef() {
  return (
    <div className="space-y-10">
      {OPTIONS.map((option) => (
        <section
          key={option.name}
          className="tg-letterproef space-y-3"
          style={
            {
              "--tg-display": option.family,
              "--tg-stretch": option.stretch,
              fontFamily: option.family,
            } as CSSProperties
          }
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{option.name}</strong> · {option.note}
          </p>
          <p className="tg-display">Vandaag</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="tg-tile tg-zwbeter col-span-2">
              <span className="tg-tile-small">ZWBeter Worden · training vandaag</span>
              <span className="tg-tile-title mt-0.5">Sweet spot 3 × 12 min</span>
              <span className="mt-auto pt-4 text-[0.9375rem] tabular-nums">75 min · 233–246 W</span>
            </div>
            <div className="tg-tile tg-kalender">
              <span className="tg-tile-small">di 13 okt · Bdev</span>
              <span className="tg-tile-title mt-0.5">ZRL 2026/27 · R1 · W4</span>
              <span className="tg-tile-num">20:07</span>
            </div>
            <div className="tg-tile tg-club">
              <span className="tg-tile-small">Club · Zwift Racing League</span>
              <span className="tg-tile-title mt-0.5">ZRL Zwiftladies C</span>
              <span className="tg-tile-num">2e</span>
            </div>
          </div>
          <div className="flex items-end">
            {(["vandaag", "kalender", "zwbeter", "club", "meer"] as const).map((place, index) => (
              <span
                key={place}
                className={`tg-tab tg-${place} px-4`}
                style={{ height: index === 0 ? "3.25rem" : "2.5rem" }}
              >
                {["Vandaag", "Kalender", "ZWBeter", "Club", "Meer"][index]}
              </span>
            ))}
          </div>
          <p className="max-w-prose text-[0.9375rem]">
            Rustige duurrit van 60 minuten, onder 150 watt. Zaterdag om 09:00 vertrekt de clubrit
            vanaf Rheden: 82 km over de Veluwezoom, 12 doen mee.
          </p>
        </section>
      ))}
    </div>
  );
}
