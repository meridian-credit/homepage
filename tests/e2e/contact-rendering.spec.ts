import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test('contact is prerendered instead of rendered on every Worker request', () => {
  const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
  expect(manifest.routes['/contact']).toBeDefined();
  expect(manifest.routes['/contact'].initialRevalidateSeconds).toBe(false);
});

test('contact keeps its form and direct contact details without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact`);
  await expect(page.getByLabel('현재 상황')).toBeVisible();
  await expect(page.getByRole('heading', { name: '직접 연락처로 보내기' })).toBeVisible();
  await context.close();
});

/* 수화 전에는 보내기 버튼이 꺼져 있다. 꺼진 기본 버튼은 Enter 암묵 제출도 막아서,
   JS 가 없을 때 입력이 GET 주소나 빈 POST 로 새지 않는다. 대신 직접 연락처를 안내한다. */
test('without JavaScript, Enter submits nothing and points to direct contact', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/contact`);
  const sent = page.waitForRequest(request => request.method() !== 'GET' || request.url().includes('?'), { timeout: 1500 })
    .then(() => true, () => false);
  await page.getByLabel('이름', { exact: false }).fill('테스트');
  await page.getByLabel('현재 상황').fill('자바스크립트 없이 쓴 글');
  await page.getByLabel('이메일', { exact: false }).fill('test@example.com');
  await page.getByLabel('이메일', { exact: false }).press('Enter');
  expect(await sent).toBe(false);
  expect(page.url()).toBe(`${baseURL}/contact`);
  await expect(page.getByRole('button', { name: '문의 보내기' })).toBeDisabled();
  await expect(page.getByText('보내기 버튼이 켜지지 않으면')).toBeVisible();
  await context.close();
});

/* JS 가 늦게 오는 동안 친 글이 수화 뒤에도 남고, 주소 초안이 그 글을 덮지 않는다.
   다 써 두고 버튼이 켜지자마자 눌러도 서버의 「너무 빠른 제출」(900ms) 에 걸리지 않는다 —
   폼이 보인 때는 JS 가 온 때가 아니라 페이지를 연 때다. */
test('text typed before hydration survives it and is what gets sent', async ({ page }) => {
  let release = () => {};
  const scriptsHeld = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.pathname.startsWith('/_next/static/chunks/') && url.pathname.endsWith('.js'), async route => {
    await scriptsHeld;
    await route.continue();
  });
  await page.route('**/api/contact', route => route.fulfill({ status: 503, json: { error: '일시적인 오류입니다.' } }));
  await page.goto('/contact?service=tax-bookkeeping', { waitUntil: 'domcontentloaded' });
  const submit = page.getByRole('button', { name: '문의 보내기' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('이름', { exact: false }).fill('테스트');
  await page.getByLabel('이메일', { exact: false }).fill('test@example.com');
  await page.getByLabel('현재 상황').fill('수화 전에 쓴 글');
  await page.waitForTimeout(1000); // 느린 휴대폰에서 JS 를 기다리는 동안
  release();
  await expect(submit).toBeEnabled();
  await expect(page.getByText('보내기 버튼이 켜지지 않으면')).toHaveCount(0);
  await expect(page.getByLabel('이름', { exact: false })).toHaveValue('테스트');
  await expect(page.getByLabel('현재 상황')).toHaveValue('수화 전에 쓴 글');
  const request = page.waitForRequest('**/api/contact');
  await submit.click();
  const body = (await request).postDataJSON();
  expect(body).toMatchObject({ name: '테스트', email: 'test@example.com', message: '수화 전에 쓴 글' });
  expect(Date.now() - body.startedAt).toBeGreaterThanOrEqual(900);
  await expect(page.locator('form [role=alert]')).toContainText('일시적인 오류');
  // 초안 효과는 수화 직후에 돈다. 응답까지 기다린 뒤에 봐야 「초안이 안 덮었다」가 참으로 검사된다.
  await expect(page.getByText('선택한 서비스·견적 조건을')).toHaveCount(0);
});
