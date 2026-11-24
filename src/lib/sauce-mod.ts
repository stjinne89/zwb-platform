// De Sauce-mod ZWB ZRL Live (sauce-mod/zwb-zrl-live): welke versie de nieuwste
// is en waar leden hem halen. De versie komt uit het manifest, zodat er maar één
// plek is om hem op te hogen. De mod vraagt hem op bij /api/live/sauce-mod en
// meldt een nieuwere versie.

import manifest from "../../sauce-mod/zwb-zrl-live/manifest.json";

export const SAUCE_MOD_VERSION: string = manifest.version;
export const SAUCE_MOD_DOWNLOAD = "/downloads/Sauce-mod-ZRL-live-installeren.bat";
export const SAUCE_MOD_HELP = "/hulp/wedstrijden#sauce-mod";
