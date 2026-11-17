# 사이트 검색

머리말의 검색으로 서비스, 페이지, 글, FAQ 를 찾는다. 목록은 `/api/search`(정적) 하나다.

## Sub-features

- `search-open` 검색 열기와 닫기.
- `search-results` 입력에 맞는 결과 목록과 키보드 이동.
- `search-hidden` `/pricing`, `/preview` 는 결과에 나오지 않는다.

## How to get to it (user POV)

- 머리말 `getByRole('button', { name: '검색 열기' })`.

## Driving it with Playwright

`verify.mjs search <label>` 가 아래를 모두 한다.


- **열기.** 위 버튼을 누른다. 끝 상태: 버튼 이름이 「검색 닫기」, `aria-expanded="true"`.
  검색창은 데스크톱과 모바일 메뉴에 하나씩 있다. 데스크톱은 `getByRole('combobox', { name: '사이트 검색' }).first()`,
  모바일은 `getByLabel('모바일 메뉴').getByRole('combobox', { name: '사이트 검색' })`. 이름만으로 찾으면 둘이 잡혀 실패한다.
- **찾기.** `기장` 을 입력한다. 끝 상태: `getByRole('listbox', { name: '검색 결과' }).first()` 안에 `role=option` 이 여럿
  (2026-11-17 빌드에서 7개), 첫 결과 href 가 `/services/tax-bookkeeping`.
- **키보드.** ArrowDown 다음 Enter. 끝 상태: 고른 결과의 주소로 이동.
- **숨김 페이지.** `수임료` 를 입력한다. 끝 상태: 결과에 `/pricing` 이 없다(`tests/e2e/noindex-pages.spec.ts` 가 API 로도 본다).

## Gotchas

- 결과는 처음 열 때 `/api/search` 를 받는다. 받는 동안 「검색 목록을 불러오는 중입니다.」 상태가 보인다.
- 글은 `CONTENT_DB` 가 있어야 나온다. 이 도구의 기본 빌드에는 글 결과가 없다.
- 검색어의 글자가 사이트에 없으면 원본 폰트 조각으로 그린다. 깨져 보이면 폰트 서브셋 문제다.
