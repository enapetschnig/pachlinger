import { test, expect, Page } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  cleanupLieferscheineFor,
  cleanupKundenBy,
} from "./helpers";

// Eindeutige Test-Mails pro Lauf
const stamp = Date.now();
const ADMIN_EMAIL = `pw-admin-${stamp}@pachlinger.local`;
const MA_EMAIL = `pw-ma-${stamp}@pachlinger.local`;
const PASSWORD = "PWTest-12345!";

let adminUid: string;
let maUid: string;

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeAll(async () => {
  adminUid = await createTestUser({
    email: ADMIN_EMAIL,
    password: PASSWORD,
    vorname: "PW",
    nachname: "Admin",
    role: "administrator",
    active: true,
  });
  maUid = await createTestUser({
    email: MA_EMAIL,
    password: PASSWORD,
    vorname: "PW",
    nachname: "Mitarbeiter",
    active: true,
  });
  // Kurze Wartezeit damit profile-Trigger sicher durch ist
  await new Promise((r) => setTimeout(r, 500));
});

test.afterAll(async () => {
  await cleanupLieferscheineFor(maUid);
  await cleanupLieferscheineFor(adminUid);
  await cleanupKundenBy(maUid);
  await cleanupKundenBy(adminUid);
  await deleteTestUser(maUid);
  await deleteTestUser(adminUid);
});

async function loginAs(page: Page, email: string, password: string) {
  // Install-Prompt-Onboarding überspringen
  await page.addInitScript(() => {
    localStorage.setItem("pachlinger_install_dialog_seen", "true");
    sessionStorage.setItem("pachlinger_install_dialog_session_shown", "true");
  });
  await page.goto("/auth");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("/", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

test("0. robots noindex meta-tag im HTML", async ({ request }) => {
  const resp = await request.get("/");
  const html = await resp.text();
  expect(html).toContain('name="robots"');
  expect(html).toContain("noindex");
});

test("1. unauthed wird auf /auth umgeleitet", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/auth/);
  await expect(page.getByText("Lieferscheine erstellen und verwalten")).toBeVisible();
});

test("2. falsches Passwort zeigt Fehler-Toast", async ({ page }) => {
  await page.goto("/auth");
  await page.getByLabel("E-Mail").fill(MA_EMAIL);
  await page.getByLabel("Passwort").fill("falsch-falsch");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(/Fehler beim Anmelden/).first()).toBeVisible({ timeout: 5000 });
});

test("3. Admin-Login + Dashboard mit Admin-spezifischen Karten", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  // Admin sieht Card "Kunden" + Card "Mitarbeiter"
  await expect(page.getByText("Stammdaten verwalten & importieren")).toBeVisible();
  await expect(page.getByText("Benutzerverwaltung & Freischaltungen")).toBeVisible();
});

test("4. Mitarbeiter-Login + Dashboard ohne Admin-Karten", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await expect(page.getByRole("heading", { name: "Mein Dashboard" })).toBeVisible();
  // Mitarbeiter sieht KEINE Admin-Beschreibungen
  await expect(page.getByText("Stammdaten verwalten & importieren")).toHaveCount(0);
  await expect(page.getByText("Benutzerverwaltung & Freischaltungen")).toHaveCount(0);
});

test("5. Admin: /admin zeigt E-Mail-Einstellungen mit festem Absender", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, PASSWORD);
  await page.goto("/admin");
  await expect(page.getByText("E-Mail-Einstellungen")).toBeVisible();
  await expect(page.getByText("pachlinger@handwerkapp.at")).toBeVisible();
});

test("6. Mitarbeiter: /admin → 'Kein Zugriff'", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await page.goto("/admin");
  await expect(page.getByText(/Kein Zugriff/i)).toBeVisible({ timeout: 5000 });
});

test("7. Mitarbeiter: /kunden → Admin-Sperrtext", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await page.goto("/kunden");
  await expect(page.getByText(/nur für Administratoren/i)).toBeVisible({ timeout: 5000 });
});

test("8. Admin: Kunde anlegen via Sheet", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, PASSWORD);
  await page.goto("/kunden");
  await page.getByRole("button", { name: /Neuer Kunde/ }).first().click();
  await page.locator("#kunde-name").waitFor({ state: "visible" });
  await page.locator("#kunde-name").fill("E2E Kunde GmbH");
  await page.locator("#kunde-strasse").fill("Teststraße 1");
  await page.locator("#kunde-plz").fill("8010");
  await page.locator("#kunde-ort").fill("Graz");
  await page.locator("#kunde-knr").fill("E2E001");
  await page.locator("#kunde-uid").fill("ATU99999999");
  await page.locator("#kunde-email").fill("test@e2e.local");
  // Submit (im Sheet)
  await page.getByRole("button", { name: /^Speichern/ }).first().click();
  await expect(page.getByText("E2E Kunde GmbH").first()).toBeVisible({ timeout: 10_000 });
});

test("9. Mitarbeiter: Lieferschein erstellen → Wizard öffnet Sign-Dialog", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await page.goto("/lieferscheine/neu");

  // Empfänger-Combobox ist ein Input mit id=empfaenger_name
  await page.locator("#empfaenger_name").fill("E2E Wizard Empfänger");
  // Click außerhalb damit Combobox-Popover schließt
  await page.locator("#lieferschein_datum").click();

  // Position Bezeichnung — Textarea direkt suchen
  const bezeichnungArea = page.locator("textarea").first();
  await bezeichnungArea.fill("E2E Position Test");

  // Submit
  await page.getByRole("button", { name: /Lieferschein erstellen/ }).click();
  await page.waitForURL(/\/lieferscheine\/[a-f0-9-]+/, { timeout: 15_000 });

  // Sign-Dialog auto-open
  await expect(page.getByRole("heading", { name: "Lieferschein unterschreiben" })).toBeVisible({ timeout: 10_000 });
  // Wizard-Cancel-Label
  await expect(page.getByRole("button", { name: /Später unterschreiben/ })).toBeVisible();
  await page.getByRole("button", { name: /Später unterschreiben/ }).click();

  // Detail bleibt offen — der Card-Title ist semantic der eindeutige Treffer
  await expect(page.getByText("E2E Wizard Empfänger").first()).toBeVisible();
});

test("10. Mitarbeiter sieht nur eigenen Lieferschein in Liste", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await page.goto("/lieferscheine");
  await expect(page.getByText("E2E Wizard Empfänger").first()).toBeVisible({ timeout: 10_000 });
});

test("11. Admin sieht den Lieferschein des Mitarbeiters", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, PASSWORD);
  await page.goto("/lieferscheine");
  await expect(page.getByText("E2E Wizard Empfänger").first()).toBeVisible({ timeout: 10_000 });
});

test("12. PDF-Download in der Liste funktioniert", async ({ page }) => {
  await loginAs(page, MA_EMAIL, PASSWORD);
  await page.goto("/lieferscheine");
  await page.getByText("E2E Wizard Empfänger").first().waitFor({ state: "visible", timeout: 10_000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.locator('button[title="PDF herunterladen"]').first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/LS\d+_\d+\.pdf$/);
});
