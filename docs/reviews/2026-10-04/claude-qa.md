# QA report: accounting.teamcredit.kr (dev @ 37fc011), Claude tester

Date: 2026-10-04 (Asia/Seoul). Target: https://accounting.teamcredit.kr. Compared against https://www.meridianco.kr, read-only.
All paths below are relative to `temp/qa-2026-10-04/claude/`.

---

## 1. Verdict: NOT READY

The site itself is in good shape. All 81 routes I crawled load on desktop Chromium and iPhone WebKit, and I spot-checked Android Chromium and desktop Firefox. I found no page errors, no failed requests and no broken internal links. Lab LCP stays under 0.5 s and CLS at or below 0.026. Every one of the 71 URLs on the live site still works, and the `/practice/*` redirects are kept.

Two things block the launch:
1. **There is no privacy policy and no collection notice anywhere**, yet the contact form collects name, e-mail, phone and free text. The 개인정보 보호법 requires a published 처리방침. The live site has the same gap, so this risk already exists today and the relaunch is the moment to close it.
2. **The contact form has never delivered a mail on this build, and the deployed route is the old Resend version.** That version reports success even when the provider rejects the send (BE-01), so inquiries can be lost silently. The fix exists as local commit 9fe32e7, which is not deployed.

Both are small: one static page, one line of notice text, one footer link, then deploy 9fe32e7 and send one real test mail.

I also strongly recommend fixing four visible problems before launch. Each is a one-line or content-only fix:
- The mobile menu stays open after a search.
- Code blocks break the mobile layout on 6 posts, and on Android they push the header buttons off-screen.
- A VAT post shows last year's deadline in the middle of this year's season.
- The 「무료 대시보드」 button ends at a login page on a domain that resembles 홈택스.

---

## 2. Findings

### P0: blocks launch

#### P0-1 No privacy policy, no collection notice, no consent text around the contact form
- **URL:** every page (footer); https://accounting.teamcredit.kr/contact (form)
- **Browser:** desktop Chromium 1440×900; same on iPhone 13 WebKit 390×844
- **Steps:**
  1. Open /contact and read the form and its submit area.
  2. Scroll to the footer and read every link.
  3. Try `/privacy`.
- **Expected:** The form collects name, e-mail, phone and a message, so the site needs:
  - a 개인정보 처리방침 linked from the footer (PIPA §30);
  - at least one line next to the submit button saying what is collected, why, how long it is kept, and who processes it (the mail provider).
- **Actual:**
  - The footer has the 8 services, HOME…CONTACT, 카카오톡 채널, the e-mail, the phone and CLIENT LOGIN. There is no privacy or terms link.
  - The words 개인정보, 처리방침 and 이용약관 appear nowhere on the page (`privacyAnywhere: false`).
  - The form has no notice and no checkbox, and `/privacy` returns 404.
  - The only privacy text on the site is one FAQ answer (`src/lib/faq.ts:41-43`).
  - The footer also has no business details (상호, 대표자, 사업자등록번호). That part is optional for a professional's marketing site, so I don't count it as a blocker.
- **Evidence:**
  - `shots/ev-desktop-footer.png`, `shots/ev-desktop-contact-form-no-consent.png`
  - `evidence.json` → `footer.links`, `footer.privacyAnywhere=false`; `contact-nosubmit.json` → form inventory
  - The live site has the same gap, so this is not a regression.
  - The client portal (hometax-dashboard.vercel.app) already has its own /privacy page. It names the controller "MERIDIAN TAX & ADVISORY" and the officer 박민상, but covers only the portal.
- **Confidence:** CONFIRMED
- **Smallest proper fix:**
  1. Add one static page, `src/app/privacy/page.tsx`. Start from the portal's policy and add the contact-form specifics:
     - items: 이름·이메일·연락처·문의 내용;
     - purpose: 문의 답변;
     - how long it is kept;
     - processor: Amazon SES, which is an overseas transfer;
     - the officer's contact and how to ask for 열람·삭제.

     Add the page to `sitemap.ts` and `sitePages`.
  2. Add a 「개인정보처리방침」 link to the footer bottom bar (`src/components/layout/footer.tsx:190-201`).
  3. Add one line of notice above the submit button in the contact form, linking to /privacy.
  - **Over-engineering to avoid:** a consent-management system, a table of stored consents, or a cookie banner. The site sets no cookies at all; I measured this on /, /contact and /blog with `cookie-check.mjs`.
  - Whether an explicit checkbox is legally required, rather than a notice, is for the owner's adviser to decide. The notice line is the minimum either way.
  - This is already tracked as BE-07 in `docs/plans/ui-ux-remediation/backend-backlog.md`.

#### P0-2 Contact mail has never been delivered on this build, and the deployed route can report success for a failed send
- **URL:** https://accounting.teamcredit.kr/contact → POST /api/contact
- **Browser:** desktop Chromium 1440×900 (submissions s1 and s3); iPhone 13 WebKit (s2)
- **Steps:**
  1. Fill the form with fake data (`QA 테스트`, `qa-claude@example.com`).
  2. Submit.
- **Expected:** One real send has gone all the way through before launch, and a failed send is never shown to the visitor as a success.
- **Actual:**
  - Dev answers `500 {"error":"메일 전송 설정이 완료되지 않았습니다."}`. That is intentional, since dev has no mail keys, but it means the mail path has never run on this build.
  - The deployed code (37fc011) is the old Resend route. `route.ts:476` awaits `resend.emails.send(...)` but ignores the `{ error }` it returns. Resend SDK 6.x does not throw on a rejected send, so the route goes on to answer success at `:512`.
  - So with a wrong or rotated key, or an unverified domain, the visitor sees a success message and the firm receives nothing. This is BE-01.
  - It is fixed only in the undeployed local commit 9fe32e7. That commit switches to SES, which throws on rejection, and answers 502 with a hint to contact the firm directly.
- **Evidence:**
  - `submit-s1.json`, `submit-s2.json` (status 500, body above)
  - `shots/submit-s1-after.png`, `shots/submit-s2-after.png`
  - `git show 37fc011:src/app/api/contact/route.ts`, lines 449-452, 476 and 512
- **Confidence:**
  - CONFIRMED: the mail path has never run on this build.
  - SUSPECTED: the silent-success path. I found it by reading the code and could not trigger it without keys.
- **Smallest proper fix:**
  1. Deploy 9fe32e7 to dev.
  2. On the server, set `CONTACT_FROM_EMAIL`, a test `CONTACT_TO_EMAIL` and the SES credentials.
  3. Send one real inquiry and confirm it arrives.
  4. Repeat once with the production values before the DNS switch.
  - Remove the Resend DNS records only after the live site runs this code, as AGENTS.md says.
  - No queue or retry store is needed. The 502 plus the direct-contact hint is the right size for this site.

### P1: fix before launch if at all possible

#### P1-1 Mobile menu stays open, with the page scroll-locked, after a site search
- **URL:** any page, e.g. https://accounting.teamcredit.kr/
- **Browser:** iPhone 13 WebKit 390×844 touch; Android Galaxy S9+ Chromium 360×800 touch
- **Steps:**
  1. Tap the menu button.
  2. In the sheet's search field, type 「세무조정」.
  3. Tap the first result, or press Enter.
- **Expected:** The sheet closes and the new page is visible and scrollable.
- **Actual:**
  - The URL changes (`/services/tax-adjustment` on tap, `/blog/temporary-advance-cleanup` on Enter), but the sheet stays open (`role=dialog`, `open: true`).
  - `body` keeps `overflow: hidden`, and the new page sits hidden behind the scrim.
  - The ordinary menu links do close the sheet. Only search fails to.
- **Evidence:** `shots/nav-iphone-after-search-tap.png`, `shots/nav-iphone-after-search-enter.png`, `shots/nav-android-after-search-tap.png`; `nav-iphone.json` and `nav-android.json`, step "tap search result": `open:true, bodyOverflow:"hidden"`.
- **Confidence:** CONFIRMED in both WebKit and Chromium
- **Smallest proper fix:**
  - Give `SiteSearch` an optional `onNavigate` prop and call it in `go()` (`src/components/layout/site-search.tsx:126-130`) and in the result link's `onClick` (`:204-207`).
  - Pass `onNavigate={() => setMobileOpen(false)}` from `src/components/layout/header.tsx:220`, the same way `MobileNav` gets it at `:223`.
  - A fix of the same size: close `mobileOpen` whenever `pathname` changes.

#### P1-2 Code blocks run off the screen on 6 blog posts; on Android they push the header buttons off-screen
- **URL:** https://accounting.teamcredit.kr/blog/interim-corporate-tax-2025 (worst case). Also `/blog/corporate-tax-filing-prep`, `/blog/home-office-expense-deduction`, `/blog/combined-income-tax-filing`, `/blog/vat-preliminary-q1-2025` and `/blog/vat-final-q4-checklist`.
- **Browser:** iPhone 13 WebKit 390×844; Android Galaxy S9+ Chromium 360×800
- **Steps:**
  1. Open the post on a phone.
  2. Scroll to the calculation block.
  3. Swipe sideways.
- **Expected:** The text wraps inside the 338 px column, and the page never scrolls sideways.
- **Actual:**
  - `article pre` has `white-space: pre` and `overflow-x: visible`. The block is 763 px wide in a 338 px column.
  - The page is 789 px wide on a 390 px screen and pans sideways (I measured `scrollX` 399).
  - Page widths on iPhone for the six posts: 789, 525, 421, 412, 418 and 393 px.
  - On Android Chromium the layout viewport grows to fit the content: `innerWidth` is 782 on interim-corporate-tax-2025 and 522 on corporate-tax-filing-prep. The header's fixed 상담 button and menu button then sit at x ≈ 618-756, outside the 360 px screen.
- **Evidence:**
  - `shots/ev-iphone-code-overflow.png`, `shots/ev-iphone-code-overflow-scrolledx.png`, `shots/ev-android-interim-corporate-tax-2025.png`, `shots/ev-android-corporate-tax-filing-prep.png`
  - `evidence.json` → `codeOverflow` (`pre[1].sw=763`, `sw=789`); `android-zoom.json` (`innerWidth 782`, `vvWidth 360`)
  - `crawl-iphone.json` shows overflow on exactly these 6 routes.
- **Confidence:** CONFIRMED
- **Smallest proper fix:** There is a `.prose code` rule but no `.prose pre` rule. Add one next to `src/app/globals.css:538`: `.prose pre { white-space: pre-wrap; overflow-wrap: anywhere; }`, with a margin that matches the paragraphs. Don't rewrite the posts.

#### P1-3 A VAT post shows last year's deadline during this year's filing season, stamped "reviewed 2026-04-29"
- **URL:** https://accounting.teamcredit.kr/blog/vat-preliminary-q2-2025 (also `/blog/vat-final-q4-checklist`)
- **Browser:** desktop Chromium 1440×900 (a content problem, so it shows in every browser)
- **Steps:**
  1. Open the post today, 2026-10-04.
  2. Open the schedule cube in the header.
- **Expected:** A reader in October 2026 sees either the 2026 deadline or an article clearly dated 2025.
- **Actual:**
  - The title is 「2기 부가가치세 예정신고, 10월 27일까지 챙겨야 할 실무 사항」, the body repeats 10월 27일, and 검토 기준일 is 2026-04-29.
  - The header schedule on the same page shows 「부가세 2기 예정신고 2026.10.26 D-22」.
  - Each date is right for its own year (2025-10-27 was a Monday), but nothing on the post says 2025.
  - `vat-final-q4-checklist` has the same problem: 「1월 27일까지」 was right for January 2025. The January 2027 deadline is 1월 25일.
- **Evidence:** `shots/ev-desktop-stale-deadline.png`; `evidence.json` → `staleDeadline`; `content/posts/vat-preliminary-q2-2025.mdx:2,4,33,124`; `content/posts/vat-final-q4-checklist.mdx:2,31,99`
- **Confidence:** CONFIRMED
- **Smallest proper fix:** Content only. Either put the year in the title and the first mention (「2025년 2기…」), or update the dates to 2026 and refresh `lastChecked`.

#### P1-4 A device clock a few minutes fast blocks every inquiry
- **URL:** https://accounting.teamcredit.kr/contact
- **Browser:** desktop Chromium 1440×900, with the device clock simulated 10 minutes fast (`performance.timeOrigin` and `Date.now` shifted)
- **Steps:**
  1. Set the clock 10 minutes ahead.
  2. Fill the form and submit.
- **Expected:** The inquiry is accepted.
- **Actual:** The server answers `400 「문의 양식을 새로고침한 뒤 다시 시도해 주세요.」`. Refreshing cannot help:
  - the deployed form sends a timestamp from the visitor's own clock (`startedAt`, `37fc011:src/components/contact/contact-form.tsx:35,61`);
  - the server compares it with its own clock (`route.ts:420-436`).
- **Evidence:** `submit-s3.json` (status 400), `shots/submit-s3-after.png`
- **Confidence:** CONFIRMED
- **Smallest proper fix:** Already fixed in 9fe32e7, which sends the elapsed time from `performance.now()` instead. Ship it with P0-2.

#### P1-5 Contact error messages leave the visitor with no way forward
- **URL:** https://accounting.teamcredit.kr/contact
- **Browser:** desktop Chromium 1440×900; iPhone 13 WebKit
- **Steps:** Submit while the server fails (on dev it always does).
- **Expected:** The message tells the visitor how else to reach the firm: e-mail, phone or Kakao.
- **Actual:**
  - The message is 「메일 전송 설정이 완료되지 않았습니다.」. It is internal configuration wording and offers no alternative.
  - The rest of the error handling is good:
    - the alert gets focus and is in view;
    - typed values are kept;
    - a double-click plus Enter sent exactly 1 POST.
- **Evidence:** `shots/submit-s1-after.png`, `shots/submit-s2-after.png`; `submit-s1.json` → `after.focus="alert"`, `alertInView:true`, values kept, `posts:1`
- **Confidence:** CONFIRMED
- **Smallest proper fix:** 9fe32e7 adds a hint to contact the firm directly to the 5xx answers. Check it on screen after deploying.

#### P1-6 「무료 대시보드 시작하기」 leads to a login page with no sign-up, on an off-brand domain that resembles 홈택스
- **URL:** https://accounting.teamcredit.kr/ (portal section of the home page); https://accounting.teamcredit.kr/portal (「대시보드 시작하기」 in the hero)
- **Browser:** desktop Chromium 1440×900; iPhone 13 WebKit
- **Steps:**
  1. Click 「무료 대시보드 시작하기」.
  2. Look at where you land.
- **Expected:** A prospect who clicks 「무료 … 시작하기」 can start something, or is told how to ask for an account.
- **Actual:**
  - The button opens https://hometax-dashboard.vercel.app, a client login form (ID and password) with no sign-up.
  - The domain is a vercel.app subdomain containing 「hometax」, so it looks like the national tax site, and it asks for a password away from the firm's own brand.
  - I did not try to sign in.
  - **Login and personal-data flag:** a password form on a look-alike domain hurts trust and may be flagged by phishing filters.
- **Evidence:** `shots/ext-portal.png`; `external-apps.json`; `src/app/page.tsx:104-108`, `src/app/portal/page.tsx:63-67`, `src/lib/constants.ts:72`; backlog BE-04
- **Confidence:** CONFIRMED for the dead end; SUSPECTED for the phishing-filter risk
- **Smallest proper fix:**
  - For launch, rename both buttons 「고객 대시보드 로그인」. Or point the button aimed at prospects to `/contact` with the text 「대시보드 사용 문의」.
  - Later, serve the portal under a meridianco.kr subdomain. Only `constants.ts:72` changes.
  - No single sign-on or sign-up flow is needed for launch.

#### P1-7 The 「세무 자문」 advisory content from the live site is gone; the page now describes bookkeeping, but other pages still link to it as advisory
- **URL:** https://accounting.teamcredit.kr/services/tax-advisory; https://accounting.teamcredit.kr/clients (persona 03, 「중요한 결정을 앞둔 대표」)
- **Browser:** desktop Chromium 1440×900
- **Steps:**
  1. On the live site, open /practice/tax-advisory. It covers 양도·상속·증여 사전 검토 and 가업 승계.
  2. On dev, open /services/tax-advisory.
  3. On /clients, open persona 03 and click 「세무 자문」.
- **Expected:** The advisory service the live site sells is still described somewhere, and links labelled 「세무 자문」 land on advisory content.
- **Actual:**
  - /services/tax-advisory is now a category page: 「기장 · 신고 · 세무조정과 일상 경리 업무를 지원합니다.」, with the children 세무 기장, 세무 조정 and 경리 아웃소싱.
  - Persona 03 still lists it as the matching service (`fitServices`, `src/lib/data.ts:570`).
  - Site search still lists 「서비스 세무 자문」 for the query 「세무조정」.
  - No page covers the 양도·상속·증여 advisory anymore.
  - The live home page's personas 개인사업자·프리랜서 and 자산가(양도·증여·상속) are also gone.
- **Evidence:** `live.json` (live text), `shots/pages-iphone-clients-tab3.png`, `shots/nav-iphone-search-results.png`; `src/lib/data.ts:240-246`
- **Confidence:** CONFIRMED
- **Smallest proper fix:** The owner decides. Either restore one advisory line or section (양도·상속·증여 사전 검토) on the tax-advisory page, or remove `tax-advisory` from persona 03's `fitServices`. Both are edits to `data.ts`.

#### P1-8 The legal affiliation paragraph uses a different firm name
- **URL:** https://accounting.teamcredit.kr/about (affiliation section)
- **Browser:** iPhone 13 WebKit 390×844; same on desktop
- **Steps:** Scroll to the affiliation and disclaimer paragraph.
- **Expected:** The disclaimer names the firm exactly as the rest of the site does: 메리디안 택스 어드바이저리.
- **Actual:**
  - The paragraph says 「**메리디안 어드바이저리**는 박민상 공인회계사가 운영하는 개인 자문 브랜드이며, 별도의 법인이 아닙니다.」 and 「메리디안 어드바이저리를 통해 수임하는 모든 업무는 동성회계법인과의…」.
  - The footer, the page title and `siteConfig` all say 메리디안 택스 어드바이저리.
  - This is the one paragraph with legal weight, so the name has to match.
- **Evidence:** `shots/ev-iphone-about-affiliation-name.png`; `evidence.json` → `firmName`
- **Confidence:** CONFIRMED
- **Smallest proper fix:** In `src/app/about/page.tsx:212,217`, use `siteConfig.name` or the literal 메리디안 택스 어드바이저리.

### P2: polish

| ID | Page / browser | What happens (and what should happen) | Evidence | Confidence | Smallest fix |
|---|---|---|---|---|---|
| P2-1 | /blog, desktop 1440×900 | Scroll down to the page numbers and click 2. The list changes but the view stays at the bottom, with the top of the list at −1393 px. It should jump to the top of the list. | `shots/blog-desktop-page2.png`, `blog-desktop.json` | CONFIRMED | `src/app/blog/blog-content.tsx:109`: after `updateQuery`, scroll the top of the list into view. |
| P2-2 | /services, iPhone WebKit 390×844 | Open row 1 of the mobile service list, then tap row 4. The tapped row jumps from y=1288 to −181, off the top of the screen. | `shots/ev-iphone-services-fold-jump.png`, `evidence.json` → `foldJump` | CONFIRMED | `src/components/services/service-picker.tsx:95`: after `setOpen`, scroll the tapped row into view (`scrollIntoView({block:'nearest'})`). |
| P2-3 | /contact, header search, /blog search, iPhone | Text sizes in the input boxes: contact form 15 px, header search 12.19 px, blog search 12.9 px (`html` is 15 px). iOS Safari zooms the page when you tap an input whose text is under 16 px. | `evidence.json` → `inputFont` | CONFIRMED for the sizes; SUSPECTED for the zoom, which emulation can't show | Set these inputs to `font-size: 16px` on mobile (`globals.css:79-80`, `:1524`, `:4741`). Don't disable zoom in the viewport meta. |
| P2-4 | Every page, desktop keyboard | The 「본문 바로가기」 skip link is the 12th Tab stop, after the whole header. axe also flags it on every page (`region`, moderate) because it sits outside any page landmark. | `shots/ev-desktop-skip-link.png`, `evidence.json` → `skipLink.tabsToReach=12`, `axe.json` | CONFIRMED | `src/app/layout.tsx:164-165`: render the skip link before `<Header>`. One move fixes both. |
| P2-5 | /blog and /blog/*, desktop mega menu | Every BLOG item in the mega menu is marked as the current page at once (`aria-current="page"`), because `isOn` ignores the `?cat=` part of the link. | `shots/nav-desktop-blog-vat.png`, `nav-desktop.json` | CONFIRMED | `src/components/layout/site-nav.tsx:39-43`: compare the query too for links that have one, or mark only the parent. |
| P2-6 | Pages with a dark hero, desktop | The header search icon is `#4d4d4d` over the dark hero, about 2.3:1. WCAG 1.4.11 asks for 3:1 on interface icons. | `icon-contrast.mjs`, `shots/desktop-home-top.png` | CONFIRMED | `globals.css:1504`: use `currentColor` so the icon follows the header colour. |
| P2-7 | Header search; /blog search | 「수임료」 and 「전화번호」 return 「찾는 글이 없습니다」, although /contact shows the phone (/pricing is hidden on purpose). Blog search doesn't find 「VAT」. When a category and a search are both active and nothing matches, the message doesn't mention the category. | `shots/nav-desktop-search-noresult.png`, `shots/blog-desktop-search-empty.png` | CONFIRMED | Add 연락처, 전화, 주소 and 비용 to the /contact search hint (`src/lib/constants.ts:196-206`). Keep /pricing out. |
| P2-8 | /contact, Chromium | The browser accepts `qa@example` and a message of only spaces. The server would reject both with a generic 400 (from the code). There is no 「* 필수」 note on the form. | `contact-nosubmit.json` | CONFIRMED in the browser; SUSPECTED for the server answer (not sent, to save the submission budget) | Add a `pattern` to the e-mail field, trim the message before sending, and add one 「* 필수」 note. |
| P2-9 | 2 blog posts | Bad source links in `/blog/apartment-joint-vs-sole-ownership`: the legalengine.co.kr link is a 404, and the link labelled 「헌법재판소 2006헌바112」 opens a page listing past court presidents (「역대 헌법재판소장」). In `/blog/small-corp-tax-benefits-checklist`, the law.go.kr 별표6 link opens an error page. | `shots/ev-desktop-wrong-source-label.png`, `shots/ev-desktop-wrong-source-target.png`, `linkcheck.json` | CONFIRMED | Edit the posts: `apartment-joint-vs-sole-ownership.mdx:47-50,71-72` and `small-corp-tax-benefits-checklist.mdx:30`. |
| P2-10 | Static pages | Most static pages share the generic share title (`og:title`) 「MERIDIAN \| 메리디안 택스 어드바이저리」. /blog, /faq and about 49 posts without a cover image have no share image (`og:image`). The 404 page's title is generic. | `crawl-desktop.json` → `meta` | CONFIRMED | Set a per-page share title (`openGraph.title`) where the page title is already set. Use `/home-hero-poster.jpg` as the fallback share image. |
| P2-11 | /portal, desktop | The schedule popup's 「24시간 동안 보지 않기」 checkbox does nothing: on /portal the popup never opens by itself (`auto=false`). | `shots/pages-desktop-portal-popup.png` | CONFIRMED | `src/components/home/schedule-popup.tsx:116-124`: show the checkbox only when `auto` is on. |
| P2-12 | /faq | Questions have no `id`, so you can't link to one directly. `/blog?tab=faq` redirects to `/faq?tab=faq` with a temporary 307. | `pages-desktop.json`, `live.json` → `legacyRes` | CONFIRMED | Give each item an `id` in `src/app/faq/faq-list.tsx` and open the item named in the URL `#`. Set `permanent: true` on the redirect at `next.config.ts:47-53`; the leftover `?tab=faq` does no harm. |
| P2-13 | Inner pages while scrolling, iPhone | The white header layer is only 80% opaque (`rgba(255,255,255,.8)`), so page text shows through behind the logo and menu. | `shots/ev-iphone-header-bleed.png` | CONFIRMED | A design choice. If wanted, raise it to 0.9 (`globals.css:2188`). |
| P2-14 | /services/audit-advisory, pa, ipo-advisory, transaction-advisory | 「관련 글」 shows general tax posts (e.g. apartment co-ownership), because related posts are matched by category only. | `shots/desktop-services_audit-advisory-full.png` | CONFIRMED | `src/app/services/[slug]/page.tsx:52-55`: show the block only when the categories fit, or remove `postTopics` for these services in `data.ts`. |
| P2-15 | Several pages | Small inconsistencies:<br>• BLOG, 인사이트 and 「실무 메모」 all name the same section.<br>• Dates are written three ways: 2026-04-29, 2026.04.29, 2026년 4월 29일.<br>• /services says 10.25 while the header says 10.26 (legal date vs actual date, not explained).<br>• /contact says 「Seoul · Online Meeting」 while the footer gives the full address.<br>• The contact block on /about has no phone number.<br>• The 세무 기장 button pre-fills 「급여자료」 as the deliverable.<br>• 경리 아웃소싱's deliverables have no descriptions.<br>• /members has no call to action.<br>• The /portal demo shows a fixed D-76. | `text-pages.txt`, `contact-nosubmit.json`, `shots/ev-desktop-annual-flow-1025.png` | CONFIRMED | Copy edits only. |
| P2-16 | /blog, home 「최근 인사이트」 | The newest post is dated 2026-04-29, over five months old, under a "recent" heading. | `blog-desktop.json` | CONFIRMED | The owner publishes a new post or renames the heading. |
| P2-17 | Header, compared with live | The live header has 「Client Login」. On dev it is only in the footer and on /portal, so existing clients may not find it. | `live.json`, `shots/desktop-home-top.png` | CONFIRMED | The owner decides. If wanted, add it to `navMenu`. |
| P2-18 | Hero sections, iPhone WebKit | The hero video (about 730 KB) is downloaded on every page view in emulation. Its metadata is also fetched where the hero is folded away (/blog and /faq on mobile). | `crawl-iphone.json` → `totalKB` up to 1735 | SUSPECTED: real Safari may cache it | Check on a real iPhone first. If it holds, use `preload="none"` where the hero is folded. |
| P2-19 | Home, /services | Comparative and absolute claims: 「저가 기장 사무소」 and 「보통의 세무사무소」, and 「0건 대표님이 찾아 보낼 자료」. The live site has similar claims. | `text-pages.txt` | SUSPECTED: a legal judgement | The owner and adviser review the wording against the advertising rules for CPAs. |
| P2-20 | Technical noise | 74 WebKit pages warn about a CSS file that was preloaded but not used. Firefox prints 85 warnings about how the Pretendard Variable font file is ordered internally. favicon.ico is 85 KB. /blog?cat=case has a small layout shift (CLS 0.0256) from the footer. | the `crawl-*.json` files | CONFIRMED | Optional: shrink favicon.ico. The rest is harmless. |

### Side effects: one component breaking something nearby
- **A blog post's code block breaks the site header on Android.** The wide block widens the whole page, which pushes the header's buttons off-screen (P1-2).
- **The search box reused in the mobile menu doesn't know about the menu.** Searching navigates away but leaves the menu open and the page locked (P1-1).
- **Removing the home popup left a checkbox behind on /portal.** 「24시간 동안 보지 않기」 survived and now does nothing (P2-11).
- **Turning 「세무 자문」 into a category left old links behind.** /clients persona 03 and the search results still present it as advisory (P1-7).
- **The mega menu's current-page check ignores the query.** So every BLOG category is marked current at once (P2-5).

---

## 3. Checked and working

**Routes and status**
- I crawled the 69 sitemap URLs plus 12 extra test URLs (81 per browser) on desktop Chromium 1440×900 and iPhone 13 WebKit 390×844. Android 360×800 and Firefox 1440×900 got 15 routes each.
- 76 routes return 200. The 5 that return 404 are the ones I chose to probe: 3 made-up URLs and 2 unpublished drafts.
- No page errors in any engine. No failed requests apart from those 404s.
- The `X-Robots-Tag: noindex` header on dev is intentional.
- robots.txt and sitemap.xml agree: /pricing and /preview are left out and marked noindex, and robots.txt also disallows /preview.
- Redirects:
  - `/practice` and all 6 `/practice/*` → `/services/*` with 308, the same as live;
  - URLs with a trailing slash → 308;
  - `/blog?tab=faq` → /faq.
- I visited all 71 URLs reachable on the live site, and every one resolves on dev.

**Links**
- All 96 internal links work.
- Of 120 external links, 117 are fine; the 3 bad ones are in P2-9.
- The `tel:` and `mailto:` links are correct. The Kakao channel loads.
- `/contract` loads; no page on the site links to it.
- The portal loads and has its own privacy link.
- I did not sign in or submit anything in either app.

**Header and mega menu, desktop**
- Hover opens the menu and moving away closes it after a short delay.
- Click works. ArrowDown moves into the panel and Tab moves through it. Esc closes it and returns focus to the menu item. Enter follows a link.
- Hidden panels can't be reached by keyboard.
- The header button reads 「상담 문의하기」 with the right `?service=` on the service detail pages.
- Nothing overlaps at widths 768, 960, 1024, 1280 and 1366 px.

**Mobile menu, iPhone WebKit and Android Chromium**
- It opens and closes with the button, by tapping outside, and with the close button.
- The page behind it doesn't scroll (tested on Android).
- Focus moves into the menu on open and back to the button on close.
- Sub-menus expand. In landscape the menu scrolls inside itself.

**Schedule cube and modal**
- The dates match the 2026 NTS calendar.
- D-day is computed in Korean time.
- Esc and clicking outside close the modal, and focus is handled correctly.

**Site search**
- Korean search works, including 초성 and queries with spaces.
- Arrow keys, Enter and Esc work.
- An empty query shows nothing.

**Blog**
- The lead carousel loops.
- The category counts add up: 51 = 12 + 13 + 14 + 12.
- Search filters the list.
- Odd URL parameters are handled cleanly.
- The back button restores state.
- Posts:
  - source links carry `rel=noreferrer`;
  - related posts work;
  - 「URL 복사」 copies the page address;
  - the back link works.

**Services, clients, portal, home**
- Desktop hover and click on the service list work. The mobile list works apart from P2-2.
- /clients: the tabs and arrow keys work, and the URL `#` stays in sync.
- The in-page section links on /portal work, and on desktop the home page's work too.

**FAQ and contact page accordion**
- /faq: questions open and close by mouse and keyboard, with a visible focus outline.
- The accordion on /contact keeps only one item open at a time.

**Contact form**
- Except for the 3 real test submissions, I blocked all form sending during testing.
- An empty submit focuses 「이름」 and sends nothing.
- E-mail checks catch the common mistakes. Length limits are 80 for the name and 4000 for the message.
- Pre-filled drafts:
  - `?service=` fills in the service;
  - `?type=` and `?output=` fill in the service and deliverable;
  - the fee calculator's draft arrives complete;
  - an unknown service is ignored;
  - nothing the visitor typed is ever overwritten.
- Before the page finishes loading, typed text is kept, the button stays disabled and a hint shows (`shots/contact-prehydration.png`).
- Without JavaScript the form and hint still show.
- A double-click plus Enter sends 1 request.
- On error, the alert gets focus and is in view, and the typed values are kept.
- I used 3 of my 4 allowed real submissions and sent nothing to www.meridianco.kr.

**404 page**
- It renders, and its links work (`shots/pages-desktop-404.png`).

**Motion**
- With reduced motion turned on, no video is chosen, all content is visible, and the scroll scenes lay flat.
- No scroll-in animation got stuck.
- Smoothness while scrolling:
  - Chromium and WebKit: no slow frames.
  - Firefox: a few 67-83 ms frames.

**Performance**
- Lab LCP at most 364 ms desktop, 459 ms iPhone, 204 ms Android.
- CLS at most 0.026.
- Page weight at most 1.0 MB on desktop and 1.7 MB on iPhone, including the video.

**Metadata and accessibility**
- Every page has a canonical URL, `lang="ko"` and JSON-LD.
- The favicon, logo and share image load.
- axe on 15 main routes at both sizes found only P2-4.
- axe also reported contrast on the home orbs, /clients 「01」 and /portal. I re-measured those once they were fully on screen: the hits were captured mid-animation, and the /portal ones are a decorative demo screen.
- Input fields show a 2 px focus outline.

**Firefox and Android spot checks**
- Nothing beyond the findings above.

---

## 4. Not checked, and why

- **Real mail delivery and the "too many requests" (429) path.** Dev has no mail keys. I kept the 4th submission unused, and the 429 path would need 5 submissions.
- **Real phones.** All mobile testing was Playwright emulation. Not covered: the iOS zoom on input focus, Safari's video caching, iOS bounce-scrolling under the menu, and how the glass header performs on a real GPU.
- **Production hosting.** Not covered: HSTS and HTML cache headers on the production host (BE-08), and whether /preview is hidden with `ENABLE_PREVIEW_PAGE` unset.
- **Whether the phone number and address are right.** `02-6953-2820` and 「서울시 강서구 마곡중앙로 171 프라이빗타워Ⅱ 1210호」 appear on every page but are new: the live site shows only the e-mail. I could not confirm them independently. **The owner must confirm both before launch. If either is wrong, that is a P0 (wrong contact info).**
- **Tax accuracy of the 51 posts.** I checked only dates, deadlines and source links.
- **Screen readers.** No VoiceOver or NVDA run.
- **The portal and /contract apps.** I only checked that they load, as the brief said.
- **Real-visitor performance.** All numbers are lab measurements.