// WTRL-teampagina's → zFTP, zMAP en divisieadvies per renner.
//
// Zwift geeft zFTP en zMAP alleen van je eigen account; WTRL heeft ze wel, omdat
// elke deelnemer daar zijn Zwift-account koppelt (partnertoegang). WTRL verbiedt
// scraping, dus een beheerder plakt de tekst van "My Teams" en ZWB leest die hier.
//
// Drempels: https://www.wtrl.racing/zrl/resources/, gelezen 2026-09-22. Getoetst
// op 56 renners in 7 teams uit de eerste plak: de uitgerekende categorie was overal gelijk
// aan wat WTRL toonde.

export type WtrlRiderStatus = "member" | "invited";

export type WtrlRider = {
  zwiftId: string;
  name: string;
  /** De categorie die WTRL bij de renner toont (A–E). */
  category: string | null;
  status: WtrlRiderStatus;
  zftpW: number | null;
  zftpWkg: number | null;
  zmapWkg: number | null;
};

export type WtrlTeam = {
  name: string;
  trcRef: string;
  season: string | null;
  division: string | null;
  captain: string | null;
  riders: WtrlRider[];
};

const LABELS = ["TRC Ref", "Season", "Rounds", "Division", "Team Jersey", "Next Race"];

function valueAfter(lines: string[], start: number, end: number, label: string) {
  for (let i = start; i < end - 1; i++) {
    if (lines[i] === label) return lines[i + 1];
  }
  return null;
}

function number(value: string | null | undefined): number | null {
  const match = /(\d+(?:[.,]\d+)?)/.exec(value ?? "");
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const PARTICLES = new Set(["de", "den", "der", "van", "het", "ter", "ten", "te", "la", "le", "da", "di"]);

/** "PIM DE MEULEMEESTER" → "Pim de Meulemeester". */
export function prettyName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part, index) =>
      index > 0 && PARTICLES.has(part)
        ? part
        : part.replace(/(^|[-'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()),
    )
    .join(" ");
}

/** Leest de geplakte tekst van WTRL "My Teams" (één of meer teams). */
export function parseWtrlTeams(text: string): WtrlTeam[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Een team begint op de regel vóór "TRC Ref".
  const starts: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "TRC Ref") starts.push(i - 1);
  }

  return starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    const captainLine = lines
      .slice(start, end)
      .find((line) => /^Captain\s+/i.test(line));

    const riders: WtrlRider[] = [];
    for (let i = start; i < end; i++) {
      const id = /^#(\d+)\s*•\s*(MEMBER|INVITED)\b/i.exec(lines[i]);
      if (!id) continue;
      const category = /^[A-E]$/.test(lines[i - 2] ?? "") ? lines[i - 2] : null;
      let next = end;
      for (let j = i + 1; j < end; j++) {
        if (/^#\d+\s*•/.test(lines[j])) {
          next = j - 2;
          break;
        }
      }
      riders.push({
        zwiftId: id[1],
        name: prettyName(lines[i - 1] ?? ""),
        category,
        status: id[2].toLowerCase() === "invited" ? "invited" : "member",
        zftpWkg: number(valueAfter(lines, i + 1, next, "zFTPW/kg")),
        zftpW: number(valueAfter(lines, i + 1, next, "zFTPW")),
        zmapWkg: number(valueAfter(lines, i + 1, next, "zMAPW/kg")),
      });
    }

    const trc = valueAfter(lines, start, end, "TRC Ref");
    const value = (label: string) => {
      const found = valueAfter(lines, start, end, label);
      return found && !LABELS.includes(found) ? found : null;
    };
    return {
      name: lines[start],
      trcRef: trc ?? lines[start],
      season: value("Season"),
      division: value("Division"),
      captain: captainLine ? captainLine.replace(/^Captain\s+/i, "").trim() : null,
      riders,
    };
  });
}

// ---------- Drempels ----------

export type Category = "A" | "B" | "C" | "D";
const ORDER: Category[] = ["A", "B", "C", "D"];

/** Ondergrens om in een categorie te komen: zFTP of zMAP (w/kg), plus een wattvloer (alleen Open). */
const OPEN: Record<Exclude<Category, "D">, { ftp: number; map: number; floorW: number }> = {
  A: { ftp: 4.2, map: 5.1, floorW: 250 },
  B: { ftp: 3.36, map: 4.1, floorW: 200 },
  C: { ftp: 2.63, map: 3.2, floorW: 150 },
};
const WOMEN: Record<Exclude<Category, "D">, { ftp: number; map: number }> = {
  A: { ftp: 3.88, map: 4.8 },
  B: { ftp: 3.36, map: 4.1 },
  C: { ftp: 2.63, map: 3.2 },
};
/** Development: beide waarden moeten eronder blijven. */
const DEV_OPEN: Record<Category, { ftp: number; map: number }> = {
  A: { ftp: 4.37, map: 5.33 },
  B: { ftp: 3.74, map: 4.53 },
  C: { ftp: 3.08, map: 3.68 },
  D: { ftp: 2.4, map: 2.83 },
};
const DEV_WOMEN: Record<Category, { ftp: number; map: number }> = {
  ...DEV_OPEN,
  A: { ftp: 4.36, map: 5.29 },
};

type Power = Pick<WtrlRider, "zftpW" | "zftpWkg" | "zmapWkg">;

/** De Zwift-categorie volgens de WTRL-tabel. Null zonder zFTP en zMAP. */
export function wtrlCategory(power: Power, women: boolean): Category | null {
  const ftp = power.zftpWkg ?? 0;
  const map = power.zmapWkg ?? 0;
  if (power.zftpWkg == null && power.zmapWkg == null) return null;
  for (const category of ["A", "B", "C"] as const) {
    if (women) {
      const t = WOMEN[category];
      if (ftp >= t.ftp || map >= t.map) return category;
    } else {
      const t = OPEN[category];
      if ((ftp >= t.ftp || map >= t.map) && (power.zftpW ?? 0) >= t.floorW) return category;
    }
  }
  return "D";
}

/** Past de renner in de Development-divisie van deze categorie? */
export function fitsDevelopment(power: Power, category: Category, women: boolean): boolean {
  if (power.zftpWkg == null || power.zmapWkg == null) return false;
  const limit = (women ? DEV_WOMEN : DEV_OPEN)[category];
  return power.zftpWkg < limit.ftp && power.zmapWkg < limit.map;
}

/** "B" of "B Dev": de divisie waar de renner het best in past. */
export function recommendedDivision(power: Power, women: boolean): string | null {
  const category = wtrlCategory(power, women);
  if (!category) return null;
  return fitsDevelopment(power, category, women) ? `${category} Dev` : category;
}

export type WtrlDivision = { category: Category; development: boolean; women: boolean };

/** "Open Aqua Dev League Division B3" → B, Development, Open. */
export function parseDivision(label: string | null | undefined): WtrlDivision | null {
  if (!label) return null;
  const match = /Division\s+([A-D])\d*/i.exec(label);
  if (!match) return null;
  return {
    category: match[1].toUpperCase() as Category,
    development: /\bDev\b/i.test(label),
    women: /^\s*Wom[ae]n/i.test(label),
  };
}

/**
 * Mag de renner in deze divisie starten? Hoger rijden mag; een sterkere categorie
 * dan de divisie niet, en in een Development-divisie moet je onder de grenzen blijven.
 */
export function fitsDivision(power: Power, division: WtrlDivision): boolean | null {
  const category = wtrlCategory(power, division.women);
  if (!category) return null;
  if (ORDER.indexOf(category) < ORDER.indexOf(division.category)) return false;
  if (division.development) return fitsDevelopment(power, division.category, division.women);
  return true;
}

/** Binnen deze fractie onder de bovengrens van de divisie: gevarenzone. */
export const DANGER_MARGIN = 0.05;

export type DivisionStatus = "ok" | "danger" | "over";

/**
 * De bovengrens van een divisie in W/kg. Standard: de ondergrens van de categorie
 * erboven (A heeft er geen). Development: het Dev-plafond van die categorie.
 */
function upperLimit(division: WtrlDivision): { ftp: number; map: number } | null {
  if (division.development) {
    return (division.women ? DEV_WOMEN : DEV_OPEN)[division.category];
  }
  const above = ORDER[ORDER.indexOf(division.category) - 1] as Exclude<Category, "D"> | undefined;
  if (!above) return null;
  const table = division.women ? WOMEN : OPEN;
  return { ftp: table[above].ftp, map: table[above].map };
}

/**
 * "over": te sterk voor de divisie. "danger": zFTP of zMAP zit binnen 5% onder de
 * bovengrens. De gevarenzone kijkt alleen naar W/kg; de wattvloer van Open kan een
 * renner daar nog onder houden, maar dat is geen reden om niet te waarschuwen.
 */
export function divisionStatus(power: Power, division: WtrlDivision): DivisionStatus | null {
  const fits = fitsDivision(power, division);
  if (fits === null) return null;
  if (!fits) return "over";
  const limit = upperLimit(division);
  if (!limit) return "ok";
  const near = (value: number | null, max: number) =>
    value != null && value >= max * (1 - DANGER_MARGIN);
  return near(power.zftpWkg, limit.ftp) || near(power.zmapWkg, limit.map) ? "danger" : "ok";
}

export type WtrlRiderSummary = {
  category: Category | null;
  zftpW: number | null;
  zftpWkg: number | null;
  zmapWkg: number | null;
  /** "B" of "B Dev". */
  advice: string | null;
  /** Past in de divisie van elk WTRL-team waar de renner in staat; null = onbekend. */
  fits: boolean | null;
  /** Het zwaarste over zijn WTRL-teams: over > danger > ok. */
  status: DivisionStatus | null;
};

const STATUS_RANK: Record<DivisionStatus, number> = { ok: 0, danger: 1, over: 2 };

/**
 * Eén regel per renner over de WTRL-teams op een pagina. Staat iemand in twee
 * teams (B1 en B2), dan telt "past niet" in één ervan.
 */
export function summarizeWtrlRiders(
  teams: Array<{ division: string | null; riders: WtrlRider[] }>,
): Map<string, WtrlRiderSummary> {
  const byRider = new Map<string, WtrlRiderSummary>();
  for (const team of teams) {
    const division = parseDivision(team.division);
    const women = division?.women ?? false;
    for (const rider of team.riders) {
      const fits = division ? fitsDivision(rider, division) : null;
      const status = division ? divisionStatus(rider, division) : null;
      const previous = byRider.get(rider.zwiftId);
      const worst =
        previous?.status && (!status || STATUS_RANK[previous.status] >= STATUS_RANK[status])
          ? previous.status
          : status;
      byRider.set(rider.zwiftId, {
        category: previous?.category ?? wtrlCategory(rider, women),
        zftpW: rider.zftpW,
        zftpWkg: rider.zftpWkg,
        zmapWkg: rider.zmapWkg,
        advice: previous?.advice ?? recommendedDivision(rider, women),
        fits: previous?.fits === false || fits === false ? false : (fits ?? previous?.fits ?? null),
        status: worst ?? null,
      });
    }
  }
  return byRider;
}
