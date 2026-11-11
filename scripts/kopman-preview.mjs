// Local-only preview of Kopman (src/kopman). The game has no server side, so this
// is the real client with browser storage. Listens on localhost only.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const out = path.join(root, ".tmp", "kopman-preview");
await mkdir(out, { recursive: true });
await build({
  entryPoints: [path.join(root, "tests", "fixtures", "kopman", "entry.tsx")], outfile: path.join(out, "game.js"), bundle: true, format: "esm", jsx: "automatic", sourcemap: true,
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const html = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kopman · lokale demo</title><link rel="stylesheet" href="/game.css"><body><div id="root"></div><script type="module" src="/game.js"></script></body></html>`;
const types = { ".js": "application/javascript", ".css": "text/css", ".map": "application/json" };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); return; }
  if (!["/game.js", "/game.js.map", "/game.css", "/game.css.map"].includes(pathname)) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { "Content-Type": types[path.extname(pathname)] }); res.end(await readFile(path.join(out, pathname.slice(1)))); }
  catch { res.writeHead(404); res.end(); }
});
const port = Number(process.env.KOPMAN_PREVIEW_PORT ?? 3198);
server.listen(port, "127.0.0.1", () => process.stdout.write(`Kopman lokale demo: http://127.0.0.1:${port}\n`));
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
