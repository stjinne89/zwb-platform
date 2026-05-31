export const WORKOUT_INTENSITIES = [
  "recovery",
  "endurance",
  "tempo",
  "threshold",
  "vo2max",
  "anaerobic",
  "race",
  "rest",
] as const;

export type WorkoutIntensity = (typeof WORKOUT_INTENSITIES)[number];

export type WorkoutBlock = {
  label: string;
  durationMinutes: number;
  target: string;
  notes: string;
  intensity: WorkoutIntensity;
};

export const INTENSITY_COLORS: Record<WorkoutIntensity, string> = {
  recovery: "#38bdf8",
  endurance: "#22c55e",
  tempo: "#facc15",
  threshold: "#f97316",
  vo2max: "#ef4444",
  anaerobic: "#a855f7",
  race: "#ec4899",
  rest: "#94a3b8",
};

export const INTENSITY_LABELS: Record<WorkoutIntensity, string> = {
  recovery: "Herstel",
  endurance: "Duur",
  tempo: "Tempo",
  threshold: "Drempel",
  vo2max: "VO2max",
  anaerobic: "Anaeroob",
  race: "Race",
  rest: "Rust",
};

export function defaultTrainingPrompt() {
  return [
    "Je bent een Nederlandse wielercoach-assistent voor ZWB Cycling.",
    "Maak veilige, realistische concept-workouts voor review door een menselijke trainer.",
    "Geef geen medisch advies. Respecteer beschikbaarheid, max uren per week, herstel en bekende risiconotities.",
    "Bouw gestructureerde workouts met duidelijke blokken: warming-up, kern, herstel en cooling-down.",
    "Beschrijf elk trainingsblok met RPE plus doelwattage of wattagerange wanneer FTP bekend is, bijvoorbeeld 'RPE 6, 210-235w'.",
    "Als FTP ontbreekt, gebruik RPE en korte gevoelstaal.",
    "Kies targetType bij voorkeur 'power' wanneer FTP bekend is.",
    "Gebruik Nederlands in titel, samenvatting, beschrijving en bloknotities.",
    "Maak een concept dat de trainer daarna kan redigeren; wees concreet maar niet dogmatisch.",
    "Als er herstel-data (wellness) is meegegeven, weeg die mee: bij state 'fatigued', lage readiness, weinig slaap of verhoogde rust-hartslag plan je voorzichtiger — stel zware blokken (threshold/vo2max/anaerobic) uit of vervang ze door endurance/herstel, en benoem dit kort in cautions. Bij state 'fresh' mag een zwaardere sleutelsessie.",
    "Periodiseer: bouw belasting progressief op met 2-4 opbouwweken gevolgd door een herstelweek; vermijd te grote sprongen in wekelijkse belasting.",
    "Plan rond de target_date naartoe met een taper (laatste ~1-2 weken volume omlaag, intensiteit/scherpte behouden) zodat de renner fris aan het doel start.",
    "Houd rekening met aankomende events/races (indien meegegeven): plan eromheen — geen zware sleutelsessie vlak vóór een race, en gebruik races eventueel als kwaliteitsprikkel.",
    "Gebruik intervals.icu-belasting indien meegegeven: bij sterk negatieve TSB (form) bouw je herstel in; bij hoge ramp_rate matig je de opbouw. Stem het wattage af op de eFTP wanneer die afwijkt van de profiel-FTP.",
    "Respecteer de beschikbare dagen en max uren/week strikt; verdeel sleutelsessies met voldoende herstel ertussen.",
  ].join("\n");
}

// Adaptieve dag-prompt: bovenop de basisprincipes een expliciet beslis-raamwerk
// voor een dagelijks flexibel schema. Veiligheids-bias: bij twijfel of bij
// tegenstrijdige signalen kies je minder belasting (blessurepreventie).
export function adaptiveDailyPrompt() {
  return [
    defaultTrainingPrompt(),
    "",
    "Dit is een DAGELIJKSE AANPASSING van een bestaand plan, geen nieuw plan.",
    "Behoud de plan-intentie en periodisering richting het doel: wijzig alleen de workouts van vandaag en de komende dagen van deze week; laat de verdere toekomst ongemoeid.",
    "Veiligheidsregel: bij twijfel, tegenstrijdige signalen of onvolledige data kies je de voorzichtigere optie (minder belasting). Leg elke aanpassing kort uit in cautions.",
    "Pas het schema aan op basis van de meegegeven signalen, volgens dit beslis-raamwerk:",
    "1) Workout zwaarder uitgevallen (yesterday.actualLoad/actualMinutes duidelijk hoger dan gepland): maak de eerstvolgende sessie(s) lichter of vervang door herstel/endurance; voorkom opstapeling van vermoeidheid.",
    "2) Te moe (today.feeling='tired', lage readiness, hoge ATL of verhoogde rust-HR): verlaag duur en intensiteit; vervang een sleutelsessie (threshold/vo2max/anaerobic) door endurance, hersteltraining of rust. Forceer geen kwaliteit.",
    "3) Geen/weinig tijd vandaag (today.availableMinutes lager dan de geplande duur): comprimeer de sessie tot binnen de beschikbare tijd — behoud zo veel mogelijk de kernprikkel in een kortere vorm, of verschuif de sleutelsessie en plan vandaag een korte onderhoudsrit. Overschrijd de beschikbare minuten nooit.",
    "4) Frisser dan verwacht (today.feeling='fresh', hoge readiness, positieve TSB): je mág kwaliteit toevoegen of een sessie iets zwaarder maken, maar blijf binnen de weeklimiet en ga niet ten koste van de volgende geplande sleutelsessie.",
    "Combineer signalen verstandig (bv. fris maar weinig tijd = korte, scherpe sessie). Geef altijd een concreet, uitvoerbaar voorstel voor vandaag.",
  ].join("\n");
}

function asIntensity(value: unknown, fallback: WorkoutIntensity): WorkoutIntensity {
  const text = String(value ?? "").toLowerCase();
  return (WORKOUT_INTENSITIES as readonly string[]).includes(text) ? (text as WorkoutIntensity) : fallback;
}

function positiveMinutes(value: unknown, fallback = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(480, Math.max(1, Math.round(n)));
}

export function normalizeWorkoutBlocks(value: unknown, fallbackIntensity: WorkoutIntensity = "endurance") {
  if (!Array.isArray(value)) return [] satisfies WorkoutBlock[];
  return value
    .map((row): WorkoutBlock => {
      const record = (row ?? {}) as Record<string, unknown>;
      return {
        label: String(record.label ?? "Blok").trim() || "Blok",
        durationMinutes: positiveMinutes(record.durationMinutes),
        target: String(record.target ?? "").trim(),
        notes: String(record.notes ?? "").trim(),
        intensity: asIntensity(record.intensity, fallbackIntensity),
      };
    })
    .filter((block) => block.durationMinutes > 0);
}

export function blocksFromForm(formData: FormData, fallbackIntensity: WorkoutIntensity = "endurance") {
  const labels = formData.getAll("block_label").map(String);
  const durations = formData.getAll("block_duration").map(String);
  const targets = formData.getAll("block_target").map(String);
  const notes = formData.getAll("block_notes").map(String);
  const intensities = formData.getAll("block_intensity").map(String);
  const deletes = formData.getAll("block_delete").map(String);
  const max = Math.max(labels.length, durations.length, targets.length, notes.length, intensities.length);
  const blocks: WorkoutBlock[] = [];

  for (let i = 0; i < max; i++) {
    if (deletes[i] === "1") continue;
    const label = (labels[i] ?? "").trim();
    const target = (targets[i] ?? "").trim();
    const note = (notes[i] ?? "").trim();
    const durationMinutes = positiveMinutes(durations[i], 0);
    if (!label && !target && !note && durationMinutes <= 0) continue;
    blocks.push({
      label: label || "Blok",
      durationMinutes: durationMinutes || 5,
      target,
      notes: note,
      intensity: asIntensity(intensities[i], fallbackIntensity),
    });
  }

  return blocks;
}

function targetForIntervals(target: string) {
  const text = target.trim();
  const wattRange = text.match(/(\d+)\s*-\s*(\d+)\s*w/i);
  if (wattRange) return `${wattRange[1]}-${wattRange[2]}w`;
  const watt = text.match(/(\d+)\s*w/i);
  if (watt) return `${watt[1]}w`;
  const ftpRange = text.match(/(\d+)\s*-\s*(\d+)\s*%/);
  if (ftpRange) return `${ftpRange[1]}-${ftpRange[2]}%`;
  const ftp = text.match(/(\d+)\s*%/);
  if (ftp) return `${ftp[1]}%`;
  return text;
}

export function blocksToIntervalsText(blocks: WorkoutBlock[]) {
  return blocks
    .map((block) => {
      const target = targetForIntervals(block.target);
      const suffix = [target, block.notes].filter(Boolean).join(" ");
      return `- ${block.durationMinutes}m${suffix ? ` ${suffix}` : ""}`;
    })
    .join("\n");
}

// Standaard %FTP per intensiteit als een blok geen leesbaar wattage/%-doel heeft.
const INTENSITY_FTP_PCT: Record<WorkoutIntensity, number> = {
  rest: 40,
  recovery: 50,
  endurance: 65,
  tempo: 80,
  threshold: 95,
  vo2max: 110,
  anaerobic: 125,
  race: 100,
};

function clampPct(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(200, Math.max(20, Math.round(value)));
}

// Zet één blok-doel ("75%", "60-75%", "210w", "210-235w", "Vrij") om naar een
// %FTP-waarde. Watt-doelen worden via de FTP omgerekend; ranges nemen het
// middelpunt. Zonder bruikbaar doel valt het terug op de intensiteit. %FTP is
// draagbaar: Wahoo/Garmin past de eigen FTP van de renner toe.
function blockToFtpPct(block: WorkoutBlock, ftp: number | null): number | null {
  const text = (block.target ?? "").trim();
  const ftpRange = text.match(/(\d+)\s*-\s*(\d+)\s*%/);
  if (ftpRange) return clampPct((Number(ftpRange[1]) + Number(ftpRange[2])) / 2);
  const ftpSingle = text.match(/(\d+)\s*%/);
  if (ftpSingle) return clampPct(Number(ftpSingle[1]));
  const wattRange = text.match(/(\d+)\s*-\s*(\d+)\s*w/i);
  if (wattRange && ftp && ftp > 0) {
    const watts = (Number(wattRange[1]) + Number(wattRange[2])) / 2;
    return clampPct((watts / ftp) * 100);
  }
  const wattSingle = text.match(/(\d+)\s*w/i);
  if (wattSingle && ftp && ftp > 0) {
    return clampPct((Number(wattSingle[1]) / ftp) * 100);
  }
  return clampPct(INTENSITY_FTP_PCT[block.intensity]);
}

// Bouwt een NATIVE intervals.icu workout_doc uit onze blokken. Dit is de bron
// voor de FIT-export (Garmin/Wahoo). intervals parseert de description NIET
// server-side, dus zonder een geldig workout_doc bevat de FIT 0 stappen en
// weigeren apparaten het als "corrupt". Schema dat intervals accepteert:
//   { duration, steps: [{ duration: <sec>, power: { units: "%ftp", value } }] }
// We houden bewust alleen `duration` + `power.value` aan (geen extra velden zoals
// label/target-strings) omdat afwijkende velden de FIT-generator deden crashen.
export function blocksToWorkoutDoc(
  blocks: WorkoutBlock[],
  ftp: number | null,
): { duration: number; steps: Array<Record<string, unknown>> } | null {
  const steps = blocks
    .filter((block) => block.durationMinutes > 0)
    .map((block) => {
      const pct = blockToFtpPct(block, ftp);
      const duration = Math.round(block.durationMinutes * 60);
      const step: Record<string, unknown> = { duration };
      if (pct != null) step.power = { units: "%ftp", value: pct };
      return step;
    });
  if (steps.length === 0) return null;
  const duration = steps.reduce((total, step) => total + Number(step.duration), 0);
  return { duration, steps };
}

export function estimateTrainingLoad(blocks: WorkoutBlock[]) {
  const factors: Record<WorkoutIntensity, number> = {
    rest: 0,
    recovery: 0.45,
    endurance: 0.6,
    tempo: 0.78,
    threshold: 0.95,
    vo2max: 1.15,
    anaerobic: 1.3,
    race: 1.05,
  };
  return Math.round(
    blocks.reduce((total, block) => total + block.durationMinutes * factors[block.intensity], 0),
  );
}

export function projectCtl(initialCtl: number | null | undefined, dailyLoads: Array<{ date: string; load: number }>) {
  if (initialCtl === null || initialCtl === undefined || !Number.isFinite(initialCtl)) return null;
  let ctl = Number(initialCtl);
  for (const day of dailyLoads.sort((a, b) => a.date.localeCompare(b.date))) {
    ctl += (Number(day.load || 0) - ctl) / 42;
  }
  return Math.round(ctl * 10) / 10;
}
