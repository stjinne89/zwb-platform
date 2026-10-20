// Het spiekbriefje als papier: gelinieerd crème met een gouden kantlijn, een
// strook teal plakband en gescheurde randen, in handschrift. Gedeeld door het
// spiekbriefje van de TTT Planner en het racebriefje bij een ZRL-race.
//
// Het briefje is papier, ook in het donkere thema (dan iets gedimd): de kleuren
// hieronder zijn inkt op papier, geen thema-tokens.

import { Shantell_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

// Handschrift met duidelijke cijfers: een 1 die niet op een l lijkt. De assen
// INFM (informeel) en BNCE (dansende letters) maken het meer geschreven; de
// koppen het sterkst.
export const hand = Shantell_Sans({ subsets: ["latin"], weight: "variable", axes: ["BNCE", "INFM"], display: "swap" });
export const HAND_TEXT = "[font-variation-settings:'INFM'_70,'BNCE'_25]";
export const HAND_HEADING = "[font-variation-settings:'INFM'_100,'BNCE'_50]";

// Inkt op papier.
export const INK = "#1d3540";
export const PENCIL = "#55707a";
export const RED = "#b3261e";
export const GREEN = "#0f6e56";
export const TEAL = "#1f6068";
export const RULE = "border-[#d6dfdc] dark:border-[#c7cec6]";
export const HIGHLIGHT = "bg-[rgba(232,190,90,0.45)] box-decoration-clone px-1";

export function PaperTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-lg font-bold leading-tight", HAND_HEADING, className)}>{children}</h3>;
}

// Gescheurde randjes: een masker van getande stroken langs de randen plus een
// vlak in het midden. De bovenkant is uit een schrift gescheurd en het grilligst;
// de tegels zijn ongelijk breed, zodat de herhaling niet opvalt.
const edge = (w: number, h: number, points: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><polygon points='${points}'/></svg>`)}")`;
const TORN = {
  top: edge(126, 14, "0,14 0,7 4,1 7,4 12,1 19,9 21,3 23,5 29,7 31,3 35,9 41,2 43,10 49,5 52,9 54,11 56,3 61,2 66,10 68,10 71,11 73,4 79,6 84,2 86,9 92,2 94,10 97,1 104,10 111,4 117,8 119,11 125,9 126,7 126,14"),
  bottom: edge(98, 9, "0,0 98,0 98,5 96,8 91,5 84,5 81,7 77,6 68,2 60,7 56,5 47,4 43,8 38,8 33,4 27,6 20,5 14,3 9,6 0,5"),
  left: edge(8, 91, "8,0 8,91 5,91 5,88 3,83 5,72 2,64 3,59 6,54 5,43 4,32 5,23 2,14 5,5 5,0"),
  right: edge(8, 77, "0,0 0,77 5,77 7,71 6,65 4,57 5,50 5,46 7,35 8,30 5,24 2,15 5,4 5,0"),
};
const tornMask = {
  image: `${TORN.top}, ${TORN.bottom}, ${TORN.left}, ${TORN.right}, linear-gradient(#000, #000)`,
  position: "left top, left bottom, left top, right top, 8px 14px",
  size: "126px 14px, 98px 9px, 8px 91px, 8px 77px, calc(100% - 16px) calc(100% - 23px)",
  repeat: "repeat-x, repeat-x, repeat-y, repeat-y, no-repeat",
};
const PAPER_STYLE: React.CSSProperties = {
  color: INK,
  maskImage: tornMask.image,
  maskPosition: tornMask.position,
  maskSize: tornMask.size,
  maskRepeat: tornMask.repeat,
  WebkitMaskImage: tornMask.image,
  WebkitMaskPosition: tornMask.position,
  WebkitMaskSize: tornMask.size,
  WebkitMaskRepeat: tornMask.repeat,
};

/** Een briefje met kop; de kop krijgt `id` zodat de sectie ernaar kan verwijzen. */
export function SpiekPaper({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="w-full px-1 pt-3 pb-1 sm:px-3">
      {/* De schaduw zit op de omhulling: drop-shadow volgt de gescheurde rand. */}
      <div className="relative mx-auto max-w-5xl [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.16))_drop-shadow(0_5px_10px_rgba(0,0,0,0.08))] sm:-rotate-[0.6deg]">
        <div
          className={cn(hand.className, HAND_TEXT, "relative bg-[#fbf7ea] pt-8 pr-5 pb-7 pl-10 sm:pr-8 sm:pl-14 dark:bg-[#e6dfcc]")}
          style={PAPER_STYLE}
        >
          <span aria-hidden className="absolute inset-y-0 left-6 border-l-[1.5px] border-[#c9a15a] sm:left-10" />
          <h2 id={id} className={cn("text-2xl font-bold leading-tight", HAND_HEADING)}>
            <span className="border-b-2" style={{ borderColor: INK }}>
              {title}
            </span>
          </h2>
          {children}
        </div>
        <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-3 bg-[rgba(31,96,104,0.28)]" />
        <span aria-hidden className="absolute -right-3 -bottom-1 h-5 w-16 -rotate-[38deg] bg-[rgba(31,96,104,0.22)]" />
      </div>
    </section>
  );
}
