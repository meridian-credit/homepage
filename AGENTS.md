<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guide

Read by Claude Code (through `CLAUDE.md` → `@AGENTS.md`) and by codex. Edit guidance here, outside the
nextjs-agent-rules markers above — `next dev` rewrites only the text between those markers.

## What this is

Marketing site for 메리디안 택스 어드바이저리 (MERIDIAN, https://www.meridianco.kr), a boutique tax / accounting
advisory firm. Next.js 16 App Router, React 19, Tailwind v4, TypeScript. All user-facing copy is Korean. Production
runs on Vercel.

Git: the only remote is `origin` = `meridian-credit/homepage`, the owner's organization repo. It was transferred from
`nonesty5/homepage` (noted 2026-09-28); GitHub still redirects the old URL. Treat `main` as production and reach it
through a PR, never a direct push. The renewal work (IA v2, new home, services restructure) lives on `ian`.

## Commands

```bash
npm ci
npm run dev                  # http://localhost:3000
npm run lint
npm run build
npm run audit:content        # frontmatter checks on content/posts/*.mdx (CI gate)

# Playwright e2e. playwright.config.ts starts `next start` on :3100 itself, so build first.
npm run build && npm run test:e2e
npx playwright test tests/e2e/flows.spec.ts -g "menu focus" --project=desktop   # one test, one project
```

CI (`.github/workflows/ci.yml`, Node 22) runs `npm audit`, `npm audit signatures`, audit:content, lint, build, then
e2e across four projects (desktop, mobile, webkit, firefox). CI puts `node scripts/qa/https.mjs` in front of :3100 and
sets `QA_BASE_URL=https://localhost:3443`. That local TLS proxy makes the tests run under the real production CSP,
including `upgrade-insecure-requests`. Reproduce it the same way when a change touches headers or CSP.

Other browser QA scripts in `scripts/qa/` all expect a server on :3100:

- `audit.mjs`: axe accessibility check over the main routes at 1440 and 390px.
- `lifecycle.mjs`: finds requestAnimationFrame calls that keep running after navigation.
- `capture.mjs`: screenshots, video and trace into `artifacts/<label>/`. Run it as `npm run qa:capture -- <label>`.
- `measure.mjs`: per-route console errors, failed requests, horizontal overflow, CLS/LCP, bytes by type, meta and
  small tap targets, at 1440 and 390px. Budgets and P0 numbers are in `docs/plans/production-fixes/`
  (`baseline.json`). Use `BASE=https://localhost:3443` behind the TLS proxy. `ENGINE=webkit` switches the
  browser. WebKit on plain http :3100 gets no CSS, because the CSP upgrades insecure requests.

## Architecture

**Site data is code, not a CMS.**
- `src/lib/data.ts` holds `services` (fields drive the services pages, home, and search), `members`, and `personas`.
- `src/lib/constants.ts` holds `siteConfig` (name, URL, contacts) and `navMenu`. It also holds `serviceGroups`, the
  single source of the 4-group / 8-service taxonomy that menus, lists, and strips all read. `orderedServices`
  throws at import time if a group names a slug missing from `data.ts`.
- `sitePages` (also in `constants.ts`) feeds the in-site search index (`/api/search`). `/pricing` and `/preview` are
  deliberately absent from it and from `sitemap.ts`. Both pages set `robots: { index: false }` in their own metadata,
  and `robots.ts` also disallows `/preview`. Keep these consistent.
- `src/lib/schedule.ts` holds NTS tax-calendar dates plus `scheduleReviewedAt`. D-day is computed at view time in
  Asia/Seoul; never store a D-day number.
  - List only months NTS has actually published; don't guess dates.
  - Once every listed date has passed, the header cube and the `/portal` popup link to this month's NTS page.
  - `npm run audit:content` puts a warning first when under 30 days of dates remain.
    `.github/workflows/schedule-check.yml` runs the same check weekly and fails, as a reminder to refill the list.

**Blog.** Posts are `content/posts/*.mdx`, parsed by `src/lib/posts.ts` (gray-matter, next-mdx-remote, remark-gfm).
The frontmatter schema and citation rules are in `docs/content-system.md`:
- Any post stating rates, deadlines, thresholds, or law changes needs `sourceLinks`, primary authority first.
- `services: [slug]` attaches a 업무경험 post to that service's detail page.
- Related posts rank by `relatedSlugs`, then category, then keyword overlap.
- `/blog` ships its first page of posts in the static HTML. `blog/page.tsx` renders the same `BlogContent`, without a
  query, as the `<Suspense>` fallback. Only `BlogContentFromUrl` calls `useSearchParams`. A `null` fallback here once
  left the HTML without a single post and caused CLS of 0.6. `tests/e2e/blog-rendering.spec.ts` guards against that.

**Routing and headers** live in `next.config.ts`:
- A strict CSP and security headers apply to every path except `/contract/**`. A new third-party script, image, or
  connect origin must be added to the CSP, or it fails silently in production only.
- `/contract` is a rewrite to a separate Vercel project (taxchat, the freelancer contract app). It is excluded from
  the headers because its ID-card capture needs `camera=(self)`.
- The exact `/contract` rewrite must stay **before** `/contract/:path*`. Otherwise Vercel produces an infinite
  trailing-slash redirect, which does not reproduce under local `next start`.
- Redirects: apex to www, `/practice/*` to `/services/*`, `/blog?tab=faq` to `/faq`.

**Gated routes.** `/preview` returns 404 unless `ENABLE_PREVIEW_PAGE=true`. `/pricing` exists but is kept out of the nav
and the sitemap, and is noindex.

**`/api/contact`** sends mail through Resend.
- It checks Origin and Sec-Fetch-Site against `siteConfig.url` plus `CONTACT_ALLOWED_ORIGINS`.
- Rate limiting is an Upstash sliding window per IP and per email. It falls back to an in-memory map when the
  Upstash env vars are unset; set `CONTACT_RATE_LIMIT_REQUIRE_SHARED=true` to forbid that fallback.
- The full env var list is in `README.md`.

**`/contact` must stay statically prerendered.**
- The form renders once, outside any `<Suspense>`. Inquiry drafts arrive as query params. Only the empty `InquiryDraft`
  child (`components/contact/contact-inquiry.tsx`) reads them, from inside a `<Suspense>`, and hands the draft to the
  form. The draft never overwrites a field the user has already edited.
- The fields are uncontrolled and are read with `FormData` at submit. Text typed before hydration therefore survives:
  The React build that Next bundles (19.3 canary) does not replay it, and a controlled field would reset it on the
  first re-render.
- The submit button stays disabled until hydration. A disabled default button also blocks Enter submission, and a
  hint line gives direct contacts until then.
`tests/e2e/contact-rendering.spec.ts` asserts that `/contact` is in the prerender manifest and that the page works
without JavaScript. Background: per-request rendering blew the Cloudflare Workers CPU limit
(`docs/reviews/2026-09-11/contact-worker-1102.md`).

**Styling.**
- Tailwind v4 is configured with `@theme inline` in `src/app/globals.css`. That file (~5.8k lines) carries most of
  the site's styling as named classes.
- `promo.css` is imported only by the home page (`src/app/page.tsx`) and scoped under `.promo`.
- `glass.css` is the refracting-glass header material, imported verbatim. Don't edit it; site colors are passed in
  from `globals.css`.
- The type scale `--t-*` is defined once, in the `:root` block of `globals.css`; `.promo` inherits it. The promo
  colour names (`--navy`, `--tx`, `--blue`, …) are aliases of the theme colours. The spacing ladder `--s1`…`--s7`
  exists only in `promo.css`.
- Tailwind drops theme variables nothing uses from the build. A `var(--color-…)` in `promo.css` counts as a use.
- Design rules are in `docs/DESIGN_SYSTEM.md`.

**Fonts and media.**
- Body text is Pretendard and headings are Wanted Sans. Both ship as their original 92 unicode-range chunks in
  `src/fonts/<family>/`.
- `scripts/fonts/subset.mjs` runs first in `npm run build` and `npm run dev`. It keeps only the glyphs the site
  uses: string literals and JSX text under `src/`, CSS `content:`, and all of `content/`. The result goes to
  `src/fonts/generated/`, which is gitignored, as the `"Pretendard Site"` / `"Wanted Sans Site"` families. Those sit
  first in `--font-sans` / `--font-display`.
- A glyph the site doesn't contain, such as a search query, falls back to the original chunk.
- The layout imports the font CSS, so Next fingerprints every file into `/_next/static/media`. Don't move fonts back
  to `public/`, and don't link them with `<link>`.
- An unknown HTML entity in JSX makes the generator fail. Add it to `ENTITIES` in the script. In `content/` it only
  warns and counts the text literally, because MDX prints unknown names as-is ("R&D;").
- Cormorant Garamond (`next/font`) is loaded at 600 normal only, for the `.brand-word` wordmark.
- `public/media/*` is served `immutable`. When a file's content changes, bump the version in its name (`.v1.` →
  `.v2.`) and update every reference.
  - The OG/Twitter image stays at `/home-hero-poster.jpg`, so SNS caches keep working.
  - Every video `<source>` carries `media="(prefers-reduced-motion: no-preference)"`. Under reduced motion no
    source matches, so no video is downloaded.

**Motion.** GSAP drives the home scroll scenes (`components/home/promo-motion.tsx`, `promo-scenes.ts`,
`service-merge-scene.ts`). Lenis (`components/providers/smooth-scroll-provider.tsx`) smooths the native scroll, so
ScrollTrigger needs no bridge. There is no `motion` (framer-motion) dependency; the rest is CSS driven by small hooks.
- **Stage scenes** (home opening `about/about-opening.tsx`, promise thread `about/promise-stage.tsx`):
  - One DOM. The base CSS rules are the stacked (flat) layout. The pinned stage lives under
    `@media (width > 900px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)`.
    That string is `STAGE_MEDIA` in `src/lib/use-scroll-progress.ts`. Change both together.
  - `useScrollProgress(ref, range, { media, onProgress })` writes the element's scroll progress as `--p` (0..1) on
    each frame. Every CSS phase is a `clamp()` over `--p`. It does not re-render React. Only the promise thread's
    state machine uses `onProgress`. The hook commits those updates with `flushSync` so CSS transitions start in the
    same frame, except on the first draw: that one runs inside `useLayoutEffect`, where React forbids `flushSync`.
  - Lightning CSS (the Next minifier) drops a `scale` property that shares a rule with `transform`. Put the scale
    inside `transform`.
- **Reveals** (`components/motion/`: `AnimateOnScroll`, `StaggerChildren`/`StaggerItem`, `LineReveal`):
  - Server HTML is always visible. After hydration, only elements still below the fold get
    `data-reveal="pending"`. `onceInView` in `src/lib/in-view.ts` (the same check `useInViewOnce` uses) flips them to `"shown"`.
  - The look (distance, duration, easing) is the `[data-reveal]` rules at the end of `globals.css`.

Tests enforce three rules:
- Honour `prefers-reduced-motion`.
- Keep essential content visible without JS.
- Tear down animation frames and listeners on unmount.

## Conventions

- Code comments, commit messages, and docs are written in Korean, in a plain explanatory voice that records *why*.
  Comments often cite client review items as `첨삭 #NN`. Match that.
- Layout fixes are verified by measuring in a real browser (Playwright `getBoundingClientRect` /
  `getComputedStyle`), not by eyeballing screenshots. `docs/FIX_LOG_2026-09-07.md` shows the pattern.
- Root `MEMORY.md` is a timestamped decision log: record conclusions there. Scratch investigation files go in
  `/temp/`, which is gitignored.
- `HANDOFF_REVIEW.md` is stale (April 2026, pre-rebrand "한결회계법인"). Don't rely on it.
- `docs/IA_V2.md` is the current information-architecture plan (plain summary in `docs/memory/memory_IA_V2.md`).

## Deploy

- **Production:** Vercel. `.vercelignore` keeps `docs/`, `image/`, and local artifacts out of the upload.
- **Cloudflare Workers preview** via OpenNext uses `wrangler.preview.jsonc` and `open-next.preview.config.mjs`. The
  commands are in `docs/reviews/2026-09-11/contact-worker-1102.md`.
  - On Workers Free (10 ms CPU per request) the adapter intermittently returns error 1102, so this path is only
    usable for previews.
  - The `meridian-preview-menu-ia` worker it targets was deleted on 2026-09-27; a deploy recreates it.
