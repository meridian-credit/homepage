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

## P2 — 폰트 · 미디어 · 캐시

### 한 것

- **폰트 subset** (`scripts/fonts/subset.mjs`, `src/fonts/`, `layout.tsx`, `globals.css --font-*`)
  - 원본 92조각을 `public/fonts` 에서 `src/fonts/<family>/` 로 옮기고 layout 에서 import 한다.
    Next 가 조각마다 해시 이름을 붙여 `/_next/static/media` 에 불변 캐시로 싣는다(`max-age=0` 문제도 사라짐).
  - 생성기는 사이트 글자 884자를 모은다. 조각 61개, 1450KB → 408KB 다.
    결과는 `src/fonts/generated/` 의 `"Pretendard Site"` · `"Wanted Sans Site"` 로 쓴다(git 제외).
  - `build` · `dev` 스크립트 맨 앞에서 돌고, 1.8초 걸린다. 같은 입력이면 같은 바이트가 나온다(shasum 으로 확인).
- **Cormorant** 는 600 정체만 부른다. preload 가 두 파일(77KB)에서 한 파일(23KB)로 줄었다.
- **미디어** (`public/media/*.v1.*`, `next.config.ts` `/media/:path*` immutable)
  - 영상 넷을 버전 이름으로 옮겼다. 포스터는 WebP(q80)로 바꿨다. SSIM 은 원본 JPG 대비 0.990 · 0.997 이고,
    크기는 83 → 47KB · 46 → 27KB 다.
  - OG/Twitter 는 `/home-hero-poster.jpg` 그대로 둔다. 쓰지 않게 된 `meridian-hero-poster.jpg` 는 지웠다.
- **홈 첫 화면 영상** (`about-opening.tsx` `HomeFilm`)
  - 두 판에 복사돼 있던 video 를 한 컴포넌트로 모았다.
  - 세로 휴대폰(≤767, portrait)에는 가운데 540×720 을 잘라 낸 판을 준다. webm 921 → 497KB, SSIM 0.989 이다.
    P4 에서 휴대폰 영상 판이 56svh 로 낮아져 이 판이 맞지 않게 됐다. P6 에서 720×720(≤540 세로)으로 바꿨다.
  - 포스터 preload 는 `HomeFilm` 안에서 `ReactDOM.preload` 로 건다.
- **움직임 끔**: 모든 video `<source>` 에 `media="(prefers-reduced-motion: no-preference)"` 를 걸었다.
  서버 HTML 은 움직임 설정을 모르고 영상 판으로 그려지는데, 이제 맞는 source 가 없어 영상을 받지 않는다.

### 계획과 달라진 것

| 계획 | 실제 | 이유 |
|---|---|---|
| 모바일 영상은 "저해상도 인코드" | 홈만, **가운데 잘라 낸 판** | 세로 휴대폰은 cover 로 1280 폭 중 가운데 26–42% 만 보인다. 해상도를 낮추면 이미 확대된 화면이 더 뭉개진다. 잘라 내면 보이는 픽셀은 그대로다. 세로 화면 비(0.46–0.75)는 540×720(0.75) 안에 다 든다(320–767 폭 실측). |
| (계획에 없음) 하위 페이지 영상 | 그대로 | 폭 ≤767 에서 히어로 비율이 0.65–2.2 로 흩어져 한 가지로 잘라 낼 수 없다. 수용 기준도 홈만 본다. |
| 포스터 preload 를 홈 page.tsx 에 | `HomeFilm` 안(클라이언트) | 서버 컴포넌트에서 부른 `preload` 는 이 구성에서 아무것도 내보내지 않았다(HTML · RSC 둘 다 확인). Next 문서 예시대로 클라이언트 렌더에서 부르니 `<head>` 에 실렸다. 쓰는 요소 옆에 있는 편이 낫기도 하다. |
| 생성 결과 캐시(stamp) | 없앰 | 매번 1.8초라 캐시가 얻는 게 없다. 코드만 늘어난다. |

### 측정 (P0 → P2, 모바일 cold, Chromium)

| 경로 | 폰트 | 미디어 |
|---|---|---|
| / | 636 → 362 KB (−43%) | 901 → 486 KB |
| /blog | 584 → 345 KB (−41%) | — |
| /services | 585 → 331 KB (−43%) | — |
| /contact | 560 → 329 KB (−41%) | — |
| 12개 경로 전체 | −40 ~ −51% | |

- 원래 family 조각 요청: 12개 경로 모두 **0**.
- 표본 200노드(1440 · 390, 다섯 경로): subset 과 원래 family 의 폭 차이 최대 **0px**, 줄 수 차이 **0**.
  subset 파일을 막아 원래 family 로 떨어뜨려 같은 빌드에서 비교했다.
- 사이트에 없는 글자 「뷁」: 원래 조각(PretendardVariable.subset.38)을 받아 `Pretendard Variable` 로 그린다(CDP `getPlatformFontsForNode`).
- 워드마크 `.brand-word` 는 Cormorant Garamond SemiBold 로 그려진다.
- 영상 source 선택(Chromium · WebKit):
  - 390×844, 767×1024 → 잘라 낸 판. 768×1024, 844×390, 1440 → 기본 판.
  - reduced-motion → 영상 요청 0(포스터 한 장만 받는다).
- 헤더: `/media/*` `public, max-age=31536000, immutable`, `/_next/static/*` immutable, OG JPG `max-age=0`.

### 남은 것

- 폰트는 페이지마다 여전히 330–380KB 다. 본문 글자가 거의 모든 조각에 걸쳐 있어서다.
  더 줄이려면 가변 축 범위를 좁혀야 하는데, 렌더가 바뀔 수 있어 이번 범위 밖이다.
- 움직임 끔에서도 서버 HTML 의 video 가 포스터 한 장(47KB)은 받는다. P4b 에서 고치지 않았다. 판단은 P6 「남은 것」에 있다.
- Pretendard 는 SIL OFL 1.1 에 Reserved Font Name 이 있다.
  - 사이트 전용 subset 을 만들어 자기 사이트에서만 쓰는 것은 흔한 웹폰트 최적화다.
  - 다만 OFL 을 엄격하게 읽으면 수정본에 원래 이름을 쓰는 것이 문제가 될 수 있다(font-family 이름과 내부 name 표 모두).
  - 법적 판단은 사이트 주인 몫으로 남긴다.

## P3 — UI/UX 규칙

### 한 것

- **P3-1 유리 헤더**: 밝은 막 알파를 0.66 에서 0.8 로 올렸다. 뒤 본문 글자 대비가 2.37:1 에서 약 1.5:1 로 내려간다.
  - 비교 화면은 `docs/plans/production-fixes/glass/`(Chromium · WebKit × 데스크톱 · 모바일)에 있다.
    값 0.66 · 0.8 · 0.86 을 세 위치에서 찍었다. 데스크톱은 위치마다 세 값을 위아래로, 모바일은 값을 가로로 놓았다.
  - 실측: Chromium · WebKit · Firefox 모두 `@supports (backdrop-filter: url())` 를 통과한다. 그래서 blur 대체 분기로
    가지 않고 이 막을 쓴다(주석이 틀렸던 것을 고쳤다).
  - **주인 확인**: 큰 굵은 제목이 헤더 뒤로 지날 때는 0.86 에서도 윤곽이 비친다. 투명 유리에서 알파만으로는 없앨 수 없다.
- **P3-2 최소 글자 12px**:
  - `--t--1` 을 두 파일 모두 0.8rem 으로 했다. 주석은 "12px" 라고 적혀 있었지만, 뿌리 15px 에서 0.75rem 은 11.25px 였다.
  - Tailwind `--text-xs` 도 0.8rem 으로 했다. 줄 높이는 1rem 그대로라 줄 간격이 바뀌지 않는다.
  - globals.css 44곳, promo.css 1곳, TSX 임의 크기 22곳을 올렸다.
  - 예외는 그림뿐이다:
    - 요소로 그린 대시보드: 홈 `.dpk`, /portal `.db`. `role="img"` 를 달았다 — div 의 aria-label 은 원래 읽히지도 않았다.
    - 그 확대 조각(`.hs-in`): `aria-hidden`. 뜻은 figcaption 이 전한다.
    - (P3 에서는 /portal 기능 덱 `.deck` 도 예외로 뒀다. 접근성 트리에 두는 실제 내용이라 계획의 예외가 아니었다.
      P6 비평에서 잡혀 12px 로 올렸다 — 아래 P6.)
  - 결과: 14경로 × 폭 320 · 390 · 960 · 1280 · 1440 에서 12px 미만 글자 229묶음 → **0**(덱은 이때 셈에서 뺐다. P6 뒤로는 덱까지 0).
    가로 넘침 0, 헤더 요소 겹침 0(/ · /services/audit-advisory · /blog).
- **P3-3 누를 자리**: WCAG 2.5.8 을 규칙대로 쟀다.
  - 판정: 24px 미만이면서, 문장 안 링크(inline 예외)도 아니고, 24px 원이 이웃과 겹치는 것만 센다.
  - 걸린 것은 둘뿐이었다:
    - 데스크톱 푸터 전체 메뉴: 줄 간격 0 이라 19px 링크가 맞붙었다 → 칸 높이 24px.
    - /pricing 슬라이더(16px) → `h-[24px]`. 뿌리 15px 이라 `h-6` 은 22.5px 다.
  - 계획이 이름으로 든 로고 · 「모든 글 보기」 · 고객 단계 탭 · 카카오 · 이메일은 간격 예외를 받는다.
    계획의 원칙("간격 예외도 못 받는 것만")대로 손대지 않았다. 결과: **0**.
- **P3-4 제목 구조와 대비**
  - 홈 오프닝:
    - h1 은 `What` 안 워드마크 하나다. 안에 `sr-only` 「— 세무·회계 자문」을 둔다.
    - 영상 위 워드마크는 `p[aria-hidden]` 로 강등했다.
    - 데스크톱 · 정적(reduced) · 휴대폰 세 판 모두 h1 이 하나다(실측).
  - heading-order:
    - /about keep-list h4 → h3.
    - /portal 근거 데모 h4 → h3(CSS 선택자 함께).
    - /services 서비스 목록 눈썹을 h2 로 했다(화면 글자 SERVICE, 읽는 글자 「서비스 목록」).
    - 푸터 제목 h3 → h2: 푸터는 제 landmark 다. /faq 처럼 h1 뒤에 바로 오는 페이지에서 건너뛰었다.
    - 그림 속 「한눈에 보는 우리 회사」 h3 → p.
  - **블로그 표 머리줄이 안 보였다.** `.prose th` 가 `--color-surface`(지금은 검정)를 배경으로 써서 #1A1A1A 글자가
    검정 위에 앉았다(1.2:1). 모든 글의 모든 표가 그랬다. → `--color-card`.
  - 서비스 상세 「드리는 것」 영문 꼬리표: 남색 위 #6E6E6E(3.2:1) → `--color-on-deep-muted`.
  - 오른쪽 구역 바로가기 이름: 투명도 0.55(흰 바탕 2.7:1, 짙은 바탕 4.0:1) → 0.8(4.7:1 · 6.9:1).
  - `scripts/qa/audit.mjs`:
    - `BASE` · `MOTION` 인자, 경로 12개(/about · 서비스 상세 · 블로그 글 · /members 추가).
    - 움직임 켬 모드에서는 끝까지 스크롤한 뒤 잰다.
    - 받아들인 예외를 코드에 이유와 함께 적는다. 받아들이지 않은 serious · critical 이 있으면 exit 1.
  - 결과: 두 모션 모드 × 1440 · 390 × 12경로에서 **받아들이지 않은 serious · critical 0, heading-order 0**.
- **P3-5 빈 「업무경험」 갈래**:
  - layout 이 글 없는 갈래 주소를 세어 `Header hiddenNav` 로 넘긴다.
    `visibleMenu()` 가 데스크톱 · 펼침판 · 모바일 메뉴에 같은 목록을 준다.
  - /blog 칩도 뺀다. `?cat=case` 로 곧장 오면 칩과 빈 상태 안내는 남는다.
  - 서비스 상세 제목은 사례 글이 없으면 「인사이트」다.
- **P3-7 서비스 맥락 CTA**: 감사 · 회계자문 · 재무자문 상세에서 헤더 단추 셋이 「상담 문의하기 → /contact?service=<slug>」가 된다.
  세무자문 묶음과 tax-advisory 는 「기장 문의하기」 그대로다.
- **P3-8 전화 · 구조화 데이터**:
  - 문의 페이지 「직접 연락처」와 푸터에 Tel 을 넣었다.
  - JSON-LD 에 `telephone`(+82-2-…)과 `PostalAddress` 를 넣었다. 우편번호는 확인한 값이 없어 뺐다.
  - 구조 칸은 `siteConfig.postalAddress` 에 표기 주소 바로 옆에 둔다.
  - 이력: 4월에 주인이 전화번호를 뺐다(6563d9f). 그 뒤 첨삭 44건 커밋(d77a659)이 「전화 문의」 단추 넷을 다시 넣었다.
    그래서 이미 보이는 번호를 두 자리에 더한 것이다.

### 남은 것 · 주인 확인

- 유리 알파 최종값(0.8 적용, 비교 화면 참고).
- 12px 로 올린 꼬리표들의 줄바꿈은 폭 다섯에서 넘침 · 겹침만 쟀다. 한 줄씩 비교하지는 않았다.
  P4 기준 화면이 P3 뒤 모습을 담는다.

## P4 — Motion 제거

### 한 것

- **기준**: P3 빌드로 다시 떴다(`temp/p4base`).
  - 오프닝 · 약속은 진행률 21점마다 떴다. 약속은 임계값 직전 · 직후 16점과 시간 표본 3종 × 5시각(0/150/300/600/1200ms)을 더 떴다.
  - 지켜가는 방식(/about)은 줄마다 화면 위치 7곳에서 떴다. 리빌과 숫자 셈은 시간 표본으로 떴다.
  - 같은 스크립트로 전후를 떠서 비교했다.
- **P4a 리빌**(`components/motion/*`):
  - 이름과 쓰는 props 는 그대로다. 판정은 `use-reveal.ts`, 모양은 globals.css `[data-reveal]` 규칙이 맡는다.
  - 서버 HTML 은 보이는 상태다. 수화 뒤 **화면 아래 요소만** `pending` 을 건다. 한 번 보이면 `shown` 이고, 떨어지면 원상태로 돌아간다.
  - 거리 · 시간 · 곡선은 motion 판 그대로다: 글 20px · 0.6s, 묶음 항목 20px · 0.5s(0.08s 간격), 밑줄 0.8s,
    곡선 `(.16,1,.3,1)`.
  - 호출부가 0 인 variant(slideLeft · slideRight · scaleIn)와 props(once · amount · duration · direction)는 뺐다.
  - 밑줄(LineReveal)은 첫 화면에서도 그어진다. 측정해 보니 원래 연출이었다(서버 HTML 은 접힌 선, 수화 뒤 0.5–1.2s 에 그어짐).
    그래서 `(scripting: enabled)` 일 때만 처음에 접는다. JS 가 없으면 처음부터 그어진 선이다.
  - 글은 첫 화면에서 건드리지 않는다. motion 판은 수화 직후 한 번 숨김으로 갔다가 돌아와서, 첫 화면 글이 0.71 까지 흐려졌다
    되돌아왔다(측정). 그 결함이 없어졌다.
- **헤더 진행 막대**(`layout/scroll-progress.tsx`):
  - 네이티브 scroll · resize · ResizeObserver 로 재고, rAF 한 번에 쓴다. 경로가 바뀌면 다시 잰다.
  - 뒤따름은 CSS `transform .2s linear` 다. 값이 프레임마다 새로 들어와 전환이 다시 시작하므로, spring
    (stiffness 200 · damping 50, 시간 상수 약 0.23s)과 비슷하게 따라간다.
- **evidence-demo**: `useInView` 대신 `lib/in-view.ts` 의 `useInViewOnce` 를 쓴다. 리빌과 같은 판정이다.
- **지운 것**: `tilt-card` · `image-reveal` · `principal-unfold` · `hero-parallax` · `hero-text-reveal` · `hero-cta-button` ·
  `sticky-scroll-services` · `diagnostic-checklist`. 모두 참조 0 이다.
- **P4b 장면 — 레이아웃은 CSS 가, 진행률은 훅 하나가**
  - `lib/use-scroll-progress.ts`(약 70줄, 주석 포함):
    - 요소가 구간을 지나는 진행도를 rAF 로 재서 요소의 `--p` 에 쓴다. React 는 다시 그리지 않는다.
    - `media` 가 맞을 때만 돈다. `STAGE_MEDIA` 는 `(width > 900px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)` 이다(비평 뒤 범위 문법으로 바꿈, P6).
  - **오프닝**: DOM 을 하나로 합쳤다.
    - 기본 규칙은 쌓은 판이다. STAGE 미디어가 붙은 무대로 바꾼다.
    - 구간(이름 0.08–0.4, 영상 0.18–0.44, 색 0.26–0.38, 나머지 0.42–0.6)은 `--p` 위 `clamp()` 다.
    - 날아갈 거리는 JS 가 붙은 판 기준으로 잰다. 폭이 바뀔 때, 붙임이 켜지고 꺼질 때, 글꼴이 다 온 뒤에 다시 잰다.
      값은 `--fly-x · --fly-y · --fly-s` 와 `data-fly` 로 넘긴다.
    - 재기 전(JS 전 첫 그림)에는 영상 위 이름(`.about-logo`)이 그 자리를 지킨다. 재고 나면 날아갈 이름과 바꿔 끼운다.
      두 이름의 차는 1.8px 이다.
    - 색은 `color-mix(in srgb-linear)` 로 섞는다. motion 은 제곱 공간에서 섞었고, 표준 색 공간 가운데 그와 가장 가까운 것이 이것이다.
    - 쌓은 판의 영상 판 높이는 `min(100svh, max(22rem, 56svh))` 다(구 P3-6).
  - **keep-list**: 같은 훅과 CSS 식(opacity = p/0.55, 옆으로 ±72px)이다.
    - `--p` 가 없으면 제자리다. JS 를 끄면 전에는 세 줄이 opacity 0 이었다.
  - **promise-stage**: 상태 기계(step · exit · orbs, 임계값 그대로)는 훅 콜백이 돌린다.
    - 콜백은 `flushSync` 로 같은 프레임에 DOM 까지 반영한다. 그냥 두면 CSS 전환이 40ms 늦게 출발했다(측정).
  - **promise-orbs**: `data-show` 에 CSS 전환(1.4s, 두 번째 원 0.35s 지연)을 건다.
  - **complaint-thread**:
    - 줄 상태는 `data-state`(hidden · shown · gone)다. 켜짐 0.42s, 마지막 한 마디 1.1s, 나감 1.05s, 옅어짐은 0.8s 뒤에 시작한다.
    - 나가는 동안 14px 가라앉는 것도 motion 판 그대로다. motion 은 빠진 값을 처음 값(y 14)으로 되돌렸다.
    - 점 풍선 → 글 풍선 성장은 손으로 쓴 FLIP 이다(WAAPI 11칸, 모서리는 radius/scale 로 거꾸로 줄인다).
      도는 변신이 있으면 먼저 끈다.
    - 점과 글은 늘 DOM 에 있다. 전에는 JS 전 HTML 에서 대화 줄과 글이 opacity 0 이었다.
- `promo-scenes.ts` 와 header 의 첫 판 선택자를 `.about-stage` · `.about-video` 로 바꿨다.
  reduced-motion e2e 는 쌓은 판을 `position: static` 으로 확인한다.
- `motion` 을 package.json 에서 뺐다. 빌드 청크에 motion 코드가 없다(`MotionValue` 0건).

### 계획과 달라진 것

- STAGE 미디어에 `(scripting: enabled)` 를 더했다.
  - JS 를 끈 넓은 화면도 쌓은 판을 받는다. 전에는 첫 장면에 멈춰 오프닝 글과 대화 대부분이 opacity 0 이었다.
  - `scripting` 을 모르는 옛 브라우저(Safari < 17 등)는 쌓은 판을 받는다. 기본 규칙이 쌓은 판이라서다.
- 밑줄은 첫 화면에서도 그어지게 두었다(위). 계획은 "화면 아래만" 이었다.
- 진행 막대 전환을 120ms 에서 200ms 로 했다. spring 의 시간 상수에 맞춘 값이다.
- 쌓은 판 영상 높이는 휴대폰만이 아니라 쌓은 판 전체(움직임 끈 넓은 화면 포함)에 쓴다.
  붙은 무대의 끝 모습(영상 판 + 글)과 같은 구도다.
- 빌드(Lightning CSS)가 한 규칙에 `transform` 과 같이 있는 `scale` 속성을 지운다. 그래서 나감의 가로 이동과 축소는
  `transform` 이, 세로 가라앉음은 `translate` 가 맡는다.

### 측정 (P4 기준 → 지금, Chromium 1440×900 · 390×844)

- **정지 표본**(907개): 기준(rect ≤ 4px · opacity ±0.05)을 넘는 것은 시간 표본뿐이다.
  - 오프닝 이름은 ≤ 2px 다. 영상 clip-path 값은 소수 넷째 자리에서 다르다.
  - 약속 · 지켜가는 방식 줄은 모두 기준 안이다.
- **색 전환 지점**: 같은 색이 되는 진행률 차가 0.005 다(기준 ±0.02).
  - 예: p 0.30 에서 motion 207, 지금 212(sRGB 한 채널).
- **시간 표본**:
  - 약속 원: 시각을 맞추지 않아도 최대 0.019 opacity 차다.
  - 리빌: 38–41ms 늦게 출발한다. 출발을 맞추면 곡선 차는 opacity 0.059 · 1.1px 다.
  - 대화 나감: 이상 곡선에 맞춰 보면 motion 은 8ms, 지금은 28ms 늦게 출발한다. 곡선은 같다.
    - 한 프레임을 허용하면 최대 차는 회차마다 1.8–18.7px 다.
    - motion 은 애니메이션 시계를 방아쇠가 당겨진 프레임으로 잡는다. CSS 전환은 처음 그려지는 프레임에서 시작한다.
  - 그래서 수용 기준 4(같은 시각 ±8px · ±0.1)는 출발 시각을 맞추면 통과한다. 같은 시각으로 비교하면 나감 장면의
    가장 빠른 구간(1–2px/ms)에서 넘는다. 원인은 출발 1–2 프레임 지연 하나다.
- **진행 막대**(문서 가운데로 점프한 뒤 scaleX):

  | ms | 0 | 50 | 100 | 150 | 300 | 600 |
  |---|---:|---:|---:|---:|---:|---:|
  | motion spring | 0.010 | 0.042 | 0.106 | 0.178 | 0.345 | 0.459 |
  | 지금 0.2s 선형 | 0.000 | 0.083 | 0.167–0.208 | 0.333 | 0.500 | 0.500 |

  점프에는 더 빨리 닿는다. 이어서 굴릴 때의 뒤따름은 비슷하다.
- **JS 전송**: 비홈 모바일 전 경로가 −47 ~ −48 KiB 다(P0 311–334 → 263–286 KiB, 기준 ≥ 40). 데스크톱도 같다.
- **CLS**: 홈 데스크톱 0.0858 → 0.0179. 다른 경로는 모두 0 또는 /portal 0.0178 이다.
- **휴대폰 첫 화면**:
  - 390×844: 설명 첫 줄 top 1,049 → 679px 이고, JS 를 꺼도 같다.
  - 375×667: 첫 줄 bottom 625px 로 화면 안이다.
  - 360×740: 611px 다. 768×1024: 780px 다.
- **JS 끔**: 390 · 1440 모두 쌓은 판이다. 1440 에서 대화 5줄 · 글 5 · 원 2 가 모두 보인다. /about 지켜가는 방식 3줄: opacity 0 → 1.
- **lifecycle**: 경로 네 개를 10번 왕복해도 남은 rAF 는 4 로 일정하다. 페이지 오류 0, 문서 하나.
- **리빌이 숨은 채 남는 곳**: 12경로 × 2폭, 휠로 끝까지 가면 0 이다. 끝으로 점프해 지나친 것은 올라오면서 켜진다(motion 판과 같다).
- **살아 있는 페이지에서 오가기**: 폭 900 경계, reduced-motion 켜고 끄기, 약속 장면 한가운데서 좁혔다 넓히기를 해 봤다.
  오류 0 이고, 이름 거리를 다시 잰다.
- e2e 95 통과 · 5 건너뜀(4 브라우저, TLS 프록시). axe 두 모드에서 받아들이지 않은 serious · critical 은 0 이다.
- 영상은 `artifacts/p4-after/` 에 있다(정상 · End 점프 · 역방향, 1440 · 390).
  - **P4 전 영상은 남기지 않았다.** 기준은 정지 · 시간 표본으로 떴다.
  - 진행 막대의 느낌은 위 숫자와 지금 영상으로 판단해야 한다.

### 남은 것 · 주인 확인

- 진행 막대의 느낌(spring → 0.2s 선형).
- 쌓은 판의 영상 판 높이(56svh). 휴대폰 첫 화면에 설명 첫 줄이 들어오는 대신 영상이 화면을 다 채우지 않는다.

## P5 — 정리

### 한 것

- **지운 파일**:
  - 컴포넌트 8개(P4 에서)와 `constants.heroImages` 다.
  - 자산 11개(약 3.6MB)다: `public/{file,globe,next,vercel,window}.svg`, `media/hero-3d.{mov,webm}`,
    `images/{profile-chest.jpg, founder-3d-serious.png, hero-document.webp, meridian-advisory-workspace-hero.webp}`.
    src · content · scripts · tests · 설정에서 참조 0 이다.
- **죽은 CSS**:
  - promo.css: 대표 회계사(펼침) `.pu-*` 전부.
  - globals.css:
    - `#who .pu-head`, `.about-hero*`, `.mglobe--dark/--xl`, `.about-what-rule`, 12px 바닥 목록의 `.about-eyebrow`.
    - 옛 오프닝 판(`.about-globe*`, `.about-logo-shell/move`, `.about-meaning`, `.about-laser`, `.about-last`,
      `.about-stage-static`, `.ass-scene`, `.about-flat`, `.aflat-*` 등 — P4 에서).
    - 약속 구간의 `.imsg-stamp`(첨삭 #21 로 뺀 줄), `.imsg-flash`, `.imsg-face--out`, `.promise-dark` 한 벌,
      `.promise-meridian(-trail/-beam)`, `--imsg-ground`.
- **토큰**:
  - `--t-*` 는 globals.css `:root` 한 벌만 둔다. `.promo` 는 그 값을 물려받는다. "홈 토큰이 여기까지 닿지 않는다"던 주석은 틀렸다.
  - promo 색 7개는 같은 값 · 같은 뜻의 globals 색을 가리킨다: `--w` · `--navy` · `--navy-2` · `--tx` · `--tx-2` · `--blue` · `--blue-b`.
    값이 같아도 뜻이 다른 `--navy-3` 은 그대로 둔다.
  - Tailwind 는 안 쓰는 테마 변수를 빌드에서 지운다. `--color-deep-2` 가 그 예다. promo.css 의 `var()` 도 쓰임으로 세는 것을
    확인했다: alias 뒤 빌드에 나타난다.
  - `.promo` 안 계산값 13개가 이전 값과 같다.
- **주석**:
  - `sitemap.ts`: robots 는 /pricing 을 막지 않는다. noindex 를 읽게 두려는 것이다.
  - `constants.ts`:
    - `sitePages`: noindex 설명.
    - `navMenu`: 일곱 칸이고, 수임료는 메뉴에 없다. 결정은 IA_V2 §7 에 있다. 없는 문서 링크(IA_MENU_PLAN)를 고쳤다.
  - `promo-scenes.ts`: Lenis 가 창 스크롤을 움직이므로 ScrollTrigger 를 따로 잇지 않는다.
  - `layout.tsx` 폰트 주석은 P2 에서 이미 고쳤다. `api/search` 는 손대지 않았다(§7).
- **불안정 e2e**: 검색 재시도가 실제 `/api/search` 대신 fixture 응답을 받는다. TLS 프록시에서 4 브라우저 × 5회가 20/20 이다.
- **preload 경고**:
  - Cormorant 이탤릭은 P2 에서 사라졌다.
  - `meridian-logo.png`:
    - React 19 는 서버 렌더에서 lazy 가 아닌 `<img>` 에 `<head>` preload 를 건다. /portal 표 머리 로고는 한참 아래라
      몇 초 안에 안 쓰였다.
    - 다른 경로에서 /portal 을 미리 받을 때(prefetch)도 같은 경고가 났다.
    - `loading="lazy"` 로 없앴다. 홈 대화의 인물 SVG 3장도 같은 이유로 preload 되고 있어 lazy 로 했다.
  - 홈 전용 CSS(promo.css) preload:
    - 다른 페이지의 헤더 로고(→ /)를 Next 가 미리 받으며 그 CSS 를 preload 한다. 3초 안에 안 쓰여 경고가 난다.
    - 원인만 적는다. 홈으로 갈 때 캐시에 있으니 되돌릴 일이 아니다.

### 측정 · 관찰

- 비홈 히어로 영상(`meridian-hero.v1.webm`, 720KB)의 전송량이 회차마다 0–673KB 로 흔들린다.
  - 파일은 P0 과 같다. 측정 창 안에서 재생이 시작됐는지에 따라 달라진다.
  - P0 측정(http, 모두 32KB)과 바로 비교할 수 없다. 예산 항목도 아니다.
- WebKit 은 `http://localhost:3100` 에서 운영 CSP 의 `upgrade-insecure-requests` 때문에 CSS 를 못 받는다(글자만 뜬다).
  그래서 e2e 와 측정은 TLS 프록시(`https://localhost:3443`)로 돌린다(AGENTS.md).

## P6 — 비평 · 게이트 · 문서

### 독립 검토 반영 (critic, Opus 5.5 xhigh — P2–P5 대상)

f4556d3 대비 전체 diff 를 따로 봤다. 반영한 것과 남긴 것:

- **막음: /portal 기능 덱에 12px 미만 글자** (390 에서 「원」 4.4px, 날짜 8.8px 등).
  - 덱은 접근성 트리에 두는 실제 내용이다. 계획(P3-2)의 예외가 아니라서, 카드 안 글자의 바닥을 모두 0.8rem 으로 올렸다.
    em 으로 줄이는 꼬리(「원」, 알약, 기준 시점)는 `max(.8rem, …em)` 이다.
  - 재다가 더 큰 결함을 찾았다. **≤1000px 에서 카드가 90px 로 접혀 내용이 잘렸다** — 첫 줄과 큰 숫자만 보였다.
    - 원인: 카드가 크기 격리(`container-type: size`)라 제 내용으로 높이를 못 정한다. 쌓은 판에서 높이를 안 줬다.
    - P0 이전(936315b)부터 있던 결함이다.
  - 고친 것:
    - 쌓은 판 카드 높이는 `clamp(17rem, 66vw, 380px)` 이다.
    - 큰 숫자는 높이(27cqh)만이 아니라 폭(17cqw)으로도 막는다. 안 막으면 좁은 카드에서 숫자 한 덩어리가 폭을 넘는다.
    - 넓은 화면은 두 값 모두 전과 같다.
  - 실측(여섯 카드 × 폭 320 · 360 · 390 · 430 · 600 · 768 · 1000 · 1280 · 1440): 12px 미만 0, 카드 밖으로 나간 요소 0.
    320×568 에서만 여섯째 카드 목록 여백이 1px 걸친다(글자는 안 잘림).
- **위험: 휴대폰 영상 잘린 판이 맞지 않게 됐다.** P2 의 540×720 판은 영상 판이 100svh 일 때 기준이었다.
  - P4 에서 판이 56svh 로 낮아졌다. 그 뒤로 541–767 세로 화면은 이 판을 1.1–1.4배 확대했다.
    ≤540 휴대폰도 포스터(원본 비율)와 보이는 범위가 달라, 영상이 시작될 때 10–16% 확대되며 튀었다.
  - 가운데 **720×720** 을 잘라 낸 판(`home-hero.square.v1.*`, webm 619KB · mp4 586KB, SSIM 0.990 · 0.986)으로 바꿨다.
    `(max-width: 540px) and (orientation: portrait)` 에만 준다.
    - 휴대폰 영상 판은 폭보다 높이가 길거나 같다. 그래서 cover 가 높이에 맞춰 키우고, 보이는 범위가 가운데 720px 안에 든다.
      포스터와 같은 자리 · 같은 배율이다.
    - 실측(Chromium · WebKit), 가운데 594–720px 을 0.575–0.75배로 보인다:
      - 390×844: 594×720
      - 360×740: 626×720
      - 540×960: 720×717
    - 600 · 767 세로와 844 가로는 원본을 0.66–0.80배로 받는다(확대 없음). 1440 데스크톱은 전과 같이 1.25배다.
  - 540×720 판 두 파일은 지웠다.
- **위험: /services 「SERVICE」 꼬리표 서체가 바뀌었다.** P3 에서 `p` → `h2` 로 바꾸며 제목 서체(h1–h4 규칙)를 받았다.
  - `.t-eyebrow` 에 본문 서체를 못 박았다.
  - 실측: 세 꼬리표 모두 Pretendard Site 12px 700, 자간 1.44px, 줄 18px 로 같다.
- **고침: 개발 빌드에서 수화마다 `flushSync` 경고.**
  - 첫 측정이 `useLayoutEffect` 안에서 `onProgress` → `flushSync` 로 불렸다.
  - `flushSync` 를 훅으로 옮겼다. 프레임(rAF)에서 부를 때만 쓰고, 처음 한 번은 그냥 부른다.
  - 비평은 `flushSync` 자체를 과하다고 봤다. 남긴 이유: 없으면 대화 줄 전환이 40ms 늦게 출발해 P4 수용 기준을 넘는다(P4 측정).
- **고침: 900px 과 901px 사이 틈.** 확대 · 축소한 창의 900.5px 같은 폭에서는 `(max-width: 900px)` 도 `(min-width: 901px)` 도
  안 맞았다. 그러면 쌓인 판에 원이 되어, 글이 원 밖으로 나갔다.
  - 붙은 무대 쪽 일곱 곳과 `STAGE_MEDIA` 를 `(width > 900px)` 로 바꿨다.
  - Lightning CSS 는 이를 `(not (max-width:900px))` 로 내보낸다. 뜻이 정확히 같고 틈이 없다.
  - 900 → 쌓은 판 · 네모, 901 → 붙은 무대 · 원(Chromium · WebKit 실측).
- **고침: 폰트 생성기가 글(content/)의 「R&D;」 같은 평범한 글자에 빌드를 멈췄다.**
  - 글에서는 경고만 찍고 글자 그대로 센다. MDX 도 모르는 이름은 그대로 찍는다. 코드(JSX)는 전처럼 멈춘다.
- **정리**:
  - `useBackgroundVideo` 의 안 쓰는 `layoutKey` 인자를 지웠다.
  - `useHandheld` 주석이 붙임을 정한다고 적혀 있던 것을 고쳤다. 지금은 서비스 고르기만 쓴다.
  - `baseline.json` 을 만들었다(아래).
- **남김**:
  - *수화 전 붙은 무대*: `scripting` 이 맞으면 서버 HTML 도 붙은 무대로 그려지고, JS 가 진행도를 넣기 전까지 첫 장면에 머문다.
    수화가 실패한 채 굴리면 설명 · 대화 3–6줄 · 원 둘이 opacity 0 이다. motion 판도 같았다.
    쌓은 판으로 먼저 그리고 수화 뒤 붙이면 데스크톱 첫 화면이 통째로 이동한다(CLS). 그래서 JS 없는 경우(`scripting`)만 막는다.
  - *움직임 끔의 포스터 47KB*: Chromium · WebKit 은 숨긴 video 의 포스터도 받는다.
    없애려면 포스터를 video 밖(배경 그림)으로 빼야 하는데, 그것이 첫 화면 LCP 요소다. 움직임 끔 사용자 한정 47KB 를 위해
    LCP 경로(P2 에서 preload 로 맞춘 것)를 바꾸지 않는다.

### 게이트 (커밋 B 빌드)

| 단계 | 결과 |
|---|---|
| `npm ci` | 통과 |
| `npm audit` · `audit signatures` | 취약점 0 · 520 서명 + 92 attestation 확인 |
| `audit:content` | 오류 0, 경고 51(편집 검토 120일 초과 — 전부터 있던 것) |
| lint · tsc | 오류 0. 경고 2: /portal 표 머리 로고와 대화 인물 SVG 의 `<img>`. 전부터 있었다. `next/image` 로 얻는 것이 없는 작은 그림이다 |
| build | 통과. 사이트 글자 881자, 폰트 61조각 1450 → 407KB |
| e2e(TLS 프록시, 4 프로젝트) | 95 통과 · 5 건너뜀 |
| axe(HTTPS, 두 모션 모드, 1440 · 390) | 받아들인 예외(`region`, /clients 장식 번호)만 남음 |
| lifecycle | 10 왕복, 남은 rAF 3–4 로 일정, 오류 0, 같은 문서 |
| 12px 미만 글자 | 노출된 것 0. 남은 것은 `role="img"` 대시보드(`.dpk` · `.db`)와 `aria-hidden` 확대 조각뿐(320 · 390 · 960 · 1440) |
| WebKit HTTPS 측정 | 14경로 × 2폭: CSS 73KB 받음, 폰트 subset, 가로 넘침 0. 콘솔은 promo.css prefetch preload 경고뿐(P5 분류) |
| 깨끗한 checkout | 커밋 B 를 임시 worktree 로 꺼내 `npm ci` · `npm run build` 통과. /, /blog, /portal, /contact 에서 CSS 12 · woff2 106 · 미디어 요청 모두 200/206. 쓰인 글꼴은 subset family 와 Cormorant 뿐 |
| `next dev` 콘솔 | `flushSync` 경고 0(홈을 끝까지 굴리고, 약속 장면 한가운데서 새로 고침) |

### P0 대비 (`scripts/qa/measure.mjs`, Chromium, 수치는 `baseline.json`)

| 항목 | P0 | P6 | 합격선 |
|---|---:|---:|---:|
| 모바일 폰트 (`/`·`/blog`·`/services`·`/contact`) | 636·584·585·560 KiB | 362·345·331·329 KiB (−43·−41·−43·−41%) | 각각 ≥ 40% 감소 ✓ |
| 비홈 모바일 JS | 311–334 KiB | 263–286 KiB (−47 ~ −48) | 경로별 ≥ 40 KiB 감소 ✓ |
| `/blog` CLS (데스크톱) | 0.595 | 0 | < 0.1 ✓ |
| 홈 데스크톱 CLS | 0.0858 | 0.0179 | ≤ 0.0858 ✓ |
| 그 밖의 경로 CLS | ≤ 0.024 | ≤ 0.0178 | < 0.1 ✓ |
| 가로 넘침 (1440 · 390, 덱은 320–1440) | 0 | 0 | 0 ✓ |

- 콘솔 · 실패 요청은 P0 과 같은 종류뿐이다. `_vercel/insights` · `speed-insights` 는 Vercel 밖에서 404 다.
  영상 요청 ERR_ABORTED 는 측정이 페이지를 닫을 때 끊긴 범위 요청이다.
- Lighthouse 12.8.2(참고, 모바일 simulate, http :3100):

  | 경로 | 성능 | LCP | CLS |
  |---|---|---|---|
  | / | 62 → 68 | 8.5 → 5.9s | 0 → 0 |
  | /blog | 42 → 68 | 9.3 → 7.4s | 0.909 → 0 |
  | /services | 64 → 73 | 7.1 → 5.1s | 0 → 0 |
  | /contact | 65 → 75 | 7.0 → 4.7s | 0 → 0 |
  | /portal | 63 → 72 | 7.4 → 5.1s | 0 → 0 |
  | / (데스크톱) | 94 → 98 | 1.4 → 1.1s | 0 → 0 |

  - 홈 TBT 는 첫 회 128ms 가 나왔다. 세 번 더 돌리니 26 · 39 · 31ms 다(P0 24ms).
  - LCP 요소는 여전히 홈 영상 포스터다.

### 남은 것 · 주인 확인 (P1–P6 모음)

- **백엔드 — 공개 조건**: 이번 범위 밖으로 미뤘다(`src/app/api/**` 손대지 않음). 2026-09-30 재감사 결과는 [백엔드 후속 목록](../ui-ux-remediation/backend-backlog.md) 에 있다.
  - 운영 전에 막아야 할 것: BE-01(Resend 실패도 성공으로 답함), BE-07(개인정보 고지 없음).
  - 운영을 옮길 때 볼 것: BE-08(Vercel 이전 점검 목록).
- 유리 알파 최종값(0.8 적용, `glass/` 비교 화면).
- 헤더 진행 막대의 느낌(spring → 0.2s 선형, `artifacts/p4-after/` 영상과 P4 표).
- 휴대폰 첫 화면 영상 판 높이 56svh(설명 첫 줄이 첫 화면에 들어오는 대신 영상이 화면을 다 채우지 않는다).
- 세무 일정 점검 알림을 받을 사람과 30일 기준(P1).
- Pretendard OFL Reserved Font Name 과 subset 이름(P2).
- 이 계획 문서들(`docs/plans/production-fixes/`)을 저장소에 둘지.
- 위 「남김」 둘(수화 전 붙은 무대, 움직임 끔 포스터)과 promo.css prefetch preload 경고는 알고 둔 것이다.
