import { test as setup, expect } from "@playwright/test";
import path from "path";

export const STORAGE_STATE = path.join(__dirname, ".auth/user.json");

/**
 * Auth-Setup: loggt einen Test-User per UI ein und speichert die Session
 * für alle weiteren Tests. Läuft einmal pro Test-Run.
 *
 * Benötigt in .env.test.local:
 *   E2E_USER_EMAIL=test@example.com
 *   E2E_USER_PASSWORD=...
 */
setup("Login", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    setup.skip(true, "E2E_USER_EMAIL/E2E_USER_PASSWORD nicht gesetzt");
    return;
  }

  await page.goto("/auth/login");
  await page.getByPlaceholder("max@beispiel.de").fill(email);
  await page.getByPlaceholder("Ihr Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Nach Login → redirect auf /
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/auth\//);

  await page.context().storageState({ path: STORAGE_STATE });
});
