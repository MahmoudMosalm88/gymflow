import { defineConfig, devices } from "@playwright/test";

const isProdTarget = process.env.PLAYWRIGHT_TARGET === "prod";
const localBaseURL =
  process.env.PLAYWRIGHT_LOCAL_BASE_URL || "http://127.0.0.1:3100";
const productionBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PRODUCTION_BASE_URL ||
  "https://gymflowsystem.com";

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: isProdTarget ? 30_000 : 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: isProdTarget ? productionBaseURL : localBaseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: isProdTarget
    ? undefined
    : {
        command: "PORT=3100 node .next/standalone/server.js",
        url: localBaseURL,
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium-local",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium-prod",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
