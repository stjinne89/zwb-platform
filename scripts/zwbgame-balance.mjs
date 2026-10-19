// Bundles and runs the ZWBgame balance simulation (scripts/zwbgame-balance/sim.ts).
// SEEDS=10 LEVELS=2 FTP=270 npm run zwbgame:balance
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const root = process.cwd();
const out = path.join(root, ".tmp", "zwbgame-balance", "sim.mjs");
await mkdir(path.dirname(out), { recursive: true });
await build({ entryPoints: [path.join(root, "scripts", "zwbgame-balance", "sim.ts")], outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "warning" });
await import(pathToFileURL(out).href);
