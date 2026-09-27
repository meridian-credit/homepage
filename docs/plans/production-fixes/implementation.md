# 구현 기록 — production-fixes

계획(README.md v2)대로 한 것과 계획과 달라진 것을 단계별로 남긴다. 측정은 §5 조건(`next start` :3100 앞에
`scripts/qa/https.mjs` :3443, 운영 CSP 그대로)에서 했다.

## P1 — 머지 차단 결함 (커밋 A)

### 한 것

- **/blog 정적 목록** (`src/app/blog/page.tsx`, `blog-content.tsx`)
  - Suspense fallback 을 `null` 에서, 쿼리 없이 그린 같은 `BlogContent` 로 바꿨다.
  - 주소는 `BlogContentFromUrl` 만 읽고, 쿼리는 문자열로 넘긴다(`URLSearchParams` 는 경계를 못 넘는다).
  - 대표 카드의 `AnimateOnScroll` 을 벗겼다. fallback 이 실제 화면으로 바뀔 때 한 번 꺼졌다 켜졌다.
- **세무 일정** (`src/lib/schedule.ts`, `schedule-cube.tsx`, `schedule-popup.tsx`, `globals.css .sc-empty`)
  - 국세청이 게시한 10–12월 여섯 건을 넣었다. 항목마다 그 달 국세청 표를 출처로 단다.
  - 다 지나면 헤더 큐브와 /portal 팝업이 「이번 달 세무일정 · 국세청」으로 서울 기준 오늘의 달을 연다.
    버튼 라벨은 「이번 달 일정」이다.
  - 큐브는 날짜를 알기 전에도 같은 크기의 자리를 둔다(헤더 CLS 0.006 → 0).
  - `content-audit` 가 남은 일정이 30일 밑이면 경고를 맨 앞에 찍는다. `--schedule-strict` 면 실패한다.
    `.github/workflows/schedule-check.yml` 이 매주 월요일 그걸 돌린다.
- **문의 폼** (`contact-form.tsx`, `contact-inquiry.tsx`, `src/app/contact/page.tsx`)
  - 폼은 Suspense 밖에서 한 번만 그린다. 주소 초안은 Suspense 안의 빈 자식 `InquiryDraft` 가 폼에 건넨다.
  - 칸은 비제어로 바꾸고, 보낼 때 `FormData` 로 읽는다.
  - `method="post"` 를 달았다. 버튼은 `disabled = !hydrated || sending` 이다.
  - 수화 전까지 「보내기 버튼이 켜지지 않으면 이메일이나 카카오톡 채널로 보내 주세요」를 보인다.

### 계획과 달라진 것

| 계획 | 실제 | 이유 |
|---|---|---|
| 칸은 제어 그대로, 초안이 "친 칸을 덮지 않게" | 칸을 **비제어**로 | React 19.2.4 는 수화 전 입력을 다시 보내 주지 않는다. 확인한 곳: `react-dom-client.production.js` 의 `initInput`, 수화 중에는 DOM 값을 건드리지 않고 `track` 만 한다. 그래서 제어 칸이면 수화 뒤 첫 렌더(`hydrated` 전환)가 빈 state 로 DOM 값을 덮는다. 비제어면 덮을 state 가 없다. 초안은 textarea 의 `defaultValue` 로만 넣으니 브라우저 dirty 규칙이 한 번 더 지킨다. |
| `data-hydrated` + CSS 로 안내 숨김 | `!hydrated` 일 때만 렌더 | 같은 일을 더 적은 장치로 한다. 서버 HTML·수화 실패·JS 없음 모두 안내가 남는다. |
| /blog 고유 slug 13 | **12** | 대표 카드가 첫 칸 글과 같은 글이다. 테스트는 숫자를 박지 않고 "JS 없이 본 목록 = 수화 뒤 목록, 12편 이상"으로 건다. |

### 받아들인 것

- `/contact?service=…` 데스크톱 CLS **0.0061**
  - 초안이 들어오면 「선택한 서비스·견적 조건을 … 담았습니다」 한 줄이 폼 위에 생긴다.
  - 서버는 주소를 모르니 그 줄은 수화 뒤에야 생긴다. 예전 구조(fallback 교체)에서도 같았다.
  - 자리를 늘 비워 두면 초안 없는 /contact 에 빈 줄이 생긴다. 0.1 기준에 한참 못 미쳐 그대로 둔다.

### 독립 검토 반영 (critic, Opus 5.5 xhigh — 커밋 A 대상)

막는 결함은 없었다. 반영한 것:

- **위험: JS 를 기다리며 다 써 둔 사람이 버튼이 켜지자마자 누르면 서버가 막는다.**
  - `startedAt` 이 수화 시점이라 900ms 검사에 걸렸다(실측 326–358ms).
  - 검토안은 "보내기 전에 1초 기다리기"였다. 대신 수화해 붙은 폼은 `performance.timeOrigin`(페이지를 연 때)을 쓴다.
    폼이 실제로 보이기 시작한 때이고, 기다림을 끼우지 않는다. 클라이언트 이동으로 그려진 폼은 그대로 `Date.now()` 다.
  - 테스트: JS 를 1초 붙잡은 뒤 켜지자마자 제출하고, 경과 ≥ 900ms 를 본다. 병렬 12개로 96/96 통과했다.
- 「새 문의 작성」 뒤 초안이 안 바뀌던 것: textarea 에 `key={draft}` 를 달았다.
  재마운트된 칸은 브라우저가 「고친 칸」으로 표시해 `defaultValue` 만으로는 안 바뀌었다.
- 「새 문의 작성」 뒤 초점이 body 로 떨어지던 것: 이제 첫 칸으로 간다(테스트 추가).
- 초안 안내 `toHaveCount(0)` 검사가 초안 효과보다 먼저 돌 수 있었다: 응답 뒤로 옮겼다.
- 헤더 큐브 자리 상자가 눌리는 것처럼 보였다: `pointer-events: none`.
- 쓰지 않는 `scheduleDates[].source` 를 지웠다.
- `content-audit` 날짜 정규식이 작은따옴표만 받던 것: 세 가지 따옴표를 모두 받는다.
- 주석의 React 판: App Router 는 Next 가 싣는 19.3 canary 로 돈다.
- 테스트 이름 과장(`blog is in the prerender manifest`), /blog 주석의 "/contact 와 같은 방식" 오류를 고쳤다.

받아들이지 않은 것:

- **/blog 를 /contact 식(주소를 수화 뒤에 읽기)으로 바꾸기.** 수화 전 검색창 입력과 초점이 사라지는 틈은 남는다.
  대신 메뉴에서 갈래로 옮겨 올 때 첫 화면부터 맞는 목록이 나온다. /contact 식이면 클라이언트 이동마다 전체 목록이
  한 번 비쳤다가 바뀐다. 이유는 `blog/page.tsx` 주석에 적었다.
- 계획 문서 · 검토 원문을 docs 에 두는 것: 사용자가 요청한 산출물이라 둔다(Vercel 업로드에서는 빠진다).

**주인이 정할 것:**

- 주간 일정 점검(`schedule-check.yml`)의 실패 메일은 GitHub 가 **cron 줄을 마지막으로 바꾼 사람**에게 보낸다.
  갱신 담당(사이트 주인)에게 가게 하려면, 주인이 그 파일을 한 번 커밋하거나 알림을 이슈로 바꿔야 한다.
- 11월 16일부터(남은 일정 30일 미만) 매주 빨갛게 뜬다.
  국세청이 1월 표를 12월 말에 올리면 몇 주 동안 할 일 없는 경고가 된다.
  헤더는 「이번 달」 링크로 안전하게 떨어지므로, 기준(30일)을 줄일지 주인이 정한다.

검증 중 사고 하나:

- 3100 에 떠 있던 옛 서버(`next-server`, 프로세스 이름이 `next start` 가 아니라 `pkill -f` 에 안 잡힘)가 포트를 쥐고 있었다.
  그래서 새 빌드가 뜨지 못한 채 첫 전체 실행이 옛 빌드를 쟀다.
- 포트 주인의 cwd 를 확인한 뒤(`lsof -p <pid>`) 다시 돌렸다: **95 통과, 5 건너뜀, 0 실패.**

### 측정 (P0 → P1, Chromium)

| 경로 | P0 CLS | P1 CLS |
|---|---|---|
| /blog 데스크톱 | 0.595 | 0 |
| /contact 데스크톱 | 0.006 | 0 |
| /services 데스크톱 | 0.006 | 0 |
| / 데스크톱 | 0.0858 | 0.0804 |
| 모바일 /blog · /contact · /services · / | 0 | 0 |

가로 넘침은 P0 과 같다. 홈 `section.end` 가 -4px 에서 시작하지만 잘려 있고, `scrollWidth` 는 뷰포트와 같다.

### 검증

- `npm run lint`: 오류 0, 경고 3. 셋 다 P1 이 건드리지 않은 파일에서 전부터 있던 것이다.
- `npm run audit:content`: 오류 0.
- `npm run build`: /contact · /blog 정적.
- e2e 4 프로젝트(desktop · mobile · webkit · firefox) :3443: **95 통과, 5 건너뜀, 0 실패.**
  - 새 테스트 파일은 `blog-rendering.spec.ts` 와 `schedule.spec.ts`. `contact-rendering.spec.ts` 에 두 건을 더했다:
    JS 없이 Enter, 수화 지연 중 입력.
  - 한 번은 파일 넷만 돌릴 때 firefox 홈 `load` 가 30초를 넘겼다(병렬 부하). 따로 3회는 통과했고, 전체 실행에서도
    통과했다. 홈 영상이 무거운 탓이라 P2(미디어)에서 다룬다.
