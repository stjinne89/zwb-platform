// Supabase-stub voor de SRC-tests: filters, insert met teruggave, update, upsert
// op een (samengestelde) sleutel, en rpc-aanroepen die alleen worden vastgelegd.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Row = Record<string, unknown>;

export function fakeAdmin(tables: Record<string, Row[]>) {
  let nextId = 1;
  function from(table: string) {
    const rows = (tables[table] ??= []);
    const filters: Array<(row: Row) => boolean> = [];
    let action: "select" | "insert" | "update" | "upsert" = "select";
    let payload: Row = {};
    let conflict = "id";

    const run = () => {
      if (action === "insert") {
        const row = { id: `e${nextId++}`, ...payload };
        rows.push(row);
        return [{ ...row }];
      }
      if (action === "upsert") {
        const keys = conflict.split(",");
        const known = rows.find((row) => keys.every((key) => row[key] === payload[key]));
        if (known) Object.assign(known, payload);
        else rows.push({ ...payload });
        return [];
      }
      const matched = rows.filter((row) => filters.every((f) => f(row)));
      if (action === "update") for (const row of matched) Object.assign(row, payload);
      return matched.map((row) => ({ ...row }));
    };
    const result = () => ({ data: run(), error: null });

    const builder = {
      select: () => builder,
      insert: (values: Row) => {
        action = "insert";
        payload = values;
        return builder;
      },
      update: (values: Row) => {
        action = "update";
        payload = values;
        return builder;
      },
      upsert: (values: Row, options?: { onConflict?: string }) => {
        action = "upsert";
        payload = values;
        conflict = options?.onConflict ?? "id";
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      neq: (column: string, value: unknown) => {
        filters.push((row) => row[column] !== value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") >= value);
        return builder;
      },
      lt: (column: string, value: string) => {
        filters.push((row) => String(row[column] ?? "") < value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      single: async () => ({ data: run()[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => resolve(result()),
    };
    return builder;
  }
  const rpc = async (name: string, args: Row) => {
    (tables[`rpc:${name}`] ??= []).push(args);
    return { data: null, error: null };
  };
  return { from, rpc } as unknown as SupabaseClient;
}
