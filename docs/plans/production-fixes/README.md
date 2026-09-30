# 배포 전 수정 계획 — 2026-09-27 검토 후속 (v2, 검토 반영)

작성: 2026-09-27 · 기준: `ian` `936315b` (+ 검토 문서 `51837d2`)

> **상태 (2026-09-30):** P1–P6 를 모두 반영했다(`f4556d3`, `30fdebb`).
> - 결과와 측정은 [implementation.md](./implementation.md) 에 있다.
> - 이 수정은 `dev` 브랜치(https://accounting.teamcredit.kr)에 있고, `main`(운영)에는 아직 없다.
> - 미룬 백엔드 항목은 [백엔드 후속 목록](../ui-ux-remediation/backend-backlog.md) 에 있다. 2026-09-30 에 다시 감사했다.

근거 문서:

- [2026-09-27 통합 검토](../../reviews/2026-09-27/ian-production-readiness.md)
- 앞선 계획 [ui-ux-remediation](../ui-ux-remediation/README.md)
- [백엔드 후속 목록](../ui-ux-remediation/backend-backlog.md)

계획 검토: [Opus 5.5 xhigh](./reviews/opus.md) · [Astra](./reviews/astra.md). 둘 다 approve-with-changes 였다. 무엇을 받고 무엇을 버렸는지는 §9 에 있다.

## 1. 목표와 범위

검토에서 나온 결함을 **원인에서** 고친다. 부채가 남는 쪽보다는 다시 쓰는 쪽을 고른다.
작은 자문사의 영업 사이트에 맞지 않는 틀은 만들지 않는다. CMS, CSS Modules, 시각 회귀 서비스, Lighthouse CI 가 그런 예다.

지킬 디자인 방향:

- 영상 판과 워드마크
- 굴절 유리 헤더
- 남색·파랑 팔레트
- 두 서체 (본문 Pretendard, 제목 Wanted Sans)
- 섹션 순서
- 스크롤 장면의 인상

바꾸는 것은 결함으로 확인된 것과 [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) 스스로의 규칙을 어긴 것뿐이다. 바뀐 화면은 모두 §8 에 적는다.

**이번에 하지 않는 것:** 백엔드와 DB. 사용자 지시다. `src/app/api/**` 는 주석 하나도 고치지 않는다. 목록은 §7 에 있다.

**운영 조건 (검토 결론 유지):** 문의 API 가 실패를 성공으로 표시하는 결함(BE-01)이 남아 있는 한, 운영 공개는 주인이 이 위험을 받아들인다고 명시해야 가능하다.

## 2. 원칙

1. **도구는 일마다 하나.**
   - 스크롤에 묶인 연출은 CSS 변수로 한다. 네이티브 `scroll` 을 듣는 작은 훅 하나가 진행률을 CSS 변수로 쓴다.
     오프닝이 이미 `--vp`·`--rest` 로 이렇게 하고 있으니, 그 방식을 넓힌다.
   - 한 번 나타나는 연출은 CSS 전환과 IntersectionObserver 로 한다.
   - 홈과 포털의 복잡한 장면은 GSAP 이 그대로 맡는다.
   - 부드러운 스크롤은 Lenis 다.
   - `motion` 의존성은 없앤다.
2. **서버 HTML 이 완성본이다.**
   - JS 가 없거나 늦어도 본문, 목록, 연락처, 첫 화면 레이아웃이 맞아야 한다.
   - 모바일·데스크톱 레이아웃은 JS(`useHandheld`)가 아니라 **CSS 미디어쿼리**가 고른다.
   - 숨김은 요소마다, 관찰 준비가 끝나고 화면 아래에 있을 때만 건다. 전역 선숨김은 하지 않는다.
3. **시간이 지나면 틀리는 데이터는 조용히 망가지지 않게 한다.**
   - 만료되면 공식 출처의 **이번 달**로 안내한다.
   - 만료가 다가오면 audit 이 **맨 앞**에 경고를 찍는다.
   - 주간 점검이 알린다.
4. **측정으로 닫는다.** 레이아웃은 Playwright `getBoundingClientRect` / `getComputedStyle` 로 잰다. 측정 조건은 §5 에 고정한다.
5. **보안 수정을 뒤 단계에 묶지 않는다.**
   - P1 은 따로 한 커밋으로 끝낸다. 그 커밋을 가리키는 `ihseo/release-p1` 브랜치 포인터를 만든다.
   - 그렇게 하면 `ian`(Next 16.3.4 포함) + P1 을 먼저 PR 로 낼 수 있다.
   - P2–P6 은 그 위의 다음 커밋이다.

## 3. 순서

| 단계 | 내용 | 위험 | 커밋 |
|---|---|---|---|
| P0 | 기준 측정 (**완료**: `temp/baseline/`, 요약은 §5) | — | — |
| P1 | 블로그 정적 목록, 일정, 문의 폼 | 낮음 | **커밋 A** (+ 이 계획) |
| P2 | 폰트·미디어·캐시 | 중간 | 커밋 B |
| P3 | UI/UX 규칙 위반 | 중간 | 커밋 B |
| P4 기준 | P3 끝난 화면으로 장면 기준 다시 뜨기 | — | — |
| P4a | 리빌·진행 막대·evidence-demo·안 쓰는 motion 컴포넌트 삭제 | 중간 | 커밋 B |
| P4b | 장면: 오프닝·약속·대화·keep-list, 레이아웃을 CSS 로 | **높음** | 커밋 B |
| P5 | 정리 | 낮음 | 커밋 B |
| P6 | 전체 게이트, 문서 | — | 커밋 B |

- 게이트: 폰트, 모션, 공통 렌더처럼 넓게 닿는 변경 뒤에는 넓은 회귀를 돌린다. 문구·주석 같은 좁은 변경은 관련 검사만 한다.
- 전체 게이트는 커밋 A 와 커밋 B 직전에 각각 한 번씩 돈다.

## 4. 단계별 작업

### P1 — 머지 차단 결함 (커밋 A)

**P1-1 `/blog` 목록을 정적 HTML 에 싣는다**

- `BlogContent` 는 선택 prop `query?: string` 을 받는 클라이언트 화면 컴포넌트로 바꾼다. 파싱은 컴포넌트 안에서 한다.
  서버에서 `URLSearchParams` 를 넘기지 않는다. RSC 직렬화가 막는다.
- 같은 파일의 `BlogContentFromUrl` 이 `useSearchParams().toString()` 을 넘긴다.
- `page.tsx` 는 `<Suspense fallback={<BlogContent posts={posts} />}>` 로 바꾼다. `/contact` 와 같은 방식이다.
- 대표 카드의 `AnimateOnScroll` 감싸기는 뺀다. fallback 이 바뀔 때 카드가 opacity 0 으로 깜빡인다. 어차피 첫 화면 안이다.
- 수용 기준:
  - 빌드된 `blog.html` 을 DOM 으로 읽었을 때 `/blog/<slug>` 링크 고유값이 13개다(대표 1 + 목록 12).
  - JS 를 끄면 목록이 보인다.
  - `/blog` CLS < 0.1 (Chromium, 데스크톱·모바일).
  - 기존 페이지·뒤로가기 e2e 가 통과한다. 새 prerender·no-JS 테스트를 추가한다.
- 명시적으로 받아들이는 것:
  - main 은 `/blog` 에 51편을 모두 링크했다. 이제 13편이다. 나머지는 사이트맵과 글 사이 관련 링크가 잇는다.
  - 쿼리가 붙은 주소는 JS 없이는 1쪽 전체 목록으로 보인다.

**P1-2 세무 일정**

- 데이터:
  - 국세청에 **공식 게시된 달**까지 채운다. 확인 결과 11월과 12월은 게시되었고 2027년 1월은 아직이다. 게시되지 않은 달은 추측하지 않는다.
  - 기존 두 건에 다음을 더한다: 11/10 원천세, 11/30 소득세 중간예납, 12/10 원천세, 12/15 종합부동산세.
  - 항목마다 출처 URL(그 달)을 둔다.
- 만료 상태 (헤더 `ScheduleCube`, `/portal` 의 `ScheduleButton`·팝업):
  - "등록된 다음 일정이 없습니다"와 "다음 일정 미등록" 대신 **「이번 달 세무일정 · 국세청」** 링크를 둔다.
  - 링크는 서울 기준 **오늘의 연·월**로 만든다.
- 헤더 CLS: `ScheduleCube` 는 날짜를 알기 전에 아무것도 그리지 않는다(0.006 이동). 같은 크기의 자리를 먼저 그린다.
- 경고:
  - `content-audit.mjs` 가 남은 일정이 30일 미만이면 **맨 앞**에 경고를 찍는다(경고 목록 앞쪽). 빌드를 실패시키지는 않는다.
  - 주 1회 GitHub Actions `schedule-check.yml` 이 같은 검사를 엄격 모드로 돌린다. 실패하면 저장소 알림이 간다.
  - 갱신 담당은 주인이다. 절차는 AGENTS.md 에 적는다.
- 테스트: Playwright `page.clock` 으로 만료 이후 날짜를 둔다. 헤더·팝업이 링크 상태이고 href 의 달이 맞는지 본다.
  연말 넘어가는 경우(12/31 → 1월)도 본다.

**P1-3 문의 폼**

- 폼은 하나만 둔다.
  - 지금은 fallback 폼이 수화 때 새 인스턴스로 바뀌어 수화 전에 친 글이 사라진다.
  - `ContactForm` 을 Suspense **밖**에 한 번만 그린다. URL 초안(`?service=` 등)은 Suspense 안의 빈 자식(`InquiryDraft`)이 폼에 적용한다.
  - 사용자가 이미 친 칸은 덮지 않는다.
- `<form method="post">`: GET 으로 주소에 새는 길을 막는다.
- 제출 버튼은 `disabled = !hydrated || sending` 이다.
  - 수화 전 disabled 인 기본 버튼은 Enter 로 암묵 제출이 되지 않는다(HTML 규격).
- **수화 전까지 보이는 안내 한 줄**: "보내기가 켜지지 않으면 이메일·카카오로 보내 주세요" + 링크.
  - `data-hydrated` 로 CSS 가 숨긴다. noscript 와 수화 실패를 한 장치로 덮는다.
- honeypot 은 이미 가려져 있다(확인만).
- 수용 기준:
  - JS 를 끄고 올바른 가짜 입력 뒤 Enter → 주소 변화 없음, 요청 없음, 안내 보임.
  - JS chunk 를 늦추고(route 지연) 그동안 입력 → 수화 뒤 입력이 남아 있고 버튼이 켜진다.
  - 전송 중 disabled 가 유지된다.
  - 정적 prerender 테스트가 통과한다. 실제 메일은 mock 으로 막는다.

### P2 — 폰트·미디어·캐시

**P2-1 한글 웹폰트를 사이트 글자로 줄인다 (두 서체 유지)**

- 방식:
  - 기존 92조각 구조를 그대로 두고, 조각마다 사이트 글자만 남긴다. `unicode-range` 는 **실제 남긴 글자 목록**으로 적는다.
  - family 이름은 `"Pretendard Site"`, `"Wanted Sans Site"` 로 하고 `--font-sans` / `--font-display` 맨 앞에 넣는다. 원래 family 는 그 뒤에 남는다.
- 대체 동작 (정확히):
  - 사이트에 없는 글자는 그 글자를 덮는 subset face 가 없으니 원래 family 의 해당 조각을 받는다.
  - 받는 동안(`swap`)에는 잠깐 시스템 서체로 보인다. 원래에도 없는 글자는 그 뒤 fallback 으로 간다.
- 글자 모으기:
  - `ts.createSourceFile` AST 에서 문자열 리터럴, 템플릿 조각, JSX 텍스트를 모은다. 주석은 뺀다.
  - `content/**` 전문, CSS `content:` 도 모은다. U+0020–007E 는 항상 넣는다.
  - 빠진 글자는 원래 조각으로 안전하게 대체되고, P6 의 "예상 밖 원래 조각 다운로드" 검사로 찾는다.
- 배포 경로 (스파이크로 먼저 확인):
  - 생성한 woff2 와 CSS 를 `src/fonts/generated/` 에 두고 `layout.tsx` 에서 import 한다. 폴더는 git 에서 제외한다.
  - 그러면 Next 가 `/_next/static/media` 에 해시 이름과 immutable 캐시를 준다.
  - 원래 조각도 같은 방식으로 `src/fonts/` 아래에서 import 한다. 그러면 `public/fonts` 의 `max-age=0` 문제가 같이 사라진다.
  - 스파이크에서 data: URL 로 인라인되면(CSP `font-src 'self'` 에 막힌다) 대안으로 간다: woff2 는 해시 이름에 immutable, CSS 는 해시 이름으로 만들어 layout 이 manifest 를 읽는다.
- 실행:
  - `"build": "node scripts/fonts/subset.mjs && next build"`, `dev` 도 같게 한다. prebuild 는 대시보드 override 로 건너뛸 수 있어 쓰지 않는다.
  - 생성기가 실패하면 build 도 실패한다. 같은 입력이면 같은 해시가 나온다.
  - devDependency `subset-font@2.9.0` 을 쓴다. 설치 스크립트가 없어 CI 의 `--ignore-scripts` 에 안전하다.
- Cormorant(`next/font/google`): 워드마크의 `600` normal 만 남긴다. 이탤릭 preload 를 없앤다.
- 수용 기준 (측정 조건 §5):
  - 모바일 cold load 폰트 전송이 `/`, `/blog`, `/services`, `/contact` 각각 **P0 대비 ≥ 40% 감소**한다.
  - 표본 텍스트 노드 20개의 Range 폭 차이 ≤ 0.5px, 줄 수가 같다(1440·390).
  - 일반 페이지에서 원래 family 조각 요청이 0 이다.
  - 검색창에 사이트에 없는 글자를 쳤을 때 원래 조각 요청이 생기고, 그 글자가 같은 family 로 그려진다.
  - clean checkout 에서 `npm ci && npm run build` 뒤 CSS 와 woff2 URL 이 200 이다.

**P2-2 미디어 이름과 캐시**

- 영상과 WebP 포스터를 `public/media/<이름>.v1.<ext>` 로 옮기고 `/media/*` 에 immutable 헤더를 준다.
  - 규칙: 이 폴더의 파일은 내용이 바뀌면 이름(버전)을 바꾼다. AGENTS.md 에 적는다.
- 참조를 모두 고친다: `hero-video.tsx`, `about-opening.tsx`(두 곳), `globals.css` `.hero-video` 배경(:2080).
- OG/Twitter 이미지(`layout.tsx:67,72`)는 **지금 JPG 주소를 그대로** 둔다. SNS 캐시를 깨지 않는다.
- 수용 기준: 참조 grep 에 옛 주소가 0 이다(OG JPG 제외). 로컬 `curl -I` 로 헤더를 본다. Vercel CDN 헤더는 preview 에서 확인한다(§7).

**P2-3 첫 화면 이미지·영상**

- 포스터는 WebP 로 한다. 홈에만 `<link rel="preload" as="image" fetchPriority="high" media="(prefers-reduced-motion: no-preference)">` 를 둔다.
  - reduced-motion 의 flat 레이아웃에는 영상이 없어 preload 가 헛돌기 때문이다.
  - `<video poster>` 와 같은 URL 로 이중 다운로드를 피한다.
- 모바일 영상은 `ffmpeg` 로 저해상도 인코드를 둔다.
  - `<source media="(max-width: 767px)">` 를 webm·mp4 각각 두고, 그 뒤에 기본 webm·mp4 를 둔다.
  - 767/768 경계, 회전, 자동재생 실패, reduced-motion 을 확인한다.
- 수용 기준: 모바일 홈 미디어 전송이 줄고, 1440·390 첫 화면 품질이 같다(육안 + 파일 크기 기록).

### P3 — UI/UX 규칙 위반

**P3-1 유리 헤더 가독성 (굴절 유지)**

- 밝은 쪽 막 `--glass-bar-bg` 알파를 올린다.
  - 0.66 에서 뒤 글자 대비는 2.37:1 이다. 0.78 이면 약 1.6:1, 0.86 이면 1.38:1 이다.
  - **적용값은 0.8 안팎**이다. 뒤 글자 대비 ≤ 1.6:1 을 지키면서 뒤가 20% 비친다.
- 굴절 필터, 히어로 위 투명 상태, `@supports` fallback 분기는 그대로 둔다.
- 0.66 / 0.8 / 0.86 세 값을 Chromium 과 WebKit 에서 같은 스크롤 위치 3곳으로 찍어 나란히 둔다. 최종 값은 **주인 확인 항목**이다(§7).

**P3-2 최소 글자 12px**

- 읽는 글자 중 12px(`--t--1`) 미만인 것을 모두 올린다.
- 예외는 조작할 수 없는 **정적 삽화**뿐이다. `/portal` 의 기간 탭·KPI 같은 실기능 데모는 예외가 아니고, 접근성 트리에서 빼지 않는다.
- 폭 320 / 390 / 960 / 1280 / 1440 에서 가로 넘침 0, 헤더 겹침 0 이어야 한다. 줄바꿈이 바뀐 곳은 §8 에 적는다.

**P3-3 누를 자리 (WCAG 2.2 2.5.8)**

- 24×24 미만이면서 **간격 예외도 못 받는** 대상만 고친다. 로고, "모든 글 보기", 고객 단계 탭, 카카오·이메일 링크가 대상이다.
- 모양은 그대로 두고 padding 과 음수 margin 을 쓴다. 이웃 누를 자리와 겹치지 않는지 잰다.
- `/pricing`(숨김) 슬라이더는 쉬울 때만 한다.

**P3-4 제목 구조**

- 오프닝의 h1 은 `What` 안 워드마크 하나다. 데스크톱과 공용이다.
  - 영상 위 워드마크(`about-opening.tsx:145`, flat 쪽)를 `p` + `aria-hidden` 으로 강등한다.
  - h1 안(Wordmark 컴포넌트 밖)에 `<span class="sr-only"> — 세무·회계 자문</span>` 을 둔다.
  - P4b 에서 DOM 을 하나로 합칠 때도 이 구조를 지킨다.
- `/services`·`/faq`·`/portal`·`/about` 의 heading-order 를 고친다.
- `/clients` 의 장식 번호(`#C7D3EE`, 이미 aria-hidden)는 **문서화된 axe 예외**로 둔다. 색은 디자인이라 바꾸지 않는다.
- axe:
  - 경로를 넓힌다: `/about`, 서비스 상세, 블로그 글.
  - 두 모션 모드(reduce / no-preference)에서 HTTPS 로 돈다(`audit.mjs` 에 BASE·모션 인자).
  - 합격선: 새 serious/critical 0. `region`(건너뛰기 링크)과 위 장식 번호는 예외다.

**P3-5 빈 「업무경험」 갈래**

- 글이 있는 갈래만 메뉴(DesktopNav·MegaPanel·MobileNav)와 `/blog` 칩에 보인다.
  - `layout` 서버 컴포넌트가 개수를 세어 넘긴다. `insightCategories` 원본은 그대로 둔다.
  - `/blog?cat=case` 로 직접 들어오면 빈 상태 안내가 그대로 나온다.
- 서비스 상세의 "업무 경험 & 인사이트" 제목(`services/[slug]/page.tsx:322`)은 사례 글이 없으면 "인사이트"로 한다.
- 확인은 한 번 수동으로 한다(임시 사례 글로 빌드).

**P3-6 → P4b 로 옮김** (모바일 첫 화면은 레이아웃을 CSS 로 고르는 일과 함께 고친다)

**P3-7 서비스 맥락 CTA**

- 세무자문 갈래가 아닌 서비스 상세에서는 헤더 버튼 셋(`header.tsx:140,149,216`)을 "상담 문의하기"로 바꾼다. 링크는 `/contact?service=<slug>` 다.
- 세무자문 분류 페이지인 `tax-advisory` 는 "기장 문의하기"를 유지한다.
- 데스크톱과 모바일 모두 확인한다.

**P3-8 전화·구조화 데이터**

- `siteConfig.tel` 을 문의 페이지 「직접 연락처」와 푸터에 `tel:` 링크로 넣는다.
- JSON-LD 에 `telephone` 과 `PostalAddress` 를 넣는다. `streetAddress`, `addressLocality`, `addressCountry` 를 쓰고 `postalCode` 는 지어내지 않는다.

### P4 — Motion 제거

**P4 기준:** P3 까지 반영한 빌드로 장면 기준을 다시 뜬다. P0 기준은 성능과 전체 디자인 근거로 보관한다.

- 장면별 시작·끝과 offset 을 기록한다.
- 진행률 0/12.5/…/100% 정지 화면을 찍는다.
- **임계값 직전·직후 표본**을 찍는다: 약속 0.69/0.71, 0.77/0.79, 대화 step 경계.
- 임계값을 넘은 뒤 **0/150/300/600/1200ms 시간 표본**을 찍는다.
- 정상, 역방향, 빠른 스크롤 영상을 남긴다(`capture.mjs` 영상).
- 기록 값: rect, opacity, transform, clip-path, 색.

**P4a (중간 위험)**

- 리빌 (`AnimateOnScroll`, `StaggerChildren`, `StaggerItem`, `LineReveal` — 이름과 props 는 유지, 호출 131곳):
  - 서버 출력은 **보이는 상태**다.
  - mount 때 motion 이 허용되고 요소가 **화면 아래에 있을 때만** `data-reveal="pending"` 을 건다. 이것이 CSS 초기 상태다.
  - IntersectionObserver 가 한 번 `shown` 으로 바꾼다.
  - 실패하거나 cleanup 되면 보이는 상태로 돌아간다.
  - 쓰는 variant 는 fadeUp·fadeIn 둘뿐이다. 지금의 거리, 시간, 곡선, stagger 간격, amount 를 그대로 옮긴다.
- 헤더 진행 막대:
  - 네이티브 passive `scroll` + `resize` + rAF 한 번으로 `scaleX` 를 쓴다. 문서 높이 변화는 ResizeObserver 로, 경로 이동은 pathname 으로 다시 잰다.
  - Lenis 가 없어도(reduced-motion) 동작한다.
  - spring 대신 CSS `transition: transform 120ms linear` 로 근사한다. 움직임은 영상으로 비교해 승인한다.
- `evidence-demo`: `useInView` 를 작은 once-in-view 훅으로 바꾼다. count-up 취소와 reduced 동작은 유지한다.
- 삭제: `tilt-card`, `image-reveal`(사용처 없음), 안 쓰는 home 컴포넌트(P5 목록).

**P4b (높은 위험) — 레이아웃은 CSS 가, 진행률은 훅 하나가**

- 공용 `useScrollProgress(ref, offset)`:
  - 네이티브 scroll 에서 rAF 로 요소 진행률(0..1)을 계산해 `--p` 로 쓴다. 필요한 곳만 콜백을 준다.
  - React 를 다시 그리지 않는다. 약 40줄이다.
- 오프닝(`about-opening`):
  - **한 DOM** 으로 합친다. 휴대폰·reduced-motion 이면 CSS(`@media (max-width) / (prefers-reduced-motion)`)가 고정(pin)을 풀고 위아래로 쌓는다.
  - 서버 HTML 이 휴대폰에서도 처음부터 맞는 레이아웃이다(R7).
  - `useTransform` 구간을 `--p` 기반 `clamp()` 계산으로 옮긴다. 선형이다. 워드마크 비행, 영상 축소, 색 전환이 대상이다.
  - 비행 거리(dx/dy/s)는 지금처럼 JS 가 재서 CSS 변수로 넣는다.
  - 모바일 첫 화면: 영상 판 높이를 줄여 설명 첫 줄이 보이게 한다(구 P3-6). 390×844 에서는 첫 줄 top < 700 이고, 375×667 에서는 첫 줄 bottom 이 화면 안이다. 헤더·영상에 가리지 않는다.
- `keep-list`: 같은 훅과 `--p` 다. 모바일 동작은 지금과 같게 한다.
- `promise-stage`:
  - **상태 기계는 유지한다.** 훅 콜백으로 지금 임계값(TALK_FROM/TO, EXIT_AT 0.70, ORBS_AT 0.78)의 `step`/`exit`/`orbs` 를 계산한다.
  - flat 판정도 CSS 로 한다. 한 DOM 이다.
- `promise-orbs`: 상태가 바뀌면 CSS 전환을 건다. 1.4s, 두 번째 원 0.35s 지연, `cubic-bezier(.16,1,.3,1)` 로 지금과 같다.
- `complaint-thread`:
  - step·typing·exit 상태는 그대로 둔다. 등장과 퇴장은 CSS 전환으로 하되 지금 시간(1.05s 이동, 0.8s 지연 opacity)을 그대로 쓴다.
  - 점 말풍선 → 글 말풍선 성장은 **FLIP**(약 30줄, transform + 내용 역보정)으로 한다. 레이아웃은 한 번에 바꾸고 transform 으로 보간한다. CLS 가 지금 이하여야 한다.
- 수용 기준:
  1. `motion` 이 package.json 과 청크에서 없다.
  2. 비홈 모바일 경로의 net JS 전송이 P0 대비 ≥ 40 KiB 감소한다. 경로별로 잰다.
  3. P4 기준 대비 정지 표본의 핵심 요소 rect ≤ 4px, opacity ±0.05, 색 전환 지점 ±0.02 진행률.
  4. 시간 표본이 같은 곡선 안에 있다: 같은 시각에 ±8px, opacity ±0.1.
  5. 홈 데스크톱 CLS ≤ P0(0.0858).
  6. 휴대폰 첫 paint(JS 전)가 flat 레이아웃이다. JS 를 끄고 390 에서 확인한다.
  7. reduced-motion, JS 끔, lifecycle(RAF 누적 없음), resize·경로 왕복, 4개 브라우저 e2e 를 통과한다.
- 되돌리기: 장면마다 기준을 못 맞추면 그 장면만 되돌리고 보고한다. Motion 이 한 장면에라도 남으면 "완전 제거"로 보고하지 않는다.

### P5 — 정리

- 삭제 (참조 0 확인, `npx knip@5` 는 참고만):
  - 컴포넌트: `principal-unfold`, `hero-parallax`, `hero-text-reveal`, `hero-cta-button`, `diagnostic-checklist`, `sticky-scroll-services`, `constants.heroImages`.
  - 자산: `media/hero-3d.mov`·`.webm`, `profile-chest.jpg`, `founder-3d-serious.png`, `hero-document.webp`, `meridian-advisory-workspace-hero.webp`, 기본 svg 5개.
  - 동적 문자열·MDX·metadata 참조도 확인한다. `imageCredits` 는 footer 가 쓰니 남긴다.
- 죽은 CSS: 지운 컴포넌트 전용 선택자.
- 토큰: `promo.css` 와 `globals.css` 의 `--t-*`·색 중 **값과 뜻이 같은 것만** 하나로 두고 alias 한다. 다른 값은 범위별 override 로 남긴다.
- 어긋난 주석:
  - `sitemap.ts`, `constants.ts`(`navMenu`, `sitePages`), `layout.tsx`(폰트), `promo-scenes.ts:334`
  - `api/search/route.ts` 는 **손대지 않고** §7 로 넘긴다
- 불안정 e2e: 재시도 경로가 실제 `/api/search` 를 부르던 것을 fixture 로 응답하게 바꾼다. 테스트를 자기 완결로 만든다.
  재현 기록: 단독 90/90 통과, 전체 스위트 부하 중 1회 실패.
- preload 경고:
  - Cormorant 이탤릭은 P2-1 에서 사라진다.
  - `meridian-logo.png` 는 원인을 찾아 불필요하면 없앤다.
  - Next 가 경로 prefetch 로 만드는 CSS preload 는 원인만 기록한다.

### P6 — 게이트와 문서

- 게이트: `npm ci` → audit·signatures → `audit:content` → lint → tsc → build → TLS 프록시로 e2e 4개 프로젝트 → 측정 스크립트 → axe(두 모드) → lifecycle → Lighthouse(참고) → WebKit HTTPS 측정.
- 문서:
  - `implementation.md`: 결과표, P0 대비, 의도한 변경, 남은 일.
  - `AGENTS.md`: 폰트 생성, 모션 구조, 미디어 이름 규칙, 일정 갱신.
  - `MEMORY.md`.
  - 압축 기준 수치 `baseline.json` 은 커밋한다(스크린샷은 커밋하지 않는다).

## 5. 측정 조건과 예산

측정 조건:

- Chromium(Playwright 번들), 캐시 없음(새 context).
- `load` → `document.fonts.ready` → 1.2s 대기 → 0.6 뷰포트씩 휠 스크롤로 끝까지 → 0.8s.
- 바이트는 `transferSize` 합이다.
- 모바일은 390×844, DPR 3, `isMobile`, `hasTouch`. 데스크톱은 1440×900.
- CLS 는 load 부터 스크롤 끝까지의 layout-shift 합이다(Chromium 만).
- 스크립트: `temp/claude-qa/measure.mjs`. P6 에서 `scripts/qa/measure.mjs` 로 옮겨 커밋한다.

| 항목 | P0 | 합격선 |
|---|---:|---:|
| 모바일 폰트 전송 (`/`·`/blog`·`/services`·`/contact`) | 636·584·585·560 KiB | 각각 ≥ 40% 감소 |
| 비홈 모바일 JS 전송 | 311–334 KiB | 경로별 ≥ 40 KiB 감소 |
| `/blog` CLS | 데스크톱 0.595 | < 0.1 |
| 홈 데스크톱 CLS | 0.0858 | ≤ 0.0858 |
| 그 밖의 경로 CLS | ≤ 0.024 | < 0.1 |
| 가로 넘침 (320–1440) | 0 | 0 |

- Lighthouse 는 참고로만 기록한다. 같은 조건에서 LCP 가 되풀이해 나빠지면 원인을 확인한다.
- 예산 테스트는 e2e 에 Chromium 전용 하나만 둔다(`/`·`/blog` 모바일의 폰트 바이트와 CLS).

## 6. 하지 않는 것

- CSS Modules·CSS-in-JS 전환, `globals.css` 재구성
- CMS
- 시각 회귀 서비스, Lighthouse CI
- 폰트 CDN (CSP `font-src 'self'` 유지)
- `/portal` 개편, 메뉴 영문 표기 변경, 데스크톱 오프닝 구성 변경
- 스크롤 장면을 전부 scrub 타임라인으로 다시 만들기 (상태 기계와 시간 전환은 그대로 둔다)

## 7. 넘기는 것

**백엔드 (이번 범위 밖)** — [backend-backlog.md](../ui-ux-remediation/backend-backlog.md)

- **BE-01** Resend `{error}` 무시. **운영 공개 조건.**
- **BE-02** 속도 제한과 운영 환경 변수.
- 문의 폼 서버 폴백 접수(JS 없는 POST 를 받는 경로).
- `api/search/route.ts` 의 어긋난 주석(수임료가 색인된다는 문장).

**주인 확인**

- 헤더 막 알파(P3-1 비교 이미지).
- 개인정보 처리방침 사실 관계(확정되면 `/privacy` 는 프론트에서 바로 붙인다).
- 블로그 51편 편집 검토, 대시보드 문구, 메뉴 영문, `/portal` 길이.
- 일정 갱신 담당.

**배포 전에 확인할 것 (Vercel preview, SSO)**

- `/media`, `/_next/static/media` 캐시 헤더.
- 폰트 생성이 Vercel build 에서 도는지(build command override 가 없는지).
- 영상 전송.

## 8. 의도한 변경

| 변경 | 이유 |
|---|---|
| 밝은 쪽 헤더 막 알파 0.66 → 약 0.8 | 메뉴와 뒤 본문 겹침(주인 확인) |
| 12px 미만 → 12px 이상 | DESIGN_SYSTEM 최소 단계 |
| 누를 자리 확대 (모양 동일) | WCAG 2.5.8 |
| 모바일 오프닝: 첫 paint 부터 flat, 영상 판 축소 | 첫 화면에 서비스 설명. 수화 뒤 레이아웃 바뀜 제거 |
| 비세무자문 서비스 상세의 헤더 버튼 "상담 문의하기" | 맞는 말 |
| 빈 「업무경험」 숨김, 사례 없는 서비스 상세 제목 "인사이트" | 빈 갈래가 실적 없음으로 읽힘 |
| 일정 만료 시 이번 달 국세청 링크 | 헤더에 결함 문구를 두지 않음 |
| 문의: 수화 전 버튼 비활성과 안내 한 줄, 폼 하나 | GET 누출과 입력 유실 차단 |
| 헤더·팝업 전화 링크 | 연락 수단 |
| 진행 막대 spring → 짧은 linear | Motion 제거(영상 비교 승인) |
| (P6) /portal 기능 덱, 쌓은 판(≤1000px) 카드 높이 90px → `clamp(17rem, 66vw, 380px)` | 카드가 접혀 첫 줄과 큰 숫자 밖이 잘리던 결함(P0 이전부터) |
| (P6) 휴대폰 첫 화면 영상: 540×720 → 720×720 잘린 판, ≤540 세로에만 | 낮아진 영상 판(56svh)에서 포스터와 범위가 달라 재생 시작 때 튐, 541–767 확대 |
| (P4) 그 밖의 차이 | 수용 기준 밖이면 되돌린다. 사후에 표에 적는 것만으로 승인하지 않는다 |

## 9. 검토 반영 요약

| 항목 | 누가 | 반영 |
|---|---|---|
| `URLSearchParams` 를 서버에서 넘기면 안 됨. 수용 수 13 | 둘 다 | P1-1 |
| 대표 카드 깜빡임, 51→13 링크 명시 수용 | Opus | P1-1 |
| 일정 링크 달 고정, 팝업 위치, 라벨 누락, audit 30개 제한, 갱신 담당 | 둘 다 / Opus | P1-2 |
| 폼 입력 유실(fallback 교체), 수화 실패 안내 | Opus | P1-3 |
| honeypot·장식 번호 aria-hidden 이미 있음 | 둘 다 | 제거·예외로 |
| api 주석은 범위 위반 | 둘 다 | §7 로 |
| 폰트 CSS 캐시 계약, build 연결, AST 수집, 대체 설명 정정 | 둘 다 | P2-1 |
| Cormorant 이탤릭 | Opus | P2-1 |
| 미디어 참조와 OG | 둘 다 | P2-2 |
| h1 강등 대상이 틀림 (데스크톱 h1 사라짐) | Opus | P3-4 |
| 첫 화면 문제의 원인은 JS 레이아웃 선택 | Opus | P4b 로 합침 |
| 헤더 알파는 주인 결정, WebKit fallback | 둘 다 | P3-1 |
| html.js 선숨김 금지 | 둘 다 | P4a |
| 진행 막대 reduced-motion | 둘 다 | P4a |
| 약속·대화는 상태 기계 + 시간 전환, FLIP | 둘 다 / Opus | P4b |
| Lenis–ScrollTrigger 연동 주장 틀림 | 둘 다 | 문장 삭제 |
| /about 에 GSAP 대신 CSS 변수 (Astra 는 GSAP scrub 도 가능하다고 봄) | **갈림 → Opus 채택** | P4b. /about 모바일 JS 목표를 지키고, 이미 있는 `--vp` 방식과 같아서 |
| P4 기준을 P3 뒤에, 시간 표본·영상 | 둘 다 | P4 기준 |
| P1 먼저 릴리스, BE-01 운영 조건 명시 | Opus | §1, §2-5, §3 |
| 폭 320·960–1280 | Opus | P3-2 |
| ScheduleCube 헤더 이동 | Opus | P1-2 |
| 토큰 중복은 `--t-*`·색 (`--s*` 아님) | Opus | P5 |
| 측정 조건 명시, 예산 정의 통일 | Astra | §5 |
| fixture 빌드 테스트는 과함 | Opus | P3-5 수동 |
