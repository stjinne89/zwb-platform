import { expect, test } from "@playwright/test";

test("full interface, tactics, food, pause and save/resume", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Niet de sterkste? Wel de slimste." })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: `.tmp/zwbgame-${info.project.name}-lobby.png`, fullPage: true });
  await page.getByRole("button", { name: /Ardennenjacht/ }).click();
  await expect(page.getByRole("button", { name: /Ardennenjacht/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start de koers" }).click();
  await expect(page.getByRole("region", { name: "Rennerbediening" })).toBeVisible();
  await page.getByRole("button", { name: "4 Aanvallen" }).click();
  await expect(page.getByRole("button", { name: "4 Aanvallen" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Gel nemen/ }).click();
  await expect(page.getByRole("button", { name: /Eten/ })).toBeVisible();
  await page.getByRole("button", { name: "Pauzeren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Even op adem" })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("zwbgame:v2:demo-0:race"));
  expect(stored).toBeTruthy(); expect(stored).not.toContain("de Vries");
  await page.reload();
  await page.getByRole("button", { name: "Hervat je koers" }).click();
  await expect(page.getByRole("heading", { name: "Ardennenjacht", exact: true })).toBeVisible();
  await page.screenshot({ path: `.tmp/zwbgame-${info.project.name}-race.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("finishing stores only your result and removes the ongoing save", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.zwbgameFixture.nearFinish());
  await page.reload();
  await page.getByRole("button", { name: "Hervat je koers" }).click();
  await expect(page.getByRole("heading", { name: "De koers is van jou." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("zwbgame:v1:demo-0:results"))).toContain('"place":1');
  expect(await page.evaluate(() => localStorage.getItem("zwbgame:v2:demo-0:race"))).toBeNull();
  await page.getByRole("button", { name: "Nieuwe koers" }).click();
  await expect(page.getByRole("heading", { name: "Jouw laatste koersen" })).toBeVisible();
  await page.getByRole("button", { name: "Wissen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jouw laatste koersen" })).toHaveCount(0);
});

test("consent, own power input and profile updates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Spelinstellingen" }).click();
  await expect(page.getByLabel("Gewicht (kg)")).toHaveCount(0);
  await page.getByRole("checkbox", { name: /Mijn sportgegevens/ }).check();
  await page.getByLabel("Gewicht (kg)").fill("75");
  await page.getByLabel("FTP (W)").fill("280");
  await page.getByRole("button", { name: "Spelprofiel bijwerken" }).click();
  await expect(page.getByText(/Eigen meting/)).toBeVisible();
});

test("WebGL unavailable keeps the race playable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("3D is niet beschikbaar");
  await page.getByRole("button", { name: "Start de koers" }).click();
  await expect(page.getByRole("button", { name: /Gel nemen/ })).toBeEnabled();
  await expect(page.getByRole("region", { name: "Koersoverzicht" })).toBeVisible();
});
