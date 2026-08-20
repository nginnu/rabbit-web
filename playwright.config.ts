import { defineConfig, devices } from "@playwright/test";

// The suite runs against whichever environment is up:
//
//   kind cluster (default): BASE_URL=https://localhost  — Traefik fronts the
//     whole shop with an mkcert local CA cert, hence ignoreHTTPSErrors.
//   local dev: BASE_URL=http://localhost:3000 — `npm run dev` with
//     AUTH_URL / CATALOG_URL / ORDER_URL pointing at reachable backends.
const baseURL = process.env.BASE_URL ?? "https://localhost";

export default defineConfig({
  testDir: "./e2e",
  // Specs create real orders against real services — keep them sequential so
  // a shared MariaDB never becomes the reason a run flakes.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
