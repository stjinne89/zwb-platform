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
