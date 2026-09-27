# Independent production-readiness review: `ian` @ `936315b`

Reviewed 2026-09-27, against `main` @ `db9e3a3`. Repository: `/tmp/dual-astra-ian`. Work performed alone. All artifact paths below are under `/tmp/dual-astra-artifacts/` unless stated otherwise. **VERIFIED** means measured or reproduced; **PLAUSIBLE** means a code-derived or operational risk that was not reproduced in production. P0 means a release blocker for this brief, not a claim of a critical security exploit.

## 1. Verdict — NO-GO

Do not merge and deploy this exact revision yet: the contact API can acknowledge an inquiry that the email provider rejected, then the UI clears the visitor's message.
The build and all 68 acceptance tests pass, but those tests mock contact responses and miss this server failure.
The renewal also materially increases mobile loading cost, and its first screen delays the service explanation until scrolling.
URL preservation, static contact rendering, dependency checks, and the broad browser sweep are otherwise healthy. The blocking contact defect already exists on `main`; it is not a newly introduced regression.

## 2. Blockers (P0)

### P0-1. Rejected email is reported as a successfully received inquiry — VERIFIED

- **Evidence:** `src/app/api/contact/route.ts:476` awaits `resend.emails.send()` without inspecting its result and returns `{success:true}` at line 512. The installed SDK returns `{data:null,error:...}` for HTTP failures, rather than throwing (`node_modules/resend/dist/index.mjs:1071`). `src/components/contact/contact-form.tsx:62` treats any 2xx as success and clears the form.
- **Reproduction:** `node /tmp/dual-astra-artifacts/contact-route-repro.cjs` loads the actual route through a temporary TypeScript loader, substitutes only outbound `fetch`, and supplies a deliberately fake local credential. Simulated provider HTTP **403 → route HTTP 200, `{"success":true}`**. No network request or email was sent. See `contact-route-repro.json`. Separate SDK checks reproduced non-throwing 401, 403, 429, and 500 responses (`resend-repro.jsonl`).
- **Impact:** bad sender configuration, revoked keys, provider limits, or provider outages silently lose leads while telling customers to await a reply. The catch block does not cover these ordinary failures.
- **Required fix:** inspect the SDK's `error` result, return an appropriate non-2xx with a safe message, and retain the existing form error behavior. Add one server-level provider-rejection regression check and a provider-success check. No queue/database redesign is needed.
- **Release evidence:** rerun the checks on the corrected commit and confirm the verified sender/recipient setup through an owner-authorized delivery test. No real delivery was attempted in this review.
- **Attribution:** `git diff db9e3a3 HEAD -- src/app/api/contact/route.ts` is empty. This is an existing production-readiness defect, not a renewal regression.

## 3. Should-fix (P1)

### P1-1. Mobile load performance regresses substantially — VERIFIED

- Home mobile LCP **9.19 s**, independently repeated at **8.77 s**, versus production **2.87 s**; scores 59/61 versus 95. Contact mobile **5.74 s** versus **2.56 s**. Portal mobile **6.71 s**. See the performance table and `lh-*.json`.
- Home mobile transfers approximately **1,381 KiB**, including **658 KiB fonts**, **331 KiB scripts**, and **75 KiB stylesheets**; production home transfers **371 KiB total**. The current layout loads both Korean font families globally (`src/app/layout.tsx:134`); the home run requested 25 font resources. Its comment predicts 100–200 KB, materially below the measured total. Lighthouse identifies both font stylesheets as render-blocking. Video posters, typography, and animation code all contribute; this is not evidence that JavaScript alone causes the LCP delay.
- **Fix:** reduce initial font families/weights and route-wide loading; prioritize the first meaningful image/poster; defer below-fold animation and nonessential media. Set a mobile performance budget and remeasure the corrected deployed candidate. Do not replace the entire framework to address this.
- Localhost versus Vercel is not a controlled hosting comparison; these are lab findings, not field Core Web Vitals. The magnitude, repeat, and transfer-size difference still warrant action before marketing traffic is sent to the renewal.

### P1-2. No-JavaScript form submits private inquiry text into the URL — VERIFIED

- `src/components/contact/contact-form.tsx:121` renders a form with an `onSubmit` handler but no HTML method/action fallback. Native HTML submission defaults to GET.
- With JavaScript disabled, filling the form and pressing Enter in email navigated to `/contact?website=&name=LOCAL_REVIEW&email=review%40example.invalid&phone=&message=LOCAL_TEST_NO_PERSONAL_DATA`. No success message appeared and no contact API request was made. See `noscript-check.mjs` and `noscript-check.json`.
- **Impact:** inquiry content can enter browser history and request URLs/logs, and the customer receives no email service. The same fallback may be relevant before hydration completes; that timing was not separately reproduced. The existing no-JS test checks visibility, not successful or safe submission (`tests/e2e/contact-rendering.spec.ts:10`).
- **Fix:** make the unhydrated/no-JS state explicitly safe, for example direct email/Kakao guidance with submission enabled only when the handler is ready, or implement a deliberate server fallback. Prevent sensitive fields from falling back to GET. Preserve static prerendering.

### P1-3. The first home screen does not explain the service — VERIFIED layout; conversion effect PLAUSIBLE

- At **390×900**, the visible hero contains only “Meridian.” over a full-height film; the main “상담하기” CTA starts at **y=1295.8 px**. The fixed header's bookkeeping CTA remains usable, so this is not a total navigation failure. Desktop likewise opens on a large wordmark, with the explanatory content revealed by scrolling.
- Evidence: `motion-390-_-0.png`, `motion-1440-_-0.png`, `motion-check.json`; `src/components/about/about-opening.tsx:137` and line 150 split the brand film and explanation into separate sections. Reduced motion retains a full-height brand panel without the film.
- **Fix:** place one concise Korean statement of service/customer fit and a general consultation CTA on the first screen. Shorten the film on mobile. Keep the visual identity without requiring a scroll to understand the business.

### P1-4. Refresh high-risk tax editorial review dates — VERIFIED stale review, not verified incorrect law

- `npm run audit:content`: **0 errors, 51 warnings** for editorial review older than 120 days. Representative `lastChecked` dates are April 29–May 1; review date is September 27. See `content.log` and `content/posts/corporate-tax-rate-increase-2026.mdx:10`.
- `git diff db9e3a3 HEAD -- content/posts` is empty: these are inherited articles. Passing frontmatter validation is not a legal accuracy certificate.
- Spot checks supported the October calendar, ordinary corporate-tax rate table, startup relief headline rates, and pension contribution rate (sources below). No contradictory rate was established in those samples. I did not validate every threshold, exception, court citation, or all 51 articles.
- **Fix:** have the responsible accountant refresh the time-sensitive articles, prioritizing current-year changes and high-traffic pages. Record substantive verification dates rather than mechanically updating all timestamps. Schedule data currently ends in October; assign its next update now.

### P1-5. Confirm operational inquiry handling and published privacy promises — VERIFIED code facts; deployment risk PLAUSIBLE

- Missing `RESEND_API_KEY` returns a local 500; missing sender defaults to `onboarding@resend.dev` (`src/app/api/contact/route.ts:449`, line 456). Missing Upstash falls back to a process-local map unless `CONTACT_RATE_LIMIT_REQUIRE_SHARED=true` (`route.ts:28`, line 264). The local sixth request returned **429, Retry-After: 600**; this proves only single-process limiting.
- `src/lib/faq.ts:42` promises destruction if the inquiry does not become a contract. The form provides no dedicated privacy-policy link or concrete retention period; the application passes name/email/phone/message to Resend and the firm's mailbox. There is no application deletion workflow because there is no inquiry database.
- **Action:** owner should confirm production sender/domain setup, shared limiting, mailbox/provider retention, and that the actual process supports this promise. Publish accurate handling information. This is an operational/privacy review item, not a conclusion that a particular legal basis or consent checkbox is mandatory. I did not inspect credentials or provider settings.

### P1-6. Obtain actual PR CI results for the release commit — VERIFIED missing evidence

- GitHub has no `ian` PR or `CI` workflow run for this head. Check-runs show only successful **Vercel Preview Comments**, and combined status shows successful **Vercel**. Artifacts: `github-checks.json`, `github-status.json`, `github-prs.json`.
- `.github/workflows/ci.yml:3` runs on PRs and pushes to `main`, not ordinary pushes to `ian`; this explains the absence. The local equivalent checks passed, but they do not create a GitHub CI result.
- **Action:** after fixing P0, require the existing supply-chain and verify jobs on the normal PR. No workflow expansion or direct production push is needed. I did not open a PR.

## 4. Nice-to-have (P2)

### P2-1. Clean up minor accessibility/semantic issues — VERIFIED

- Axe flags the large pale “01” on `/clients`: contrast **1.5:1**, below the large-text threshold of 3:1 at both widths (`src/components/clients/stage-picker.tsx:82`). It is a redundant stage index, so either hide it from assistive technology as decoration or increase contrast.
- Heading-order warnings occur on about, portal, and FAQ. Mobile/reduced-motion home contains two `h1` elements, both “Meridian.” (`browser-audit.json`, `about-opening.tsx:145` plus the reused explanation component). Give the actual service proposition the main heading.
- Axe's recurring `region` warning is the skip link outside landmarks. I do not consider that alone a material accessibility failure. Keyboard menus, customer tabs, search retry, FAQ-related navigation and contact error focus were covered by passing acceptance tests. This was not a screen-reader certification.

### P2-2. Simplify animation and style maintenance — VERIFIED size; over-engineering judgment PLAUSIBLE

- `globals.css` is **5,791 lines**, `promo.css` **2,522**, `promo-scenes.ts` **480**, and `service-merge-scene.ts` **756**. GSAP, Motion, and Lenis coexist; the home logo has its own scroll-position/transform calculation, and a decorative glass filter is global.
- For a small advisory firm's marketing site, the coordinated logo movement, stacked-card simulations, and very long portal narrative appear to cost more loading and maintenance effort than they earn. `/portal` measured **10,578 px** tall on the reduced-motion desktop sweep. This is a design judgment, not proof of a memory leak.
- The 10-cycle home/portal/about/contact lifecycle check stayed in one document, with pending frames **3 initially, 4 finally**, no errors, and no growing accumulation (`acceptance/lifecycle.json`). Do not rewrite working teardown code on speculation. Remove the least useful scenes incrementally and consolidate duplicated styling when touching it.

### P2-3. Improve wayfinding for non-specialists — VERIFIED copy; usability judgment PLAUSIBLE

- Navigation labels “SERVICE”, “FOR WHO”, and “DASHBOARD” mix with Korean content (`src/lib/constants.ts`, `navMenu`). “PA” and “IPO” need plain Korean explanations at the point of selection. Screenshots: `overview-1440.jpg`, `overview-390.jpg`.
- The pricing page intentionally remains unlinked from navigation/search and noindex. Respect that product decision; instead make the free-first-consultation and quote process more apparent from service pages. The global “기장 문의하기” label can imply that audit/valuation prospects are in the wrong place; a general consultation label would fit the wider service taxonomy.

## 5. Performance measurements

**Every paired cell is `ian / production`.** LCP is seconds; TBT is milliseconds; transfer is KiB. `—` means not measured/no equivalent production portal page. Lighthouse's default simulated mobile profile uses a 412 px viewport and CPU/network throttling; desktop uses `--preset=desktop`. The separate visual/layout sweep used the requested 1440 and 390 px widths.

| Page | Device | Performance score | LCP (s) | CLS | TBT (ms) | Transfer (KiB) |
|---|---|---:|---:|---:|---:|---:|
| / | desktop | 91 / 100 | 1.65 / 0.61 | 0.000 / 0.000 | 2 / 0 | 1377 / 374 |
| / | mobile | 59 / 95 | 9.19 / 2.87 | 0.000 / 0.000 | 150 / 14 | 1381 / 371 |
| /contact | desktop | 93 / 100 | 1.54 / 0.45 | 0.000 / 0.000 | 0 / 0 | 1263 / 330 |
| /contact | mobile | 72 / 97 | 5.74 / 2.56 | 0.000 / 0.000 | 22 / 19 | 1872 / 330 |
| /portal | desktop | 93 / — | 1.44 / — | 0.000 / — | 0 / — | 1276 / — |
| /portal | mobile | 64 / — | 6.71 / — | 0.000 / — | 75 / — | 1229 / — |

Home mobile isolated repeat: **score 61, LCP 8.77 s, CLS 0, TBT 94 ms** (`lh-ian-home-mobile-repeat.json`). Initial suite runs overlapped some other browser review work; the repeat corroborates the main finding. Other rows are single runs, so differences of a few milliseconds should not be interpreted.

| Initial resource category, mobile home | ian | Production |
|---|---:|---:|
| JavaScript transfer | 331 KiB | 224 KiB |
| CSS transfer | 75 KiB | 11 KiB |
| Fonts transfer | 658 KiB (25 requests) | 0 measured |
| Lighthouse main-thread work | 1,989 ms | 643 ms |

Production's zero font transfer is what Lighthouse observed; it does not imply typographic equivalence. Home script evaluation was about 491 ms, or 525 ms in the repeat. Contact mobile script transfer was 347 KiB and font transfer 579 KiB. These are measured transfers, not the sum of every emitted chunk or a claimed initial bundle budget. Some routing prefetch may contribute.

On-disk media: home WebM **921,743 B**, home MP4 **1,086,651 B**; shared hero WebM **720,728 B**, MP4 **2,416,986 B**; profile source JPEG **1,106,272 B**; largest blog PNG **1,220,607 B**. Browser format selection and range requests mean these should not simply be added to every page's initial transfer. Raw files and Lighthouse resource summaries identify the practical optimization targets.

No field INP or CrUX measurement was obtained. TBT is a lab interaction proxy, not INP. The lab CLS measurements were 0; they do not cover all subsequent user interactions.

## 6. Backend and database

- **Hosting/runtime:** Next.js App Router on Vercel; most pages are prerendered. `/contact` is in `.next/prerender-manifest.json` with `initialRevalidateSeconds:false`. `/preview` is dynamic and returns 404 without its flag.
- **POST `/api/contact`:** checks browser origin/fetch-site, user agent, JSON type, a streamed 20,000-byte body cap, required fields, email format, honeypot, elapsed-form time, URL count, and per-IP/per-email limits. It escapes HTML and strips line breaks from the mail subject. Inquiry email goes through Resend to `siteConfig.email`. It stores no application inquiry record. P0 describes its error-handling defect.
- **GET `/api/search`:** builds public page/service/persona/post metadata from local TypeScript and MDX; caches the array in process and returns public `max-age=3600`. It is not a database query or a private-data endpoint. The build trace includes **54 MDX files**, so the file-backed index's deployment tracing looks appropriate. Search excludes pricing/preview.
- **GET `/llms.txt`:** static public descriptive text; not a data store.
- **Database:** optional **Upstash Redis** for rate-limit state only. Keys are derived from client IP and lowercased email with the contact prefixes. Without those env vars, limits are per-process memory, unsuitable for a guaranteed fleet-wide cap. With require-shared enabled, absence/outage fails closed with 503. I did not verify the deployed Redis region, retention configuration, or account.
- **Other services:** Vercel Analytics/Speed Insights, mail delivery, outbound Kakao links, and an external client portal at `hometax-dashboard.vercel.app`. Fonts/media are served locally at runtime; the Google serif font is fetched during the build.
- **Contract app:** `/contract` and `/contract/:path*` rewrite to `taxchat-one.vercel.app`; that is a separate app, not this repository's database/backend. Both local and live read-only `/contract` returned 200, retaining `camera=(self)` policy. Exact rewrite precedes wildcard and the homepage's restrictive camera headers are excluded.
- No payment processor, authentication implementation, or data migration was found in this marketing repository. The linked portal and contract application's auth, identity-document collection, storage, and payment implications remain for the owner; none were exercised or changed.

## 7. UI/UX judge notes

The renewal has a coherent navy/white/blue palette, strong photographic and typographic identity, and consistent service-detail templates. The profile page is restrained and gives the person behind the business a clear presence. The service taxonomy is substantially easier to scan than a flat list, and the separate FAQ is useful.

The home opening over-prioritizes the brand animation; the measured first-screen issue is P1-3. The portal reads more like a long software product launch than an advisory firm's concise service explanation. Its demo information is useful, but the number of pinned scenes and repeated proof sections makes it laborious to scan. Full-page screenshots of sticky scenes can show blank rails that are occupied while scrolling; I checked actual scroll states and did **not** treat those screenshot gaps as missing content.

Main-route inspection matrix (both 1440×900 and 390×900; normal-motion sampling plus reduced-motion full-page capture):

| Route | Visual/interaction assessment |
|---|---|
| `/` | Polished identity, weak initial service explanation; narrow screen stacks cleanly after the full-height film. |
| `/about` | Clear philosophy/founder sequence, balanced image/text rhythm; long but coherent. |
| `/services` | Four-group/eight-service navigation is scannable; mobile list is compact but hides detail until selection/navigation. |
| `/members` | Name, credentials and portrait establish a specific responsible person; no obvious clipping. |
| `/clients` | Stage tabs and keyboard/hash navigation work; pale decorative index is the contrast issue. |
| `/portal` | Responsive dashboard examples communicate the offer; long narrative and scene complexity deserve reduction. |
| `/blog` | Readable listing, search/filter/pagination; mobile prioritizes articles by hiding the decorative hero. Back/scroll preservation passes. |
| `/faq` | Compact, readable questions; mobile goes straight to the useful material. Heading hierarchy could improve. |
| `/contact` | Clear labels, visible alternative contact paths and reply expectation; actual delivery failure is the critical exception. |

All nine service-detail routes, hidden `/pricing`, and one long blog article also received screenshots/axe/layout checks at both widths. All **40 route×viewport combinations** returned 200 with `scrollWidth === viewport width` and zero page exceptions. Some intentionally clipped decorative/transformed descendants extend beyond their containers; there was no resulting document overflow. Evidence: `browser-audit.json`, the `1440-*.png`/`390-*.png` files, full overview images, and `motion-*.png`.

## 8. Potential-customer walkthrough

1. **What do they do?** After scrolling, “매일의 기장부터 세무조정, 세무자문, 가치평가까지 / 회계사가 직접 맡습니다” is clear. I should not need that first scroll to learn it.
2. **Do they fit me?** Stage-based clients and specific service pages help distinguish bookkeeping from a transaction/IPO need. Service inquiry context survives navigation in the automated checks. “PA” still assumes specialist knowledge.
3. **Who is accountable?** 박민상's portrait, career and direct-responsibility wording build trust. The footer explains the personal brand and that statutory engagements are performed under 동성회계법인. The different `dscpa.co.kr` email domain is therefore explainable, but keeping that affiliation near the contact decision would help.
4. **What will it cost?** The public path explains a free first consultation and a scope-based quote rather than surfacing the hidden calculator. This is adequate for a boutique service, although a brief process explanation on service pages would reduce uncertainty. No payment was requested or attempted.
5. **How do I engage?** Sticky CTA, service links, email and Kakao make contact easy. The response-time FAQ says one business day with a caveat for filing peaks. The provider-rejection bug breaks the trust established by all of this; a prospect can believe the firm is ignoring them when it never received the inquiry.
6. **Do I trust the dashboard claims?** The examples explain the benefit well, but “daily collection”, “30 forms”, “19 certificates”, and “0 documents to send” are operational product claims, not features this marketing backend proves. The owner should validate them against the external product. Demo screenshots do not establish actual integration capability.

## 9. Verification, regressions, and limitations

### Completed checks

| Check | Result / evidence |
|---|---|
| Install | `npm ci` passed; `install.log`; Node 22.23.1 locally (CI pins 22.21.1). |
| Build/typecheck | `npm run build` passed, including TypeScript; `build.log`. |
| Lint | 0 errors, 3 `no-img-element` warnings; `lint.log`. |
| Content schema | 0 errors, 51 age warnings; `content.log`. |
| Dependency audit | 0 known vulnerabilities; `npm-audit.json`. |
| Registry signatures | 518 packages verified, 91 attestations; `signatures.log`. |
| Browser acceptance | 68/68 passed in 1.4 minutes across desktop/mobile Chromium, WebKit and Firefox; `e2e.log`. |
| Accessibility/layout | 40 combinations, 20 routes; detailed axe nodes and rectangles in `browser-audit.json`. |
| Motion lifecycle | 10 SPA cycles, no error or cumulative frame leak; `acceptance/lifecycle.json`. |
| Sitemap/internal links | All 69 sitemap URLs returned 200; 73 collected internal href targets, no 4xx; `link-check.json`. |
| API negatives | Cross-origin 403; invalid JSON 400; oversized body 413; valid request without key 500; GET 405; sixth same-IP attempt 429; `http-check.json`, `extra-checks.json`. |
| Repository hygiene | Tracked and staged diffs remained empty; no commit/push/PR/deploy. |

### URL/SEO/security observations

**VERIFIED:** no old service/persona slugs were removed from `data.ts`; no article files changed between the reviewed commits. Existing blog and service routes still resolve. `/practice` redirects 308 to `/services`; `/practice/tax-advisory` redirects 308 to the retained detail route. `/blog?tab=faq` now redirects 307 to `/faq?tab=faq`, which resolves. Pricing is 200/noindex and omitted from sitemap/search; preview is 404/noindex and disallowed in robots. Canonicals inspected in the browser use the production domain and page path. Sitemap includes the new FAQ/portal and excludes hidden routes. The HTTP crawl recorded canonical, h1 and JSON-LD counts for all sitemap pages. Organization/WebSite, article/breadcrumb, and contact FAQ data are generated from site/content data with JSON escaping.

**VERIFIED:** CSP and security headers were tested via a local TLS proxy preserving `upgrade-insecure-requests`. The only >=400 assets in the route sweep were local `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`; both are 200 on production. Do not classify platform-only scripts being absent under `next start` as a production regression. The contract headers remain separate. CSP allows inline scripts for framework/JSON-LD use, prohibits objects/framing, and restricts connect/media/image origins; this is defense in depth, not proof that XSS is impossible. A limited source/public/content pattern scan found no common private-key/AWS/GitHub/Stripe secret signatures; this was not a full historical secret scan.

### Primary-source content spot checks

- October withholding due **2026-10-12** and VAT preliminary filing **2026-10-26** agree with the [NTS October 2026 calendar](https://www.nts.go.kr/nts/ad/taxSchdul/selectList.do?mi=135747&taxMonth=10&taxYear=2026). `src/lib/schedule.ts:1` links this source. The live production snapshot still showed October 10/25; `ian` corrects those weekend dates and computes D-day rather than storing it.
- The ordinary corporate-rate table **10/20/22/25%** agrees with the [NTS corporate tax rate page](https://nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7746&mi=2372). This verifies the sampled table, not every special-corporation exception or associated credit example.
- Startup relief's regional headline distinction is supported by the [NTS startup relief guidance](https://t.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=239070&mi=41093).
- The pension article's **9.5% total contribution in 2026** is supported by the [National Pension Service contribution page](https://www.nps.or.kr/eng/ntnlpnsplan/cntb/getOHAI0013M0.do).

### Not checked / not established

- No real contact submission, provider account access, credentials inspection, production env inspection, mail deliverability, spam-folder behavior, or retention verification. P0 reproduction used mocked outbound transport only; ordinary local API tests ran with no key.
- No access to the SSO-protected candidate deployment; Vercel-specific rewrite behavior and actual analytics ingestion must still be checked on the released candidate. Live `/contract` and local rewrite checks do not certify all flows in the separate contract app. No camera/identity upload, login, payment, or state-changing external action was performed.
- No exhaustive legal review of all 51 articles, all law/case links, service claims, professional credentials, or dashboard promises. Metadata validation and sampled authorities are not substitutes for the firm's editorial sign-off.
- No real-device hardware test, tablet matrix, exhaustive zoom/screen-reader audit, all dynamic interaction combinations, field INP/CrUX, endurance/load test, or production security penetration test. Four browser projects, two requested layout widths and targeted normal/reduced-motion checks provide bounded coverage.
- No baseline checkout build: production performance was measured directly read-only and can differ in CDN/compression, caches, feature flags and deployed artifact from a locally built `main`. Lighthouse figures should be repeated on the accessible release candidate after fixes.
- No full Git history credential audit or formal structured-data rich-results validation. The visible contact form, local API behavior, source paths and crawled metadata were inspected.

Only reviewer-owned servers on **3200** and **3643** were used. Ports 3100 and 3443 were neither connected to nor bound. Review server cleanup and final repository status are recorded in `cleanup.txt`. No tracked decision log was modified because the brief explicitly required a read-only repository.
