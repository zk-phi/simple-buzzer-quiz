import { test, expect } from "@playwright/test";

const virtualKeyboardType = async (page, str) => {
  const chars = str.split("");
  for (const ch of chars) {
    await page.locator(`[data-key=${ch}]`).tap();
  }
}

const virtualKeyboardPress = async (page, key) => {
  await page.locator(`[data-key=${key}]`).tap();
}

test("問題とアセットが正しくロードされる", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h2")).toHaveText("サンプル問題");
  await expect(page.locator("#status")).toHaveText(/スタート/);
});

test("Space or スタートボタンでゲームが開始する", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.locator("input[type=checkbox]").click(); // disable sound
  if (isMobile) {
    await expect(page.locator("#status")).toHaveText("スタート");
    await page.locator("#status").click();
  } else {
    await expect(page.locator("#status")).toHaveText("[Space] でスタート");
    await page.keyboard.press(" ");
  }
  await page.waitForSelector("blockquote");
});

test("問題が少しずつ読まれ、読み切ると解答モードに移行する", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.waitForTimeout(500);
  const problem1 = await page.locator(".hidden").innerHTML();
  await page.waitForTimeout(3000);
  const problem2 = await page.locator(".hidden").innerHTML();
  expect(problem1.endsWith(problem2)).toBe(true);
  expect(problem2.endsWith(problem1)).toBe(false);
  // 約 4 秒で読み終わる (125ms x (31 + 3)chars)
  await page.waitForTimeout(1000);
  await expect(page.locator("blockquote")).toHaveText(/「日本で.*何？$/);
  // 自動で入力モードに移行する
  await page.waitForSelector(".pie");
});

test("Space または画面タップで解答モードに移行する", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  if (isMobile) {
    await page.locator("#app").tap();
  } else {
    await page.keyboard.press(" ");
  }
  await page.waitForSelector(".pie");
});

test("キーボードから英数で解答を入力して正解する", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  if (isMobile) {
    await virtualKeyboardType(page, "everest")
  } else {
    await page.keyboard.type("everest");
  }
  await page.waitForSelector(".correct");
});

test("キーボードからローマ字で解答を入力して正解する", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  if (isMobile) {
    await virtualKeyboardType(page, "eberesuto")
  } else {
    await page.keyboard.type("eberesuto");
  }
  await page.waitForSelector(".correct");
});

test("Backspace で解答を訂正できる", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  if (isMobile) {
    await virtualKeyboardType(page, "eberesuteto")
    await virtualKeyboardPress(page, "Backspace");
    await virtualKeyboardPress(page, "Backspace");
    await virtualKeyboardPress(page, "Backspace");
    await virtualKeyboardPress(page, "o");
  } else {
    await page.keyboard.type("eberesuteto");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("o");
  }
  await page.waitForSelector(".correct");
});

test("約６秒放置で誤答になる", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.waitForTimeout(6100);
  await page.waitForSelector("#answer");
});

test("全問終了でリザルト画面になる", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/スタート/);
  await page.locator("input[type=checkbox]").click(); // disable sound
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.keyboard.type("eberesuto");
  await page.waitForSelector("#answer");
  await page.keyboard.press(" ");
  await page.keyboard.press(" ");
  await page.waitForTimeout(6100);
  await page.waitForSelector("#answer");
  await page.keyboard.press(" ");
  await expect(page.locator("h3")).toHaveText("ゲーム終了");
});
