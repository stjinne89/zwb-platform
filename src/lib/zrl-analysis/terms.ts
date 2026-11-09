// Begrippen in de race-analyse, met een korte uitleg. De pagina van een race
// toont ze achter het begrip zelf (tik erop); /hulp#racen-begrippen zet ze
// onder elkaar. Op verzoek van de eigenaar (2026-11-09): "met daar telkens
// uitleg wanneer je ingewikkelde begrippen gebruikt".

export const RACE_TERMS = {
  np: {
    label: "NP",
    title: "Genormaliseerd vermogen (NP)",
    text: "Wat je rit je lichaam kostte, uitgedrukt als een constant vermogen. Versnellingen tellen zwaarder dan rustig rijden, dus in een grillige race ligt NP boven je gemiddelde.",
  },
  if: {
    label: "IF",
    title: "Intensiteit (IF)",
    text: "Je NP gedeeld door je FTP. 1,00 is een uur volle bak; een korte race ligt er vaak boven. Rond 1,05 of hoger over meer dan een uur betekent meestal dat je FTP te laag staat.",
  },
  vi: {
    label: "VI",
    title: "Variabiliteit (VI)",
    text: "NP gedeeld door je gemiddelde vermogen. 1,00 is een tijdrit op constant vermogen; boven 1,10 was het een race met veel aanzetten en rustige stukken.",
  },
  ftp: {
    label: "FTP",
    title: "FTP",
    text: "Het vermogen dat je ongeveer een uur kunt volhouden. De app rekent met de FTP van je profiel; intervals.icu schat er zelf ook een uit je ritten.",
  },
  cp: {
    label: "CP",
    title: "Critical power (CP)",
    text: "De grens waarboven je vermogen je reserve aanspreekt. Ligt meestal net boven je FTP. Onder CP vult je reserve zich weer.",
  },
  wbal: {
    label: "W′",
    title: "W′ en W′-balans",
    text: "W′ (W-accent) is je reserve boven CP, in kilojoule: de energie voor aanvallen, klimmen en sprints. De W′-balans is hoeveel ervan over is: 100% is vol, 0% is op. Onder nul kan niet echt; dan klopt het model niet bij deze race.",
  },
  model: {
    label: "model",
    title: "Het W′-model",
    text: "CP en W′ samen. De app neemt het model dat intervals.icu na deze rit gebruikt; zonder dat model een schatting uit je beste vermogens van de afgelopen 90 dagen, met deze race erbij.",
  },
  kj: {
    label: "kJ",
    title: "Kilojoule (kJ)",
    text: "De arbeid die je leverde. Ongeveer gelijk aan de kilocalorieën die je verbrandde, omdat je lichaam maar zo'n kwart van de energie omzet in trapkracht.",
  },
  decoupling: {
    label: "decoupling",
    title: "Decoupling",
    text: "Hoeveel je watt per hartslag in de tweede helft daalt tegenover de eerste. Onder 5% is je duurvermogen in orde. In een race met klimmen en afdalingen zegt het minder dan in een tijdrit.",
  },
  hrr: {
    label: "hartslagherstel",
    title: "Hartslagherstel",
    text: "Hoeveel slagen je hartslag zakt in de minuut na je zwaarste inspanning. Meer slagen betekent sneller herstel; het verschilt per persoon, dus vergelijk vooral met jezelf.",
  },
  lthr: {
    label: "LTHR",
    title: "Drempelhartslag (LTHR)",
    text: "Je hartslag rond je FTP, zoals ingesteld in intervals.icu. Tijd erboven is tijd in het rood.",
  },
  form: {
    label: "vorm",
    title: "Fitheid, vermoeidheid en vorm",
    text: "Fitheid (CTL) is je trainingsbelasting van de laatste zes weken, vermoeidheid (ATL) die van de laatste week. Vorm is fitheid min vermoeidheid: onder −10 ben je flink moe, rond 0 tot +10 fris.",
  },
  hrv: {
    label: "HRV",
    title: "Hartslagvariabiliteit (HRV)",
    text: "Hoe sterk de tijd tussen hartslagen varieert, gemeten in rust. Lager dan je eigen gewoonte wijst op vermoeidheid of stress. Alleen te vergelijken met jezelf.",
  },
  vam: {
    label: "VAM",
    title: "VAM",
    text: "Hoeveel meter je per uur stijgt. Een maat voor klimmen die niet van de lengte van de klim afhangt.",
  },
  torque: {
    label: "koppel",
    title: "Koppel",
    text: "De kracht waarmee je op de pedalen duwt, in newtonmeter. Hoog koppel bij lage cadans is zwaar voor je spieren; lichter schakelen spaart ze.",
  },
  durability: {
    label: "durability",
    title: "Durability",
    text: "Hoeveel vermogen je nog hebt na veel arbeid. intervals.icu houdt je beste vermogens bij na 1000 en 2000 kJ; dichtbij je frisse waarden betekent dat je lang sterk blijft.",
  },
  zrs: {
    label: "ZRS",
    title: "Zwift Racing Score (ZRS)",
    text: "De score van Zwift die bepaalt in welke categorie je rijdt. Hij stijgt als je beter eindigt dan renners met een hogere score, en daalt andersom.",
  },
  compliance: {
    label: "compliance",
    title: "Compliance",
    text: "Hoeveel van de geplande training je volgens intervals.icu deed, naar belasting. 100% is precies wat er gepland stond.",
  },
} as const satisfies Record<string, { label: string; title: string; text: string }>;

export type RaceTermKey = keyof typeof RACE_TERMS;
