// Nep-Supabase voor de instructievideo.
//
// De lokale app praat normaal met productie. Voor een opname wil je daar niet
// tegenaan: echte leden komen in beeld en elke klik schrijft in de echte
// database. Deze server speelt de paar Supabase-endpoints na die de app
// gebruikt (PostgREST, Auth) met verzonnen leden uit fixtures.mjs, alleen op
// deze pc. Onbekende tabellen geven een lege lijst; schrijfacties blijven in
// het geheugen en zijn weg na een herstart.

import http from "node:http";
import { buildState } from "./fixtures.mjs";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54399);
const LOG_UNKNOWN = process.env.MOCK_SUPABASE_LOG !== "0";

let preset = "goedgekeurd";
let state = buildState(preset);
const seenUnknown = new Set();

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** Een JWT dat alleen gelezen wordt: HS256 laat de app terugvallen op /auth/v1/user. */
export function fakeJwt(user) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 60 * 60 * 24 * 30,
      session_id: "demo-session",
    }),
  );
  return `${header}.${payload}.${b64url("demo")}`;
}

export function fakeSession(user) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: fakeJwt(user),
    refresh_token: "demo-refresh",
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 30,
    expires_at: now + 60 * 60 * 24 * 30,
    user,
  };
}

function userFromRequest(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return state.users.find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function send(res, status, body, headers = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
    "Access-Control-Expose-Headers": "Content-Range",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

// ---- PostgREST -----------------------------------------------------------

function parseValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== "boolean") return na - nb;
  return String(a).localeCompare(String(b));
}

function matches(row, column, expr) {
  let negate = false;
  let rest = expr;
  if (rest.startsWith("not.")) {
    negate = true;
    rest = rest.slice(4);
  }
  const dot = rest.indexOf(".");
  if (dot === -1) return true;
  const op = rest.slice(0, dot);
  const raw = rest.slice(dot + 1);
  const value = row[column];
  let ok;
  switch (op) {
    case "eq":
      ok = String(value) === raw;
      break;
    case "neq":
      ok = String(value) !== raw;
      break;
    case "gt":
      ok = compare(value, raw) > 0;
      break;
    case "gte":
      ok = compare(value, raw) >= 0;
      break;
    case "lt":
      ok = compare(value, raw) < 0;
      break;
    case "lte":
      ok = compare(value, raw) <= 0;
      break;
    case "is":
      ok = value === parseValue(raw) || (raw === "null" && value === undefined);
      break;
    case "in": {
      const list = raw
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((v) => v.replace(/^"|"$/g, ""));
      ok = list.includes(String(value));
      break;
    }
    case "like":
    case "ilike": {
      const pattern = new RegExp(
        `^${raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[*%]/g, ".*")}$`,
        op === "ilike" ? "i" : "",
      );
      ok = pattern.test(String(value ?? ""));
      break;
    }
    case "cs": {
      const wanted = raw.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
      ok = Array.isArray(value) && wanted.every((w) => value.map(String).includes(w));
      break;
    }
    default:
      ok = true;
  }
  return negate ? !ok : ok;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "or", "and", "on_conflict", "columns"]);

function applyQuery(rows, params) {
  let out = rows;
  for (const [key, expr] of params) {
    if (RESERVED.has(key) || key.includes(".")) continue;
    out = out.filter((row) => matches(row, key, expr));
  }
  const order = params.get("order");
  if (order) {
    const keys = order.split(",").map((part) => {
      const [column, dir] = part.split(".");
      return { column, desc: dir === "desc" };
    });
    out = [...out].sort((a, b) => {
      for (const { column, desc } of keys) {
        const c = compare(a[column], b[column]);
        if (c !== 0) return desc ? -c : c;
      }
      return 0;
    });
  }
  const offset = Number(params.get("offset") ?? 0);
  const limit = params.has("limit") ? Number(params.get("limit")) : undefined;
  return out.slice(offset, limit === undefined ? undefined : offset + limit);
}

/** De bovenste laag van een select, met komma's binnen haakjes heel gelaten. */
function splitSelect(select) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of select) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const singular = (table) => table.replace(/s$/, "");

/**
 * Ingebedde tabellen zoals `profiles(display_name)` op een eenvoudige manier
 * invullen: eerst als verwijzing vanuit deze rij (profile_id, created_by, of
 * de kolom na !), anders als lijst van rijen die naar deze rij verwijzen.
 */
function embed(rows, parentTable, select) {
  if (!select) return rows;
  const embeds = splitSelect(select)
    .filter((part) => part.includes("("))
    .map((part) => {
      const head = part.slice(0, part.indexOf("("));
      const [aliasOrTable, maybeTable] = head.split(":");
      const target = (maybeTable ?? aliasOrTable).split("!");
      return { key: aliasOrTable.split("!")[0], table: target[0], hint: target[1] };
    });
  if (!embeds.length) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const { key, table, hint } of embeds) {
      if (copy[key] !== undefined || !(table in state.tables)) continue;
      const others = state.tables[table];
      const columns = [hint, `${singular(table)}_id`, "profile_id", "created_by", "user_id", "author_id"];
      const column = columns.find((c) => c && row[c] !== undefined && others.some((o) => o.id === row[c]));
      if (column) {
        copy[key] = others.find((o) => o.id === row[column]) ?? null;
      } else {
        const back = `${singular(parentTable)}_id`;
        copy[key] = others.some((o) => back in o) ? others.filter((o) => o[back] === row.id) : null;
      }
    }
    return copy;
  });
}

function tableRows(table) {
  if (!(table in state.tables)) {
    if (LOG_UNKNOWN && !seenUnknown.has(table)) {
      seenUnknown.add(table);
      console.log(`[mock-supabase] lege tabel: ${table}`);
    }
    state.tables[table] = [];
  }
  return state.tables[table];
}

function countHeader(prefer, total, shown) {
  if (!prefer?.includes("count=")) return {};
  const range = shown === 0 ? "*" : `0-${shown - 1}`;
  return { "Content-Range": `${range}/${total}` };
}

let idCounter = 1;
function withId(row) {
  return { id: row.id ?? `demo-${Date.now()}-${idCounter++}`, created_at: new Date().toISOString(), ...row };
}

async function handleRest(req, res, url) {
  const table = decodeURIComponent(url.pathname.replace(/^\/rest\/v1\//, ""));
  const params = url.searchParams;
  const accept = req.headers.accept ?? "";
  const prefer = req.headers.prefer ?? "";
  const wantsObject = accept.includes("vnd.pgrst.object");

  if (table.startsWith("rpc/")) {
    const fn = table.slice(4);
    const body = (await readBody(req)) ?? Object.fromEntries(params);
    const handler = state.rpc[fn];
    if (handler === undefined && LOG_UNKNOWN && !seenUnknown.has(`rpc:${fn}`)) {
      seenUnknown.add(`rpc:${fn}`);
      console.log(`[mock-supabase] onbekende rpc: ${fn}`);
    }
    const result = typeof handler === "function" ? handler(body, state) : (handler ?? null);
    return send(res, 200, result);
  }

  const rows = tableRows(table);

  if (req.method === "GET" || req.method === "HEAD") {
    const filtered = applyQuery(rows, new URLSearchParams([...params].filter(([k]) => !["limit", "offset"].includes(k))));
    const page = embed(
      applyQuery(filtered, new URLSearchParams([...params].filter(([k]) => ["limit", "offset", "order"].includes(k)))),
      table,
      params.get("select"),
    );
    const headers = countHeader(prefer, filtered.length, page.length);
    if (req.method === "HEAD") return send(res, 200, undefined, headers);
    if (wantsObject) {
      if (page.length !== 1) {
        return send(res, 406, {
          code: "PGRST116",
          message: "JSON object requested, multiple (or no) rows returned",
          details: `The result contains ${page.length} rows`,
          hint: null,
        });
      }
      return send(res, 200, page[0], headers);
    }
    return send(res, 200, page, headers);
  }

  const body = await readBody(req);
  const returnRows = prefer.includes("return=representation");

  if (req.method === "POST") {
    const incoming = (Array.isArray(body) ? body : [body]).filter(Boolean);
    const upsert = prefer.includes("resolution=merge-duplicates") || prefer.includes("resolution=ignore-duplicates");
    const conflict = (params.get("on_conflict") ?? "id").split(",");
    const written = incoming.map((row) => {
      if (upsert) {
        const existing = rows.find((r) => conflict.every((c) => r[c] !== undefined && String(r[c]) === String(row[c])));
        if (existing) return Object.assign(existing, row);
      }
      const created = withId(row);
      rows.push(created);
      return created;
    });
    if (!returnRows) return send(res, 201, undefined);
    return send(res, 201, wantsObject ? written[0] : written);
  }

  if (req.method === "PATCH") {
    const target = applyQuery(rows, params);
    for (const row of target) Object.assign(row, body);
    if (!returnRows) return send(res, 204, undefined);
    return send(res, 200, wantsObject ? target[0] ?? null : target);
  }

  if (req.method === "DELETE") {
    const target = applyQuery(rows, params);
    state.tables[table] = rows.filter((row) => !target.includes(row));
    if (!returnRows) return send(res, 204, undefined);
    return send(res, 200, target);
  }

  return send(res, 405, { message: "niet ondersteund" });
}

// ---- Auth ----------------------------------------------------------------

async function handleAuth(req, res, url) {
  const path = url.pathname.replace(/^\/auth\/v1/, "");
  if (path === "/user" && req.method === "GET") {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { code: 401, msg: "Niet ingelogd" });
    return send(res, 200, user);
  }
  if (path === "/user" && req.method === "PUT") {
    const user = userFromRequest(req);
    return send(res, 200, user);
  }
  if (path === "/signup") {
    const body = (await readBody(req)) ?? {};
    // Bevestiging per mail vereist: een gebruiker zonder sessie.
    return send(res, 200, {
      id: "00000000-0000-4000-8000-0000000000aa",
      aud: "authenticated",
      role: "authenticated",
      email: body.email,
      confirmation_sent_at: new Date().toISOString(),
      user_metadata: body.data ?? {},
      app_metadata: { provider: "email" },
      identities: [{ id: "demo", provider: "email" }],
      created_at: new Date().toISOString(),
    });
  }
  if (path === "/token") {
    const user = state.users[0];
    return send(res, 200, fakeSession(user));
  }
  if (path === "/logout") return send(res, 204, undefined);
  if (path === "/otp" || path === "/recover" || path === "/resend") return send(res, 200, {});
  if (path.startsWith("/.well-known/jwks.json")) return send(res, 200, { keys: [] });
  if (path === "/settings") return send(res, 200, { external: { email: true }, disable_signup: false });
  return send(res, 404, { msg: `onbekend auth-endpoint ${path}` });
}

// ---- Server --------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (req.method === "OPTIONS") return send(res, 204, undefined);

    if (url.pathname === "/__demo/preset") {
      const body = (await readBody(req)) ?? {};
      preset = body.preset ?? url.searchParams.get("preset") ?? preset;
      const design = body.design ?? url.searchParams.get("design") ?? "klassiek";
      // Vers inlezen, zodat aangepaste fixtures zonder herstart meedoen.
      const fixtures = await import(`./fixtures.mjs?t=${Date.now()}`);
      state = fixtures.buildState(preset, { design });
      return send(res, 200, { preset, design });
    }
    if (url.pathname === "/__demo/session") {
      return send(res, 200, fakeSession(state.users[0]));
    }
    if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url);
    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url);
    if (url.pathname.startsWith("/storage/v1/")) return send(res, 404, { message: "geen opslag in demo" });
    return send(res, 404, { message: `onbekend pad ${url.pathname}` });
  } catch (error) {
    console.error("[mock-supabase]", error);
    send(res, 500, { message: String(error) });
  }
});

export function startMockSupabase() {
  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[mock-supabase] luistert op http://127.0.0.1:${PORT} (preset ${preset})`);
      resolve(server);
    });
  });
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  startMockSupabase();
}
