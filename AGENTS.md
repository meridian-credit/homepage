<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guide

Read by Claude Code (through `CLAUDE.md` → `@AGENTS.md`) and by codex. Edit guidance here, outside the
nextjs-agent-rules markers above. `next dev` rewrites only the text between those markers.

## What this is

Marketing site for 메리디안 택스 어드바이저리 (MERIDIAN, https://www.meridianco.kr), a boutique tax / accounting
advisory firm. Next.js 16 App Router, React 19, Tailwind v4, TypeScript. All user-facing copy is Korean. Production
runs on our own server since 2026-10-12, not Vercel (see Deploy).

Git: the only remote is `origin` = `meridian-credit/homepage`, the owner's organization repo. It was transferred from
`nonesty5/homepage` (noted 2026-09-28); GitHub still redirects the old URL. Treat `main` as production and reach it
through a PR, never a direct push. Branches:
- `ian`: the renewal work (IA v2, new home, services restructure), not yet merged to `main`.
- `dev`: `ian` plus the production-readiness fixes (`docs/plans/production-fixes/`). It is what
  accounting.teamcredit.kr serves (see Deploy). New work lands here first.

## Commands

```bash
npm ci
npm run dev                  # http://localhost:3000
npm run lint
npm run build
npm run audit:content        # tax-calendar runway check (CI gate); post checks moved to the admin's publish check
npm run check:rules          # source checks for the rule table in "Corrections become checks" (CI gate)

# Playwright e2e. playwright.config.ts starts `next start` on :3100 itself, so build first.
npm run build && npm run test:e2e
npx playwright test tests/e2e/flows.spec.ts -g "menu focus" --project=desktop   # one test, one project

# Admin app (admin/): its own build, and e2e that starts the admin on :3310 and the public site on :3210.
npx next build admin
npx playwright test -c admin/playwright.config.ts
```

CI (`.github/workflows/ci.yml`, Node 22) runs `npm audit` (runtime deps fail from moderate, dev tools only on
critical; see the comment there), `npm audit signatures`, audit:content, check:rules, lint, build, then
e2e across four projects (desktop, mobile, webkit, firefox), then the admin build and admin e2e. CI puts `node scripts/qa/https.mjs` in front of :3100 and
sets `QA_BASE_URL=https://localhost:3443`. That local TLS proxy makes the tests run under the real production CSP,
including `upgrade-insecure-requests`. Reproduce it the same way when a change touches headers or CSP.

To drive the built site like a visitor and collect PR evidence, follow `.claude/skills/verify-meridian/SKILL.md`
(start, doctor, the contact journey, stop, and a feature map). Codex reads it as a plain file.

Other browser QA scripts in `scripts/qa/` all expect a server on :3100:

- `audit.mjs`: axe accessibility check over the main routes at 1440 and 390px.
- `lifecycle.mjs`: finds requestAnimationFrame calls that keep running after navigation.
- `capture.mjs`: screenshots, video and trace into `artifacts/<label>/`. Run it as `npm run qa:capture -- <label>`.
- `measure.mjs`: per-route console errors, failed requests, horizontal overflow, CLS/LCP, bytes by type, meta and
  small tap targets, at 1440 and 390px. Budgets and P0 numbers are in `docs/plans/production-fixes/`
  (`baseline.json`). Use `BASE=https://localhost:3443` behind the TLS proxy. `ENGINE=webkit` switches the
  browser. WebKit on plain http :3100 gets no CSS, because the CSP upgrades insecure requests.

## Architecture

**Site data is code, except the tax calendar, the FAQ and the blog, which the servers read from the admin's DB.**
- `src/lib/data.ts` holds `services` (fields drive the services pages, home, and search), `members`, and `personas`.
- `src/lib/constants.ts` holds `siteConfig` (name, URL, contacts) and `navMenu`. It also holds `serviceGroups`, the
  single source of the 4-group / 8-service taxonomy that menus, lists, and strips all read. `orderedServices`
  throws at import time if a group names a slug missing from `data.ts`.
- `sitePages` (also in `constants.ts`) feeds the in-site search index (`/api/search`). `/pricing` and `/preview` are
  deliberately absent from it and from `sitemap.ts`. Both pages set `robots: { index: false }` in their own metadata,
  and `robots.ts` also disallows `/preview`. Keep these consistent.
- The tax calendar and the FAQ are read only through `getSchedule()` / `getFaq()` in `src/lib/content/read.ts`.
  - With `CONTENT_DB` set (production since 2026-11-16, and dev), they read the admin app's SQLite file read-only.
  - Without it (CI, local), they return the arrays in `src/lib/schedule.ts` / `src/lib/faq.ts`.
  - The arrays also seed a new DB. Edits made in the admin never flow back into them.
- `src/lib/schedule.ts` holds NTS tax-calendar dates plus `scheduleReviewedAt`. D-day is computed at view time in
  Asia/Seoul; never store a D-day number.
  - List only months NTS has actually published; don't guess dates.
  - Once every listed date has passed, the header cube and the `/portal` popup link to this month's NTS page.
  - `npm run audit:content` puts a warning first when under 30 days of dates remain.
    `.github/workflows/schedule-check.yml` runs the same check weekly and fails, as a reminder to refill the list.
    GitHub runs scheduled workflows only from the default branch (`main`).
  - Both checks read only the arrays. Since production reads the DB, the schedule visitors see is filled in the
    admin, and the admin home shows its real runway.

**Blog.** Since 2026-11-16 posts are written in the admin (블로그 글) and live in the content DB; there is no
`content/` directory, no MDX and no gray-matter. The plan and the decisions are in `docs/plans/admin-backend/blog.md`;
the fields and citation rules are in `docs/content-system.md`.
- The public site reads only the published copy (`post_public`) through `src/lib/posts.ts`, which keeps the old
  file-era function names and `PostMeta` shape, so its consumers (blog, home, services, search, sitemap, llms.txt,
  menu) did not change. Without `CONTENT_DB` (CI, local) there are no posts.
- The body is GFM Markdown. `src/components/blog/post-body.tsx` renders it with remark → hast → JSX
  (`src/lib/content/markdown.ts`). Raw HTML is dropped, links are kept only when safe, and images render only from
  `/uploads/<24 hex>.webp` with the width and height stored in the DB.
- Images are BLOBs in the DB (`upload` table), so the existing backups and build snapshots cover them.
  `/uploads/[name]` serves them `immutable`; the name is a content hash.
- `/blog/[slug]` and the signed preview `/blog-preview/[id]?t=<exp>.<sig>` render the same `PostView`. The preview
  signature is HMAC keyed from `REVALIDATE_SECRET`, valid for 1 hour, noindex, and disallowed in `robots.ts`.
- `<article data-published-at>` carries the last publish time. The admin checks it after a publish to confirm the
  site really redrew.
- `/api/search` is `force-static` and has no module cache, so a redraw rebuilds it. `scripts/fonts/subset.mjs`
  reads published posts, FAQ and schedule text from `CONTENT_DB` when set.
- Any post stating rates, deadlines, thresholds, or law changes needs sources, primary authority first. The admin
  enforces it when 「세율 · 기한 …을 다룹니다」 is on.
- `services: [slug]` attaches a 업무경험 post to that service's detail page.
- Related posts rank by `relatedSlugs`, then category, then keyword overlap.
- `/blog` ships its first page of posts in the static HTML. `blog/page.tsx` renders the same `BlogContent`, without a
  query, as the `<Suspense>` fallback. Only `BlogContentFromUrl` calls `useSearchParams`. A `null` fallback here once
  left the HTML without a single post and caused CLS of 0.6. `tests/e2e/blog-rendering.spec.ts` guards against that.

**Admin app** (`admin/`) edits the tax calendar, the FAQ and the blog; see `docs/plans/admin-backend/`.
- It runs in two places, each with its own DB and accounts:
  - Production: https://admin.meridianco.kr (since 2026-11-16). A save redraws www.meridianco.kr.
  - Dev: https://accounting-admin.teamcredit.kr, kept for trials. A save redraws only the dev site.
- It is a separate Next app in the same repo and `node_modules`, built with `next build admin`. It imports public
  code through `@/` and its own through `@admin/`.
  - It is separate rather than a route group so the public layout stays untouched and `main` ships no admin
    surface.
  - The separate host also keeps the admin session away from `/contract`, which runs another app's JS on the site
    origin.
- Login is Better Auth with username and password. The owner switched from Google on 2026-10-12.
  - The auth route opens only `POST sign-in/username`, `POST sign-out` and `GET get-session`; everything else in
    Better Auth answers 404.
    - Otherwise `/sign-in/email` skips the sign-in limit, and several routes reveal whether a username exists.
    - Users could also rename themselves or change passwords over HTTP.
  - Sign-up is off, and a user-create hook refuses every creation. Accounts exist only if an operator made one with
    `admin/scripts/user.mjs` (`add` / `passwd` / `remove` / `list`, password on stdin) inside the admin container. So
    any valid session is an admin.
  - `passwd` and `remove` delete that user's sessions. `requireAdmin()` runs on every page and in every server
    action, so the user is locked out on the next request. There are no roles.
  - Sign-in is limited to 10 tries per 15 minutes per client IP. Better Auth reads the IP from `X-Real-IP`, which the
    inner NPM sets to the real client.
    - With two proxies `X-Forwarded-For` holds two addresses, and Better Auth then falls back to one bucket shared
      by everyone.
    - The username and password rules live in `admin/scripts/account-rules.mjs`, which both `auth.ts` and `user.mjs`
      import. It sits next to `user.mjs` because that script runs in the container without a build.
- The content is one SQLite file (WAL), `CONTENT_DB`.
  - The admin is its only writer. On start it applies `MIGRATIONS` from `src/lib/content/schema.ts` and seeds from
    the code arrays once.
  - Migrations only add. The previous public build may still be reading the same file.
- Every save runs in one transaction: check the revision, replace the list, bump the revision, and write an audit
  row with the before and after.
  - A stale revision is refused, so two tabs can't overwrite each other.
  - 변경 기록 restores an older state as a new save.
- Blog posts differ (`admin/src/lib/posts.ts`, `admin/src/app/post-actions.ts`):
  - Each post has its own revision, a working copy (`post.draft`) and a published copy (`post_public`). 저장 changes
    only the draft; 게시 copies it to the site.
  - Post history goes to its own `post_event` table, not `audit_event`, so a rolled-back admin that knows only
    `schedule` and `faq` never meets a `post` row. The history page merges both.
  - The slug is locked while a post is published. 완전히 지우기 (from the trash) also deletes that post's history.
  - Post ids are never reused: `createPost` picks max(id in `post`, `post_id` in `post_event`) + 1. SQLite would
    otherwise hand a deleted last id to the next post, attaching the old post's history and preview links to it.
  - An image dropped from every draft and published copy is deleted at once; history alone does not keep it.
  - The editor is Milkdown (`admin/src/editing/markdown-editor.tsx`). It removes Milkdown's own `strong`/`emphasis`
    serializers so `**25%**로` is saved as `**25%**&#xB85C;`, which CommonMark reads as bold. `admin/tests/posts.spec.ts`
    guards it.
  - Uploads are re-encoded by sharp (JPEG/PNG/WebP by magic bytes, ≤15 MB, ≤1600 px wide, metadata stripped).
    The admin's server action body limit is 16 MB.
- The UI was rebuilt from scratch on 2026-10-12. The design, the decisions and the "add a content type" checklist
  are in `docs/plans/admin-backend/ui.md`.
  - Each type has a client-safe model in `admin/src/content/<type>.ts`: the zod rules that the browser and the server
    both run, and `describe(before, after)`. The history page builds its summary lines from that diff, not from the
    stored summary. `content/registry.ts` lists the types for the menu, home and history filter.
  - `admin/src/editing/use-editor.ts` is the one save flow: working copy, change count, save-bar states, Ctrl+S and
    the leave warning.
    - Unsaved edits are kept in `localStorage` (`meridian-admin:draft:<kind>`) with their base revision. Saving,
      discarding or logging out clears them.
    - Save actions answer `signed-out` instead of redirecting, so the typed text survives an expired session.
  - Restore is `previewRestore(id)` then `restoreBefore(id, revision)`. A save made after the preview is refused,
    not overwritten.
  - A failed publish is remembered in `content_meta` (`admin.publishFailed`) and shown on every page until a
    republish succeeds. The public site never reads that key.
  - Styles are tokens plus numbered sections in `admin/src/app/admin.css`. There is no Tailwind, and the icons are
    inline SVG (`admin/src/ui/icons.tsx`).
- After a save the admin POSTs the public site's `/api/revalidate` (bearer `REVALIDATE_SECRET`; 404 when unset),
  then warms `/`, `/faq`, `/contact`, `/portal` (for a post: `/`, `/blog`, the post, `/api/search`). A post publish
  or unpublish is then verified by fetching the post (200 with its `data-published-at`, or 404) and `/blog`.
  - The route reads the DB first and answers 500 if it can't. A failed regeneration would otherwise keep serving
    the old page while the admin reported success.
  - Pages stay statically prerendered. Next writes the regenerated HTML into `.next/server/app`, but it keeps the
    "stale" marks in memory, and a new or rolled-back image starts from its build snapshot.
  - So the public server revalidates itself once on every start (`src/instrumentation.ts`). That only runs when
    `CONTENT_DB` and `REVALIDATE_SECRET` are set, and it calls `127.0.0.1:$PORT`. Give the port as `PORT`, not
    `-p`.
  - The admin e2e therefore leaves edited FAQ/schedule pages and test posts in the local `.next`. Run it after the
    public e2e, or rebuild.

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

**`/api/contact`** sends mail through Amazon SES (our AWS account, ap-northeast-2) as `no-reply@meridianco.kr`.
- It checks Origin and Sec-Fetch-Site against `siteConfig.url` plus `CONTACT_ALLOWED_ORIGINS`.
- Rate limiting is an Upstash sliding window per IP and per email. It falls back to an in-memory map when the
  Upstash env vars are unset; set `CONTACT_RATE_LIMIT_REQUIRE_SHARED=true` to forbid that fallback.
- The SES SDK throws when a send is rejected, denied, or can't reach SES. The route then answers 502 with the
  direct email address, and does the same when no `MessageId` comes back. Only the error name and status are logged,
  never the visitor's address or message.
- `CONTACT_FROM_EMAIL` is the switch: without it the route answers 500 and sends nothing, even if AWS credentials
  are in the environment. The recipient is `CONTACT_TO_EMAIL`, else `siteConfig.email`. The Korean display name goes
  out as an RFC 2047 encoded-word, which SES requires.
- DNS for `meridianco.kr` moved to our Cloudflare on 2026-10-01. It holds the SES DKIM CNAMEs and the
  `e.meridianco.kr` MAIL FROM records. `resend._domainkey` and `send.` belong to the Resend setup of the old Vercel
  build. Production runs this code since 2026-10-12; remove them once a rollback to Vercel is no longer wanted.
- The anti-bot speed check takes `elapsedMs`, which the form measures with `performance.now()` (0 = page open on a
  first load). Never send a client wall-clock timestamp: a device clock a few minutes off would block every
  submission.
- `tests/e2e/contact-route.spec.ts` is the only test that hits the real route. It starts its own `next start` with
  every `AWS_*` from the shell removed, a fake key, and `AWS_ENDPOINT_URL_SESV2` pointed at an in-process fake SES,
  so it never uses the shared :3100 server or a real key.
  The other contact tests fake the response with `page.route`.
- `/privacy` (개인정보 처리방침) describes this route's data flow. When a processor changes, update its 「처리 위탁」 table:
  production hosting, Upstash, or the mailbox.
- Open backend issues, and what not to build, are in `docs/plans/ui-ux-remediation/backend-backlog.md`.
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
without JavaScript. Background: per-request rendering blew the CPU limit on a Cloudflare Workers preview
(`docs/reviews/2026-09-11/contact-worker-1102.md`).

**Styling.**
- Tailwind v4 is configured with `@theme inline` in `src/app/globals.css`. That file (~5.8k lines) carries most of
  the site's styling as named classes.
- `promo.css` is imported only by the home page (`src/app/page.tsx`) and `/portal`, and is scoped under `.promo`.
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

**Motion.** GSAP drives the scroll scenes on the home page and `/portal` (`components/home/promo-motion.tsx`,
`promo-scenes.ts`, `service-merge-scene.ts`; the scene list is §6 of `docs/DESIGN_SYSTEM.md`). Lenis (`components/providers/smooth-scroll-provider.tsx`) smooths the native scroll, so
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
    inside `transform`. It also moves a separate `transition-behavior: allow-discrete` line above the `transition`
    shorthand, which then resets it to `normal`. Write `allow-discrete` inside the shorthand.
- **Header glass and mega menu** (`layout/header.tsx`, `layout/site-nav.tsx`, `glass-filter.tsx`):
  - The SVG refraction backdrop-filter is re-drawn on every frame in which anything inside the header moves.
    That frame is about 10× dearer than without it (measured 2026-09-30).
  - Don't animate inside the header while the refraction is on. The mega menu turns it off while open and for
    0.3 s after close.
  - Every mega-menu pane is always rendered; inactive ones are inert. Each pane is placed under its trigger with
    no transition. The panel uses `overflow: clip`: with `hidden`, keyboard focus scrolled the shorter pane.
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

## Corrections become checks

An agent skips a rule that nothing enforces. So when the owner corrects the same mistake a second time, don't add
another line to this file. Fix it at the highest level that works:

1. Architecture: one owner for each piece of state, one supported way for each task, delete the old way.
2. Types, or a lint or CI check whose error message names the file or function to use instead. If the pattern is
   already common, fail only when a change adds more.
3. A test of the behavior. Show that it fails on the real past mistake before you commit it.
4. Text here, last, and only for judgment calls.

A comment that explains why a quick fix is acceptable is not a fix. Agents copy it as permission, so fix the root
cause instead. Comments that record a constraint the code cannot show (a browser bug, a vendor limit, a client
review item) stay, as Conventions says.

Prove a change by running it, not by reading it: a Playwright measurement, a `capture.mjs` screenshot or a test
output. Put that evidence in the PR so the reviewer reads the result instead of the diff.

Rules in this file and what enforces them. When you enforce one of the unenforced rules, move it up. Drop a row once
its mistake can't happen.

| Rule | Enforced by |
|---|---|
| `/contact` stays statically prerendered and works without JS | `tests/e2e/contact-rendering.spec.ts` |
| `/blog` ships its first page of posts in the static HTML | `tests/e2e/blog-rendering.spec.ts` |
| `allow-discrete` goes inside the `transition` shorthand | `tests/e2e/flows.spec.ts` (menu close) |
| Milkdown saves `**25%**로` as bold | `admin/tests/posts.spec.ts` |
| `serviceGroups` names only slugs in `data.ts` | `orderedServices` throws at import |
| The tax calendar has 30+ days of dates | `npm run audit:content`, `schedule-check.yml` |
| The exact `/contract` rewrite comes before `/contract/:path*` | `npm run check:rules` |
| `/pricing` and `/preview` stay out of the sitemap and search, and are noindex | `npm run check:rules` (metadata), `tests/e2e/noindex-pages.spec.ts` |
| `scale` goes inside `transform` (Lightning CSS drops it) | `npm run check:rules` |
| `STAGE_MEDIA` and the CSS media query match | `npm run check:rules` |
| Username and password rules | One source, `admin/scripts/account-rules.mjs`, read by `auth.ts` and `user.mjs` |

## Deploy

- **Production: https://www.meridianco.kr serves `main` from `proxmox-ubuntu`, and https://admin.meridianco.kr is its
  admin.** Both were the owner's decisions: the move off Vercel on 2026-10-12 (the Vercel Git link had been broken
  since the repo transfer), and the admin on 2026-11-16.
  - Stack `/opt/stacks/accounting_prod`, containers `accounting_prod` and `accounting_prod_admin`. The ubuntu crontab
    runs its `deploy.sh` every minute (tag `# accounting-prod-deploy`). It builds in dev's order (below), with one
    addition:
    - It deploys a new `main` head only after that commit's `CI` run passed. It reads the result from the public
      Actions API without a token. A pass on the PR counts, so fast-forwarding `main` to a green PR head ships at
      once. A failed CI marks the SHA `failed`; after a green re-run, `rm failed && ./deploy.sh`.
    - That API allows 60 requests an hour per public IP, and other machines behind the same address share the quota.
      When it runs out, the script exits without a log line until the reset (seen 2026-11-16). Before assuming the
      cron is broken, run `curl -s https://api.github.com/rate_limit` on the server.
  - Path: Cloudflare DNS-only (`www` and `admin` CNAMEs, the apex flattened) → `origin.teamcredit.kr` → site blocks in
    the Caddy edge on `proxy-seoul-01` → inner NPM. Host 79 goes to `accounting_prod:3000` and host 86 to
    `accounting_prod_admin:3000`. The apex is redirected to www by `next.config.ts`.
  - The www block adds what Vercel used to: HSTS `max-age=63072000`, and `public, max-age=0, must-revalidate` on
    HTML in place of `next start`'s `s-maxage=31536000`. It adds no `X-Robots-Tag`. The admin block adds the same
    HSTS and `X-Robots-Tag: noindex`.
  - `.env` (mode 600) holds:
    - the SES key of the IAM user `meridian-homepage-contact-prod` (same send-only policy as dev's)
    - `CONTACT_FROM_EMAIL`
    - the two search-console tokens, which `compose.yaml` passes as build args
    - `REVALIDATE_SECRET`
  - `CONTACT_TO_EMAIL` is unset, so inquiries go to `siteConfig.email`.
  - `admin.env` (mode 600) has no `ADMIN_ENV_BAND`, so the production admin shows no banner. `env.example` and
    `admin.env.example` list both files.
  - Accounts: `printf '%s' "$PW" | docker exec -i accounting_prod_admin node admin/scripts/user.mjs add <username>`.
    The operator keeps the production login in `~/dev/credit-scripts/.env` (`MERIDIAN_ADMIN_*`).
  - The content DB is `data/content.db`. It was seeded from the code arrays on 2026-11-16.
  - `backup.sh` runs daily at 04:27 (tag `# accounting-prod-admin-backup`, log `backup.log`):
    - It keeps a copy in `data/backups/` for 30 days.
    - It puts another in S3 `meridian-homepage-content-backup/content/` (Seoul). The bucket is versioned and its
      lifecycle keeps copies for 90 days.
    - The server's key (IAM user `meridian-homepage-backup-prod`, in `backup.env`) may only `PutObject` there. It
      cannot list, read or delete.
  - Restore works as on dev (below), with `accounting_prod_admin` and `accounting_prod`.
  - Rollback within the server: the previous image of each container is kept.
    - The images carry the label `com.teamcredit.keep=true`. Without it the host's weekly
      `docker image prune --filter until=336h` deletes a rollback image two weeks after a deploy, as it did on
      2026-11-01.
    - Rollback to Vercel: point `www` back to `cname.vercel-dns.com` and the apex to `76.76.21.21`. The Vercel
      project still serves `db9e3a3` (2026-08-02), whose form mails through Resend and which has no admin.
  - Vercel Analytics and Speed Insights render only when `VERCEL=1`, so they are gone on this host.
- **CI runs only on PRs and `main` pushes.** A `dev` push is checked only by the server's own build.
- **Dev: https://accounting.teamcredit.kr serves the `dev` branch, and https://accounting-admin.teamcredit.kr its
  admin.** A push to `dev` deploys both in a few minutes.
  - The ubuntu crontab on `proxmox-ubuntu` runs `/opt/stacks/accounting_dev/deploy.sh` every minute. The script
    polls the branch head (public repo, so no credentials and no inbound webhook or runner) and builds an image
    tagged with the commit SHA. The log is `deploy.log` in that directory. The order:
    1. Build and swap `accounting_admin`. It migrates the DB on start.
    2. Snapshot the DB to `data/build.db`.
    3. Build the public image. The snapshot is bind-mounted only during `npm run build`, so a missing snapshot
       fails the build and the image never contains the DB.
    4. Swap `accounting_dev`. On start it revalidates itself, which picks up edits saved during the build.
  - Either container rolls back to the previous image if it doesn't answer within 60s. Only the two newest images
    of each are kept.
  - A failed build leaves the running container in place. A failed SHA is not retried until the next push; to retry
    by hand, run `rm failed && ./deploy.sh`.
  - Path: Cloudflare DNS-only CNAME (grey cloud) → `origin.teamcredit.kr` → Caddy edge on `proxy-seoul-01` (adds
    `X-Robots-Tag: noindex`) → inner NPM proxy host 76 → `accounting_dev:3000`. The admin host takes the same path
    through NPM host 77 to `accounting_admin:3000`.
  - The content DB is `data/content.db`, mounted at `/data` in both containers. `data/` is mode 700, because the DB,
    its `build.db` snapshot and the backups also hold the login sessions and password hashes.
  - A daily copy goes to `data/backups/` and is kept 30 days (ubuntu crontab; failures go to `backup.log`).
  - To restore (rehearsed here on 2026-11-16, 5 s down):
    1. Stop both containers, because the web one holds the file open too.
    2. Copy a backup over `content.db` and delete `content.db-wal` and `content.db-shm`. The files belong to root
       (the containers write them), and the ubuntu user has no sudo, so do it inside a throwaway container:
       `docker run --rm -v "$PWD/data:/data" --entrypoint sh accounting_admin:$DEPLOY_SHA -c 'cp /data/backups/<file> /data/content.db && rm -f /data/content.db-wal /data/content.db-shm'`.
    3. Start the admin, then the web container. The web container redraws itself on start.
  - The dev images carry no keep label yet, so their rollback images still go after two weeks.
  - The admin's settings are in `admin.env` (mode 600). `admin.env.example` lists them: `BETTER_AUTH_SECRET`, and
    the same `REVALIDATE_SECRET` as `.env`.
  - Accounts are managed with
    `printf '%s' "$PW" | docker exec -i accounting_admin node admin/scripts/user.mjs add <username>`.
  - The server `.env` (mode 600) sets `CONTACT_ALLOWED_ORIGINS` and `ENABLE_PREVIEW_PAGE=true`.
  - It also holds the SES key of the IAM user `meridian-homepage-contact-dev`. That key may only call `ses:SendEmail`
    as `no-reply@meridianco.kr`.
  - `CONTACT_TO_EMAIL` there is the SES mailbox simulator, so dev sends reach no real inbox. There are no Upstash keys.
- The earlier Cloudflare Workers preview (OpenNext) was removed on 2026-09-30. Workers Free intermittently hit the
  10 ms CPU limit (error 1102), which ruled it out for production.
