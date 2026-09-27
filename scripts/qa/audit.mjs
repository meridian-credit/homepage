import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

/* axe 접근성 점검.
   BASE   기본 http://localhost:3100. 운영 CSP 그대로 보려면 https://localhost:3443(scripts/qa/https.mjs).
   MOTION reduce | no-preference | both(기본). 홈 첫 화면은 움직임 설정에 따라 레이아웃이 다르다.
   받아들인 예외(아래 ACCEPTED)를 뺀 serious · critical 이 하나라도 있으면 실패로 끝난다. */
const BASE = process.env.BASE || 'http://localhost:3100';
const motions = process.env.MOTION && process.env.MOTION !== 'both' ? [process.env.MOTION] : ['reduce', 'no-preference'];
const routes = ['/', '/about', '/services', '/services/tax-bookkeeping', '/clients', '/members', '/contact', '/blog',
  '/blog/apartment-joint-vs-sole-ownership', '/portal', '/faq', '/pricing'];

/* 알고 둔 것. 이유를 같이 적는다. */
const ACCEPTED = [
  /* 건너뛰기 링크 밖의 내용이 landmark 밖에 있다는 경고 — 구조 개편 때 본다. */
  { id: 'region' },
  /* /clients 의 큰 장식 번호(01 · 02 · 03). aria-hidden 이지만 axe 대비 검사는 aria-hidden 을
     건너뛰지 않는다. 색(#C7D3EE)은 디자인 결정이라 그대로 둔다. */
  { id: 'color-contrast', route: '/clients', target: /persona|num|text-\[#C7D3EE\]/ },
  /* 그림(role="img") 속 글자. 대시보드를 요소로 그린 그림이라 WCAG 1.4.3 의 예외
     (그림의 일부인 글자)다. 장면이 그림을 흐리게 누르는 동안 axe 가 잡는다. */
  { id: 'color-contrast', target: /role="img"/ },
  /* 오른쪽 구역 바로가기. 막대 전체가 가운데 점이 걸친 구역의 색(밝음/짙음)을 따른다.
     구역 경계가 막대를 지나는 동안에는 끝의 이름 하나가 반대 색 위에 잠깐 놓인다.
     평소 대비는 .anchor .lb(0.8)가 지킨다. */
  { id: 'color-contrast', motion: 'no-preference', target: /^\.anchor|> \.lb$/ },
];
const accepted = (route, motion, violation, node) => ACCEPTED.some(a => a.id === violation.id && (!a.route || a.route === route)
  && (!a.motion || a.motion === motion) && (!a.target || a.target.test(node.target.join(' ')) || a.target.test(node.html)));

await mkdir('artifacts/audit', { recursive: true });
const browser = await chromium.launch();
const results = [];
let failing = 0;
for (const reducedMotion of motions) {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    for (const route of routes) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto(`${BASE}${route}`);
      await page.evaluate(() => document.fonts.ready);
      /* 움직임이 켜진 화면은 아래 내용이 스크롤해야 나타난다. 나타나는 중인 반투명 글자를
         axe 가 대비 부족으로 잡지 않도록, 읽는 사람처럼 끝까지 내려가 거기서 잰다.
         맨 위로 되돌아오면 스크롤에 묶인 장면(지표 띠 등)이 처음 상태로 돌아가 아직
         안 켜진 글자를 다시 잡는다. */
      if (reducedMotion === 'no-preference') {
        await page.evaluate(async () => {
          const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.6) { scrollTo(0, y); await pause(120); }
          await pause(900);
        });
      }
      await page.waitForTimeout(400);
      const violations = (await new AxeBuilder({ page }).analyze()).violations.map(v => ({
        id: v.id, impact: v.impact,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary, accepted: accepted(route, reducedMotion, v, n) })),
      }));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const bad = violations.filter(v => ['serious', 'critical'].includes(v.impact)).flatMap(v => v.nodes.filter(n => !n.accepted).map(n => `${v.id} ${n.target.join(' ')}`));
      failing += bad.length + errors.length + (overflow ? 1 : 0);
      results.push({ route, width, reducedMotion, errors, overflow, violations });
      page.off('pageerror', onError);
      console.log(reducedMotion.padEnd(13), String(width).padEnd(4), route.padEnd(40),
        violations.map(v => `${v.id}(${v.impact}):${v.nodes.length}${v.nodes.every(n => n.accepted) ? ' accepted' : ''}`).join(', ') || 'ok',
        errors.length ? `pageerror:${errors.length}` : '', overflow ? 'OVERFLOW' : '');
    }
    await context.close();
  }
}
await browser.close();
await writeFile('artifacts/audit/results.json', JSON.stringify(results, null, 2));
if (failing) {
  console.error(`\n받아들이지 않은 serious·critical · 페이지 오류 · 가로 넘침: ${failing}건 (artifacts/audit/results.json)`);
  process.exitCode = 1;
}
