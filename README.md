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

- `RESEND_API_KEY`: server-only key used by `/api/contact`. Without it the route answers 500 and sends nothing.
- `RESEND_FROM_EMAIL`: a sender address on a domain verified in Resend. If unset, the route falls back to Resend's
  test sender, which cannot deliver to the firm's mailbox.
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
