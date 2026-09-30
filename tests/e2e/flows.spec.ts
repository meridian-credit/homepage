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

/* 펼침판은 칸마다 따로 늘 그려져 있고, 여는 판은 처음부터 제 칸 밑에 선다.
   예전에는 판 하나를 칸마다 갈아 끼우고 자리를 0.24초에 걸쳐 옮겨서, 칸을
   옮기면 글이 옛 칸 자리에서 미끄러져 왔다. 판이 열려 있는 동안과 접히는 동안은
   헤더 굴절을 끄고(메뉴가 끊기던 원인), 다 접힌 뒤에 다시 켠다. */
test('desktop menu panes open in place and pause the refraction', async ({ page, isMobile }) => {
  test.skip(isMobile, '펼침판은 넓은 화면에만 있다');
  await page.goto('/services');
  const panel = page.locator('#desktop-navigation-panel');
  const service = page.locator('#desktop-navigation-service');
  const blog = page.locator('#desktop-navigation-blog');
  const glass = () => page.locator('.site-header').evaluate(el => getComputedStyle(el, '::before').backdropFilter);
  const offset = (label: string) => page.evaluate(label => {
    const cols = document.getElementById(`desktop-navigation-${label.toLowerCase()}`)!.querySelector('.hdr-mega-cols')!.getBoundingClientRect();
    const trigger = document.querySelector(`[data-trigger="${label}"]`)!.getBoundingClientRect();
    return Math.abs(cols.left - trigger.left);
  }, label);

  await page.locator('[data-trigger="SERVICE"]').hover();
  await expect(service).toHaveAttribute('data-on', 'true');
  expect(await glass()).toBe('none');
  await page.locator('[data-trigger="BLOG"]').hover();
  await expect(blog).toHaveAttribute('data-on', 'true');
  /* 전환이 걸려 있으면 이 순간에는 아직 서비스 칸 자리 근처다. */
  expect(await offset('BLOG')).toBeLessThan(2);
  await expect(service).toHaveAttribute('inert', '');

  await page.mouse.move(10, 600);
  await expect(panel).toHaveAttribute('data-open', 'false');
  /* 접히는 0.3초 동안은 아직 꺼져 있다. 단축 속성 밖의 allow-discrete 는 빌드에서
     지워져, 닫자마자 켜진 적이 있다. */
  expect(await glass()).toBe('none');
  await expect.poll(glass).toContain('glass-refract');

  /* 키보드로 연 판은 그 칸의 판이다. 닫힌 판(inert)의 링크로 가면 포커스가 사라진다.
     짧은 판(서비스)을 열어도 통이 스크롤되어 칸 제목이 잘리지 않는다. */
  await page.locator('[data-trigger="BLOG"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(blog.locator('a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await page.locator('[data-trigger="SERVICE"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(service.locator('a').first()).toBeFocused();
  await page.waitForTimeout(400);
  expect(await panel.evaluate(el => el.scrollTop)).toBe(0);
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
