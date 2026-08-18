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

export type WorkoutPowerTarget = {
  units: "%ftp" | "w";
  value?: number;
  start?: number;
  end?: number;
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

/**
 * Label voor een intensiteit die als losse string uit de database komt. Valt
 * terug op de ruwe waarde, zodat een onbekende intensiteit niet als leeg veld
 * in de UI belandt.
 */
export function intensityLabel(intensity: string | null | undefined): string {
  if (!intensity) return "";
  return INTENSITY_LABELS[intensity as WorkoutIntensity] ?? intensity;
}

/** %FTP naar intensiteit. Gebruikt om blokken uit een intervals.icu workout_doc
 * te classificeren. */
export function intensityFromPct(pct: number | null): WorkoutIntensity {
  if (pct == null) return "endurance";
  if (pct < 55) return "recovery";
  if (pct < 76) return "endurance";
  if (pct < 91) return "tempo";
  if (pct < 106) return "threshold";
  if (pct < 121) return "vo2max";
  return "anaerobic";
}

/**
 * Intensiteit uit belasting per uur (TSS/uur). Geeft null als er te weinig data
 * is, zodat een samenvatting "onbekend" kan onderscheiden van "duur" — de UI
 * gebruikt daarvoor de wrapper `intensityFromLoad` met een vaste terugval.
 */
export function detectIntensityFromLoad(
  load: number | null,
  minutes: number | null,
): WorkoutIntensity | null {
  if (!load || !minutes || minutes <= 0) return null;
  const loadPerHour = load / (minutes / 60);
  if (loadPerHour < 35) return "recovery";
  if (loadPerHour < 65) return "endurance";
  if (loadPerHour < 85) return "tempo";
  if (loadPerHour < 105) return "threshold";
  if (loadPerHour < 125) return "vo2max";
  return "anaerobic";
}

export function intensityFromLoad(
  load: number | null,
  minutes: number,
): WorkoutIntensity {
  return detectIntensityFromLoad(load, minutes) ?? "endurance";
}

export function defaultTrainingPrompt() {
  return [
    "Je bent een Nederlandse wielercoach-assistent voor ZWB Cycling.",
    "Maak veilige, realistische concept-workouts voor review door een menselijke trainer.",
    "Geef geen medisch advies. Respecteer beschikbaarheid, max uren per week, herstel en bekende risiconotities.",
    "goal.maxHoursPerWeek en availability zeggen hoeveel tijd het lid heeft, niet hoeveel het aankan. Het is geen budget dat het lid niet mag overschrijden, maar wél het volume waar het schema naartoe werkt: in de zwaarste week van een opbouwblok zit je er dicht tegenaan.",
    "Werk met de opbouwweken toe naar goal.maxHoursPerWeek. In de piekweek van een blok plan je minstens 85% van dat plafond, tenzij herstelwaarden, TSB of ramp_rate dat verbieden — en benoem die reden dan in cautions. Herstelweken en een eventuele taper liggen bewust lager; die tellen hier niet mee.",
    "Plan een opbouwweek nooit onder recentLoad.hoursPerWeek: dat is wat het lid nu al uit zichzelf rijdt. Een schema dat daar structureel onder blijft is geen training maar een rem. Wijk daar alleen van af bij een concreet vermoeidheidssignaal, en leg dat uit in cautions.",
    "Reed het lid in een voorbije week méér dan dat plafond, dan is dat op zichzelf GEEN reden om de komende week af te remmen, te compenseren of het volume te verlagen. Plan gewoon binnen het plafond verder volgens de periodisering. Benoem zo'n overschrijding ook niet in cautions.",
    "Belasting verlaag je alleen bij echte overbelastingssignalen: sterk negatieve TSB, een hoge ramp_rate, wellness state 'fatigued', een dalende HRV of verhoogde rust-hartslag, lage readiness, of naleving 'te_zwaar' samen met een hoge RPE (8+) of gevoel 'zwaar'/'slecht'. Ontbreken die signalen, dan bouw je normaal door. Een geplande herstelweek uit de periodisering en een eventuele taper richting de target_date vallen hier buiten: die horen bij de opbouw en gaan gewoon door.",
    "recentLoad gaat over recentLoad.days dagen, niet over één week. Reken dat niet om naar een weekgemiddelde om het met maxHoursPerWeek te vergelijken; gebruik het als beeld van de opgebouwde conditie.",
    "Bouw gestructureerde workouts met duidelijke blokken: warming-up, kern, herstel en cooling-down.",
    "Plan uitsluitend op-de-fiets werk: elk blok moet met een fietscomputer te rijden zijn. Geen kracht-, core-, mobiliteits-, stretch- of ademhalingsoefeningen, en geen loop-, zwem- of gymsessies. Is een dag een rustdag, plan dan rust zonder oefeningen; wil je iets naast de fiets adviseren, zet dat hooguit als korte opmerking in cautions.",
    "Schrijf herhalingen expliciet uit als losse structure-blokken: bijvoorbeeld 3x8 min sweet spot met 4 min herstel wordt 8 min werk, 4 min herstel, 8 min werk, 4 min herstel, enzovoort.",
    "Beschrijf elk trainingsblok met RPE plus doelwattage of wattagerange wanneer FTP bekend is, bijvoorbeeld 'RPE 6, 210-235w'.",
    "Als FTP ontbreekt, gebruik RPE en korte gevoelstaal.",
    "Kies targetType bij voorkeur 'power' wanneer FTP bekend is.",
    "Gebruik Nederlands in titel, samenvatting, beschrijving en bloknotities.",
    "Maak een concept dat de trainer daarna kan redigeren; wees concreet maar niet dogmatisch.",
    "Als er herstel-data (wellness) is meegegeven, weeg die mee: bij state 'fatigued', lage readiness, weinig slaap of verhoogde rust-hartslag plan je voorzichtiger — stel zware blokken (threshold/vo2max/anaerobic) uit of vervang ze door endurance/herstel, en benoem dit kort in cautions. Bij state 'fresh' mag een zwaardere sleutelsessie.",
    "Staat wellness.readinessSource op 'afgeleid', dan is die readiness door ZWB berekend uit dezelfde HRV, rust-hartslag en slaap die je hierboven al krijgt — het apparaat van het lid levert er zelf geen. Weeg hem dan één keer mee, niet bovenop die losse waarden, en behandel hem als een indicatie: laat er geen ingrijpende keuze alleen van afhangen.",
    "Is symptoms meegegeven, dan komt dat uit het klachtenlogboek van het lid: score 0 is geen last, 1 is veel last, over de afgelopen week. Behandel het als één herstelsignaal naast readiness en TSB, niet als een aparte regel. Bij score boven 0,65 plan je de zware sleutelsessie flexibeler — bijvoorbeeld een dag opgeschoven of vervangen door endurance — en benoem dat kort in cautions.",
    "Leid uit symptoms of profile.sex NOOIT een cyclusfase af en periodiseer daar niet op. Het onderzoek naar fase-gestuurd trainen is inconsistent, en een deel van de leden heeft door anticonceptie geen natuurlijke cyclus. Je reageert op gemelde klachten, niet op een berekende dag.",
    "Noem klachten nooit expliciet in de titel of beschrijving van een workout. Dat is privé; houd het bij cautions en in neutrale bewoording ('lagere belastbaarheid deze week').",
    "Periodiseer: bouw belasting progressief op met 2-4 opbouwweken gevolgd door een herstelweek. Laat het weekvolume per opbouwweek met ongeveer 10% groeien — genoeg om richting het plafond te komen, weinig genoeg om de sprong veilig te houden. Een herstelweek zakt naar grofweg 60-70% van de week ervoor.",
    "Een taper hoort alleen bij een doel met één piekmoment: goal.type 'outdoor_event' of 'gran_fondo'. Plan dan naar de target_date toe de laatste ~1-2 weken het volume omlaag met behoud van intensiteit en scherpte, zodat de renner fris aan de start staat.",
    "Bij een doorlopend doel — goal.type 'base_fitness', 'ftp' of 'rebuild' — is de target_date het einde van de planperiode en géén wedstrijddag. Plan dan geen taper en bouw door tot het eind: een taper kost juist de trainingsprikkel waar dit doel om draait. Sluit af met een gewone opbouw- of herstelweek volgens de periodisering.",
    "Bij goal.type 'zrl' of 'ladder' gaat het om een reeks races over meerdere weken; die taper je niet als blok, want dan train je het halve seizoen niet meer door. Bouw gewoon door en houd alleen de dag vóór een racedag licht, zoals hierboven bij upcomingEvents.",
    "upcomingEvents bevat alleen clubevents waarvoor het lid zich heeft opgegeven; events zonder toezegging krijg je niet en mag je dus ook niet inplannen. Plan om de toegezegde events heen: geen zware sleutelsessie vlak vóór een race, en gebruik een race eventueel als kwaliteitsprikkel. Ze staan ook als vast blok in fixedWorkouts — neem ze niet nog een keer op.",
    "Gebruik intervals.icu-belasting indien meegegeven: bij sterk negatieve TSB (form) bouw je herstel in; bij hoge ramp_rate matig je de opbouw. Stem het wattage af op de eFTP wanneer die afwijkt van de profiel-FTP.",
    "Blijf met wat je inplant strikt binnen de beschikbare dagen en de max uren/week; verdeel sleutelsessies met voldoende herstel ertussen.",
    "Is availability meegegeven, dan gaat die vóór goal.availableDays: availability.minutesByDay geeft per weekdag ('ma' t/m 'zo') de minuten die het lid die dag heeft. Plan op een dag nooit een langere sessie dan dat aantal minuten, en staat er 0, plan die dag dan geen training. Ontbreekt een weekdag in minutesByDay, val dan terug op goal.availableDays en de weeklimiet.",
    "Zijn er fixedWorkouts meegegeven, dan zijn dat afspraken van het lid zelf: een eigen ingeplande rit (kind 'eigen_rit') of een toegezegd clubevent (kind 'clubevent'). Die liggen vast: neem ze niet op in je antwoord, vervang of verplaats ze niet, en plan er geen tweede training op dezelfde dag naast. Tel hun duur en intensiteit wél mee in de weekbelasting en zet er voldoende herstel omheen — een zware sleutelsessie hoort niet direct voor of na zo'n rit.",
    "Gebruik de naleving (compliance) indien meegegeven: dat is per geplande workout de werkelijk gereden belasting als percentage van de geplande, met een oordeel (te_licht, volgens_plan, te_zwaar, niet_gereden).",
    "Is de naleving structureel 'te_licht' (avgLoadPct duidelijk onder 100 of meerdere sessies te licht), plan dan realistischer: verlaag duur en/of intensiteit naar wat het lid werkelijk haalt in plaats van hetzelfde nog eens voor te schrijven.",
    "Is de naleving 'te_zwaar' in combinatie met een hoge RPE (8+) of gevoel 'zwaar'/'slecht', bouw dan extra herstel in en verlaag de eerstvolgende sleutelsessie.",
    "Is de naleving structureel 'te_zwaar' (avgLoadPct duidelijk boven 100 of meerdere sessies te zwaar) zónder hoge RPE, zonder gevoel 'zwaar'/'slecht' en zonder verslechterende herstelwaarden, dan is het schema te voorzichtig: verhoog duur en volume richting het plafond in plaats van hetzelfde nog eens voor te schrijven. Dit is de spiegel van de 'te_licht'-regel en telt even zwaar.",
    "Zijn workouts 'niet_gereden' op steeds dezelfde weekdagen, plan die dagen dan lichter of houd ze vrij; benoem dat kort in cautions.",
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
    "currentPlan bevat wat er nog gepland staat van vandaag tot en met currentPlan.toDate. Dat is je vertrekpunt: pas aan wat door de signalen niet meer klopt en laat de rest ongemoeid.",
    "Geef alleen de workouts terug die je werkelijk wijzigt — meestal is dat er één (vandaag). Neem ongewijzigde dagen niet opnieuw op: alles wat je teruggeeft vervangt de bestaande training van die dag.",
    "Behoud de plan-intentie en periodisering richting het doel: wijzig alleen de workouts van vandaag en de komende dagen van deze week; laat de verdere toekomst ongemoeid.",
    "Veiligheidsregel: bij tegenstrijdige signalen kies je de voorzichtigere optie (minder belasting). Leg elke aanpassing kort uit in cautions. Ontbreekt er data, meld dat in cautions maar verlaag daar niet óók de belasting op — ga dan uit van wat er wél staat in currentPlan.",
    "Pas het schema aan op basis van de meegegeven signalen, volgens dit beslis-raamwerk:",
    "1) Workout zwaarder uitgevallen (yesterday.actualLoad/actualMinutes duidelijk hoger dan gepland): maak de eerstvolgende sessie(s) lichter of vervang door herstel/endurance; voorkom opstapeling van vermoeidheid.",
    "2) Te moe (today.feeling='tired', lage readiness, hoge ATL of verhoogde rust-HR): verlaag duur en intensiteit; vervang een sleutelsessie (threshold/vo2max/anaerobic) door endurance, hersteltraining of rust. Forceer geen kwaliteit.",
    "3) Geen/weinig tijd vandaag (today.availableMinutes lager dan de geplande duur): comprimeer de sessie tot binnen de beschikbare tijd — behoud zo veel mogelijk de kernprikkel in een kortere vorm, of verschuif de sleutelsessie en plan vandaag een korte onderhoudsrit. Overschrijd de beschikbare minuten nooit.",
    "4) Frisser dan verwacht (today.feeling='fresh', hoge readiness, positieve TSB): je mág kwaliteit toevoegen of een sessie iets zwaarder maken, maar blijf binnen de weeklimiet en ga niet ten koste van de volgende geplande sleutelsessie.",
    "Combineer signalen verstandig (bv. fris maar weinig tijd = korte, scherpe sessie). Geef altijd een concreet, uitvoerbaar voorstel voor vandaag.",
  ].join("\n");
}

// Prompt voor "schema bijwerken": het doel of de randvoorwaarden zijn veranderd
// (uren per week, intensiteit, doeldatum) en het resterende deel van het lopende
// schema moet daarop worden herzien. Anders dan de dag-aanpassing gaat het hier
// om de hele periode tot de einddatum, niet alleen om vandaag.
export function planUpdatePrompt() {
  return [
    defaultTrainingPrompt(),
    "",
    "Dit is een BIJWERKING van een lopend schema, geen nieuw plan.",
    "Herplan uitsluitend de periode van planUpdate.fromDate tot en met planUpdate.toDate. Geef geen workouts buiten dat bereik.",
    "Wat al gereden is blijft staan; je bouwt verder op de belasting die het lid tot nu toe heeft opgebouwd.",
    "Behoud de opzet en de periodisering richting het doel: als het oude schema in een opbouwfase zat, ga daar verder, en houd een eventuele taper voor de target_date intact — maar bouw er geen nieuwe in bij een doel zonder piekmoment.",
    "Neem de gewijzigde randvoorwaarden uit planUpdate.changed strikt over. Minder uren per week betekent minder volume, niet dezelfde sessies ingekort tot ze hun prikkel verliezen — schrap dan liever een sessie en houd de sleutelsessies heel.",
    "Gebruik planUpdate.remainingWorkouts als vertrekpunt: houd vast wat nog past en vervang alleen wat door de wijziging niet meer klopt.",
    "De geldende randvoorwaarden staan UITSLUITEND in goal.maxHoursPerWeek, goal.availableDays en availability. Noemt planUpdate.previousSummary of planUpdate.previousTitle een ander aantal uren per week, andere trainingsdagen of een andere doeldatum, dan is dat de beschrijving van een eerdere versie van dit schema en dus achterhaald: volg die niet, en herhaal die getallen niet in je eigen titel, samenvatting of cautions.",
    "Rekent availability voor een week op tot minder dan goal.maxHoursPerWeek, dan is de beschikbaarheid van die week leidend. Is de som groter, dan blijft maxHoursPerWeek het weektotaal waar je naartoe werkt; de extra beschikbare tijd geeft je vrijheid in de verdeling over de dagen, niet meer volume.",
    "Leg in cautions per verandering kort uit wat je anders hebt gedaan dan in het oude schema, en waarom.",
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

function repeatedWorkPattern(text: string) {
  const match = text.match(/\b(\d{1,2})\s*x\s*(\d{1,3})\s*(?:m|min|mins|minuten|minute|minutes)\b/i);
  if (!match) return null;
  const reps = Number(match[1]);
  const workMinutes = Number(match[2]);
  if (!Number.isFinite(reps) || !Number.isFinite(workMinutes) || reps < 2 || workMinutes < 1) {
    return null;
  }
  return { reps, workMinutes };
}

function recoveryMinutesPattern(text: string) {
  const afterDuration = text.match(/\b(\d{1,3})\s*(?:m|min|mins|minuten|minute|minutes)\s*(?:herstel|rust|rustig|recovery|easy)\b/i);
  const beforeDuration = text.match(/\b(?:herstel|rust|rustig|recovery|easy)\D{0,16}(\d{1,3})\s*(?:m|min|mins|minuten|minute|minutes)\b/i);
  const minutes = Number(afterDuration?.[1] ?? beforeDuration?.[1] ?? 0);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function recoveryTargetFromText(text: string) {
  const recoveryText = text.match(/\b(?:herstel|rust|rustig|recovery|easy)\b[^.;,\n]*/i)?.[0] ?? "";
  const range = recoveryText.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|tot)\s*(\d+(?:[.,]\d+)?)\s*(%|w|watt)/i);
  if (range) return `${range[1]}-${range[2]}${range[3].toLowerCase() === "%" ? "%" : "w"}`;
  const single = recoveryText.match(/([<≤]?\s*\d+(?:[.,]\d+)?)\s*(%|w|watt)/i);
  if (single) return `${single[1].replace(/\s+/g, "")}${single[2].toLowerCase() === "%" ? "%" : "w"}`;
  const rpe = recoveryText.match(/\brpe\s*([1-9]|10)\b/i);
  if (rpe) return `RPE ${rpe[1]}`;
  return "";
}

function cleanRepeatedWorkLabel(label: string) {
  return (
    label
      .replace(/\b\d{1,2}\s*x\s*\d{1,3}\s*(?:m|min|mins|minuten|minute|minutes)\b/i, "")
      .replace(/\s{2,}/g, " ")
      .trim() || label
  );
}

function cleanRepeatedWorkNotes(notes: string) {
  return notes
    .replace(/\b\d{1,2}\s*x\s*\d{1,3}\s*(?:m|min|mins|minuten|minute|minutes)\b/ig, "")
    .replace(/\bmet\s+\d{1,3}\s*(?:m|min|mins|minuten|minute|minutes)\s*(?:herstel|rust|rustig|recovery|easy)[^.;,\n]*/ig, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function recoveryCountForCompactBlock(totalMinutes: number, reps: number, workMinutes: number, recoveryMinutes: number) {
  const withFinalRecovery = reps * (workMinutes + recoveryMinutes);
  const betweenOnly = reps * workMinutes + (reps - 1) * recoveryMinutes;
  if (Math.abs(totalMinutes - withFinalRecovery) <= 1) return reps;
  if (Math.abs(totalMinutes - betweenOnly) <= 1) return reps - 1;
  return reps - 1;
}

function expandRepeatedBlock(block: WorkoutBlock): WorkoutBlock[] {
  const text = `${block.label} ${block.notes}`;
  const repeated = repeatedWorkPattern(text);
  const recoveryMinutes = recoveryMinutesPattern(text);
  if (!repeated || !recoveryMinutes) return [block];

  const recoveryCount = recoveryCountForCompactBlock(
    block.durationMinutes,
    repeated.reps,
    repeated.workMinutes,
    recoveryMinutes,
  );
  const workLabel = cleanRepeatedWorkLabel(block.label);
  const workNotes = cleanRepeatedWorkNotes(block.notes);
  const recoveryTarget = recoveryTargetFromText(text);
  const expanded: WorkoutBlock[] = [];

  for (let rep = 1; rep <= repeated.reps; rep++) {
    expanded.push({
      ...block,
      label: `${workLabel} ${rep}/${repeated.reps}`,
      durationMinutes: repeated.workMinutes,
      notes: workNotes,
    });
    if (rep <= recoveryCount) {
      expanded.push({
        label: `Herstel ${rep}/${repeated.reps}`,
        durationMinutes: recoveryMinutes,
        target: recoveryTarget,
        notes: "Rustig rijden.",
        intensity: "recovery",
      });
    }
  }

  return expanded;
}

function expandRepeatedBlocks(blocks: WorkoutBlock[]) {
  return blocks.flatMap(expandRepeatedBlock);
}

export function normalizeWorkoutBlocks(value: unknown, fallbackIntensity: WorkoutIntensity = "endurance") {
  if (!Array.isArray(value)) return [] satisfies WorkoutBlock[];
  const blocks = value
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
  return expandRepeatedBlocks(blocks);
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

  return expandRepeatedBlocks(blocks);
}

function targetForIntervals(target: string) {
  const text = target.trim();
  const wattRange = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:w|watt)/i);
  if (wattRange) return `${wattRange[1]}-${wattRange[2]}w`;
  const watt = text.match(/(\d+(?:[.,]\d+)?)\s*(?:w|watt)/i);
  if (watt) return `${watt[1]}w`;
  const ftpRange = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|tot)\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (ftpRange) return `${ftpRange[1]}-${ftpRange[2]}%`;
  const ftp = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
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
export const INTENSITY_FTP_RANGE: Record<WorkoutIntensity, [number, number]> = {
  rest: [0, 40],
  recovery: [45, 60],
  endurance: [60, 75],
  tempo: [76, 90],
  threshold: [91, 105],
  vo2max: [106, 120],
  anaerobic: [121, 150],
  race: [85, 115],
};

function clampPct(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(200, Math.max(20, Math.round(value)));
}

function clampWatts(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(2500, Math.max(1, Math.round(value)));
}

function orderedRange(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function rangeTarget(start: number, end: number, units: "%ftp" | "w"): WorkoutPowerTarget | null {
  const [low, high] = orderedRange(start, end);
  const clamp = units === "%ftp" ? clampPct : clampWatts;
  const clampedLow = clamp(low);
  const clampedHigh = clamp(high);
  if (clampedLow == null || clampedHigh == null) return null;
  if (clampedLow === clampedHigh) return { units, value: clampedLow };
  return { units, start: clampedLow, end: clampedHigh };
}

function singleTarget(value: number, units: "%ftp" | "w"): WorkoutPowerTarget | null {
  const clamp = units === "%ftp" ? clampPct : clampWatts;
  const clamped = clamp(value);
  return clamped == null ? null : { units, value: clamped };
}

function wattsToPowerTarget(lowWatts: number, highWatts: number | null, ftp: number | null) {
  if (ftp && ftp > 0) {
    const lowPct = (lowWatts / ftp) * 100;
    const highPct = highWatts == null ? null : (highWatts / ftp) * 100;
    return highPct == null ? singleTarget(lowPct, "%ftp") : rangeTarget(lowPct, highPct, "%ftp");
  }
  return highWatts == null ? singleTarget(lowWatts, "w") : rangeTarget(lowWatts, highWatts, "w");
}

// Zet een blok-doel ("75%", "60-75%", "210w", "210-235w", "210 tot 235 watt")
// om naar een native intervals.icu power target. Ranges blijven ranges.
export function blockToPowerTarget(block: WorkoutBlock, ftp: number | null): WorkoutPowerTarget | null {
  const text = (block.target ?? "").trim();
  const range = text.match(/(\d+(?:[.,]\d+)?)\s*(%|w|watt)?\s*(?:-|–|—|to|tot)\s*(\d+(?:[.,]\d+)?)\s*(%|w|watt)/i);
  if (range) {
    const low = parseNumber(range[1]);
    const high = parseNumber(range[3]);
    const unit = (range[4] || range[2] || "").toLowerCase();
    if (low != null && high != null) {
      if (unit === "%") return rangeTarget(low, high, "%ftp");
      if (unit === "w" || unit === "watt") return wattsToPowerTarget(low, high, ftp);
    }
  }

  const ftpSingle = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const ftpValue = parseNumber(ftpSingle?.[1]);
  if (ftpValue != null) return singleTarget(ftpValue, "%ftp");

  const wattSingle = text.match(/(\d+(?:[.,]\d+)?)\s*(?:w|watt)/i);
  const watts = parseNumber(wattSingle?.[1]);
  if (watts != null) return wattsToPowerTarget(watts, null, ftp);

  const fallback = INTENSITY_FTP_RANGE[block.intensity];
  return rangeTarget(fallback[0], fallback[1], "%ftp");
}

export function powerRangePercentForBlock(block: WorkoutBlock, ftp: number | null): [number, number] | null {
  const target = blockToPowerTarget(block, ftp);
  if (!target) return null;
  if (target.units === "%ftp") {
    const value = target.value ?? null;
    if (value != null) return [value, value];
    if (target.start != null && target.end != null) return orderedRange(target.start, target.end);
    return null;
  }
  if (target.units === "w" && ftp && ftp > 0) {
    const value = target.value ?? null;
    if (value != null) return [(value / ftp) * 100, (value / ftp) * 100];
    if (target.start != null && target.end != null) {
      return orderedRange((target.start / ftp) * 100, (target.end / ftp) * 100);
    }
  }
  return null;
}

// Bouwt een NATIVE intervals.icu workout_doc uit onze blokken. Dit is de bron
// voor de FIT-export (Garmin/Wahoo). intervals parseert de description NIET
// server-side, dus zonder een geldig workout_doc bevat de FIT 0 stappen en
// weigeren apparaten het als "corrupt". Schema dat intervals accepteert:
//   { duration, steps: [{ duration: <sec>, power: { units: "%ftp", value|start/end } }] }
// We houden bewust alleen `duration` + `power` aan (geen extra velden zoals
// label/target-strings) omdat afwijkende velden de FIT-generator deden crashen.
export function blocksToWorkoutDoc(
  blocks: WorkoutBlock[],
  ftp: number | null,
): { duration: number; steps: Array<Record<string, unknown>> } | null {
  const steps = blocks
    .filter((block) => block.durationMinutes > 0)
    .map((block) => {
      const power = blockToPowerTarget(block, ftp);
      const duration = Math.round(block.durationMinutes * 60);
      const step: Record<string, unknown> = { duration };
      if (power) step.power = power;
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
