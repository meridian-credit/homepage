# Planning brief: database, backend, and admin page for the MERIDIAN homepage

You are one of two independent planners. Produce your own plan from first principles. Do not edit, commit,
push, deploy, or install anything. This is read-only research plus a written plan.

## Target

Repository: `/Users/macstudio/orca/workspaces/accounting-homepage/backend-database` (git branch
`ihseo/backend-database`, identical to `origin/dev` at commit `37fc011`). Remote: public GitHub repo
`meridian-credit/homepage`.

The owner's request, in their words (Korean, translated):
> "Assume there is no backend and we are rewriting it completely from scratch. Carefully review which
> database would be good to use, and how the backend should be structured so that content can be edited
> easily, simply and intuitively from an admin page. Create a solid plan for building an admin page and a
> comprehensive backend in this repo."

Design from scratch. Treat the current code as the thing to migrate from, not as a constraint on the
design. Where the current approach is actually better for some content, say so.

## What the site is (read these; don't rely on this summary alone)

- `AGENTS.md`: the project guide. Read all of it first. `README.md`: env vars.
- Marketing site for a small boutique tax/accounting advisory firm in Seoul. All user-facing copy is Korean.
  Next.js 16 App Router, React 19, Tailwind v4, TypeScript.
- This Next.js version has breaking changes relative to older versions (caching, revalidation, route
  conventions). Before relying on any Next API in your plan (caching, `revalidate*`, `"use cache"`, route
  handlers, server actions, middleware/proxy, auth patterns), read the relevant guide in
  `node_modules/next/dist/docs/`. Cite the doc you relied on.
- All content currently lives in code:
  - `src/lib/data.ts`: services, members, personas.
  - `src/lib/constants.ts`: siteConfig, navMenu, serviceGroups, sitePages.
  - `src/lib/faq.ts`: FAQ.
  - `src/lib/schedule.ts`: NTS tax-calendar dates.
  - `src/lib/pricing.ts`: pricing calculator config.
  - `src/lib/contact-options.ts`: contact form options.
  - `src/lib/evidence-demo.ts`: portal demo numbers.
  - `content/posts/*.mdx` (54 posts): parsed by `src/lib/posts.ts`. Frontmatter and citation rules are in
    `docs/content-system.md`, and `scripts/content-audit.mjs` enforces them in CI.
- Server code today:
  - `src/app/api/contact/route.ts`: sends mail via Resend. Upstash rate limit, with an in-memory fallback.
  - `src/app/api/search/route.ts`: in-memory search index.
  - `src/app/llms.txt`, `sitemap.ts`, `robots.ts`.
- `next.config.ts` holds a strict CSP, security headers, redirects, and the `/contract` rewrite to a separate
  app.
- Out of scope (separate apps, not in this repo):
  - The freelancer contract app, proxied at `/contract`.
  - The client dashboard at `hometax-dashboard.vercel.app`. `/portal` in this repo is only a marketing page
    for it.
- Hosting today:
  - Production is `www.meridianco.kr` on Vercel. The owner plans to leave Vercel; DNS is at Gabia.
  - Dev is https://accounting.teamcredit.kr, a docker container on a self-hosted Linux server
    (`proxmox-ubuntu`). It deploys from the `dev` branch via a per-minute pull-based cron. There is no
    inbound webhook or runner, because the repo is public.
  - A Cloudflare Workers deployment was tried and rejected: the 10 ms CPU limit (error 1102).
- Earlier decision to weigh:
  - `docs/plans/ui-ux-remediation/backend-backlog.md` lists open backend defects (BE-01…BE-08).
  - Its "하지 않기로 한 것" section explicitly rejected a DB, CRM, queue, and headless CMS, each with a reason
    (e.g. storing inquiries creates retention/destruction duties under Korean privacy law).
  - The owner is now explicitly asking for a DB-backed backend and an admin page. Address those reasons
    head-on where they still apply. Don't ignore them, and don't treat them as vetoes.
- Owner preferences:
  - "Proper fix with the least technical debt."
  - Also: "Astra sometimes tend to OVERengineer, but that's not what we desire either."
  - This is a small firm, probably 1–3 non-developer editors (state your assumption). Every moving part is
    something they must run, pay for, back up, and secure.

## What the plan must answer

1. **Database choice.**
   - Compare realistic options, e.g. PostgreSQL (self-hosted on the existing server vs managed such as Neon
     or Supabase), SQLite/libSQL (file or Turso), and a *no-database* git-based CMS (content stays as
     files/MDX in the repo and an admin UI commits changes, e.g. Keystatic, TinaCMS, Decap).
   - Judge each against this site's actual constraints: hosting now and after leaving Vercel, public repo,
     tiny team, SEO/static performance, backups, cost, lock-in, and ops burden.
   - Recommend one, and state what would change your mind.
2. **Backend structure.**
   - Data model/schema for every content type.
   - Data-access layer, ORM or query builder, and why.
   - Server actions vs route handlers.
   - Validation shared between the admin and the public site.
   - How public pages stay fast and prerendered/cached while content becomes editable (revalidation strategy
     in *this* Next version).
   - Search index, sitemap and llms.txt regeneration.
   - Media/image uploads and storage.
   - Drafts, preview, publish, version history/undo.
   - Audit log.
   - Whether contact inquiries should be stored at all, given the privacy reasons above.
   - Migrations, seeding/import of the existing TS/MDX content, and what happens to `content-audit.mjs` rules
     (e.g. `sourceLinks` required for posts citing rates or deadlines).
3. **Admin page UX for non-developers**, in Korean.
   - Information architecture and screens per content type.
   - Blog post editing: MDX vs rich text vs structured blocks, citations/sourceLinks, images.
   - Preview-before-publish that shows the real site design.
   - Validation messages, guarding against breaking the live site, and roles/permissions if any.
   - What an editor's typical tasks look like, step by step (e.g. "add a new FAQ", "publish a blog post", "update
     next quarter's tax schedule").
4. **Auth and security.**
   - Admin authentication (library or approach), sessions, CSRF, and rate limiting.
   - Keeping the admin off the public CSP/SEO surface.
   - Secrets and least privilege.
   - Flag auth and migration decisions clearly as items needing owner/main-thread judgment. Don't settle them
     silently.
5. **Hosting and ops.**
   - Where the DB and uploads live today (Vercel prod + self-hosted dev) and after leaving Vercel.
   - Backups/restore, env vars, and local development.
   - CI changes: CI runs on PRs and `main`; e2e uses Playwright; see `.github/workflows/ci.yml`.
6. **Phased implementation plan.**
   - Milestones in order, each with scope, the files/areas touched, acceptance criteria, rough effort, and a
     rollback path.
   - The first phase should deliver value on its own.
7. **Risks, regressions, and side effects** on features this work doesn't intend to touch:
   - Static prerendering of `/contact` and `/blog` (tests guard these).
   - CSP, URLs/SEO and redirects, the font subsetting build step, blog rendering and related-post logic.
   - e2e tests, performance budgets in `docs/plans/production-fixes/baseline.json`, and the dev deploy.
8. **Over-engineering check.**
   - Explicitly list what you considered and chose NOT to build, and why.
   - Flag any part of your own plan that a skeptic would call over-engineered.
9. **Open decisions for the owner**, each with your recommended default.

## Output

A single structured Markdown plan, as long as it needs to be but no padding (roughly 2,500–4,000 words).
Cite repo files as `path:line` where a claim depends on current code, and cite the Next docs you relied on.
Mark anything you are unsure of as UNVERIFIED rather than asserting it.
