// Start de nep-Supabase en een Next-devserver die daarmee praat in plaats van
// met productie. Omgevingsvariabelen uit het proces gaan in Next voor op
// .env.local, dus ook vanuit de hoofdmap komt er geen echte sleutel in beeld.
//
//   node scripts/instructievideo/serve.mjs

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startMockSupabase } from "./mock-supabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mockPort = Number(process.env.MOCK_SUPABASE_PORT ?? 54399);
const appPort = Number(process.env.DEMO_APP_PORT ?? 3456);

await startMockSupabase();

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "demo-service-role-key",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${appPort}`,
  // De nep-Supabase beantwoordt ook de vragen aan intervals.icu (powercurve).
  INTERVALS_BASE_URL: `http://127.0.0.1:${mockPort}`,
  STRAVA_CLIENT_ID: "00000",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
};

const next = spawn(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(appPort)],
  { cwd: root, env, stdio: "inherit" },
);
next.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => next.kill("SIGINT"));
process.on("SIGTERM", () => next.kill("SIGTERM"));
