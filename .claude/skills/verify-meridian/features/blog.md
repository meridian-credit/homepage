# 블로그 목록과 글

`/blog` 는 첫 쪽 글 목록을 정적 HTML 에 담아 보낸다. 글은 관리자에서 쓰고 공개 사본만 읽는다.

## Sub-features

- `blog-list` 목록이 JavaScript 없이도 같은 글을 보여 준다.
- `blog-post` `/blog/<slug>` 본문, 출처, 관련 글.
- `blog-filter` 분류와 검색어 쿼리로 목록을 거른다.

## How to get to it (user POV)

- 머리말 메뉴의 블로그, 홈의 글 띠, 서비스 상세의 업무경험 글.

## Driving it with Playwright

`verify.mjs blog <label>` 가 아래 두 단계를 한다. 글이 없는 빌드면 「전제 없음」으로 실패한다.

**글이 있는 빌드 만들기(2026-11-17 구동함):**

1. `npx playwright test -c admin/playwright.config.ts admin/tests/posts.spec.ts -g "새 글을 쓰고|게시 전 검사|게시하면 블로그"`
   관리자 화면으로 글 하나(`corporate-tax-rate-2027`)를 게시한 DB 가 `admin/.e2e/db/content.db` 에 남는다.
2. WAL 까지 담아 복사한다. 파일 복사는 WAL 을 빠뜨린다.
   `node -e "const D=require('better-sqlite3');new D('admin/.e2e/db/content.db',{readonly:true}).backup('temp/verify/blog-content.db')"`
3. `CONTENT_DB=$PWD/temp/verify/blog-content.db npm run build`, 같은 셸에서 `verify.mjs start`.
4. 끝나면 `CONTENT_DB` 없이 다시 빌드해 CI 와 같은 상태로 돌린다.


- **목록.** `/blog` 를 JavaScript 끈 context 와 켠 context 에서 연다. 끝 상태: 두 쪽의 `a[href^="/blog/"]` 목록이 같다.
- **글.** 첫 글 링크를 누른다. 끝 상태: `article[data-published-at]` 이 있고 제목 `h1` 이 보인다.
- 기준 구현은 `tests/e2e/blog-rendering.spec.ts`.

## Gotchas

- `CONTENT_DB` 없이 빌드하면 글이 0개다. 이때 목록과 글 여정은 「전제 없음」으로 보고한다. 통과로 적지 않는다.
- 관리자 e2e 를 전부 돌린 뒤의 DB 는 공개 글이 0개다(뒤 시험이 글을 내린다). 위 1번처럼 게시 시험까지만 돌린다.
- `temp/` 에 `.ts`, `.mts` 파일을 두면 `next build` 의 타입 검사가 그것까지 읽고 실패한다. 탐침 스크립트는 `.mjs` 로 쓰거나 지운다.
