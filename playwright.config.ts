import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./e2e",
  // 60-second timeout to accommodate Render free-tier cold-start delays (~30 s)
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    // Production (Render): https://finance-analyser-dmff.onrender.com
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: !!process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
