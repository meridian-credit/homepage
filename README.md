# MERIDIAN Homepage

Marketing site for www.meridianco.kr. Project guide (architecture, conventions, deploy details): `AGENTS.md`.

## Getting Started

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

Where they are set:

- Production (`www.meridianco.kr`): the Vercel project's environment variables.
- Dev (`accounting.teamcredit.kr`): `/opt/stacks/accounting_dev/.env` on `proxmox-ubuntu`, with `env.example` beside it.

The variables:

- `CONTACT_FROM_EMAIL`: required to send. The sender address, `no-reply@meridianco.kr`; `meridianco.kr` is verified
  in Amazon SES (ap-northeast-2) on our AWS account. Without it `/api/contact` answers 500 and sends nothing, even
  when AWS credentials are present, so a developer machine with `~/.aws` never mails the firm.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: the SES key. The AWS SDK reads them itself. Use a key that may only
  send as `no-reply@meridianco.kr`. The region (ap-northeast-2) is fixed in the route.
- `CONTACT_TO_EMAIL`: optional recipient for inquiries. Defaults to `siteConfig.email`, the firm's real mailbox, so
  set it to a test inbox on any non-production host before giving that host an SES key.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: optional. Contact rate limits shared across instances. When
  unset, each instance keeps its own in-memory counters.
- `CONTACT_RATE_LIMIT_REQUIRE_SHARED`: `true` forbids the in-memory fallback. With this on, a missing or failing
  Upstash turns every inquiry into a 503, so leave it off on a single server.
- `CONTACT_ALLOWED_ORIGINS`: optional comma-separated extra origins that may POST `/api/contact` (preview or dev
  hosts). `siteConfig.url` is always allowed.
- `ENABLE_PREVIEW_PAGE`: `true` serves `/preview`. Leave it unset in production.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`: search-console ownership meta tags.
  They are baked into the HTML at build time, so a new build host needs them too.
- `VERCEL`: set by Vercel itself. Analytics and Speed Insights render only when it is `1`.
- `CONTENT_DB`: dev only. Path to the admin app's SQLite file. When set, the tax calendar and FAQ come from it
  (read-only); when unset, from `src/lib/schedule.ts` / `src/lib/faq.ts`.
- `REVALIDATE_SECRET`: dev only. Bearer secret for `POST /api/revalidate`, which the admin calls after a save. Unset
  means the route answers 404.

The admin app (`admin/`, dev only) reads its own set, from `admin.env` on the dev server (`admin.env.example` lists
them):

- `CONTENT_DB`: the same SQLite file. The admin creates and migrates it.
- `ADMIN_URL`: its public origin, `https://accounting-admin.teamcredit.kr`. Login callbacks and cookies use it.
- `BETTER_AUTH_SECRET`: signs login sessions. Changing it signs everyone out.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: a Google OAuth web client whose redirect URI is
  `<ADMIN_URL>/api/auth/callback/google`.
- `ADMIN_EMAILS`: comma-separated Google accounts that may enter. When empty, nobody may enter.
- `REVALIDATE_SECRET`, `PUBLIC_SITE_INTERNAL_URL`: how it asks the public site to redraw (`http://accounting_dev:3000`
  on the server).
- `PUBLIC_SITE_URL`, `ADMIN_ENV_BAND`: the 「사이트 보기」 link and the banner at the top.

Only `NEXT_PUBLIC_*` variables reach the browser. Do not put secrets in `NEXT_PUBLIC_*`, `public/`, or committed docs.

## Verification

Run the same checks as CI (`.github/workflows/ci.yml`):

```bash
npm audit --audit-level=moderate
npm audit signatures
npm run audit:content
npm run lint
npm run build
npm run test:e2e        # starts `next start` on :3100 itself; needs the build above
```

CI runs e2e behind a local TLS proxy so the production CSP applies. See `AGENTS.md` for how to reproduce that and
for the other QA scripts.

## Deploy

- Production runs on Vercel from `main`. Reach `main` through a PR. `.vercelignore` keeps `.env*`, docs, reports and
  local screenshots out of the upload.
- A push to `dev` deploys https://accounting.teamcredit.kr in about a minute (self-hosted, pull-based).
- Before moving production off Vercel, go through BE-08 in `docs/plans/ui-ux-remediation/backend-backlog.md`.
