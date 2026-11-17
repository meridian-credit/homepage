# 세무 일정

머리말의 큐브와 `/portal` 의 일정 버튼이 다가오는 국세청 신고 기한을 보여 준다. D-day 는 보는 순간 서울 시간으로 계산한다.

## Sub-features

- `schedule-cube` 머리말 큐브에 다음 일정이 돈다.
- `schedule-portal` `/portal` 의 일정 버튼과 팝업.
- `schedule-runout` 적어 둔 일정이 모두 지나면 이번 달 국세청 페이지로 링크한다.

## How to get to it (user POV)

- 모든 페이지의 머리말(데스크톱). 모바일은 메뉴 안.
- `/portal` 의 일정 버튼.

## Driving it with Playwright

`verify.mjs schedule <label>` 가 큐브와 포털 팝업을 구동한다. 다 지난 뒤의 머리말 링크는 `tests/e2e/schedule.spec.ts` 가 본다.


- **큐브.** `page.clock.setFixedTime` 으로 첫 일정 날 09:00(+09:00)에 맞추고 `/` 로 간다. 끝 상태:
  `.site-header .sched-cube li` 첫 항목에 그 일정 이름.
- **다 지난 뒤.** 마지막 일정 다음 날로 시계를 옮긴다. 끝 상태: 큐브 링크 이름이 「이번 달 세무일정 · 국세청」이고
  href 가 `ntsThisMonthUrl` 과 같다(`src/lib/schedule.ts`).
- **포털 팝업.** `/portal` 에서 `#schedOpen`(접근 이름 「주요 세무 일정 이번 달 일정」)을 누른다.
  끝 상태: `getByRole('dialog')` 안에 같은 링크.
- 기준 구현은 `tests/e2e/schedule.spec.ts`.

## Gotchas

- 시계를 고정하지 않으면 날마다 결과가 바뀐다.
- `ntsThisMonthUrl` 은 Date 가 아니라 `seoulToday(date)` 가 주는 `YYYY-MM-DD` 문자열을 받는다.
- 링크 수를 `count()` 로 바로 세면 그리기 전이라 0 이 나온다. `expect(...).toHaveAttribute` 처럼 기다리는 단언을 쓴다.
- 운영은 관리자 DB 의 일정을 읽는다. 이 빌드는 코드 배열을 읽으므로 운영 화면과 내용이 다를 수 있다.
- 30일 이하로 남으면 `npm run audit:content` 가 경고한다. 검증 실패가 아니라 일정 보충 알림이다.
