// Minimale Supabase-nabootsing in het geheugen, voor tests die meer dan één
// query per tabel doen. Kent alleen wat de geteste code gebruikt: select, eq,
// neq, gt, gte, lt, lte, in, is, not(col, "is", null), order, limit,
// maybeSingle, single, insert, upsert (onConflict), update en delete. Filters op
// JSON-paden kent hij niet.

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

function compare(a: unknown, b: unknown): number {
  const na = typeof a === "number" ? a : Number.NaN;
  const nb = typeof b === "number" ? b : Number.NaN;
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

export function fakeDb(tables: Record<string, Row[]>) {
  const calls: Array<{ table: string; op: string; filters: string[] }> = [];

  function from(table: string) {
    tables[table] ??= [];
    const filters: Filter[] = [];
    const described: string[] = [];
    let op: "select" | "update" | "delete" | "upsert" | "insert" = "select";
    let payload: Row | Row[] | null = null;
    let conflict: string[] = ["id"];
    let orderBy: { column: string; ascending: boolean; nullsFirst: boolean } | null = null;
    let limitTo: number | null = null;
    let single: "maybe" | "one" | null = null;
    let countMode = false;

    const add = (label: string, filter: Filter) => {
      described.push(label);
      filters.push(filter);
      return builder;
    };

    const run = () => {
      calls.push({ table, op, filters: described });
      const rows = tables[table];
      const matches = rows.filter((row) => filters.every((f) => f(row)));
      if (op === "delete") {
        tables[table] = rows.filter((row) => !matches.includes(row));
        return { data: null, error: null, count: matches.length };
      }
      if (op === "update") {
        for (const row of matches) Object.assign(row, payload);
        return { data: null, error: null, count: matches.length };
      }
      if (op === "upsert" || op === "insert") {
        for (const item of ([] as Row[]).concat(payload ?? [])) {
          const existing =
            op === "upsert"
              ? rows.find((row) => conflict.every((key) => row[key] === item[key]))
              : undefined;
          if (existing) Object.assign(existing, item);
          else rows.push({ ...item });
        }
        return { data: null, error: null };
      }
      let data = [...matches];
      if (orderBy) {
        const { column, ascending, nullsFirst } = orderBy;
        data.sort((a, b) => {
          const va = a[column];
          const vb = b[column];
          if (va == null || vb == null) {
            if (va == null && vb == null) return 0;
            return (va == null) === nullsFirst ? -1 : 1;
          }
          return ascending ? compare(va, vb) : compare(vb, va);
        });
      }
      if (limitTo != null) data = data.slice(0, limitTo);
      if (single) {
        if (single === "one" && data.length !== 1) {
          return { data: null, error: { message: "not single" } };
        }
        return { data: data[0] ?? null, error: null };
      }
      return { data: data.map((row) => ({ ...row })), error: null, count: countMode ? data.length : undefined };
    };

    const builder = {
      select: (_columns?: string, opts?: { count?: string }) => {
        countMode = Boolean(opts?.count);
        return builder;
      },
      eq: (column: string, value: unknown) =>
        add(`eq ${column}`, (row) => row[column] === value),
      neq: (column: string, value: unknown) =>
        add(`neq ${column}`, (row) => row[column] !== value),
      gt: (column: string, value: unknown) =>
        add(`gt ${column}`, (row) => compare(row[column], value) > 0),
      gte: (column: string, value: unknown) =>
        add(`gte ${column}`, (row) => compare(row[column], value) >= 0),
      lt: (column: string, value: unknown) =>
        add(`lt ${column}`, (row) => compare(row[column], value) < 0),
      lte: (column: string, value: unknown) =>
        add(`lte ${column}`, (row) => compare(row[column], value) <= 0),
      in: (column: string, values: unknown[]) =>
        add(`in ${column}`, (row) => values.includes(row[column])),
      is: (column: string, value: unknown) =>
        add(`is ${column}`, (row) => (row[column] ?? null) === value),
      not: (column: string, _operator: string, value: unknown) =>
        add(`not ${column}`, (row) => (row[column] ?? null) !== value),
      order: (column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => {
        orderBy = {
          column,
          ascending: opts?.ascending ?? true,
          nullsFirst: opts?.nullsFirst ?? false,
        };
        return builder;
      },
      limit: (n: number) => {
        limitTo = n;
        return builder;
      },
      maybeSingle: () => {
        single = "maybe";
        return builder;
      },
      single: () => {
        single = "one";
        return builder;
      },
      update: (values: Row) => {
        op = "update";
        payload = values;
        return builder;
      },
      delete: (opts?: { count?: string }) => {
        op = "delete";
        countMode = Boolean(opts?.count);
        return builder;
      },
      insert: (values: Row | Row[]) => {
        op = "insert";
        payload = values;
        return builder;
      },
      upsert: (values: Row | Row[], opts?: { onConflict?: string }) => {
        op = "upsert";
        payload = values;
        conflict = (opts?.onConflict ?? "id").split(",").map((key) => key.trim());
        return builder;
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        try {
          return Promise.resolve(run()).then(resolve, reject);
        } catch (err) {
          return reject ? reject(err) : Promise.reject(err);
        }
      },
    };
    return builder;
  }

  return { from, tables, calls };
}
