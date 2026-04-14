import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

test.use({ storageState: STORAGE_STATE });

test.describe("Navigation — Sidebar & Seiten-Ladecheck", () => {
  test("Dashboard lädt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hdr-title")).toBeVisible();
    // Keine Fehler im Body
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });

  test("Sidebar navigiert zu Pipeline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Pipeline" }).first().click();
    await expect(page).toHaveURL(/\/pipeline/);
    await expect(page.locator(".page-title")).toContainText(/Pipeline/);
  });

  test("Sidebar navigiert zu Objekte", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Objekte" }).first().click();
    await expect(page).toHaveURL(/\/properties/);
    await expect(page.locator(".page-title")).toContainText(/Objekte/);
  });

  test("Sidebar navigiert zu Kontakte", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Kontakte" }).first().click();
    await expect(page).toHaveURL(/\/contacts/);
    await expect(page.locator(".page-title")).toContainText(/Kontakte/);
  });

  test("Settings-Seite lädt", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });
});
