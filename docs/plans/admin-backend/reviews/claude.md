<!-- Claude Opus 5.5, xhigh effort (dual-planner), 2026-09-30. 같은 brief(../brief.md)로 따로 세운 계획. 원문 그대로. -->

# MERIDIAN homepage: database, backend and admin plan (Claude planner)

## APPROACH (summary)

1. **Database: one SQLite file** (better-sqlite3) on the same host as the app, accessed through Drizzle ORM. There is no DB server. The admin is a small custom Korean UI at `/admin` inside this Next app, not a CMS framework.
2. **Only content that non-developers actually change moves to the DB:** blog posts, tax schedule, FAQ and members. Taxonomy, navigation, services and personas copy, pricing tables, `siteConfig` and the evidence demo stay in code (§2.1).
3. **Public pages stay statically prerendered.** The build reads the DB, and every publish calls `revalidatePath('/', 'layout')`. This keeps the current caching model, so there is no Cache Components migration. better-sqlite3 is synchronous, so `getAllPosts()` and `getPostBySlug()` keep their signatures (`src/lib/posts.ts:320,348`) and most pages change only an import.
4. **Posts are stored as GFM Markdown and rendered with `format: 'md'`.** All 54 posts contain zero JSX, zero `{…}` expressions and zero raw HTML; 49 of them contain GFM tables. This closes the "executable MDX vs Markdown" trust-boundary question raised in `docs/reviews/2026-09-11/production-readiness.md:182`.
5. **Login uses Better Auth:** email + password with mandatory TOTP, sessions stored in the DB, no public sign-up, and two roles. All mutations are server actions. Route handlers are used only for auth, image upload and serving uploads.
6. **Ops:** a nightly online `.backup` of the DB plus the uploads folder goes to S3 in Seoul. Each deploy builds against a DB snapshot and applies additive-only migrations before the container swap.
7. **Order of work:** DB code cannot reach `main` while production is on Vercel, because Vercel has no persistent disk. The order is: finish the Vercel exit (BE-08), then M1 (schedule + FAQ), M2 (posts), M3 (media + members).

**Assumptions**
- There are 1–3 editors: the founder CPA, who publishes, and at most one or two staff who draft.
- Expected edit rates: a few posts a month, the schedule once a quarter, FAQ and members rarely.
- Production becomes one self-hosted `next start` container. The owner said "Vercel 은 안 쓸거고" (memory, 2026-09-28), and AGENTS.md:197 says the owner plans to leave Vercel.

---

## 1. Database choice

| Option | Works on Vercel prod today | Works on one self-hosted server | Build and CI access | Backups | Cost and lock-in | Ops burden |
|---|---|---|---|---|---|---|
| **SQLite file (better-sqlite3)** | No (no persistent disk) | Best fit | Snapshot file for the build; seed file in CI | Online `.backup` + copy | Free; no lock-in (a SQL file) | Lowest. No port, no service, nothing to upgrade |
| libSQL / Turso | Yes | Yes | Over the network; CI needs a token or file mode | Provider point-in-time restore (plan-dependent, UNVERIFIED) | Free tier or paid; vendor lock-in | Low |
| Postgres, self-hosted container | Only if exposed publicly | Yes | Build must reach the container's network | `pg_dump` cron | Free | Medium: another service, major-version upgrades, credentials, network |
| Postgres, managed (Neon / Supabase) | Yes | Yes | Network; CI needs a service container or a DB branch | Provider point-in-time restore (plan-dependent) | Roughly $0–25/month; Supabase has a Seoul region, Neon probably not (UNVERIFIED) | Low–medium |
| Git-based CMS (Keystatic / Decap / Tina) | Yes | Yes | Unchanged (files) | git | Free (Tina Cloud is SaaS) | Low infra, but see below |
| Payload CMS 3 + SQLite adapter | No | Yes | Same as SQLite | Same as SQLite | Framework lock-in; its Next peer range vs 16.3.4 UNVERIFIED | Low code, heavy dependencies |

**Why SQLite.**
- **Size:** the whole dataset is about 60 posts plus a few dozen rows.
- **Hosting:** there is one Node process on one host, and SQLite is the only option that adds no service.
- **Rendering:** synchronous reads fit Next's static prerender. The Next docs list `better-sqlite3` as a "predictable" source (`01-app/01-getting-started/08-caching.md:410`).
- **Bundling:** Next already treats it as an external server package (`node_modules/next/dist/lib/server-external-packages.jsonc:33`).
- **Backup:** backup is copying one file.

**Why not a git-based CMS**, even though it keeps `content-audit`, font subsetting and git history for free:
- **Slow publishing:** a publish becomes commit, then CI (four browser projects), then deploy, so 10–20 minutes for a typo fix.
- **Public drafts:** the repo is public, so drafts and unpublished tax claims become public git history.
- **GitHub write access for non-developers:** editors would need GitHub accounts with write access to a repo that deploys production code.
- **No real-site preview:** self-hosting has no per-branch preview deploys.
- **English UI:** Keystatic's UI is English (UNVERIFIED).

**Why not Payload:** it would remove maybe a third of the custom code, but it locks upgrades to Payload's Next version range on a Next build the repo itself calls "NOT the Next.js you know". Its default Lexical rich-text format also puts the 49 table-heavy posts at risk.

**What would change my mind:**
- Production must stay serverless or run more than one instance: use managed Postgres (Supabase, Seoul region) or Turso.
- Only the founder ever edits, less than monthly, and is comfortable with GitHub: use Keystatic, or keep the status quo plus a schedule-only form.
- Scope grows to many content types, locales and workflows: use Payload.

**Where the current approach is still better:**
- Navigation, taxonomy (`serviceGroups`, which throws on a bad slug at import, `src/lib/constants.ts:39-45`), `insightCategories` (`?cat=` URLs), `sitePages`, pricing tables (coupled to calculator logic, `src/lib/pricing.ts:486`), the evidence demo (HTML strings) and contact options.
- These are coupled to URLs, SEO and logic, change rarely, and benefit from code review and type checks.
- Services and personas copy also stays in code for now. It is 첨삭-reviewed copy, and service titles feed the client-side `navMenu` (`constants.ts:155-161`), so moving it means refactoring props across the header and nav. Revisit when there is real demand (M4).

---

## 2. Backend structure

### 2.1 What moves

| Content | Current source | Consumers | Moves? |
|---|---|---|---|
| Posts | `content/posts/*.mdx`, `src/lib/posts.ts` | blog pages, `layout.tsx:134` (`emptyInsightLinks`), home, `services/[slug]:52`, search, sitemap, llms | M2 |
| Tax schedule | `src/lib/schedule.ts:9-17` | `schedule-cube.tsx:21` (client, imported directly), `portal/page.tsx:12` | M1 |
| FAQ | `src/lib/faq.ts:11` | `contact/page.tsx:7,30,161`, `faq/page.tsx:18,41,103` | M1 |
| Members | `data.ts:492` | `about/page.tsx:4`, `members/page.tsx:4` | M3 |
| Everything else | code | many | No |

The only new prop threading needed: `layout.tsx` reads the schedule and passes it through `<Header>` to `ScheduleCube`, which currently imports it (`schedule-cube.tsx:21,30`).

### 2.2 Schema (Drizzle, SQLite, migrations committed under `drizzle/`)

- **`posts`**
  - Typed columns form the editor's working copy: `slug` (unique, locked after first publish), `title`, `description`, `category` (an enum built from the category values that `insightCategories` matches), `author`, `body_md`, `date`, `updated_label`, `last_checked`, `effective_from`, `cover_image`.
  - JSON arrays: `keywords`, `related_slugs`, `services` (validated against `serviceGroups` slugs in code), `source_links` (`{label,url,kind,note}`).
  - `cites_rules` is a boolean: "this post states rates, deadlines, thresholds or law changes".
  - `status` is `draft`, `published` or `archived`.
  - `published_snapshot` (JSON) holds exactly what the public site renders.
  - `version` supports optimistic locking. The row also has `created_at`, `updated_at` and `published_at`.
  - **Invariant: public code reads only `published_snapshot` where `status='published'`.**
    - Editing touches only the columns.
    - Publish = strict validation, then write the snapshot.
    - "Discard changes" = reload the columns from the snapshot.
- **`faq_items`**: `id`, `question`, `answer`, `position`, `updated_at`.
- **`schedule_items`**: `id`, `what`, `due_date` (`YYYY-MM-DD`, Seoul), `period`. A `settings` table (key/value) holds `schedule_reviewed_at`.
- **`members`**: scalar fields, JSON arrays for `credentials`, `practice_areas` and `experience`, plus `position` and `placeholder`.
- **`media`**: `file_name` (sha256 + `.webp`), `width`, `height`, `bytes`, `alt`, `created_by`, `created_at`.
- **`audit_events`**, append-only: `at`, `actor_id`, `actor_label`, `action`, `entity_type`, `entity_id`, `snapshot` (JSON, nullable), `summary` (Korean). This one table serves as the audit log, the version history and the undo source (§2.9).
- **Better Auth tables** (`user` + `role`, `session`, `account`, `verification`, `two_factor`), generated into the same Drizzle schema so there is one migration system.

JSON columns are used only for small nested arrays that are never queried relationally (related posts and service filters run in memory over about 60 rows, as today, `posts.ts:389`).

### 2.3 Data-access layer

- `src/server/db/client.ts` (`import 'server-only'`):
  - Opens one better-sqlite3 connection with WAL, `foreign_keys=ON` and `busy_timeout`.
  - **Throws when `DATABASE_PATH` is missing or empty during a production build**, so a build can never silently prerender an empty site.
- `src/server/content/read.ts`: synchronous getters `getAllPosts`, `getPostBySlug`, `getFaq`, `getSchedule`, `getMembers`.
  - Each is wrapped in React `cache()` for de-duplication within one render (`caching-without-cache-components.md:264-288`).
  - Each parses rows with the shared Zod schema and returns the existing types (`PostMeta` etc.).
- `src/lib/posts.ts` keeps its pure functions (`getRelatedPosts`, `comparePostDates`); the `fs` reading goes away.
- `src/lib/schedule.ts` keeps `daysLeft`, `dday` and `ntsMonthUrl`; only the array goes.
- `src/server/content/write.ts`: one function per mutation with the fixed sequence **auth check → Zod parse → transaction → audit row → `revalidateSite()`**. This follows the Data Access Layer pattern in `01-app/02-guides/data-security.md:399`.
- **Drizzle over the alternatives:** its migrations are schema-as-code SQL that can be reviewed in a PR, and Better Auth has an adapter for it. Prisma is heavier and needs a codegen step. A skeptic's "raw SQL + Zod" is a legitimate lighter alternative (§8).

### 2.4 Server actions vs route handlers

- **Server actions** handle every admin mutation: save, publish, archive, reorder, schedule save, restore, user management, login.
  - They get Next's Origin-vs-Host CSRF check, progressive enhancement, and `useActionState` for Korean field errors (`01-app/02-guides/server-actions.md:80-91`).
  - Every action re-authenticates; rendering a form only to logged-in users is not a security boundary (same doc).
- **Route handlers:**
  - `/api/auth/[...all]` (Better Auth's contract).
  - `POST /api/admin/upload`: binary data over the 1 MB server-action limit (`server-actions.md:83`). It gets its own Origin check, reusing `isAllowedBrowserRequest`, `api/contact/route.ts:129`.
  - `GET /uploads/[file]`: serves uploaded images.
- No public content API; nothing would consume it.

### 2.5 Shared validation

`src/lib/content/schemas.ts` (Zod, messages in Korean) has no server imports. It is used by the admin forms, the server actions (authoritative), the public read path, the import script and the audit script.

Each content type gets two levels of schema:
- **Draft:** lenient, only slug + title required.
- **Publish:** strict, the rules from `content-audit.mjs`, see §2.12.

### 2.6 Rendering and revalidation (Next 16.3.4, no `cacheComponents`)

- **Pages stay static.** With no request-time APIs, pages that read the DB are prerendered at build (`caching-without-cache-components.md:96-104`).
  - `generateStaticParams` still lists published slugs.
  - Posts published later render on first visit and are then cached, because `dynamicParams` defaults to true.
- **`revalidateSite()`** calls `revalidatePath('/', 'layout')`, which is the documented "revalidate all data" (`01-app/03-api-reference/04-functions/revalidatePath.md:167-176`).
  - It also calls explicit `revalidatePath('/api/search' | '/llms.txt' | '/sitemap.xml')`, since the doc says route handlers can be targeted (`revalidatePath.md:39-43`).
  - Invalidating the whole site is right because `layout.tsx:164` already reads posts and will read the schedule, so every page depends on content.
  - A single instance needs no cache handler (`01-app/02-guides/how-revalidation-works.md:68-70`; `01-app/02-guides/self-hosting.md:89-91`).
- **Not used:**
  - Cache Components / `'use cache'` / `cacheTag`: migrating the rendering model is its own project, and whole-site revalidation is enough at this size.
  - `unstable_cache`: deprecated in favour of `use cache` (`01-app/03-api-reference/04-functions/unstable_cache.md:6-8`).
- **Never add a time-based `revalidate`** to `/contact` or `/blog`: `contact-rendering.spec.ts:7` asserts `initialRevalidateSeconds === false`.
- **Never call `cookies()` or `draftMode()` on public pages.** In this model that makes them dynamic, which is why preview is a separate route (§2.9).

### 2.7 Search index, sitemap, llms.txt and fonts

- **`/api/search`:**
  - Delete the module-level `let cache` (`api/search/route.ts:22`); it would serve a stale index forever after an edit.
  - Make it `export const dynamic = 'force-static'` (`01-app/01-getting-started/15-route-handlers.md:51`), which also closes BE-03.
- **`sitemap.ts` and `llms.txt`** read from the DB unchanged and are revalidated by path.
- **Font subsetting:** `scripts/fonts/subset.mjs:95` reads `content/`.
  - Add a DB text source (published title, description, body, FAQ, schedule, members) through a plain `SELECT` when `DATABASE_PATH` is set.
  - **Glyph drift:** text published between builds falls back to the original font chunks. Rendering stays correct, but that page can cost up to roughly 400 KiB more font (`baseline.json`: post font dropped from 775 to 376 KiB after subsetting).
  - Mitigation (recommended, §5): after a burst of publishing, the deploy cron rebuilds.

### 2.8 Media

- Stored under `UPLOADS_DIR` on a host volume, never in `public/`: the image is rebuilt on every deploy, and Next's `public/` caching is `max-age=0` (`public-folder.md`).
- **Upload:**
  - Session and Origin check, 10 MB cap.
  - sharp decodes the file (anything that isn't an image is rejected; SVG is rejected), limits it to 2000 px, and re-encodes to WebP, which drops EXIF/GPS.
  - The file name is the sha256 of the content, so files are immutable.
- **Serving:** only names matching `^[a-f0-9]{64}\.webp$`, with `Cache-Control: public, max-age=31536000, immutable`. This matches the `public/media` immutability rule in AGENTS.md.
- `img-src 'self'` already covers `/uploads`, so the CSP does not change.
- Evidence for the priority: only 3 of 54 posts have a cover image and none has an inline image, so media comes in M3.

### 2.9 Drafts, preview, publish, history

- **Drafts exist only for posts.** FAQ, schedule and members are small lists: save = publish, with a confirm dialog that shows the diff, and undo through history.
- **Preview** is at `/admin/preview/posts/[id]`:
  - The page lives in the `(site)` route group, so it has the real header, fonts and CSS.
  - It is dynamic, auth-gated and noindex, and renders the extracted `<PostArticle>` component (from `blog/[slug]/page.tsx:206-446`) with the working copy and a banner "미리보기 — 아직 공개되지 않았습니다".
  - It opens in a **new tab**, because `frame-ancestors 'none'` and `X-Frame-Options: DENY` (`next.config.ts:16,98`) block iframes, even same-origin.
  - Draft Mode (`01-app/02-guides/draft-mode.md`) was considered. It would make every public getter draft-aware. It becomes worthwhile only if drafts spread to more content types.
- **History:** every save or publish writes an `audit_events` row with a full snapshot. "되돌리기" writes that snapshot back as a new change, so history is never rewritten.
- **Delete:** posts are archived (unpublished), never deleted. Only a draft that was never published can be deleted, by the owner.

### 2.10 Audit log

- The same table records logins, failed logins against existing accounts, publish, archive, restore and user changes.
- **No IP addresses are stored.** Rate-limit counters stay in memory, which avoids a new retention duty.
- Content snapshots are kept forever (small). Auth events are pruned after a year by the nightly job.

### 2.11 Contact inquiries: do not store them (default)

- The backlog's reason (`backend-backlog.md:132`) still holds. A table of inquiries brings duties to state a purpose, set retention, destroy, and control access. Backups resurrect destroyed rows. `faq.ts:42` promises "계약으로 이어지지 않으면 보관하지 않고 파기합니다", and BE-07 is still undecided.
- A database existing lowers the *technical* cost of storing inquiries, not the legal one.
- Fixing BE-01 is what prevents lost inquiries.
- If the owner still wants an inbox in the admin, the preconditions are: BE-07 wording is final, rows are deleted automatically after N days, the backup retention window is no longer than N, and only the owner role can see them.

### 2.12 Migrations, import and `content-audit`

**FLAG (main thread): migration strategy.**
- Migrations are only additive ("expand"); dropping or renaming comes one release later ("contract").
- They run in `deploy.sh` against the build snapshot before `next build`, then against the live DB just before the container swap. The snapshot doubles as the pre-migration backup.
- **Rollback** = previous image + restore the snapshot. Edits made in between are lost, which is rare and acceptable.

**Import (one-off cutover), `scripts/db/import-content.ts`:**
- Parses the MDX with gray-matter and validates each post with the publish schema.
- Materializes the default keywords for the 2 posts that rely on them (`posts.ts:307`), so the admin shows what the site shows.
- All 54 posts already have `sourceLinks`, so the defaults at `posts.ts:47-159` are dead code: delete them.
- `seriesLabel`/`seriesNumber` (3 posts) are never rendered; drop them unless the owner objects.
- The script refuses to run against a non-empty DB.

**Parity gate:** build before and after the switch and diff the HTML of every `/blog/*`, `/faq`, `/contact`, `/about` and `/members`. The switch ships only with zero unexplained differences.

**Exit ramp:** `scripts/db/export-mdx.ts` writes posts back into the exact old frontmatter format. CI checks the round trip (import → export → semantic equality). It is the M2 rollback path and the proof that there is no lock-in.

**`content-audit.mjs` rules:**

| Rule | Where it lives now |
|---|---|
| Required title/description/date/category, valid dates, no future `date` (`:38-48`) | Publish-schema **errors** |
| `updatedAt`/`lastChecked` format (`:50-56`) | Publish-schema errors |
| `lastChecked` missing | **Error** when `cites_rules`, otherwise a warning |
| `lastChecked` older than 120 days (`:58-60`) | Dashboard list "검토가 오래된 글"; warning at publish |
| `sourceLinks` missing (currently only a warning, `:66-67`) | **Error when `cites_rules`**, which defaults to true for tax categories. Each link needs a label and an http(s) URL. Warning if the first link is not law or guidance ("primary authority first", `docs/content-system.md:59-60`) |
| Schedule runway under 30 days (`:91-105`) | Dashboard banner. The optional weekly email (§5) replaces `schedule-check.yml` |

- `npm run audit:content` becomes a DB audit. It runs in CI against the seed and in `deploy.sh` against the snapshot, and only warns there.
- **Seed:** `db/seed/*.json` is the frozen import output, clearly labelled as a test fixture and not the production source. It keeps the e2e tests that need ≥12 posts (`blog-rendering.spec.ts:20`) and at least 3 pages (`flows.spec.ts:113`) working.
- Delete `content/posts/` in the same PR as the switch, so there are never two sources of truth.

---

## 3. Admin UX (Korean, for non-developers)

### Information architecture

| Screen | Contents |
|---|---|
| `/admin` 대시보드 | 할 일: 세무 일정 잔여 N일 (red under 30), 검토 120일 지난 글, 발행 대기 초안, 마지막 백업 시각. 최근 변경 10건 |
| `/admin/posts` | Filters: 상태 / 갈래 / 검색. [새 글]. Badges: "변경사항 있음", "검토 필요" |
| `/admin/posts/[id]` | Left: body editor. Right panel: 제목, 주소, 갈래 (select), 요약 (80–160자 안내), 발행일, 검토 기준일, 적용 시점, 키워드, 관련 글 (picker over published posts), 연결 서비스 (업무경험 only), 근거 자료 list, 표지. Footer: [초안 저장] [미리보기] [발행] [기록] |
| `/admin/schedule` | Editable table (항목 · 날짜 · 귀속). Link to the NTS page for next month. "국세청 게시 확인일" |
| `/admin/faq` | List with ↑/↓ reordering and inline edit |
| `/admin/members` (M3) | Member cards with photo upload |
| `/admin/media` (M3) | Thumbnails, where each is used; delete only when unused |
| `/admin/history` | Who, when, what; [되돌리기] |
| `/admin/account`, `/admin/users` (owner only) | Password, TOTP, create or disable users |

### Post editing

- **The body is Markdown:** a textarea with a toolbar (굵게, 제목, 목록, 링크, 표, 이미지) and a paste helper that turns an Excel/TSV table into a GFM table. The CPA will often paste AI-drafted Markdown, which works as-is.
- **WYSIWYG was rejected** because of table round-trip fidelity (49 of 54 posts have tables) and lock-in to an editor's JSON format. Revisit if editors struggle after trying it.
- **Rendering:**
  - Keep `next-mdx-remote` and add `mdxOptions.format: 'md'`; its compile options pass through (`node_modules/next-mdx-remote/dist/types.d.ts:17`), and `blockJS` already defaults to true (`:26`).
  - Because the pipeline and components (`mdx-content.tsx:17-52`) stay the same, the output is visually unchanged. The parity diff confirms it.

### Guards against breaking the live site

- Korean messages on each field.
- Before publish, a checklist separates blocking **오류** from **경고** that must be acknowledged.
- Publish renders the Markdown on the server first and refuses if it throws.
- Slugs must match `^[a-z0-9]+(-[a-z0-9]+)*$` (the same pattern as `posts.ts:12`), be unique, and are locked after first publish.
- Categories and service links are dropdowns, never free text; a typo would silently hide a post from `?cat=` filters.
- Optimistic lock: "다른 사람이 먼저 저장했습니다 — 새로 불러오기".
- A warning before leaving the page with unsaved changes.
- The dev server shows a red banner "개발 서버 — 여기서 고친 내용은 운영에 반영되지 않습니다".

### Roles

- `owner`: publishes, archives, restores and manages users.
- `editor`: drafts and previews only.
- The reason is professional liability: tax statements go live only through the CPA.

### Typical tasks

1. **Next quarter's tax schedule**
   - The dashboard banner reads "세무 일정이 12일 남았습니다" → [일정 채우기].
   - [국세청 월별 일정 열기] opens the NTS page.
   - [행 추가] for each deadline:
     - 항목 is autocompleted from past values.
     - 날짜 uses a date picker.
     - 귀속 is suggested, e.g. "2027년 1월분".
   - Tick 게시 확인일 = today.
   - [저장] → a confirm dialog ("추가 3건 · 지난 일정 2건은 화면에서 자동으로 빠집니다") → "사이트에 반영했습니다 [홈에서 보기]".
   - Errors: a duplicate date + item. Warnings: a date in the past, or more than 12 months ahead.
2. **Add a FAQ**
   - [문답 추가] → 질문 / 답 (guidance: two or three sentences) → move it with ↑/↓ → [저장].
   - It appears on `/faq` and `/contact`, including their FAQPage JSON-LD.
3. **Publish a post**
   - [새 글] → 제목, 주소, 갈래.
   - Paste the body; use the table helper where needed.
   - Keep "세율·기한·기준금액·법 개정을 다룹니다" ticked and add at least one 근거 자료, law first.
   - 발행일 and 검토 기준일 default to today.
   - [초안 저장] → [미리보기] opens a new tab.
   - An editor stops here; the draft appears in the owner's "발행 대기".
   - The owner presses [발행] → the checklist → [공개 페이지 보기].

---

## 4. Auth and security

**FLAG (owner / main thread): the auth approach.**

| Option | For | Against |
|---|---|---|
| **Better Auth**, email+password + mandatory TOTP (**default**) | Vetted hashing, DB sessions, built-in rate limit, 2FA plugin, "fresh session" for sensitive actions, Drizzle adapter. Listed in the Next docs (`authentication.md:1630-1643`) | A dependency with its own schema; plugin details and Next 16.3 fit UNVERIFIED |
| Hand-rolled: argon2id + session table + TOTP | Fewest dependencies | Security-critical code we own; Next recommends a library (`authentication.md:25`) |
| Magic link through Resend | No passwords | Login depends on email delivery; the mailbox becomes the key |
| Cloudflare Access in front of `/admin` | No auth code in the app | Needs a proxied hostname or tunnel, against the grey-cloud setup; the app should still verify |

**Default settings**
- **Accounts:**
  - Created with `npm run admin:create-user` on the server.
  - `disableSignUp`.
  - No password reset by email in v1: the owner resets editors, and the server CLI resets the owner.
- **Sessions:**
  - Cookie is `Secure`, `HttpOnly`, `SameSite=Lax`, 7-day sliding.
  - A fresh re-login (within 10 minutes) is required for archive, delete, restore and user management.
- **Where auth is checked:** in every action and DAL function, not in layouts; layouts don't re-run on navigation (`authentication.md:1350-1356`). `proxy.ts` (the renamed middleware, `proxy.md:11`) is optional, for redirect UX only.
- **CSRF:**
  - Server actions rely on the Origin/Host check.
  - The upload handler checks Origin itself.
  - Verify behind Caddy → NPM that Host / X-Forwarded-Host arrive correctly, otherwise actions fail. `serverActions.allowedOrigins` is the fallback (`data-security.md:544-552`).
- **Rate limit:** in memory on the single instance: per account and per IP, 5 failures in 15 minutes.

**Admin kept off the public surface**
- `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin/:path*` and `/uploads` is not indexed-sensitive (next.config headers, like `/api` at `next.config.ts:122-127`).
- `robots: { index: false }` in the admin metadata; `robots.ts:9` also disallows `/admin`.
- Kept out of `sitePages`, the sitemap, search and llms.
- Admin pages read cookies, so they are dynamic and get `private, no-store` automatically (`self-hosting.md:99`).
- **The same strict CSP applies:** editor dependencies must not need `eval` or third-party origins, and preview opens in a tab, not an iframe.

**Secrets and least privilege**
- The container gets `DATABASE_PATH`, `UPLOADS_DIR` and `BETTER_AUTH_SECRET`.
- The container runs as non-root; the DB file is mode 600, on a volume mounted only into the app container.
- S3 credentials live only in the host backup job, with a put-only IAM policy on one prefix; lifecycle rules delete old copies, so the key cannot delete backups.
- Committed: no DB files, `.data/` in `.gitignore`, and CI test-admin credentials exist only in the throwaway CI DB.

---

## 5. Hosting and ops

- **Now:**
  - Dev (proxmox-ubuntu): `/opt/stacks/accounting_dev/data/{site.db,uploads/}` mounted at `/data`, seeded from the import.
  - Prod (Vercel): **no admin**; content stays as files until the exit.
  - If the owner insists on the admin before leaving Vercel, the only options are Turso + S3, an interim architecture that gets thrown away later (§9).
- **After the exit:** the same layout on the production host. Editing happens **only in production**; dev content diverges on purpose.
- **Deploy changes** (server `deploy.sh` and Dockerfile, not in the repo; consider committing them under `deploy/`):
  1. Take an online `.backup` snapshot into a separate directory.
  2. `docker build --build-context dbsnap=<dir>`, with `RUN --mount=type=bind,from=dbsnap,…` so the snapshot never lands in an image layer. Migrate the snapshot, then `npm run build` with `DATABASE_PATH` pointing at it.
  3. Migrate the live DB, which is additive only.
  4. Swap the container, with the existing 60-second health check and rollback.
  - Keep `.next/cache` writable for incremental static regeneration.
  - **Recommended:** the app touches `/data/content-changed` on publish, and the cron rebuilds when it is newer than the last build and older than 10 minutes. This fixes the glyph drift and the edit-during-build race, using the existing pull model.
- **Backups:**
  - Nightly `docker exec … node scripts/db/backup.mjs` (better-sqlite3 online backup) plus a tar of the uploads → S3 `ap-northeast-2` with versioning and SSE. Keep 14 local copies and 90 days in S3.
  - On success, write `/data/last-backup-ok`; the dashboard shows it.
  - A written restore drill, run quarterly.
  - Litestream is the upgrade path if losing up to 24 hours of edits becomes unacceptable.
- **Optional weekly schedule email:** a host cron runs `node scripts/schedule-reminder.mjs` through Resend. It replaces `schedule-check.yml`, which can't see the DB and is inactive anyway. The recipient is already an open owner decision.
- **Local development:** `npm run db:setup` (migrate + seed into `.data/dev.db`), then `npm run admin:create-user`. The subset script uses the DB when one is present.
- **CI (`.github/workflows/ci.yml`):**
  - Add `better-sqlite3` to `npm rebuild` (`:60-61`, installs run with `--ignore-scripts`).
  - Run `db:seed:ci` (seed + test admin with a known TOTP secret) before audit and build.
  - Set `DATABASE_PATH` for the build and for Playwright's `next start`.
  - New admin e2e specs.
  - Delete `schedule-check.yml`.
  - `schedule.spec.ts:2` reads the seed JSON instead of `src/lib/schedule`.
  - Expect new `npm audit` findings from the new dependencies.

---

## 6. Phased plan (STEPS)

**M0: prerequisite, outside this plan.** Merge `dev` to `main` with BE-01, then move production off Vercel following BE-08. Until M0 is done, M1+ stays on `dev` only and is not merged to `main`.

### M1: foundation, schedule and FAQ admin (7–10 dev-days)

This phase has value on its own: the owner refills the tax schedule and edits the FAQ without a developer. It also proves auth, backups, revalidation and deploys with low SEO risk.

**Scope and files**
- Dependencies: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `zod`, `better-auth`.
- New modules and data:
  - `src/server/db/{client,schema}.ts`, `drizzle/`, `src/lib/content/schemas.ts`.
  - `src/server/content/{read,write,revalidate}.ts`, `src/server/auth.ts`.
  - `scripts/db/{migrate,seed,backup,import-content,create-user}.*`, `db/seed/{faq,schedule}.json`.
- Route-group restructure:
  - `git mv` all page folders plus `template.tsx` and `error.tsx` into `src/app/(site)/`.
  - Move the chrome from `layout.tsx:161-178` into `src/components/layout/site-chrome.tsx`, used by `(site)/layout.tsx` and by root `not-found.tsx` (so the 404 keeps the header).
  - The root layout keeps `html`, fonts, `globals.css` and JSON-LD.
  - **Do not add a catch-all route:** the array form of rewrites is `afterFiles` and would be shadowed, breaking `/contract` (`05-config/01-next-config-js/rewrites.md:64-65,96`).
- `src/app/admin/**`: layout, login, dashboard, schedule, faq, history, account, users.
- Schedule and FAQ switch to the DB:
  - `schedule-cube.tsx`, `header.tsx` and `(site)/layout.tsx` receive the schedule as a prop.
  - `portal`, `contact`, `faq`: `getFaq()` / `getSchedule()`.
- Config and cleanup: `next.config.ts` headers for `/admin`; `robots.ts`; delete the `faq.ts` and `schedule.ts` data arrays.
- CI changes; update AGENTS.md "Site data is code", the README env list, and MEMORY.md, and amend the backend-backlog "하지 않기로 한 것" with this decision and its reasons.

**Acceptance criteria**
- The prerender-manifest tests pass unchanged (`contact-rendering.spec.ts:4-8`, `blog-rendering.spec.ts:7-10`).
- New e2e checks:
  - Without a session, `/admin/*` redirects to login, and an action call is rejected.
  - Editing a FAQ shows up on `/faq` and `/contact` after publish (this checks the stale-once question, §7).
  - `/admin` sends noindex and is not in the sitemap or search.
  - An editor cannot publish.
- `measure.mjs` stays within `baseline.json` p6 on all routes.
- A restore drill on dev succeeds.

**Rollback:** revert the PR, and paste the `db:export` JSON back into the TS arrays. The DB file is inert without the code.

### M2: posts (8–12 dev-days)

**Scope and files**
- Posts schema.
- Import plus the HTML parity gate, and the `export-mdx` round-trip test.
- `src/lib/posts.ts` reads from the DB; `mdx-content.tsx` gets `format: 'md'`.
- Extract `<PostArticle>` from `blog/[slug]/page.tsx`; add `/admin/preview/posts/[id]`.
- `/admin/posts` list and editor; publish checks; archive.
- Search: remove the cache and make it `force-static`.
- `subset.mjs` gets the DB text source; `content-audit.mjs` becomes the DB audit.
- Rebuild-on-publish in `deploy.sh`.
- Delete `content/posts/*.mdx`; update `docs/content-system.md`.

**Acceptance criteria**
- Zero unexplained HTML differences across all 51 published posts, `/blog`, the sitemap and llms.txt.
- Slugs identical, so no redirects are needed.
- A new post appears in `/blog`, related posts, search and the sitemap after publish.
- A draft returns 404 publicly.
- Preview requires a session.
- The font weight of a newly published post returns to its baseline after the rebuild.

**Rollback:** run `export-mdx` for all posts, then revert the PR.

### M3: media and members (3–5 dev-days)

**Scope:** the upload route, the `/uploads` route, `media` table and library, cover image and inline image insertion, the members editor (`about` and `members` pages), and uploads added to the backup.

**Acceptance criteria:** EXIF is stripped (a test with a GPS-tagged JPEG), SVG and non-images are rejected, `/uploads` is served immutable, and a member photo change shows on `/members`.

**Rollback:** `export-mdx --copy-uploads` copies referenced files to `public/images/posts` and rewrites the paths.

### M4: optional, not recommended now (5–8 dev-days)

Services and personas text fields (slugs fixed in code) and the `siteConfig` contact fields. This needs props threaded through `navMenu`, `service-picker`, `contact-inquiry` and `contact-form`. Do it only if the owner edits these more than a few times a year.

---

## CRITICAL FILES (read first)

- **Content sources:** `src/lib/posts.ts`, `src/lib/schedule.ts`, `src/lib/faq.ts`, `src/lib/data.ts:492-515`, `src/lib/constants.ts:11-45,143-206`.
- **Rendering:** `src/app/layout.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/blog/page.tsx`, `src/components/mdx/mdx-content.tsx`.
- **Consumers to change:** `src/components/layout/{header,schedule-cube}.tsx`, `src/app/{contact,faq,portal,about,members}/page.tsx`.
- **Generated outputs:** `src/app/api/search/route.ts`, `src/app/sitemap.ts`, `src/app/llms.txt/route.ts`, `src/app/robots.ts`.
- **Security reference:** `src/app/api/contact/route.ts:100-146` (origin helpers to reuse).
- **Config and build:** `next.config.ts`, `scripts/fonts/subset.mjs`, `scripts/content-audit.mjs`, `.github/workflows/{ci,schedule-check}.yml`.
- **Tests:** `tests/e2e/*.spec.ts`, `playwright.config.ts`.
- **Docs:** `AGENTS.md`, `docs/content-system.md`, `docs/plans/ui-ux-remediation/backend-backlog.md`.
- **Next docs cited:**
  - Getting started: `01-getting-started/08-caching.md`, `15-route-handlers.md`.
  - Guides: `02-guides/{caching-without-cache-components,how-revalidation-works,self-hosting,server-actions,data-security,authentication,draft-mode}.md`.
  - API reference: `03-api-reference/04-functions/{revalidatePath,revalidateTag,updateTag,unstable_cache,draft-mode}.md`, `03-file-conventions/{route-groups,proxy}.md`, `05-config/01-next-config-js/rewrites.md`.

---

## 7. Risks, regressions and side effects

1. **Prerendering of `/contact` and `/blog` now depends on the DB at build time.** A missing DB must fail the build, never produce an empty prerender. There must be no time-based `revalidate` and no `cookies()` / `draftMode()` on these pages. The existing manifest tests guard this; add `/`, `/faq` and one `/blog/[slug]`.
2. **`revalidatePath('/', 'layout')` behaviour:**
   - Whether it reaches the `(site)` group pages and the route handlers (soft-tag model, `how-revalidation-works.md:47-51`) is UNVERIFIED. Include the explicit paths and test with e2e.
   - Whether the first visitor after a publish gets the stale page once (stale-while-revalidate) is UNVERIFIED. The admin's own view refreshes (`revalidatePath.md:17-20`). If public pages are stale once, say so in the "반영했습니다" message.
3. **Route-group move:** URLs stay the same. Watch `not-found`, `error`, `template`, and the metadata files that stay at the root (icons, sitemap, robots, llms). **A catch-all route would break `/contract`.**
4. **CSP and headers:** no iframe preview, no eval-based editor, no CDN assets. Re-run e2e behind the TLS proxy (AGENTS.md:43-46).
5. **Fonts:** DB text has to feed the subset, and glyph drift between builds is a performance regression until the rebuild. The admin's Korean strings under `src/` also enter the subset scan; exclude `src/app/admin`.
6. **Blog rendering:** `format: 'md'` treats `<` and `{` as literal text. There are none today; the parity diff is the gate. The related-post logic is unchanged (pure function).
7. **e2e and CI:** tests importing TS data (`schedule.spec.ts:2`), pagination needs enough seed posts, TOTP in tests, the native module under `--ignore-scripts`, and `npm audit` failures from new dependencies.
8. **Performance budgets:** the schedule prop adds bytes to the header's server payload; admin JS loads only on `/admin`. Check with `measure.mjs` in each phase.
9. **Dev deploy:** a failed migration must leave the old container running; `flock` already prevents overlapping runs. A server-action Origin/Host mismatch through two proxies has to be verified on dev first.
10. **Operations:** a single file is a single point of failure, so the backups and the drill are not optional. There is a split-brain risk if someone edits on dev; the dev banner mitigates it.
11. **Content history leaves git.** Public history of post edits ends at cutover. Audit snapshots replace it, privately.
12. **Base image:** whether the server's base image is Alpine or glibc, and so which better-sqlite3 prebuilt binary it needs, is UNVERIFIED. Whether TS scripts run on Node 22.21.1's built-in type stripping or need `tsx` is also UNVERIFIED.

---

## 8. Over-engineering check (OUT OF SCOPE)

**Considered and not built:**
- **Rejected alternatives:** Postgres (self-hosted or managed), SaaS headless CMS, Payload, git-based CMS (reasons in §1).
- **Architecture:** Cache Components and fine-grained tags; a separate admin app, subdomain or API server; a REST or GraphQL content API.
- **Infrastructure:** Redis, queues, outbox, cron-scheduled publishing, Litestream (for now), S3 for uploads, an image CDN, a search engine.
- **Editing features:** WYSIWYG or block editor, MDX components in posts, autosave on every keystroke, real-time collaboration, redirect tables for slug changes.
- **Access:** SSO; roles beyond owner/editor.
- **Inquiries:** stored inquiries / CRM.
- **Content left in code:** services, personas, navigation, pricing, `siteConfig`, evidence demo. The contact route's Upstash question is left to BE-08.

**Parts of this plan a skeptic would call over-engineered:**

| Item | Defense | Cut it if |
|---|---|---|
| Two roles | Tax claims go live only through the CPA | There is only ever one user |
| Mandatory TOTP | An admin that publishes on a professional firm's domain is a defacement and SEO-spam target | Owner prefers passkeys or magic links |
| Route-group move | Keeps the Lenis, glass and header machinery out of form-heavy screens | — |
| Snapshots in `audit_events` | They are the undo | — |
| `export-mdx` | It is the M2 rollback and the no-lock-in guarantee | — |
| Backup indicator on the dashboard | About 10 lines; catches silent backup failure | — |
| Rebuild-on-publish | Pure performance | Measured glyph drift is small |
| Drizzle + Better Auth as dependencies | Tested migrations and hashing instead of our own | A skeptic prefers raw SQL + Zod and hand-rolled auth; both are viable at this size |

---

## 9. Open decisions for the owner (recommended default in bold)

1. DB-backed in-app admin vs git-based CMS vs status quo: **SQLite + in-app admin**.
2. Admin before or after leaving Vercel: **after**; the interim Turso + S3 option is throwaway work.
3. Production host: **same kind of host as dev (proxmox-ubuntu)**, with the `/data` volume.
4. Auth method (FLAG): **Better Auth, email+password + mandatory TOTP, CLI-created accounts, no email reset in v1**.
5. Roles: **owner / editor**.
6. Store contact inquiries: **no** (preconditions in §2.11).
7. Post editor: **Markdown + toolbar + table paste**, not WYSIWYG.
8. Content moved: **posts, schedule, FAQ, members**; services/personas/`siteConfig` only in M4, on demand.
9. Backups: **nightly to S3 Seoul, 90 days, put-only IAM, quarterly restore drill**.
10. Schedule reminder: **dashboard banner + weekly email to the owner** (the recipient is already an open decision).
11. `seriesLabel`/`seriesNumber` in 3 posts: **drop** (not rendered).
12. Migration strategy and cutover (FLAG): **additive-only migrations in `deploy.sh`, a freeze window for MDX edits, the parity gate, and `export-mdx` as rollback**.
13. Optional IP allow-list for `/admin` at the Caddy edge: **no**; revisit if the audit log shows attacks.
