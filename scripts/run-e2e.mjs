import { spawn } from "node:child_process";
import net from "node:net";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const host = "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;
const isWindows = process.platform === "win32";

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next dev-server startte niet binnen ${Math.round(timeoutMs / 1000)}s op ${baseURL}.`);
}

function spawnNextDev() {
  return spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", host, "--port", String(port)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
}

function spawnPlaywright(args) {
  return spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
    stdio: "inherit",
  });
}

function killProcessTree(child) {
  if (!child?.pid) return Promise.resolve();
  return new Promise((resolve) => {
    if (isWindows) {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      }).on("exit", () => resolve());
      setTimeout(resolve, 5_000);
      return;
    }
    child.kill("SIGTERM");
    setTimeout(resolve, 1000);
  });
}

let server = null;
const reusedServer = await isPortOpen();

try {
  if (!reusedServer) {
    server = spawnNextDev();
    await waitForServer();
  }

  const result = await new Promise((resolve) => {
    const child = spawnPlaywright(process.argv.slice(2));
    child.on("exit", (code) => resolve(code ?? 1));
  });
  process.exitCode = result;
} finally {
  if (server) await killProcessTree(server);
}

process.exit(process.exitCode ?? 0);
