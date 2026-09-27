import { test, expect } from '@playwright/test';

test('inquiry timeout retains input and prevents duplicate submission', async ({ page }) => {
  test.setTimeout(45000);
  let submissions = 0;
  await page.route('**/api/contact', () => { submissions++; });
  await page.goto('/contact');
  await page.getByLabel('이름', { exact: false }).fill('테스트');
  await page.getByLabel('이메일', { exact: false }).fill('test@example.com');
  await page.getByLabel('현재 상황').fill('응답 지연 확인');
  const submit = page.locator('form button[type=submit]');
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(page.locator('form [role=alert]')).toContainText('접수 여부가 확실하지 않습니다', { timeout: 25000 });
  await expect(page.getByLabel('현재 상황')).toHaveValue('응답 지연 확인');
  await expect(submit).toBeEnabled();
  expect(submissions).toBe(1);
});

test('reduced motion hydrates without errors and keeps content visible', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  /* 움직임을 끄면 첫 화면은 붙이지 않고 쌓는다(DOM 은 하나, CSS 가 고른다). */
  await expect(page.locator('.about-stage')).toBeVisible();
  await expect(page.locator('.about-stage-pin')).toHaveCSS('position', 'static');
  await page.locator('footer').scrollIntoViewIfNeeded();
  for (const content of await page.locator('.rise, .rise-slow').all()) {
    await expect(content).toHaveCSS('opacity', '1');
  }
  expect(errors).toEqual([]);
});
import { services } from '../../src/lib/data';
import { pricingLinkWarning } from '../../src/lib/pricing';

test('all services preserve their inquiry context', async ({ page }) => {
  for (const service of services) {
    await page.goto(`/contact?service=${service.slug}`);
    await expect(page.getByLabel('현재 상황')).toHaveValue(new RegExp(service.title));
  }
});

for (const status of [200, 429, 503]) {
  test(`inquiry response ${status} has appropriate UX`, async ({ page }) => {
    await page.route('**/api/contact', route => route.fulfill({ status, json: status === 200 ? { success: true } : { error: '전송 실패' } }));
    await page.goto('/contact');
    await page.getByLabel('이름', { exact: false }).fill('테스트');
    await page.getByLabel('이메일', { exact: false }).fill('test@example.com');
    await page.getByLabel('현재 상황').fill('상담 테스트입니다.');
    await page.getByRole('button', { name: '문의 보내기' }).click();
    if (status === 200) {
      await expect(page.getByRole('heading', { name: '문의가 접수되었습니다' })).toBeVisible();
      await page.getByRole('button', { name: '새 문의 작성' }).click();
      await expect(page.getByLabel('이름', { exact: false })).toBeFocused();
    }
    else {
      await expect(page.locator('form [role=alert]')).toContainText(status === 429 ? '요청이 많습니다' : '전송 실패');
      await expect(page.getByLabel('현재 상황')).toHaveValue('상담 테스트입니다.');
    }
  });
}

test('invalid quote links explain fallback', () => {
  for (const query of ['v=99', 'revenue=Infinity', 'staff=-1', 'addons=monthlyReport,monthlyReport']) {
    expect(pricingLinkWarning(new URLSearchParams(query))).toBeTruthy();
  }
});

test('portal evidence has keyboard periods and consistent profit', async ({ page }) => {
  await page.goto('/portal#evid');
  const period = page.getByRole('tab', { name: '이번 달', exact: true });
  await period.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: '올해', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.locator('#evid .kpi').nth(2).click();
  await expect(page.locator('#evidence-detail')).toContainText('434,300,000');
  await expect(page.locator('#evid .kpi').nth(2)).toContainText('434,300,000');
});

test('essential content is visible without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  // The comparison section is intentionally omitted on mobile in the existing design.
  const headings = page.locator('main h2:not(#vs h2)');
  for (let i = 0; i < await headings.count(); i++) {
    expect(await headings.nth(i).evaluate(el => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return false;
      }
      return true;
    })).toBe(true);
  }
  await context.close();
});
