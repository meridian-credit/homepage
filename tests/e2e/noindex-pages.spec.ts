import { test, expect } from '@playwright/test';

/* /pricing 과 /preview 는 검색엔진에 내보내지 않는 페이지다. 사이트맵과 사이트 안 검색에서 빠지고, /pricing 은
   자기 HTML 이 noindex 를 말하고, robots.txt 가 /preview 를 막는다. 한 곳만 바뀌면 나머지와 어긋난다.
   /preview 의 metadata 는 CI 에서 404 라 여기서 볼 수 없다. scripts/check-rules.mjs 가 소스로 본다. */
const hidden = ['/pricing', '/preview'];

test('noindex pages stay out of the sitemap, search and robots', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>');
  for (const route of hidden) expect(sitemap).not.toMatch(new RegExp(`${route}(<|/|\\?)`));

  const search = await (await request.get('/api/search')).json();
  const hrefs: string[] = (Array.isArray(search) ? search : search.items ?? []).map((item: { href: string }) => item.href);
  expect(hrefs.length).toBeGreaterThan(0);
  for (const route of hidden) expect(hrefs.filter(href => href === route || href.startsWith(`${route}/`))).toEqual([]);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/^Disallow: \/preview$/m);

  const pricing = await (await request.get('/pricing')).text();
  expect(pricing).toMatch(/<meta name="robots" content="noindex/);
});
