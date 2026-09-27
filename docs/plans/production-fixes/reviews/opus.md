approve-with-changes — Opus 5.5 xhigh (critic) 독립 검토, 2026-09-27. 원문 요약 보존.

## 단계별
| Step | Call | Reason |
|---|---|---|
| P0 | change | promise-stage/complaint-thread/promise-orbs는 `/`(`src/app/page.tsx:62`), keep-list만 `/about`(`about/page.tsx:192`). P4 기준은 P3 뒤 다시 뜰 것(R6). 압축 기준 수치는 커밋(`temp/` 는 gitignore, 워크트리는 일회용). 320·960–1280 폭 추가 |
| P1-1 | keep, change details | Next 16 권장 패턴(use-search-params.md:130-133). 세부 3건 오류(R8) |
| P1-2 | keep, change details | 팝업은 홈이 아니라 /portal. 라벨 하나 누락, 링크 달 고정, audit 경고가 출력 안 됨(R12) |
| P1-3 | keep; drop honeypot | 이미 aria-hidden+tabIndex=-1. disabled 기본 버튼은 암묵 제출 막음. 인접 결함 R13 |
| P2-1 | keep scheme, change delivery | 대체 동작 맞음. subset-font 2.9.0 은 레이아웃 기능·가변축 보존(index.js:118-125,180-199). 캐시·빌드 연결 R9·R15 |
| P2-2 | change | 폰트 버전 폴더 이동 불필요(R9). 미디어는 참조 전부 함께(R10) |
| P2-3 | keep | ffmpeg 있음 |
| P3-1 | change | 계산은 맞으나 결정은 주인 몫(R14) |
| P3-2 | keep | 320·960–1280 폭 추가(R16) |
| P3-3 | keep, narrow | WCAG 2.5.8 간격 예외. 박스<24 검사는 과대 집계. /pricing 은 숨김 페이지라 낮음 |
| P3-4 | change | 두 항목이 문구대로면 실패(B1, R11) |
| P3-5 | keep; drop fixture build | 한 번 수동 확인이면 충분 |
| P3-6 | change | 증상 처리. 원인은 JS 가 레이아웃을 고르는 것(R7) |
| P3-7 | keep | `?service=<slug>` 사용(acceptance.spec.ts:35-40). tax-advisory 처리. 버튼 셋 모두(header.tsx:140,149,216) |
| P3-8 | keep | postalCode 지어내지 말 것 |
| P4 reveals | change | html.js 선숨김 금지. 기존 이름·props 유지(R4) |
| P4 tilt-card, image-reveal | drop (삭제) | index.ts 외 사용처 없음 |
| P4 evidence-demo | keep | |
| P4 진행 막대 | change | Lenis 에 묶으면 reduced-motion 에서 멈춤(R5) |
| P4 complaint-thread | change | step 은 스크롤이 정하고, 말풍선 성장은 Motion `layout`(R2) |
| P4 스크롤 장면 | change | 스크롤 진행률→CSS 변수. /about 에 GSAP 추가 금지(R3) |
| P4 수용 | change | P3 뒤 기준, 시간 표본/영상 비교. P4a(리빌·막대·evidence·삭제)/P4b(장면) 분리 |
| P5 | keep; drop api/search 주석 | 소유자 규칙 위반(B2). 토큰 중복 주장 일부 틀림 |
| P6 | change | P1 을 먼저 따로 릴리스, Vercel preview 확인(R1, R9) |
| §5 예산 테스트 | keep, Chromium only | Firefox·WebKit 은 LayoutShift API 없음 |

## 발견 (심각한 순)
- **B1** P3-4 대로면 데스크톱 홈에 h1 이 없어진다. flat 에서 첫 h1 은 영상 위 워드마크(`about-opening.tsx:145`), 두 번째는 `What` 안(`:218`). `What` 은 데스크톱(`:188`)과 공용이고 거기서는 유일한 h1. `audit.mjs:9` 가 reduced-motion 이라 axe 는 데스크톱 레이아웃을 못 본다. → 영상 위 워드마크(:145)를 강등. 숨은 설명은 Wordmark 가 아니라 h1 에(헤더 로고도 Wordmark).
- **B2** P5 의 api/search 주석 수정은 `src/app/api/**` 불가침 위반.
- **R1** 릴리스 순서가 보안 수정을 P4 에 묶는다. 운영은 next 16.2.4(critical 1/high 6). P1 을 별도 커밋/PR 로 Next 올림과 함께 먼저. BE-01 이 여전히 운영 조건임을 명시.
- **R2** complaint-thread 의 step 은 스크롤 위치(promise-stage.tsx:68-77). 점 말풍선→글 말풍선 성장은 Motion `layout`(complaint-thread.tsx:222,248-251, "나누지 말 것"). CSS 로 auto 크기 전환 불가 → FLIP(GSAP Flip 9.7KB 또는 손 30줄). promise-orbs 는 임계값 발동 시간 전환. CLS 여유 적음: 데스크톱 홈 0.0858 중 0.0665 가 `imsg-out-lines`.
- **R3** /about 에 GSAP 은 이득 없음. keep-list 는 모바일 가드 없음. GSAP core+ScrollTrigger 46.3KB gz ≈ Motion 청크. promo-scenes.ts 는 ScrollTrigger.update·gsap.ticker 를 쓰지 않는다(:334 주석 부정확). → 네이티브 scroll 한 훅으로 진행률→CSS 변수. about-opening 이 이미 `--vp`·`--rest` 로 그렇게 한다(:163,186). GSAP 을 쓴다면 ease none, scrub:true, 길이 1, async import unmount 가드.
- **R4** html.js 선숨김은 첫 화면 제목을 수화까지 숨겨 LCP 를 늦춘다. 지금은 서버에서 보임(animate-on-scroll.tsx:68-69). 홈은 mount 시 화면 아래 것만 숨긴다(promo-scenes.ts:46). 이름·props 유지(호출 131곳). fadeUp·fadeIn 만 쓰임.
- **R5** reduced-motion 이면 Lenis 가 없다(smooth-scroll-provider.tsx:33) → 네이티브 scroll.
- **R6** P3 가 장면 요소를 의도적으로 움직이므로 P4 기준은 P3 뒤에 뜬다. 정지 화면은 scrub 지연·곡선·시간 전환을 못 본다 → 임계값 뒤 0/150/300/600/1200ms 표본 또는 영상.
- **R7** `useHandheld` 는 서버에서 "모바일 아님"(use-media.ts:24-28,34-36) → 휴대폰도 첫 화면은 데스크톱 레이아웃(about-opening.tsx:157), 수화 후 flat 으로 바뀐다. 이전 계획 후속 #2(validation.md:45). flat 은 reduced-motion 데스크톱에서도 쓰인다. → P3-6 을 P4 오프닝 재작성으로, 한 DOM + CSS 미디어쿼리.
- **R8** 대표 카드가 수화 때 깜빡인다(AnimateOnScroll 이 새로 그려져 inView false 로 시작, blog-content.tsx:156) → 감싸기 제거. URLSearchParams 를 서버에서 넘기면 빌드 실패. 대표는 1장 → 고유 slug 13, href 14. main 은 /blog 에서 51편 모두 링크 → 약 13 으로 줄어드는 것은 명시적 수용(사이트맵이 전부 포함).
- **R9** 안정 이름 CSS + immutable 이면 재방문자가 옛 CSS 를 쥐고 사라진 해시 폰트를 가리킨다. → 생성 폰트·CSS 를 `src/` 아래 두고 layout 에서 import → Next 가 `/_next/static/media` 에 지문을 찍고 immutable(헤더 문서 :397). 10분 스파이크로 data: URL 이 아닌지 확인(CSP font-src 'self'). 생성기는 `build` 스크립트 안에(prebuild 는 대시보드 override 로 건너뛸 수 있음). 헤더 확인은 Vercel preview 에서.
- **R10** 미디어 이동 참조: OG/Twitter(layout.tsx:67,72), `.hero-video` CSS 배경(globals.css:2080), hero-video.tsx:24-28, about-opening.tsx:139-141,167-169.
- **R11** /clients "01" 은 이미 aria-hidden 이고 axe 대비 검사는 aria-hidden 을 건너뛰지 않는다 → 색 변경(디자인) 또는 문서화된 예외.
- **R12** 홈에 일정 팝업 없음(/portal 에만). `ScheduleButton` 의 "다음 일정 미등록" 라벨 누락. 출처 링크 달 고정. content-audit 는 경고 30개만 찍는데 이미 51개 → 일정 경고를 먼저. 갱신 담당·주기 명시(작은 scheduled workflow). 가짜 날짜는 Playwright `page.clock`.
- **R13** /contact 는 fallback 폼이 수화 때 새 인스턴스로 바뀐다 → 수화 전 입력 유실. 폼 하나를 Suspense 밖에 두고 URL 초안은 안쪽의 빈 자식이 적용. noscript 는 JS 는 켜졌는데 수화 실패인 경우를 못 막음 → 수화 전까지 보이는 안내.
- **R14** 0.86 에서는 뒤가 14% 만 보여 굴절이 거의 사라진다. 고객 첨삭은 "너무 불투명", main 의 0.9 가 그 계기. 2–3개 값을 WebKit 포함 나란히 주인에게. Safari 가 @supports(globals.css:2283)를 통과하면서 SVG 필터는 안 그릴 수 있다.
- **R15** ≤400KiB 는 못 맞출 가능성. Cormorant 정체·이탤릭 두 파일(37.8/39.3KB) 모두 preload, 이탤릭은 안 씀 → 600 normal 만, 또는 "Meridian." 아홉 글자 서브셋.
- **R16** 헤더 가장 좁은 폭(320, 960–1280) 측정 추가.
- NIT: 글자 수집은 `ts.createSourceFile` AST 로. U+0020–007E 항상 포함. 드문 글자는 원래 조각 로드 전 잠깐 시스템 서체. 렌더 차단 CSS 가 family 당 약 17KB 늘어남. reduced-motion flat 에는 영상이 없어 포스터 preload 가 헛돈다. `--s1..--s7` 은 globals.css 에 없고 promo.css:45 에만 — 실제 중복은 `--t-*`(promo.css:38-43 vs globals.css:1612-1617)와 색. promo-scenes.ts:334 주석. knip 버전 고정. `imageCredits` 는 footer.tsx:2,153 이 씀. services/[slug]/page.tsx:322 는 사례가 없어도 "업무 경험 & 인사이트".

## 계획에 없는 것
1. P1 뒤 Next 올림과 함께 릴리스 2. JS 가 모바일 레이아웃을 수화 뒤 고름(R7) 3. preload 경고(모바일 홈 meridian-logo.png, Cormorant 이탤릭) 4. /contact 수화 전 입력 유실(R13) 5. Vercel preview 확인 6. `ScheduleCube` 가 날짜를 알기 전 아무것도 안 그려 생기는 헤더 이동(schedule-cube.tsx:36, 0.006)

## 확인되어 문제없음
/blog Suspense fallback 패턴과 무쿼리 이동 0 주장(R8 깜빡임 제외). 두 family unicode-range 대체(CSS Fonts 규격). subset-font 의존성에 설치 스크립트 없음(CI --ignore-scripts 안전). disabled 기본 버튼의 암묵 제출 차단. public/ max-age=0 과 headers() 덮어쓰기. CSP 인라인 허용, /contract 예외 불변. P5 목록의 참조 0. 유리 알파 계산. ffmpeg. `<video><source media>` 지원.
