import { defineConfig, devices } from "@playwright/test";
import path from "path";

// .env.test.local für Test-Credentials laden (falls vorhanden)
import fs from "fs";
const envFile = path.join(__dirname, ".env.test.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    // Smoke-Tests ohne Auth
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Auth-Setup (einmaliger Login, Storage speichern)
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Seed-Setup: legt Kontakte/Objekte/Deals an, wenn Account leer ist
    {
      name: "seed",
      testMatch: /seed\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Authentifizierte Tests — nutzen Storage aus setup
    {
      name: "authenticated",
      testIgnore: [/smoke\.spec\.ts/, /auth\.setup\.ts/, /seed\.setup\.ts/],
      dependencies: ["seed"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
