import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

test.use({ storageState: STORAGE_STATE });

test.describe("Pipeline — Bulk-Auswahl (List-Modus)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
  });

  test("Toggle Kanban ↔ Liste schaltet Ansicht um", async ({ page }) => {
    // Default = Kanban. Kein <table>
    await expect(page.locator("table")).toHaveCount(0);

    await page.getByTitle("Liste").click();
    // In Liste: table sichtbar (wenn Daten vorhanden) ODER Empty-State
    await page.waitForTimeout(300);

    await page.getByTitle("Kanban").click();
    await page.waitForTimeout(300);
    await expect(page.locator("table")).toHaveCount(0);
  });

  test("Auswahl in Liste → Action-Bar erscheint", async ({ page }) => {
    await page.getByTitle("Liste").click();
    await page.waitForTimeout(500);

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Deals zum Testen vorhanden");

    await page.locator('table tbody tr input[type="checkbox"]').first().check();
    await expect(page.getByText(/[1-9]\d* ausgewählt/)).toBeVisible();
  });

  test("Zeilen-Klick navigiert zur Deal-Detailseite", async ({ page }) => {
    await page.getByTitle("Liste").click();
    await page.waitForTimeout(500);

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Deals zum Testen vorhanden");

    await page.locator("table tbody tr").first().locator("td").nth(1).click();
    await expect(page).toHaveURL(/\/pipeline\/[0-9a-f-]+/);
  });
});
