import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

test.use({ storageState: STORAGE_STATE });

test.describe("Objekte — Bulk-Auswahl", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/properties");
    await page.waitForLoadState("networkidle");
  });

  test("Action-Bar erscheint nach Auswahl, verschwindet nach Clear", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte zum Testen vorhanden");

    await page.locator('table tbody tr input[type="checkbox"]').first().check();
    await expect(page.getByText(/[1-9]\d* ausgewählt/)).toBeVisible();

    await page.getByRole("button", { name: "Auswahl aufheben" }).click();
    await expect(page.getByText(/[1-9]\d* ausgewählt/)).not.toBeVisible();
  });

  test("Header-Checkbox selektiert alle sichtbaren Zeilen", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte zum Testen vorhanden");

    await page.locator('table thead input[type="checkbox"]').check();
    await expect(page.getByText(new RegExp(`${rowCount} ausgewählt`))).toBeVisible();
  });

  test("Zeilen-Klick navigiert zur Detailseite", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte zum Testen vorhanden");

    await page.locator("table tbody tr").first().locator("td").nth(1).click();
    await expect(page).toHaveURL(/\/properties\/[0-9a-f-]+/);
  });

  test("Pagination-Footer ist sichtbar", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte zum Testen vorhanden");

    await expect(page.getByText(/Pro Seite:/)).toBeVisible();
    await expect(page.getByText(/Seite \d+ von \d+/)).toBeVisible();
  });

  test("Dropdown 'Status ändern' öffnet ohne Clipping", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Objekte zum Testen vorhanden");

    await page.locator('table tbody tr input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /Status ändern/ }).click();

    // Popover-Option sichtbar (verfügbar = typischer Status)
    const option = page.getByRole("button", { name: /verfügbar|reserviert|verkauft/i }).first();
    await expect(option).toBeVisible();
  });
});
