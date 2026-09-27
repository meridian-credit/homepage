import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const postSlugs = (page: Page) =>
  page.$$eval('a[href^="/blog/"]', links => [...new Set(links.map(link => link.getAttribute('href')))].sort());

test('blog is in the prerender manifest', () => {
  const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
  expect(manifest.routes['/blog']).toBeDefined();
});

/* 정적 HTML 이 수화 뒤 화면과 같은 목록을 이미 들고 있어야 한다. 예전 fallback 은 null 이라
   HTML 에 글이 없었고, 수화 뒤 목록이 들어오며 아래를 밀었다. */
test('blog lists the same posts with and without JavaScript', async ({ browser, baseURL, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const staticPage = await context.newPage();
  await staticPage.goto(`${baseURL}/blog`);
  const withoutJs = await postSlugs(staticPage);
  await context.close();
  expect(withoutJs.length).toBeGreaterThanOrEqual(12);

  await page.goto('/blog');
  await page.waitForLoadState('networkidle');
  expect(await postSlugs(page)).toEqual(withoutJs);
});

test('blog does not shift while it hydrates', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'LayoutShift API 는 Chromium 에만 있다');
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/blog');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1);
});
