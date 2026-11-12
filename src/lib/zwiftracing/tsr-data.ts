// De loaderdata van zwiftracing.app uit de HTML halen, zonder `eval`.
//
// De site (TanStack Start) zet de data van de pagina in een script als
// `$_TSR.router=($R=>$R[0]={…})($R["tsr"])`: een JavaScript-object met
// `$R[n]=` voor elk object, `!0`/`!1` voor true/false en sleutels zonder
// aanhalingstekens. Gemeten op 2026-11-12: geen terugverwijzingen (`$R[n]`
// zonder `=`), geen `new …`. Deze lezer kent alleen die vorm; iets anders geeft
// null, zodat een veranderde site niets halfs oplevert.

export type TsrValue = null | boolean | number | string | TsrValue[] | { [key: string]: TsrValue };

class Reader {
  i = 0;
  private readonly s: string;
  constructor(s: string) {
    this.s = s;
  }

  fail(): never {
    throw new Error(`onbekend teken op ${this.i}`);
  }

  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i += 1;
  }

  /** `$R[12]=` voor een waarde overslaan. */
  assignment() {
    const m = /^\$R\[\d+\]=/.exec(this.s.slice(this.i, this.i + 24));
    if (m) this.i += m[0].length;
  }

  value(): TsrValue {
    this.ws();
    this.assignment();
    const c = this.s[this.i];
    if (c === "{") return this.object();
    if (c === "[") return this.array();
    if (c === '"' || c === "'") return this.string();
    if (c === "!") {
      const next = this.s[this.i + 1];
      if (next !== "0" && next !== "1") this.fail();
      this.i += 2;
      return next === "0";
    }
    if (this.s.startsWith("null", this.i)) {
      this.i += 4;
      return null;
    }
    if (this.s.startsWith("void 0", this.i)) {
      this.i += 6;
      return null;
    }
    const m = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(this.s.slice(this.i, this.i + 40));
    if (!m) this.fail();
    this.i += m[0].length;
    return Number(m[0]);
  }

  key(): string {
    this.ws();
    const c = this.s[this.i];
    if (c === '"' || c === "'") return this.string();
    const m = /^[A-Za-z_$][\w$]*|^\d+/.exec(this.s.slice(this.i, this.i + 200));
    if (!m) this.fail();
    this.i += m[0].length;
    return m[0];
  }

  object(): { [key: string]: TsrValue } {
    const out: { [key: string]: TsrValue } = {};
    this.i += 1;
    this.ws();
    if (this.s[this.i] === "}") {
      this.i += 1;
      return out;
    }
    for (;;) {
      const key = this.key();
      this.ws();
      if (this.s[this.i] !== ":") this.fail();
      this.i += 1;
      out[key] = this.value();
      this.ws();
      const c = this.s[this.i];
      this.i += 1;
      if (c === "}") return out;
      if (c !== ",") this.fail();
    }
  }

  array(): TsrValue[] {
    const out: TsrValue[] = [];
    this.i += 1;
    this.ws();
    if (this.s[this.i] === "]") {
      this.i += 1;
      return out;
    }
    for (;;) {
      out.push(this.value());
      this.ws();
      const c = this.s[this.i];
      this.i += 1;
      if (c === "]") return out;
      if (c !== ",") this.fail();
    }
  }

  string(): string {
    const quote = this.s[this.i];
    this.i += 1;
    let out = "";
    for (;;) {
      const c = this.s[this.i];
      if (c === undefined) this.fail();
      this.i += 1;
      if (c === quote) return out;
      if (c !== "\\") {
        out += c;
        continue;
      }
      const e = this.s[this.i];
      this.i += 1;
      if (e === "n") out += "\n";
      else if (e === "t") out += "\t";
      else if (e === "r") out += "\r";
      else if (e === "b") out += "\b";
      else if (e === "f") out += "\f";
      else if (e === "v") out += "\v";
      else if (e === "0") out += "\0";
      else if (e === "x") {
        out += String.fromCharCode(parseInt(this.s.slice(this.i, this.i + 2), 16));
        this.i += 2;
      } else if (e === "u") {
        out += String.fromCharCode(parseInt(this.s.slice(this.i, this.i + 4), 16));
        this.i += 4;
      } else out += e;
    }
  }
}

const START = "$_TSR.router=($R=>$R[0]=";

/** Het routerobject van de pagina, of null als de pagina een andere opbouw heeft. */
export function readTsrRouter(html: string): { [key: string]: TsrValue } | null {
  const at = html.indexOf(START);
  if (at < 0) return null;
  try {
    const reader = new Reader(html);
    reader.i = at + START.length;
    const value = reader.value();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** De loaderdata (`l`) van de match waarvan de id met dit stuk eindigt, zoals "events $eventId {-$subgroupId} events 5773491". */
export function readTsrLoader(html: string, idSuffix: string): { [key: string]: TsrValue } | null {
  const router = readTsrRouter(html);
  const matches = router?.matches;
  if (!Array.isArray(matches)) return null;
  for (const match of matches) {
    if (!match || typeof match !== "object" || Array.isArray(match)) continue;
    const id = match.i;
    const loader = match.l;
    // De delen van de id staan los met een nulteken (`\0events\0events`).
    if (typeof id === "string" && id.replace(/[\0\s]+/g, " ").trim().endsWith(idSuffix) && loader && typeof loader === "object" && !Array.isArray(loader)) return loader;
  }
  return null;
}

export const asObject = (value: TsrValue | undefined): { [key: string]: TsrValue } | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

export const asNumber = (value: TsrValue | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : null;
