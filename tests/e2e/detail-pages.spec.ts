import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

test.use({ storageState: STORAGE_STATE });

test.describe("Detailseiten — Laden & Grundstruktur", () => {
  test("Kontakt-Detail lädt (erste Zeile)", async ({ page }) => {
    await page.goto("/contacts");
    await page.waitForLoadState("networkidle");

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Kontakte vorhanden");

    await page.locator("table tbody tr").first().locator("td").nth(1).click();
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+/);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });

  test("Objekt-Detail lädt", async ({ page }) => {
    await page.goto("/properties");
    await page.waitForLoadState("networkidle");

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte vorhanden");

    await page.locator("table tbody tr").first().locator("td").nth(1).click();
    await expect(page).toHaveURL(/\/properties\/[0-9a-f-]+/);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });

  test("Deal-Detail lädt (via List-Modus)", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");

    await page.getByTitle("Liste").click();
    await page.waitForTimeout(500);

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Deals vorhanden");

    await page.locator("table tbody tr").first().locator("td").nth(1).click();
    await expect(page).toHaveURL(/\/pipeline\/[0-9a-f-]+/);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });
});
