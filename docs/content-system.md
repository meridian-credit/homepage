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

- 종류는 `흐름`, `구간`, `일정`, `계산`, `비교`, `단계`, `구성`. 문법은 `src/lib/diagram.mjs` 와
  `tests/unit/diagram.test.mjs`(`npm run test:unit`). 언제 어떤 도식을 쓰는지는 글쓰기 스킬(`daily-tax-content` 의
  `references/diagrams.md`)에 있다.
- `구성` 은 정해진 모양이 없는 그림(관계, 돈의 흐름)을 조립한다. 한 줄이 가로 한 줄이고 `[상자] → 설명 → [상자]` 로 쓴다.
  `[이름 | 부연]` 은 상자 안 작은 글씨, `[이름]*` 는 강조다.
- 제목을 ```` ```흐름 제목 ```` 처럼 언어 줄에 쓰지 않는다. Milkdown 은 코드 블록의 언어만 지키고 그 뒤 글자를 지운다.
- 마지막 줄의 `근거: ...` 는 도식 아래 출처로 그린다.
- `계산` 은 따라 계산해 보고 틀리면 그리지 않는다.
- 그리지 못하는 블록은 사이트에 코드 그대로 나온다. 게시 전 검사(`publishIssues`)가 오류로 막는다.

### 모든 도식의 원칙

새 종류도 이것을 지키면 기존 도식과 한 벌로 보인다.

- 한 도식은 한 질문에 답한다. 틀은 늘 같다: 종류 이름, 제목, 본문, `근거:` 줄.
- 글자는 HTML 텍스트다. 그림 속 글자, 이미지, SVG `<text>` 로 정보를 쓰지 않는다.
- 색은 뜻으로만 쓴다. 남색(`--dg-navy`)은 기본 선과 "해야 하는 것"(납부), 파랑(`--dg-blue`)은 독자가 먼저 볼 한
  곳(강조, 좋은 결과, 결과 금액)이고 한 도식에 하나다. 연한 단계는 바탕과 보조다. 색은 `.dg` 의 `--dg-` 토큰만 쓴다.
- 모양은 공용 부품으로 만든다: 상자(`.dg-node`, `.dg-box`), 결과 카드(`.dg-out`), 꼬리표(`.dg-yn`, `.dg-when`),
  화살표(`.dg-arrow`), 막대, 카드, 정도 칸. 모서리 12px, 선 2px.
- 폭 600px 이하에서는 세로로 쌓는다. 가로 스크롤을 만들지 않는다.
- 서버에서 그린다. 자바스크립트 없이 보여야 한다.
- 크기에 한도를 둔다. 한도를 넘는 내용은 도식을 나누거나 글로 쓴다.
- 수치를 해석기가 따라 계산할 수 있으면 검산하고, 틀리면 그리지 않는다.

### 새 종류 더하기

먼저 `구성` 이나 일반 표로 되는지 본다. 같은 모양을 두 글 이상에서 쓰게 될 때 종류로 올린다.

1. `src/lib/diagram.mjs`: `DIAGRAM_KINDS`, `PARSERS`, typedef. 형식이 틀리면 고칠 방법을 알려 주는 오류를 낸다.
2. `src/components/blog/diagram.tsx`: `KIND_CLASS`, `KIND_LABEL`, `DiagramBody` 의 case. 빠지면 타입 오류가 난다.
3. `globals.css` 의 도식 구역에 `.dg-<이름>` 스타일. 위 원칙의 토큰과 부품을 쓴다.
4. `tests/unit/diagram.test.mjs`: 그 종류의 테스트와 `SAMPLES` 예시. 이 문서의 종류 목록에도 적는다.
5. 1280px 와 390px 에서 그려 보고, 스킬의 `references/diagrams.md` 에 문법을 더한다.

3, 4 는 `npm run test:unit` 이 막는다. 예시나 문서가 빠진 종류, `--dg-` 토큰 밖의 색, `.dg` 밖의 선택자는 실패한다.

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
