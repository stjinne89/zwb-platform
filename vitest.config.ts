import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit-tests voor de breekbare pure logica (geen netwerk/DB). E2E blijft via
// Playwright (`npm run test:e2e`).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
