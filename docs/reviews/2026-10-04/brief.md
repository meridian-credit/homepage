# Customer-perspective QA of the MERIDIAN site renewal (production-readiness)

## Target

- **Site under test:** https://accounting.teamcredit.kr
  - It runs git branch `dev` at commit `37fc011`.
  - It is the renewal that is meant to replace the live site https://www.meridianco.kr.
- **The business:** 메리디안 택스 어드바이저리 (MERIDIAN), a boutique tax / accounting advisory firm in Korea.
  - All copy is Korean.
  - Customers are business owners and individuals. Many use iPhone Safari or Android Chrome; others use desktop Chrome or Edge.
- **Source code (read-only):** `/Users/macstudio/orca/workspaces/accounting-homepage/backend-database`.
  - `AGENTS.md` there describes the architecture. Use the source to locate the cause of a defect (file:line).
  - The working tree has one local commit on the contact API (`9fe32e7`) that is **not** deployed. Judge the deployed site.
- **Things about the dev host that are intentional:**
  - It sends `X-Robots-Tag: noindex`.
  - `/preview` is enabled.
  - It has no mail-sending configuration yet, so a submitted contact form gets an error.
  - For the contact form, judge what a customer experiences: validation, messages, keeping typed text, focus, the mobile keyboard, and what the error tells them to do.

## Job

Act as a real customer.
- Visit every page.
- Click or tap every interactive element.
- Decide, element by element:
  - Does it work?
  - Is anything broken, confusing, slow, ugly, inconsistent or untrustworthy?
  - Is anything missing for launch?

Then give a verdict: production-ready or not, with the exact list of blockers.

### Minimum coverage (go beyond it)

1. **Routes.** Discover every route from `sitemap.xml`, `robots.txt`, the header nav and mega menu, the footer and in-page links. Visit every one.
2. **Browsers and viewports.**
   - Desktop Chromium 1440×900.
   - Mobile WebKit 390×844 with touch, standing in for iPhone Safari.
   - Spot-check mobile Chromium 360×800 (Android) and desktop Firefox.
3. **Every interactive element.**
   - Header nav and mega menu: hover, click, keyboard (Tab / Enter / Esc), and close behaviour.
   - Mobile menu: open, close, scroll lock.
   - Site search: Korean queries, an empty query, no results.
   - The tax-calendar / schedule widget.
   - Every CTA and button.
   - The services list and every service detail page.
   - FAQ: expand, collapse, deep links.
   - Blog list (tabs, filters, pagination, search) and several posts (source links, related posts).
   - Team / members, and personas / "for who".
   - The portal page and its popup.
   - **Contact form:**
     - every field and its validation messages, and the required fields;
     - pre-filled drafts arriving via query params from CTAs on other pages;
     - submit, error display, typed text kept after an error, double submit.
   - `tel:` and `mailto:` links. External links: the client portal and the `/contract` app — check that they load, nothing more.
   - The 404 page.
   - Redirects: `/practice/*` → `/services/*`, and `/blog?tab=faq` → `/faq`.
4. **Content and copy.**
   - Typos.
   - Inconsistent firm name, contact details, address or business registration info.
   - Stale or contradictory information.
   - Placeholder text and English leftovers.
   - Bad Korean line breaks.
   - Dates that look wrong, and claims without a basis.
   - Legal pages a Korean business site needs (for example a privacy policy for a form that collects personal data), and the footer business info.
5. **Visual and layout.**
   - Horizontal overflow; clipped or overlapping text.
   - Image quality and aspect ratio; spacing consistency.
   - Font-loading flashes and video behaviour.
   - Scroll animations: jank or stuck states.
   - `prefers-reduced-motion` mode.
6. **Technical.**
   - Console errors.
   - Failed requests (4xx/5xx).
   - Broken internal links or images: crawl them all. Check external links with a GET.
   - Page weight, and rough LCP / CLS.
   - Title, description and OG meta per page; favicon; canonical.
   - Accessibility: keyboard-only use, visible focus, alt text, form labels, contrast. Use axe-core if you can.
7. **Regressions against the live site.** Read-only on www.meridianco.kr. List anything a customer can do or find on the live site that the renewal loses:
   - pages;
   - information;
   - ways to make contact;
   - old URLs that would 404 after the switch.

## Hard rules

- **Never submit any form on www.meridianco.kr.** The live site e-mails the firm's real inbox. Only read and navigate there.
- On accounting.teamcredit.kr, submit the contact form at most 4 times in total. The rate limit is 5 per 10 minutes per IP. Use obviously fake data, e.g. name `QA 테스트`, e-mail `qa@example.com`.
- `/contract` and the client portal are separate apps. Check that they load from the site's links. Do not sign in, upload or submit anything there.
- No load or stress testing. Crawl politely: sequential, a few requests per second at most.
- Do not modify the repository, commit, push, deploy, or touch any server.
- Write only inside your own output folder (given in your prompt). Do not read the other QA folder under `temp/qa-2026-10-04/`.
- Playwright is installed in the repo:
  - Package: `node_modules/@playwright/test`.
  - Browsers: chromium, webkit and firefox in `~/Library/Caches/ms-playwright`.
  - Run scripts from the repo directory so imports resolve, and keep the script files in your output folder.
- Verify by measuring in the browser (`getBoundingClientRect`, `getComputedStyle`, network and console logs), not by eye alone. Take a screenshot for every finding.
- Anything touching login, auth or the handling of personal data: flag it. Don't try to exploit it.

## Report

Write `report.md` in your output folder, and also return its full text as your final answer.

1. **Verdict first:** PRODUCTION READY or NOT READY, plus one paragraph on why.
2. **Findings**, sorted by severity:
   - P0: blocks launch. Broken core function, legal exposure, wrong contact info, data loss, crash.
   - P1: fix before launch if at all possible. Clearly visible defect, confusing core flow, accessibility failure on a main path.
   - P2: polish, nice to have.

   Give each finding:
   - an ID;
   - the page URL;
   - browser and viewport;
   - steps to reproduce;
   - expected vs actual;
   - evidence (screenshot path or measured value);
   - confidence: CONFIRMED (reproduced) or SUSPECTED;
   - the smallest proper fix direction, with file:line if you located it.
3. **Checked and working:** what you verified works, so coverage is visible.
4. **Not checked:** what you could not check, and why.

Fix directions must be the smallest proper fix. Flag over-engineering explicitly. Codex models sometimes tend to OVERengineer, but that's not what we desire either. This is a small firm's marketing site. Do not list a CMS, CRM, queue or monitoring stack as a launch requirement.

Also note side effects: anything that looks like one component's behaviour broke something nearby on another page.
