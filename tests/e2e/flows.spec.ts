import { test, expect } from '@playwright/test';
import { calculateEstimate, DEFAULT_STATE, deserializeStateFromParams, serializeStateToParams } from '../../src/lib/pricing';
import { daysLeft, seoulToday } from '../../src/lib/schedule';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/contact', route => route.fulfill({ status: 503, json: { error: '일시적인 오류입니다.' } }));
});

test('duplicate shared options count once and round trip', () => {
  const state = { ...DEFAULT_STATE, ...deserializeStateFromParams(new URLSearchParams('type=sole&revenue=100000000&addons=monthlyReport,monthlyReport')) };
  expect(calculateEstimate(state).monthlyTotal).toBe(150000);
  expect({ ...DEFAULT_STATE, ...deserializeStateFromParams(serializeStateToParams(state)) }).toEqual(state);
  expect(deserializeStateFromParams(new URLSearchParams('v=99'))).toEqual({});
  expect(daysLeft('2026-10-12', '2026-10-11')).toBe(1);
  expect(seoulToday(new Date('2026-10-11T15:00:00Z'))).toBe('2026-10-12');
});

test('customer hash selects correct tab and supports keyboard', async ({ page }) => {
  await page.goto('/clients#growing-ceo');
  const tab = page.getByRole('tab').nth(1);
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab').nth(2)).toBeFocused();
  await page.goBack();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
});

test('menu focus stays usable', async ({ page, isMobile }) => {
  await page.goto('/services');
  if (isMobile) {
    const trigger = page.getByRole('button', { name: '메뉴 열기', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: '모바일 메뉴' });
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(page.locator('footer')).not.toHaveAttribute('inert', '');
  } else {
    const trigger = page.locator('[data-trigger="SERVICE"]');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const panel = page.locator('#desktop-navigation-panel');
    await expect(panel.locator('a').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(panel).toHaveAttribute('data-open', 'true');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('inquiry preserves estimate and retains input after server error', async ({ page }) => {
  await page.goto('/contact?from=pricing&v=1&type=sole&revenue=100000000&addons=monthlyReport');
  const message = page.getByLabel('현재 상황');
  await expect(message).toHaveValue(/150,000원/);
  await page.getByLabel('이름', { exact: false }).fill('테스트');
  await page.getByLabel('이메일', { exact: false }).fill('test@example.com');
  await page.getByRole('button', { name: '문의 보내기' }).click();
  await expect(page.locator('form [role=alert]')).toContainText('일시적인 오류');
  await expect(message).toHaveValue(/150,000원/);
});

test('blog page and scroll survive article and back', async ({ page }) => {
  await page.goto('/blog?page=3');
  await expect(page.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-current', 'page');
  const article = page.locator('a.ins-card').first();
  await article.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await article.click();
  await expect(page).toHaveURL(/\/blog\/.+/);
  await page.goBack();
  await expect(page).toHaveURL(/page=3/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 200);
});

/* 재시도 응답도 여기서 준다. 실제 /api/search 를 부르면 전체 스위트 부하 중 서버가 늦을 때
   한 번씩 떨어졌다(단독 90/90 통과). 이 테스트가 보는 것은 실패 → 다시 시도 흐름이다. */
const SEARCH_FIXTURE = [{ title: '세무 기장', href: '/services/tax-bookkeeping', kind: '서비스', hint: '세무자문', terms: '세무 기장 장부' }];

test('search distinguishes service failure and retries', async ({ page, isMobile }) => {
  let fail = true;
  await page.route('**/api/search', async route => {
    if (fail) await route.fulfill({ status: 503, json: {} });
    else await route.fulfill({ json: SEARCH_FIXTURE });
  });
  await page.goto('/services');
  if (isMobile) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  await page.getByRole('button', { name: '검색 열기', exact: true }).filter({ visible: true }).click();
  await page.getByRole('combobox', { name: '사이트 검색' }).filter({ visible: true }).fill('세무');
  await expect(page.locator('.site-search [role=alert]')).toContainText('검색을 불러오지 못했습니다');
  fail = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('option').first()).toBeVisible();
});
