import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));
const reporters = process.env.GITHUB_ACTIONS
  ? ["default", "github-actions"]
  : ["default"];

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
    },
  },
  test: {
    globals: true,
    reporters,
    environment: "node",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
