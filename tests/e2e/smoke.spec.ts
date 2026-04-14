import { test, expect } from "@playwright/test";

// Minimaler Smoke-Test: Login-Seite lädt und zeigt Formular.
// Erweiterte Tests (Bulk-Aktionen, Pagination) benötigen Test-Credentials
// in .env.test.local und sind in separaten Specs.

test("Login-Seite lädt", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.locator("form")).toBeVisible();
});

test("Geschützte Route redirectet zu Login", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page).toHaveURL(/\/auth\/login/);
});
