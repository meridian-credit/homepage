import { test, expect } from '@playwright/test';
import { ntsMonthUrl, ntsThisMonthUrl, scheduleDates, seoulToday } from '../../src/lib/schedule';

/* 적어 둔 마지막 일정 다음 날(서울 자정). 일정이 늘어나도 테스트가 따라간다. */
const last = scheduleDates.at(-1)!.when;
const dayAfter = new Date(Date.parse(`${last}T00:00:00+09:00`) + 86400000);
const [year, month] = seoulToday(dayAfter).split('-').map(Number);

test('this-month link follows the Seoul date across the year end', () => {
  expect(ntsThisMonthUrl(seoulToday(new Date('2026-12-31T15:30:00Z')))).toBe(ntsMonthUrl(2027, 1));
  expect(ntsThisMonthUrl(seoulToday(new Date('2026-12-31T14:30:00Z')))).toBe(ntsMonthUrl(2026, 12));
});

test('header schedule points to this month on NTS once the listed dates run out', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '큐브는 1360px 이상에서만 보인다');
  await page.clock.setFixedTime(new Date(`${scheduleDates[0].when}T09:00:00+09:00`));
  await page.goto('/services');
  await expect(page.locator('.site-header .sched-cube li').first()).toContainText(scheduleDates[0].what);
  await expect(page.locator('.site-header .sc-empty')).toHaveCount(0);

  await page.clock.setFixedTime(dayAfter);
  await page.goto('/services');
  const link = page.locator('.site-header .sc-empty');
  await expect(link).toHaveText('이번 달 세무일정 · 국세청');
  await expect(link).toHaveAttribute('href', ntsMonthUrl(year, month));
});

test('portal schedule button and popup point to this month once the listed dates run out', async ({ page }) => {
  await page.clock.setFixedTime(dayAfter);
  await page.goto('/portal');
  const button = page.locator('#schedOpen');
  await expect(button).toContainText('이번 달 일정');
  await button.click();
  await expect(page.getByRole('dialog').getByRole('link', { name: '이번 달 세무일정 · 국세청' }))
    .toHaveAttribute('href', ntsMonthUrl(year, month));
});
