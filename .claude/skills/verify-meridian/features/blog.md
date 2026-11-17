# 블로그 목록과 글

`/blog` 는 첫 쪽 글 목록을 정적 HTML 에 담아 보낸다. 글은 관리자에서 쓰고 공개 사본만 읽는다.

## Sub-features

- `blog-list` 목록이 JavaScript 없이도 같은 글을 보여 준다.
- `blog-post` `/blog/<slug>` 본문, 출처, 관련 글.
- `blog-filter` 분류와 검색어 쿼리로 목록을 거른다.

## How to get to it (user POV)

- 머리말 메뉴의 블로그, 홈의 글 띠, 서비스 상세의 업무경험 글.

## Driving it with Playwright

- **목록.** `/blog` 를 JavaScript 끈 context 와 켠 context 에서 연다. 끝 상태: 두 쪽의 `a[href^="/blog/"]` 목록이 같다.
- **글.** 첫 글 링크를 누른다. 끝 상태: `article[data-published-at]` 이 있고 제목 `h1` 이 보인다.
- 기준 구현은 `tests/e2e/blog-rendering.spec.ts`.

## Gotchas

- `CONTENT_DB` 없이 빌드하면 글이 0개다. 이때 목록과 글 여정은 「전제 없음」으로 보고한다. 통과로 적지 않는다.
- 관리자 e2e 의 DB(`admin/.e2e/db/content.db`)는 시험이 끝나면 공개 글이 0개다(2026-11-17 확인). 그것으로는 글이 생기지 않는다.
- 글이 있는 목록을 보려면 관리자에서 글을 하나 게시한 DB 가 필요하다. 이 경로는 아직 구동해 보지 않았다.
  처음 구동하는 사람은 성공한 절차를 여기에 적는다.
