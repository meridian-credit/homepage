# Claude (Opus 5.5) — ian production-readiness (frozen before reading Astra)

Verdict: GO with conditions (not as-is).

P0 before merge
1. /blog prerenders 0 post links (prod 51): Suspense fallback={null} src/app/blog/page.tsx:67. CLS desktop 0.595 (PW) / LH 0.72 desktop, 0.909 mobile; LH mobile perf 42. VERIFIED.
2. schedule.ts has 2 dates, last 2026-10-26 → from 10-27 header says "등록된 다음 일정이 없습니다". Add Nov–Q1 dates. VERIFIED (code + date math).

P1
3. Mobile perf: LH mobile perf ian 62/64/42/65/63 vs prod 95/99/99/99 (home/services/blog/contact/portal); bytes 1.2–1.4MB vs 330–400KB; fonts 23–25 files ~600–660KB/page (prod 0); layout comment claims 100–200KB. Desktop home 94 vs 100. Caveat local next start. VERIFIED.
4. /api/contact ignores Resend {error} → false success. Pre-existing (route unchanged). VERIFIED in SDK. (I glimpsed this in Astra's log mid-run — Astra-originated.)
5. Glass header: body text shows through under nav labels on scroll (deliberate: blur removed). main had bg/90 + blur-xl. VERIFIED screenshots.
6. 업무경험 category empty but in nav + chip "업무경험 0". VERIFIED.
7. CI never ran on ian; main CI red since 2026-08-02 (npm audit: next 16.2.4 critical + 6 high). Prod currently runs vulnerable next. Ian audit clean. VERIFIED.

P2
8. Flaky e2e search-retry (1/68 under load; 3/3 alone).
9. Dead code/assets: principal-unfold(+profile-chest.jpg 1.1MB), hero-parallax, hero-text-reveal, hero-cta-button, diagnostic-checklist, sticky-scroll-services; media/hero-3d.mov/.webm, founder-3d-serious.png, hero-document.webp, meridian-advisory-workspace-hero.webp.
10. Stale comments: sitemap.ts says robots blocks /pricing (it doesn't any more); navMenu comment says 수임료 3rd; search route comment says 수임료 indexed.
11. 11.25px text widespread, 8–9px mobile home; small tap targets; axe region/heading-order, 1 contrast on /clients.
12. Home first screen = wordmark only; brand-only h1 (2 on mobile); global CTA "기장 문의하기" on audit/IPO/valuation pages.
13. No phone on contact/footer; JSON-LD lacks address/tel.
14. /fonts and videos max-age=0 on Vercel.
15. preload warnings (logo, css chunk).
16. English-only nav ("FOR WHO").

Owner judgment (pre-existing): no 개인정보처리방침 / consent at contact form; CPA affiliation/advertising; portal on *.vercel.app.

Backend/DB: no DB. 80 static pages; /api/contact (Resend + optional Upstash Redis ratelimit, in-memory fallback), /api/search (MDX index at runtime, traced). /contract rewrite → taxchat-one.vercel.app (separate project).

OK: build/lint/tsc/content audit/npm audit/signatures; e2e 67/68 ×4 browsers under prod CSP; no sitemap URL lost; redirects; /preview 404; /pricing noindex; CSP unchanged; rAF stable; no h-overflow Chromium+WebKit (https); schedule dates correct.
Retracted during pass: WebKit /about h-scroll (artifact of http + upgrade-insecure-requests).
