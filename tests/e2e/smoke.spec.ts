import { expect, test, type Page } from "@playwright/test";

async function expectHealthyPage(page: Page) {
  await expect(page.locator("body")).not.toContainText("This page couldn't load");
  await expect(page.locator("body")).not.toContainText("An unexpected response was received from the server");
  await expect(page.locator("body")).not.toContainText("Application error");
}

test.describe("public smoke checks", () => {
  test("login page loads and switches to register mode", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("form").getByRole("button", { name: "Inloggen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stuur magic link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wachtwoord vergeten?" })).toBeVisible();
    await expect(page.getByPlaceholder("E-mailadres")).toBeVisible();

    await page.getByRole("button", { name: "Registreren" }).click();
    await expect(page.getByRole("button", { name: "Account aanmaken" })).toBeVisible();
    await expectHealthyPage(page);
  });

  test("login page can open password reset mode", async ({ page }) => {
    await page.goto("/login?mode=reset");

    await expect(page.getByRole("button", { name: "Stuur resetlink" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Terug naar inloggen" })).toBeVisible();
    await expectHealthyPage(page);
  });

  test("login page shows a friendly auth-link storage error", async ({ page }) => {
    await page.goto("/login?error=auth-link-storage-missing");

    await expect(page.getByText("Deze e-maillink kan niet worden afgerond")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("PKCE code verifier");
    await expectHealthyPage(page);
  });

  test("privacy page loads without authentication", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.getByRole("heading", { name: "Privacyverklaring" })).toBeVisible();
    await expect(page.getByText("Laatst bijgewerkt")).toBeVisible();
    await expectHealthyPage(page);
  });

  test("story page loads without authentication", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/verhaal", { waitUntil: "domcontentloaded", timeout: 60000 });

    await expect(page.getByRole("heading", { name: "Het verhaal van ZWB" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Van prototype naar echte story" })).toBeVisible();
    await expectHealthyPage(page);
  });
});

test.describe("auth guard smoke checks", () => {
  for (const path of ["/dashboard", "/training", "/profiel"]) {
    test(`${path} redirects anonymous visitors to login`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("form").getByRole("button", { name: "Inloggen" })).toBeVisible();
      await expectHealthyPage(page);
    });
  }
});
