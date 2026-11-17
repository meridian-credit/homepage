# Content System

## Why this exists

The blog was missing two structural safeguards:

- no first-class source links
- no deterministic related-post rules

This system adds those pieces.

## Post fields

Since 2026-11-16 posts are written in the admin (블로그 글), stored in the content DB, and published from there. The
plan, the data model and the publish flow are in `docs/plans/admin-backend/blog.md`. The old `content/posts/*.mdx`
files and their frontmatter are gone; the same fields live in the admin's 「글 정보」 panel (`PostData` in
`src/lib/content/post-data.ts`):

| Admin field | Public name (`PostMeta`) | Notes |
|---|---|---|
| 주소 | `slug` | lowercase letters, digits, `-`. Locked while the post is published |
| 제목 · 요약 | `title` · `description` | 요약 is the list card, search result and share card text (50–160 chars) |
| 갈래 | `category` | one of `POST_CATEGORIES`; each must appear in `insightCategories` (`src/lib/posts.ts` throws otherwise) |
| 발행일 · 업데이트 · 검토 기준일 · 적용 시점 | `date` · `updatedAt` · `lastChecked` · `effectiveFrom` | 발행일 defaults to the first publish day (Seoul) |
| 글쓴이 | `author` | empty means the firm's default author |
| 키워드 | `keywords` | empty means category + title words |
| 근거 자료 | `sourceLinks` | label, http(s) URL, kind, note |
| 관련 글 · 연결 서비스 | `relatedSlugs` · `services` | `services` only for 업무경험 posts |
| 표지 사진 | `coverImage` | an uploaded image, `/uploads/<hash>.webp` |
| 세율 · 기한 · 기준금액 · 법 개정을 다룹니다 | (not public) | when on, sources and 검토 기준일 are required to publish |
| 본문 | `content` | GFM Markdown, written in the Milkdown editor. Raw HTML is not rendered |

There are no default source links any more: a post shows only the sources its author entered. The 「<갈래> 기본 근거
넣기」 button inserts the category's statutes as editable rows.

## Editorial rules

- Turn on 「세율 · 기한 · 기준금액 · 법 개정을 다룹니다」 for any post that mentions rates, dates, filing deadlines,
  thresholds, or law changes. It then needs at least one source and a 검토 기준일 to publish.
- Use 검토 기준일 on anything seasonal or law-change sensitive. Don't press 「오늘 검토함」 without actually re-reviewing
  the post.
- Use 관련 글 when there is a specific follow-up article that should outrank generic same-category posts.
- Use 키워드 for concept clusters, not for SEO stuffing.
- 연결 서비스 values are service slugs from `serviceGroups` in `src/lib/constants.ts`. Guide for 업무경험 posts:
  `docs/BLOG_WORK_CASES.md`.

The publish check (`publishIssues` in `admin/src/content/post.ts`) runs in the browser and again on the server. It
replaced the post checks of `npm run audit:content`:
- Errors block publishing: empty title / slug / category / summary / body, a slug in use, invalid or future dates, a
  tax-facts post without sources or 검토 기준일, an incomplete source row, a body link that is not http(s) / `/` / `#`,
  a body image that is not an uploaded one or no longer exists.
- Warnings need a confirmation: summary outside 50–160 chars, 검토 기준일 older than 120 days, no keywords, images
  without alt text, a heading 1 in the body, raw HTML in the body, a 업무경험 post without a service, unpublished
  related posts, and a non-tax-facts post without sources.

## Diagrams

본문의 도식은 사진이 아니라 코드 블록으로 쓴다. 언어 자리에 종류를 적고, 블록 첫 줄에 제목을 쓴다. 사이트가 서버에서
HTML 로 그린다(`src/lib/content/markdown.ts` 의 `remarkDiagrams` → `src/components/blog/diagram.tsx`). 글자가 HTML
텍스트로 남아 검색엔진과 AI 가 읽는다.

````
```흐름
중간예납, 내야 하나
직전 사업연도에 법인세 산출세액이 있었나?
- 아니오: 상반기 가결산으로 신고 | 올해 실적 기준
- 예: 8월 31일까지 신고 납부 (납부)
근거: 법인세법 제63조
```
````

- 종류는 `흐름`, `구간`, `일정`, `계산`, `비교`, `단계`. 문법은 `src/lib/diagram.mjs` 와 `tests/unit/diagram.test.mjs`
  (`npm run test:unit`). 언제 어떤 도식을 쓰는지는 글쓰기 스킬(`daily-tax-content` 의 `references/diagrams.md`)에 있다.
- 제목을 ```` ```흐름 제목 ```` 처럼 언어 줄에 쓰지 않는다. Milkdown 은 코드 블록의 언어만 지키고 그 뒤 글자를 지운다.
- 마지막 줄의 `근거: ...` 는 도식 아래 출처로 그린다.
- `계산` 은 따라 계산해 보고 틀리면 그리지 않는다.
- 그리지 못하는 블록은 사이트에 코드 그대로 나온다. 게시 전 검사(`publishIssues`)가 오류로 막는다.

## Authority priority

- For rates, deadlines, filing duties, thresholds, forms, penalties, and calculation formulas, cite the closest primary authority first.
- Preferred order: current law, current enforcement decree/rule/notice, official NTS/MOEF guidance, then case law or tribunal decisions.
- Do not attach a case just because it is about the same topic. The authority must directly support the sentence immediately before it.
- Use case law only when the point is interpretive: constitutionality, procedural illegality, judicial interpretation, substance-over-form, attribution, or similar dispute-driven issues.
- If a statutory citation already fully supports the point, do not add a decorative case citation after it.

## Rendering behavior

- post detail pages expose dates, author, sources, and article JSON-LD
- related posts are ranked by `relatedSlugs`, then category, then keyword overlap
- the body is rendered by `src/components/blog/post-body.tsx` (remark → hast → JSX, no MDX): links are kept only when
  safe, images only when uploaded (with their stored width and height), wide tables scroll on their own

## Retrofit order

1. reform / deadline articles
2. evergreen tax guides with heavy traffic
3. archive or redirect overlapping summary posts
