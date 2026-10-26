import { Alfa_Slab_One, Cabin_Sketch, Courier_Prime, Kalam } from "next/font/google";

// Alleen voorZpWelBokaal gebruikt deze letters: het emaille bord (Alfa Slab
// One), krijt op de lei (Cabin Sketch voor koppen, Kalam voor namen en
// quoteringen) en de typemachine van het wedbriefje (Courier Prime). Gekozen in
// het voorstel van 2026-10-19. Zonder preload, zodat ze pas laden op deze pagina's.
export const signFont = Alfa_Slab_One({ variable: "--font-bk-sign", subsets: ["latin"], weight: "400", preload: false });
export const chalkHeadFont = Cabin_Sketch({ variable: "--font-bk-chalk-head", subsets: ["latin"], weight: "700", preload: false });
export const chalkFont = Kalam({ variable: "--font-bk-chalk", subsets: ["latin"], weight: ["400", "700"], preload: false });
export const slipFont = Courier_Prime({ variable: "--font-bk-slip", subsets: ["latin"], weight: ["400", "700"], preload: false });

export const bokaalFontVariables = [signFont, chalkHeadFont, chalkFont, slipFont].map((f) => f.variable).join(" ");
