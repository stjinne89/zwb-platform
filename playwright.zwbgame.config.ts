import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/game-browser", timeout: 30000, fullyParallel: false, workers: 1,
  use: { baseURL: "http://127.0.0.1:3199", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node scripts/zwbgame-preview.mjs", url: "http://127.0.0.1:3199", reuseExistingServer: !process.env.CI, timeout: 30000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
