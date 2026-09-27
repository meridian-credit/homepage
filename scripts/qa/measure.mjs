// 경로 × 화면폭(1440 · 390)마다 콘솔 오류, 실패 요청, 가로 넘침, CLS/LCP, 종류별 전송량, 메타, 작은 탭 영역을 잰다.
// 조건(캐시 없는 새 context, 끝까지 휠 스크롤)과 예산은 docs/plans/production-fixes/README.md §5, P0 수치는 baseline.json.
// 운영 CSP 로 재려면 TLS 프록시(scripts/qa/https.mjs) 뒤에서 BASE=https://localhost:3443 로 돌린다.
// WebKit(ENGINE=webkit)은 http :3100 에서 upgrade-insecure-requests 때문에 CSS 를 못 받으니 꼭 프록시로 잰다.
import { chromium, webkit } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = process.env.OUT || 'artifacts/measure';
const engine = process.env.ENGINE === 'webkit' ? webkit : chromium;
await mkdir(OUT, { recursive: true });

const routes = (process.env.ROUTES || '/,/about,/services,/services/tax-bookkeeping,/services/audit-advisory,/services/tax-advisory,/members,/clients,/blog,/blog/apartment-joint-vs-sole-ownership,/faq,/portal,/contact,/pricing').split(',');
const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
];

const browser = await engine.launch();
const results = [];
for (const vp of viewports) {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: engine === chromium ? vp.isMobile : undefined, hasTouch: vp.isMobile, deviceScaleFactor: vp.isMobile ? 3 : 1, ignoreHTTPSErrors: true });
  await context.route('**/api/contact', r => r.abort());
  for (const route of routes) {
    const page = await context.newPage();
    const consoleMsgs = [];
    const failed = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 240)}`); });
    page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message.slice(0, 240)}`));
    page.on('requestfailed', r => { const u = r.url(); if (!u.includes('/api/contact')) failed.push(`${r.failure()?.errorText} ${u}`); });
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = null; window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map(s => s.node && (s.node.className || s.node.nodeName)).map(String).map(x => x.slice(0, 60)) }); } } }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { const es = l.getEntries(); const e = es[es.length - 1]; window.__lcp = { t: Math.round(e.startTime), el: e.element ? (e.element.tagName + '.' + String(e.element.className).slice(0, 50)) : null, url: e.url?.slice(-60) }; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const t0 = Date.now();
    const resp = await page.goto(BASE + route, { waitUntil: 'load' });
    const loadMs = Date.now() - t0;
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const lcpBeforeScroll = await page.evaluate(() => window.__lcp);
    const clsBeforeScroll = await page.evaluate(() => window.__cls);
    // 끝까지 천천히 내려 스크롤 장면과 지연 로딩을 모두 깨운다.
    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < scrollH; y += vp.viewport.height * 0.6) {
      await page.mouse.wheel(0, vp.viewport.height * 0.6);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    const m = await page.evaluate(({ isMobile }) => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.visibility === 'hidden') continue;
        if (r.right > vw + 1 || r.left < -1) {
          // 조상이 overflow 를 잘라 주면 넘침이 아니다.
          let p = el.parentElement, clipped = false;
          while (p && p !== document.body) { const pc = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(pc.overflowX)) { clipped = true; break; } p = p.parentElement; }
          if (!clipped) over.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}]`);
        }
      }
      const res = performance.getEntriesByType('resource');
      const nav = performance.getEntriesByType('navigation')[0];
      const bucket = {};
      for (const r of res) {
        const u = r.name;
        const k = /\.js(\?|$)/.test(u) ? 'js' : /\.css(\?|$)/.test(u) ? 'css' : /\.(woff2?|ttf|otf)(\?|$)/.test(u) ? 'font' : /\.(mp4|webm|mov)(\?|$)/.test(u) ? 'media' : /(\.(png|jpe?g|webp|avif|svg|gif)|_next\/image)/.test(u) ? 'img' : 'other';
        bucket[k] = (bucket[k] || 0) + (r.transferSize || r.encodedBodySize || 0);
      }
      const media = [...document.querySelectorAll('video')].map(v => ({ src: v.currentSrc?.slice(-40), preload: v.preload, autoplay: v.autoplay, w: Math.round(v.getBoundingClientRect().width) }));
      const imgs = [...document.querySelectorAll('img')];
      const noAlt = imgs.filter(i => !i.hasAttribute('alt')).map(i => i.src.slice(-50));
      const oversized = imgs.filter(i => i.naturalWidth && i.getBoundingClientRect().width && i.naturalWidth > i.getBoundingClientRect().width * devicePixelRatio * 2.2).map(i => `${i.src.slice(-50)} nat=${i.naturalWidth} shown=${Math.round(i.getBoundingClientRect().width)}`);
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.src.slice(-60));
      let smallTap = [];
      if (isMobile) {
        smallTap = [...document.querySelectorAll('a[href], button, [role=button], input, select, textarea, summary')].filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (r.height < 24 || r.width < 24); }).map(el => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      }
      const tinyText = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const n = walker.currentNode; const el = n.parentElement;
        if (!el || seen.has(el) || !n.textContent.trim()) continue; seen.add(el);
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (r.width === 0 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (parseFloat(cs.fontSize) < 12) tinyText.push(`${parseFloat(cs.fontSize)}px "${n.textContent.trim().slice(0, 20)}"`);
      }
      const hs = [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ':' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 40));
      return {
        title: document.title,
        desc: document.querySelector('meta[name=description]')?.content?.slice(0, 80),
        canonical: document.querySelector('link[rel=canonical]')?.href,
        robots: document.querySelector('meta[name=robots]')?.content,
        ogImage: document.querySelector('meta[property="og:image"]')?.content,
        h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)),
        headings: hs.slice(0, 30),
        scrollWidth: document.documentElement.scrollWidth, vw,
        overflow: over.slice(0, 8),
        cls: +window.__cls.toFixed(4), shifts: window.__shifts.slice(0, 6), lcp: window.__lcp,
        ttfb: Math.round(nav.responseStart), domContentLoaded: Math.round(nav.domContentLoadedEventEnd), docBytes: nav.transferSize,
        bytes: Object.fromEntries(Object.entries(bucket).map(([k, v]) => [k, Math.round(v / 1024) + 'KB'])),
        requests: res.length, media, noAlt, oversized: oversized.slice(0, 6), broken,
        smallTap: smallTap.slice(0, 12), smallTapCount: smallTap.length, tinyText: tinyText.slice(0, 8), tinyTextCount: tinyText.length,
        pageHeight: document.documentElement.scrollHeight,
      };
    }, { isMobile: vp.isMobile });
    const shot = `${OUT}/${vp.name}${route.replaceAll('/', '_') || '_home'}.png`;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot });
    results.push({ vp: vp.name, route, status: resp.status(), loadMs, lcpBeforeScroll, clsBeforeScroll: +clsBeforeScroll.toFixed(4), ...m, console: consoleMsgs.slice(0, 10), failed: failed.slice(0, 10), shot });
    await page.close();
  }
  await context.close();
}
await browser.close();
await writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`\n## ${r.vp} ${r.route} [${r.status}] load=${r.loadMs}ms ttfb=${r.ttfb} LCP=${JSON.stringify(r.lcpBeforeScroll)} CLS(load)=${r.clsBeforeScroll} CLS(after scroll)=${r.cls} h=${r.pageHeight} bytes=${JSON.stringify(r.bytes)} req=${r.requests}`);
  console.log(`  title="${r.title}" canonical=${r.canonical} robots=${r.robots || '-'} og=${r.ogImage ? 'y' : 'n'} h1=${JSON.stringify(r.h1)}`);
  if (r.scrollWidth > r.vw) console.log(`  HORIZONTAL SCROLL: ${r.scrollWidth} > ${r.vw}`);
  if (r.overflow.length) console.log(`  overflow: ${r.overflow.join(' | ')}`);
  if (r.console.length) console.log(`  console: ${r.console.join(' | ')}`);
  if (r.failed.length) console.log(`  failed: ${r.failed.join(' | ')}`);
  if (r.noAlt.length) console.log(`  noAlt: ${r.noAlt.join(', ')}`);
  if (r.broken.length) console.log(`  brokenImg: ${r.broken.join(', ')}`);
  if (r.oversized.length) console.log(`  oversizedImg: ${r.oversized.join(' | ')}`);
  if (r.media.length) console.log(`  video: ${JSON.stringify(r.media)}`);
  if (r.smallTapCount) console.log(`  smallTap(${r.smallTapCount}): ${r.smallTap.join(' | ')}`);
  if (r.tinyTextCount) console.log(`  tinyText(${r.tinyTextCount}): ${r.tinyText.join(' | ')}`);
  if (r.shifts.length) console.log(`  shifts: ${JSON.stringify(r.shifts)}`);
}
