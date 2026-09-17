// Local-only component preview. Synthetic identities; no auth bypass in Next.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const out = path.join(root, ".tmp", "zwbgame-preview");
await mkdir(out, { recursive: true });
const fixture = path.join(root, "tests", "fixtures", "zwbgame");
await build({
  entryPoints: [path.join(fixture, "entry.tsx")], outfile: path.join(out, "game.js"), bundle: true, format: "esm", jsx: "automatic", sourcemap: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "game-preview-services", setup(builder) {
    builder.onResolve({ filter: /^next\/dynamic$/ }, () => ({ path: path.join(fixture, "dynamic.tsx") }));
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: path.join(fixture, "link.tsx") }));
    builder.onResolve({ filter: /^\.\/actions$/ }, (args) => args.importer.endsWith("game-client.tsx") ? { path: path.join(fixture, "services.ts") } : undefined);
  } }],
});
const html = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZWBgame · lokale demo</title><link rel="stylesheet" href="/game.css"><body><div class="demo-banner">Lokale speeltest · fictieve renners · geen verbinding met ledengegevens</div><div id="root"></div><script type="module" src="/game.js"></script></body></html>`;
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); return; }
  if (!["/game.js", "/game.js.map", "/game.css", "/game.css.map"].includes(pathname)) { res.writeHead(404); res.end(); return; }
  try { const content = await readFile(path.join(out, pathname.slice(1))); res.writeHead(200, { "Content-Type": pathname.endsWith(".css") ? "text/css" : pathname.endsWith(".map") ? "application/json" : "application/javascript" }); res.end(content); }
  catch { res.writeHead(404); res.end(); }
});
const port = Number(process.env.ZWBGAME_PREVIEW_PORT ?? 3199);
server.listen(port, "127.0.0.1", () => process.stdout.write(`ZWBgame lokale demo: http://127.0.0.1:${port}\n`));
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
