import { test, expect } from "@playwright/test";

test("Beach simulator loads and renders its 3D canvas", async ({ page }) => {
  const response = await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);

  await expect(page.locator("body")).toBeVisible();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();

  const dimensions = await canvas.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));

  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);

  await page.waitForTimeout(1500);

  await expect(page).toHaveScreenshot("beach-simulator-ui.png", {
    fullPage: false,
    animations: "disabled",
    mask: [canvas],
    maxDiffPixelRatio: 0.05,
  });
});

test("Command center loads and matches its visual baseline", async ({ page }) => {
  const response = await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);

  await expect(page.locator("body")).toBeVisible();

  await page.waitForTimeout(1500);

  await expect(page).toHaveScreenshot("command-center.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.05,
  });
});

test("FastAPI documentation loads", async ({ page }) => {
  const response = await page.goto("http://localhost:8000/docs", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);

  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("#swagger-ui")).toBeVisible();
});
