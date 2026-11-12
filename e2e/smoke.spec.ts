import { expect, test, type Page } from '@playwright/test';

/** Fast bot, tutorial already seen (set before the app reads storage). */
async function useFastSettings(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('rune-duel/settings')) {
      localStorage.setItem('rune-duel/settings', JSON.stringify({ botSpeed: 'fast', tutorialDone: true }));
    }
  });
}

async function startBattle(page: Page) {
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await page.getByRole('button', { name: /Vào trận/ }).click();
  await expect(page.getByText('Lượt của bạn', { exact: true })).toBeVisible();
}

test('loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Rune Duel/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('plays a card, ends the turn, and the bot hands control back', async ({ page }) => {
  await useFastSettings(page);
  await page.goto('./');
  await startBattle(page);

  const hand = page.getByRole('group', { name: 'Thẻ trên tay' }).getByRole('button');
  await hand.first().click();
  await page.getByRole('button', { name: 'Dùng thẻ' }).click();
  await expect(page.getByRole('log')).toContainText('Bạn dùng thẻ');

  await page.getByRole('button', { name: 'Kết thúc lượt' }).click();
  await expect(page.getByText('Lượt của Đối thủ', { exact: true })).toBeVisible();
  await expect(page.getByText('Lượt của bạn', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('log')).toContainText('Đối thủ');
  await expect(page.getByRole('button', { name: 'Kết thúc lượt' })).toBeEnabled();
});

test('new players see the tutorial', async ({ page }) => {
  await page.goto('./');
  await startBattle(page);
  await expect(page.getByRole('status', { name: 'Hướng dẫn' })).toContainText('Bước 1');
});

test('works offline after the first visit (service worker)', async ({ page, context }) => {
  await useFastSettings(page);
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Reload once so the page is controlled by the worker and assets are cached.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await startBattle(page); // fetches any lazily used assets while online

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Rune Duel/ })).toBeVisible();
  await page.getByRole('button', { name: /Tiếp tục trận/ }).click();
  await expect(page.getByText('Lượt của bạn', { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('mobile layout: no horizontal scroll, hand and End Turn reachable', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile only');
  await useFastSettings(page);
  await page.goto('./');
  await startBattle(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Kết thúc lượt' })).toBeInViewport();
  await expect(page.getByRole('group', { name: 'Thẻ trên tay' }).getByRole('button').first()).toBeInViewport();

  // Tap a card → detail with the explicit play button.
  await page.getByRole('group', { name: 'Thẻ trên tay' }).getByRole('button').first().tap();
  await expect(page.getByRole('button', { name: 'Dùng thẻ' })).toBeVisible();
});
