# Content System

## Why this exists

The blog was missing two structural safeguards:

- no first-class source links in frontmatter
- no deterministic related-post rules

This system adds those pieces without breaking existing posts.

## Frontmatter

Use the fields below for new or updated posts.

```yaml
---
title: "제목"
description: "검색 카드와 목록 카드에 함께 쓰이는 설명"
date: "2026-04-15"
updatedAt: "2026-04-15"
lastChecked: "2026-04-15"
category: "세무일반"
published: true
author: "박민상 회계사"
effectiveFrom: "2026-01-01"
coverImage: "/images/posts/example.png"
keywords:
  - 법인세
  - 세무조정
relatedSlugs:
  - corporate-tax-filing-prep
services:            # 업무경험 posts only: service slugs whose detail page lists this post
  - tax-bookkeeping
sourceLinks:
  - label: "국세청 공식 안내"
    url: "https://www.nts.go.kr/"
    kind: "guidance"
    note: "실무 적용 기준으로 먼저 확인한 자료"
---
```

## Editorial rules

- Add at least one `sourceLinks` entry to any post that mentions rates, dates, filing deadlines, thresholds, or law changes.
- Use `lastChecked` on anything seasonal or law-change sensitive.
- Use `relatedSlugs` when there is a specific follow-up article that should outrank generic same-category posts.
- Use `keywords` for concept clusters, not for SEO stuffing.
- `services` values are service slugs from `serviceGroups` in `src/lib/constants.ts`. Guide for 업무경험 posts:
  `docs/BLOG_WORK_CASES.md`.

`npm run audit:content` (a CI gate) enforces this schema on published posts:
- Errors: missing `title` / `description` / `date` / `category`, invalid dates, and a `date` in the future.
- Warnings: missing `lastChecked`, a `lastChecked` older than 120 days, and missing `sourceLinks`.
  - Warnings do not fail CI.
  - Don't bump `lastChecked` without actually re-reviewing the post.
## Authority priority

- For rates, deadlines, filing duties, thresholds, forms, penalties, and calculation formulas, cite the closest primary authority first.
- Preferred order: current law, current enforcement decree/rule/notice, official NTS/MOEF guidance, then case law or tribunal decisions.
- Do not attach a case just because it is about the same topic. The authority must directly support the sentence immediately before it.
- Use case law only when the point is interpretive: constitutionality, procedural illegality, judicial interpretation, substance-over-form, attribution, or similar dispute-driven issues.
- If a statutory citation already fully supports the point, do not add a decorative case citation after it.

## Rendering behavior

- post detail pages now expose dates, author, sources, and article JSON-LD
- related posts are ranked by `relatedSlugs`, then category, then keyword overlap

## Retrofit order

1. reform / deadline articles
2. evergreen tax guides with heavy traffic
3. archive or redirect overlapping summary posts
