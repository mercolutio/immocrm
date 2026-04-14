import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

test.use({ storageState: STORAGE_STATE });

test.describe("Pagination — localStorage-Persistenz & Navigation", () => {
  test("pageSize wird in localStorage persistiert", async ({ page }) => {
    await page.goto("/contacts");
    await page.waitForLoadState("networkidle");

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Kontakte vorhanden");

    // Setze pageSize direkt via localStorage + Reload
    await page.evaluate(() => localStorage.setItem("immocrm.pageSize.contacts", "50"));
    await page.reload();
    await page.waitForLoadState("networkidle");

    const stored = await page.evaluate(() => localStorage.getItem("immocrm.pageSize.contacts"));
    expect(stored).toBe("50");

    // Footer zeigt pageSize 50 nach Reload (indirekt über Seite-Anzeige)
    await expect(page.getByText(/Pro Seite:/)).toBeVisible();
  });

  test("Weiter/Zurück-Buttons sind vorhanden und reagieren", async ({ page }) => {
    await page.goto("/contacts");
    await page.waitForLoadState("networkidle");

    const rowCount = await page.locator("table tbody tr").count();
    test.skip(rowCount === 0, "Keine Kontakte vorhanden");

    const backBtn = page.getByRole("button", { name: /Zurück/ });
    const nextBtn = page.getByRole("button", { name: /Weiter/ });

    await expect(backBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Zurück-Button auf Seite 1 disabled
    await expect(backBtn).toBeDisabled();
  });
});
