import { test, expect } from "@playwright/test";

test("スクリプトと問題が正しくロードされる", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("h2");
  await expect(page.locator("h2")).toHaveText("サンプル問題");
});
