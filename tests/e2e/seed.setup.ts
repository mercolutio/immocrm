import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE } from "./storage";

/**
 * Seed-Setup: sorgt dafür, dass der Test-Account mindestens je 2 Kontakte,
 * 2 Objekte und 2 Deals hat — damit die abhängigen Tests nicht skippen.
 *
 * Idempotent: legt nur an, wenn die Liste leer ist.
 * Läuft nach auth.setup.ts (über dependency), nutzt deren Storage-State.
 */
setup.use({ storageState: STORAGE_STATE });

setup.describe.configure({ mode: "serial" });

async function countRows(page: import("@playwright/test").Page) {
  return page.locator("table tbody tr").count();
}

setup("Seed Kontakte (falls leer)", async ({ page }) => {
  await page.goto("/contacts");
  await page.waitForLoadState("networkidle");

  const existing = await countRows(page);
  if (existing >= 2) {
    setup.skip(true, `Bereits ${existing} Kontakte vorhanden`);
    return;
  }

  const needed = 2 - existing;
  const samples = [
    { first: "Anna", last: "Muster", email: "anna.muster@test.local", phone: "+49 170 1111111" },
    { first: "Ben", last: "Schmidt", email: "ben.schmidt@test.local", phone: "+49 170 2222222" },
    { first: "Clara", last: "Weber", email: "clara.weber@test.local", phone: "+49 170 3333333" },
  ];

  for (let i = 0; i < needed; i++) {
    const s = samples[i];
    await page.getByRole("button", { name: "Neuer Kontakt" }).click();
    await page.getByPlaceholder("Max", { exact: true }).fill(s.first);
    await page.getByPlaceholder("Mustermann").fill(s.last);
    await page.getByPlaceholder("max@beispiel.de").fill(s.email);
    await page.getByPlaceholder("+49 170 1234567").fill(s.phone);
    await page.getByRole("button", { name: "Kontakt speichern" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.goto("/contacts");
    await page.waitForLoadState("networkidle");
  }
});

setup("Seed Objekte (falls leer)", async ({ page }) => {
  await page.goto("/properties");
  await page.waitForLoadState("networkidle");

  const existing = await countRows(page);
  if (existing >= 2) {
    setup.skip(true, `Bereits ${existing} Objekte vorhanden`);
    return;
  }

  const needed = 2 - existing;
  const samples = [
    { title: "3-Zimmer Altbau Berlin-Mitte", street: "Musterstr.", hnr: "12", zip: "10115", city: "Berlin", price: "450000", area: "85" },
    { title: "Loft Hamburg Hafen", street: "Hafenweg", hnr: "5", zip: "20457", city: "Hamburg", price: "620000", area: "110" },
  ];

  for (let i = 0; i < needed; i++) {
    const s = samples[i];
    await page.getByRole("button", { name: "Neues Objekt" }).click();
    await page.getByPlaceholder("3-Zimmer-Wohnung Altbau").fill(s.title);
    await page.getByPlaceholder("Musterstraße").fill(s.street);
    await page.getByPlaceholder("12a").fill(s.hnr);
    await page.getByPlaceholder("10115").fill(s.zip);
    await page.getByPlaceholder("Berlin").fill(s.city);
    await page.getByPlaceholder("450000").fill(s.price);
    await page.getByPlaceholder("85").fill(s.area);
    await page.getByRole("button", { name: "Objekt speichern" }).click();
    // Nach Save: entweder Redirect auf Detailseite oder Sheet geschlossen
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    // Zurück zur Liste für nächste Iteration
    await page.goto("/properties");
    await page.waitForLoadState("networkidle");
  }
});

setup("Seed Deals (falls leer)", async ({ page }) => {
  await page.goto("/pipeline");
  await page.waitForLoadState("networkidle");

  // In Kanban: Deal-Count aus Stats ablesen über alle stage-Karten
  // Einfacher: in Liste wechseln
  await page.getByTitle("Liste").click();
  await page.waitForTimeout(600);

  const existing = await countRows(page);
  if (existing >= 2) {
    setup.skip(true, `Bereits ${existing} Deals vorhanden`);
    return;
  }

  const needed = 2 - existing;

  for (let i = 0; i < needed; i++) {
    await page.getByRole("button", { name: "Neuer Deal" }).click();

    // Kontakt wählen (SearchSelect) — trigger ist erster "Kontakt suchen…" Button
    await page.getByRole("button", { name: /Kontakt suchen/ }).click();
    // Command-Popover öffnet → erste Option klicken
    const firstContactOption = page.getByRole("option").first();
    await expect(firstContactOption).toBeVisible({ timeout: 5000 });
    await firstContactOption.click();

    // Deal speichern — Stage defaulted auf stages[0]
    await page.getByRole("button", { name: "Deal speichern" }).click();
    // Nach erfolgreichem Save: Redirect auf /pipeline/[id]
    await page.waitForURL(/\/pipeline\/[0-9a-f-]+/, { timeout: 10_000 }).catch(() => {});
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    await page.getByTitle("Liste").click();
    await page.waitForTimeout(500);
  }
});
