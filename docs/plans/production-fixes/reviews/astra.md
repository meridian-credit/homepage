approve-with-changes

검토 대상: `docs/plans/production-fixes/README.md` (2026-09-27). 독립 검토이며 다른 검토자의 작업·결과는 참조하지 않았다. 저장소 상대 경로를 근거로 쓴다.

계획의 방향은 타당하다. 정적 블로그 목록, 문의 GET 차단, 폰트 전송 축소는 실제 원인을 겨냥한다. 두 본문/제목 서체와 브랜드 연출을 지키고 백엔드를 별도로 인계하는 범위도 적절하다. 다만 그대로 실행하면 RSC 경계의 props 문제, 약속 장면의 시간·스크롤 의미 변경, reduced-motion에서 진행 막대 중단, 불완전한 폰트 캐시 계약이 생길 수 있다. 아래 변경을 반영한 뒤 실행하는 데 동의한다. 이 판정은 프론트 수정 계획에 대한 것이며, BE-01이 남은 상태에서 전체 사이트의 운영 준비 완료를 뜻하지 않는다.

VERIFIED는 현재 소스나 설치된 Next 16 문서/런타임, 명시한 1차 문서에서 확인한 사실이다. PLAUSIBLE은 아직 구현·브라우저 측정하지 않은 위험 또는 예상 효과다. 이번 검토에서 build/install/서버/브라우저 측정은 실행하지 않았고 저장소 파일도 수정하지 않았다. 기존 성능 수치를 독립 재측정한 것으로 표시하지 않는다.

단계별 판단

| 단계·하위 항목 | 판단 | 이유·필요 변경 |
|---|---|---|
| P0 production/TLS 기준선 | keep | 운영 CSP를 보존한 비교가 맞다. 실제 구현 때 수행할 일이며 이번 read-only 검토에서는 실행하지 않았다. |
| P0 14경로×2폭 바이트·CLS | change | “Claude 측정 스크립트”의 경로·버전과 정확한 14경로, 높이, cold/warm cache, 스크롤/대기 구간을 명시한다. 다른 사람이 같은 측정을 할 수 있어야 한다. |
| P0 Lighthouse 5경로 | keep | 동일 브라우저·throttling·측정 조건의 전후 비교로 충분하다. 점수 경쟁이나 새 CI 서비스는 불필요하다. |
| P0 장면별 5지점·산출물 | change | 공간 진행률뿐 아니라 threshold 이후 경과 시간, 역방향, 빠른 스크롤 영상이 필요하다. 모바일 flat 장면에 가짜 scrub 진행률을 만들지 않는다. P4 직전 승인된 P1–P3 변경을 반영한 비교 기준도 보관한다. |
| P1-1 정적 목록 fallback | change | Suspense 접근은 유지하되 `URLSearchParams` 인스턴스를 서버→클라이언트 props로 넘기지 않는다. query string 또는 plain object를 전달한다. “대표 5+12개 링크”와 “cat만 달라진다”도 실제 UI에 맞게 정정한다. F1 참조. |
| P1-2 공식 일정·period·출처 | keep | 추측 달력을 만들지 않고 공식 게시 범위만 유지하는 것이 적절하다. 현재 period는 이미 있다. |
| P1-2 만료 링크 | change | 문구만 바꾸지 말고 링크도 현재 서울 연·월로 가게 한다. 현재 출처 URL은 2026년 10월 고정이다. 개별 일정 출처와 현재 달 안내 URL을 분리한다. |
| P1-2 45일 경고·날짜 시험 | keep | 날짜 경과만으로 build를 실패시키지 않는 것이 맞다. 빈 배열, 이미 만료, 44/45/46일, 연말·서울 자정도 작은 날짜 fixture로 확인한다. 시험용 날짜를 운영 query/env 우회 기능으로 만들 필요는 없다. |
| P1-3 POST·hydration 전 disabled·noscript | keep | 프론트 범위에서 GET 노출을 막는 적절한 최소 수정이다. `disabled = !hydrated || sending`을 지키고 JS 차단/지연 및 수화 후 재시도를 함께 확인한다. 서버 POST 접수가 구현됐다고 표시하면 안 된다. |
| P1-3 honeypot 보완 | drop | 현재 이미 컨테이너 `aria-hidden`, 입력 `tabIndex=-1`이 있다. 검증만 유지하고 중복 보완 작업은 삭제한다. |
| P2-1 두 서체·기존 shard 재사용·정확한 unicode-range | keep | 제한된 글자 집합의 최적화와 전체 원본 fallback을 함께 쓰는 것은 합리적이다. 전면적인 폰트 서비스보다 작다. |
| P2-1 “fallback이면 절대 시스템 서체로 안 튄다” | change | 원본이 가진 글자와 로딩 완료 조건으로 한정한다. 원본 shard 전체를 받으며 swap 중에는 시스템 서체가 가능하다. F6 참조. |
| P2-1 글자 수집·subset-font·prebuild/predev | change | JSX/템플릿/escape 처리를 parser로 보장하거나 보수적으로 모든 소스 문자를 모은다. 생성 CSS 연결 방법, 실패 시 build 중단, 재현 가능한 해시, clean build를 명시한다. predev는 시작 후 편집마다 재생성하지 않으므로 재실행 절차만 문서화하면 충분하다. |
| P2-1 Cormorant 축소 | keep | `.brand-word`가 쓰는 600을 보존하고 실제 사용 style도 확인한다. 브랜드 로고까지 Pretendard로 바꾸는 뜻으로 해석하면 안 된다. |
| P2-1 40%·글자폭·fallback 검사 | change | 시험 수치를 목표 달성 증거로 취급하지 않는다. 제목 block 폭 대신 텍스트 Range/inline 폭, 줄 수·높이와 본문 표본도 잰다. 드문 문자 입력은 실제 rendered font와 네트워크로 확인한다. |
| P2-2 version/hash·immutable | change | 원칙은 keep. 생성 CSS/manifest의 캐시 계약과 파일 이동 참조를 포함하고, immutable 규칙을 version/hash 전용 namespace로 제한한다. 실제 Vercel 헤더는 후속 검증으로 남긴다. |
| P2-3 WebP·홈 전용 preload | keep | 같은 poster URL을 preload와 video에서 공유하고 JSX에서는 `fetchPriority`를 쓴다. 축소 파일의 육안 품질과 중복 요청 없음도 확인한다. |
| P2-3 모바일 영상 | change | 모바일 WebM 및 지원용 MP4 source 순서, 767/768 경계, 회전/resize, 자동재생 실패·reduced-motion을 포함한다. 고정 390px 품질만 보고 태블릿/고DPR을 무시하면 안 된다. 도구 부재 시 명시적 후속으로 넘기는 것은 허용한다. |
| P3-1 밝은 헤더 막 | keep | glass.css를 손대지 않는 국소 수정이다. 0.86은 계산 출발점이지 최종 시각 승인값은 아니다. 아래 fallback 분기까지 브라우저별 확인한다. |
| P3-2 최소 12px | change | 목표는 keep. 정적 삽화만 예외로 하고 조작 가능한 portal 데모 전체를 aria-hidden으로 숨기지 않는다. 제목/라벨 확대에 따른 줄바꿈은 승인된 변화로 기록한다. |
| P3-3 24×24 탭 영역 | change | padding은 합리적이나 음수 margin이 이웃 hit area와 겹치지 않게 확인한다. 작은 bounding box 전수 0과 WCAG 충족은 같은 것이 아니다. range thumb 확대뿐 아니라 track의 조작 가능 영역도 확인한다. |
| P3-4 h1·설명·heading order | keep | 실제 표시/접근 가능한 h1 하나에 업종을 담는다. 모바일/desktop/reduced/no-JS에서 중복 로고가 어떤 요소인지 명시한다. |
| P3-4 clients 장식 번호 aria-hidden 추가 | drop | 이미 적용돼 있다. 같은 속성을 다시 넣어 axe 대비 경고가 없어진다고 약속하지 않는다. 명시한 장식 예외와 실제 텍스트 대비 결함을 구분한다. |
| P3-4 axe 합격선 | change | 기존 region·장식 숫자의 근거 있는 예외를 명시하고 새 serious/critical 0을 확인한다. 현재 audit는 8경로뿐이다. /about·상세 경로와 키보드/확대도 포함한다. |
| P3-5 사례 개수→메뉴·칩 | keep | 서버 layout에서 boolean/count만 넘기면 충분하다. 원본 insightCategories는 보존하고 표시만 필터해 직접 /blog?cat=case 의미를 잃지 않는다. DesktopNav/MegaPanel/MobileNav 모두 같은 값을 사용한다. |
| P3-6 모바일 첫 화면 | change | 방향은 keep. 390×844 top<700에 더해 375×667에서 실제 한 줄의 bottom이 viewport 안에 있는지, 헤더/영상에 가리지 않는지 잰다. P4 기준과 충돌하지 않도록 의도한 크기 변경을 분리한다. |
| P3-7 서비스 CTA | keep | 명확한 그룹 규칙과 기존 type 파싱을 재사용한다. URLSearchParams로 인코딩하고 데스크톱/모바일 둘 다 검사한다. 8개 외 기존 tax-advisory 별칭/분류 경로도 확인한다. |
| P3-8 tel·JSON-LD | keep | 기존 siteConfig를 재사용하는 작은 개선이다. address 배열은 PostalAddress의 streetAddress 등 실제 구조로 변환하고 안전한 JSON-LD 직렬화를 유지한다. |
| P4 의존성 제거 목표·한정 동적 import | change | CSS 전환→진행 막대→scene 순서로 나눠 효과를 확인한다. GSAP은 필요한 breakpoint/모션 설정에서도 조건부 로드한다. 라이브러리 제거를 위해 UI를 바꾸지 않는다. |
| P4 기본 reveal·stagger·line·image | change | 공용 IO 훅은 작게 유지한다. opacity뿐 아니라 clip-path/scale-origin/parent stagger/amount를 옮긴다. html.js 전역 숨김 대신 해당 observer 준비 이후 요소 단위로 활성화한다. |
| P4 tilt-card | keep | 참조가 없으면 삭제하고 pointer 버전으로 굳이 다시 만들지 않는다. |
| P4 evidence-demo | keep | once-in-view boolean 대체가 정확하다. 기존 count-up 취소와 reduced-motion 동작은 유지한다. |
| P4 헤더 진행 막대 | change | Lenis 없는 native scroll 경로가 필수다. 문서 높이 변경·라우트 이동·resize에도 재계산한다. spring 제거는 정적 캡처가 아닌 움직임 비교로 승인한다. |
| P4 complaint-thread | change | once reveal로 치환하지 않는다. step/typing/exit 상태를 보존하고 상태 변경에 CSS timed transition을 붙인다. |
| P4 about-opening·keep-list | keep | 연속적인 transform 구간은 ScrollTrigger scrub에 적합하다. 선형 ease, 기존 offset 및 responsive geometry를 보존한다. |
| P4 promise-stage·promise-orbs | change | threshold 상태 변경과 시간 전환이 섞인 장면이다. 전부 scrub timeline으로 바꾸는 것은 동등 이전이 아니다. F2 참조. |
| P4 Lenis 공용 연결·cleanup | change | 기존 provider를 유일한 RAF 소유자로 유지한다. 코드에 없는 ScrollTrigger.update 연결을 “기존 연동 추출”이라고 가정하지 않는다. 동적 import 완료 전 unmount도 처리한다. |
| P4 성능·장면·수명주기 수용 | change | 5개 정지점+rect만으로 부족하다. 아래 F3의 동작 검증을 추가하고 route별 net JS를 잰다. |
| P4 장면별 rollback | keep | 장면 단위로 안전하게 되돌리고 최종 한 커밋으로 정리하는 방식은 적절하다. Motion이 남으면 “완전 제거” 및 40KB 기준 달성으로 보고하지 않는다. |
| P5 미사용 컴포넌트·자산·전용 CSS | keep | 참조 확인 후 삭제한다. 동적 문자열, MDX, metadata와 public 문서 경로도 확인한다. knip은 보조 자료이며 삭제의 단독 근거가 아니다. |
| P5 npx knip | change | 버전을 명시한 일회성 실행이면 충분하다. 고정되지 않은 최신 도구를 재현 가능한 검증처럼 적지 않는다. 별도 의존성 상시 추가는 불필요하다. |
| P5 CSS 토큰 단일화 | change | 이름이 같아도 값이 다른 토큰까지 합치지 않는다. 동등한 값/의미만 alias하고 나머지는 범위별 override를 유지한다. |
| P5 sitemap/constants/layout 주석 | keep | 코드에 맞추는 작은 정리다. constants의 sitePages 주석도 /pricing robots 설명이 틀려 함께 바로잡을 수 있다. |
| P5 api/search 주석 수정 | drop | 주석만이어도 src/app/api/** untouched 요구 위반이다. BE 후속으로 옮긴다. |
| P5 검색 재시도 불안정 테스트 | keep | 재현 후 원인에 따라 기다림/경합을 고치는 방향이 맞다. Chromium CDP CPU 제한과 다른 엔진 반복 검사를 구분한다. |
| P5 CI 미변경 | keep | 기존 workflow를 유지한다. 새 폰트 도구를 넣은 lockfile은 기존 audit/signature gate를 통과해야 한다. |
| P6 필수 gate·측정 | change | 전체 gate는 마지막에 한 번 실행하고 위험 높은 공통 변경에는 넓은 회귀, 국소 변경에는 해당 검사로 조절한다. 측정 조건·경로·예외를 명시한다. |
| P6 implementation/MEMORY/AGENTS·한 커밋 | keep | 실제 구현 시 적절하다. 이번 read-only 검토에는 적용하지 않는다. |
| §5 성능 예산 | change | P2의 40%와 ≤400KiB를 한 정의로 맞추고 route별 기준을 둔다. font bytes/CLS 측정 시 캐시와 관측 구간을 고정한다. 반복 측정에서 LCP가 악화되면 바이트 합격만으로 닫지 않는다. |
| §6 불필요한 플랫폼/재설계 제외 | keep | 작은 사이트에 맞다. CSS Modules/CMS/Lighthouse CI는 필요 없다. |
| §7 BE·주인 판단 후속 | keep | 문의 API·실메일·개인정보 사실·콘텐츠 검토를 범위 밖으로 남기는 것이 지시와 맞다. BE-01 미해결을 완료 보고에도 드러낸다. |
| §8 의도한 변경표 | change | P3 이후 비교 기준과 연결한다. P4의 의도치 않은 차이를 사후에 표에 넣는 것만으로 승인하지 않는다. |

중요도순 발견 사항

F1. 높음 — blog fallback은 맞지만 props와 수용 기준은 그대로 구현할 수 없다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:65`, `:67`, `:68`, `:70`; `src/app/blog/blog-content.tsx:1`, `:79`, `:86`, `:89`, `:142`, `:145`, `:171`.

BlogContent는 state와 이벤트를 쓰는 Client Component다. 서버 page에서 만든 URLSearchParams를 그대로 넘겨 `.get()` 가능한 객체로 받을 수 있다는 가정은 틀리다. 설치된 Flight 구현은 일반 iterable을 배열/fragment로 직렬화한다(`node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-server.node.development.js:2923`). 따라서 단순히 “클래스라 build 오류”라고 단정할 것도 아니다. 핵심은 URLSearchParams의 메서드 계약이 RSC 경계에서 보존되지 않는다는 것이다. `query=""`를 전달하고 클라이언트 모듈 안에서 파싱하거나 plain `{cat,q,page}`를 쓴다. [React의 직렬화 가능한 props 규칙](https://react.dev/reference/rsc/use-client#serializable-types-returned-by-server-components)도 참조했다.

Suspense fallback 자체는 정확하다. 설치된 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md:82`와 `:156`은 정적 렌더에서 fallback이 HTML에 포함됨을 설명한다. contact와 같은 구조를 재사용하고 동적 page 전환은 필요 없다.

대표 글은 5개를 동시에 렌더하지 않고 현재 heroPost 하나를 보여준다. 정적 검사는 실제 12개 목록과 선택된 대표 링크, 기대 slug 집합을 확인해야 한다. raw HTML 문자열에는 RSC 데이터도 섞이므로 HTML 링크 DOM을 검사한다. cat뿐 아니라 q/page도 수화 후 달라진다. 무쿼리 페이지도 font swap/reveal 때문에 CLS 0을 논리적으로 보장할 수 없다. <0.1을 측정한다. deep-link의 기본 목록→필터 결과 교체 및 no-JS에서 query 미반영이라는 제한은 명시한다.

F2. 높음 — P4가 약속 장면을 잘못 분류해 스크롤의 의미를 바꾼다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:215`, `:216`; `src/components/about/promise-stage.tsx:40`, `:55`, `:68`, `:79`; `src/components/about/promise-orbs.tsx:29`, `:36`, `:39`; `src/components/about/complaint-thread.tsx:83`, `:116`, `:124`, `:141`, `:167`.

PromiseStage는 scroll에서 이산 step, exit>=0.70, orbs>=0.78을 만든다. PromiseOrbs는 show가 바뀐 뒤 1.4초, 두 번째 원 0.35초 지연으로 전환한다. ComplaintThread는 step별 typing→text, 출구 방향, 1.05초 이동/0.8초 지연 opacity를 가진다. IO once+delay 또는 전부 scrub로 바꾸면 멈춰 읽기·재진입·역방향의 동작이 달라진다.

간단한 동등 이전은 ScrollTrigger onUpdate에서 기존 상태를 유지하고 CSS transitions로 현재 시간·곡선을 옮기는 것이다. opening/keep-list의 연속 transform만 scrub로 한다. 모바일에서는 이미 flat이며 promise scene을 새로 pin/scrub하지 않는다.

F3. 높음 — P4 수용 기준은 디자인의 핵심 시간 동작을 검증하지 못하고 P3 변화와 충돌한다. [VERIFIED: 검증 공백 / PLAUSIBLE: 회귀 발생]

근거: 계획 `docs/plans/production-fixes/README.md:56`, `:122`, `:187`, `:221`; 이전 계획 `docs/plans/ui-ux-remediation/README.md` UI-08의 역방향·재진입·빠른 스크롤 요구; 현재 `tests/e2e/acceptance.spec.ts:20`.

0/25/50/75/100% 정지점은 0.70/0.78 경계와 typing 중간 상태를 놓친다. rect가 같아도 opacity 0, clip-path 잘림, 다른 easing, transition 중단은 통과한다. 기존 reduced test는 홈 .rise 계열 중심이어서 새 /about 이전을 포괄하지 않는다. P3가 영상 높이와 글자 크기를 바꾸는데 P4에서 무조건 P0 rect≤4px를 요구하면 승인된 변화까지 회귀로 잡는다.

일회성 작은 capture script로 충분하다. 각 장면의 scroll start/end·offset·viewport height·elapsed time을 기록하고, 0.70/0.78 직전/직후 및 시간 전환 중간/완료를 추가한다. 정상/역방향/빠른 이동 후 정지 영상을 남긴다. opacity/clip-path/색/가독성도 확인한다. P3 완료 후 승인된 장면 기준을 P4 비교용으로 고정하되 최초 P0는 성능·전체 디자인 근거로 보관한다. resize·route 왕복·motion 설정 실시간 변경·JS chunk 실패를 포함한다. 새 시각 회귀 서비스는 필요 없다.

F4. 높음 — Lenis 이벤트만으로 진행 막대를 교체하면 reduced-motion에서 정지한다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:214`; `src/components/providers/smooth-scroll-provider.tsx:33`; `src/components/layout/header.tsx:18`, `:184`.

reduced-motion일 때 provider가 ReactLenis를 렌더하지 않는다. 따라서 Lenis scroll 이벤트도 없다. passive native scroll+resize로 문서 진행도를 계산하고 RAF로 묶으면 이 2px 막대에는 충분하다. Lenis 이벤트를 쓴다면 native fallback과 최초/높이 변경 업데이트가 필요하다. spring(200/50)을 Lenis smoothing으로 바꾸는 것은 같은 동작이 아니므로 느린/빠른 스크롤과 reduced-motion의 별도 승인 항목으로 둔다.

F5. 높음 — 전역 html.js 숨김은 JS 일부 실패 때 본문을 영구히 숨길 수 있다. [PLAUSIBLE]

근거: 계획 `docs/plans/production-fixes/README.md:211`; 기존 `src/components/motion/animate-on-scroll.tsx:56`, `:68`; `src/app/layout.tsx:124`.

현재 html에는 js class가 없고 기본 reveal은 서버 상태에서 보인다. 계획대로 전역 class를 먼저 켜면 observer chunk가 실패하거나 늦게 로드되는 동안 본문이 숨을 수 있다. JS disabled 시험만으로는 잡히지 않는다. 요소가 관찰 준비를 마친 후에만 enhancement 상태를 붙이고 in-view 콘텐츠는 재차 숨기지 않는 작은 설계가 낫다. 기본 CSS는 visible, reduced-motion은 언제나 visible, cleanup/실패도 visible로 복구한다. IO 하나를 공유하는 거대한 registry는 필요 없다.

F6. 중간 — 폰트 fallback 원리는 맞지만 네트워크·품질 보장은 과장됐다. [VERIFIED: 규칙 / PLAUSIBLE: 절감·시각 동일성]

근거: 계획 `docs/plans/production-fixes/README.md:108`, `:110`, `:118`, `:121`; `public/fonts/pretendard/PretendardVariable.css:13`, `:14`; `public/fonts/wanted/WantedSansVariable.css:13`, `:14`; `src/app/globals.css:36`, `:40`.

[CSS Fonts의 unicode-range 규칙](https://www.w3.org/TR/css-fonts-4/#descdef-font-face-unicode-range)은 범위 밖 문자 때문에 해당 face를 받지 않으며 실제 cmap과의 교집합을 사용한다고 정한다. subset family→원본 family 순서는 유효하다. 그러나 한 글자 때문에 원본 shard 하나 전체를 받는다. 원본에도 없는 문자, emoji, load 실패는 뒤 fallback으로 간다. 두 원본 모두 font-display:swap이어서 로딩 중 시스템 서체 가능성도 있다. “사이트 전체에서 첫 family를 받지 않는다”가 아니라 “그 범위 밖 문자를 위해 해당 subset face를 받지 않는다”가 정확하다.

같은 source font·weight 범위·layout features를 유지하면 동일한 모습은 합리적 기대다. [subset-font 문서](https://github.com/papandreou/subset-font)는 WOFF2 및 가변축 보존을 지원한다. 하지만 사이트의 byte reduction, 2초 생성, 모든 줄바꿈 보존은 아직 검증되지 않았다. 원본 대비 40%를 각 경로 cold load에서 재야 한다. 원본 로딩이 누락 글자를 조용히 가리므로 평상시 페이지에서 예상 밖 원본 shard 다운로드도 찾는다. 제목 block 폭≤1px만으로는 글리프 폭 동일성을 입증하지 못한다.

F7. 중간 — 폰트 생성물의 배포·CSS 캐시 계약이 빠져 있다. [VERIFIED: 명세 공백 / PLAUSIBLE: stale CSS·배포 실패]

근거: 계획 `docs/plans/production-fixes/README.md:112`, `:116`, `:127`; `src/app/layout.tsx:134`; `package.json:6`; `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md:27`; `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md:395`.

WOFF2만 hash해도 stable `site.css`를 /fonts/site/* immutable 아래 두면 새 글자 집합을 배포한 뒤 오래된 CSS를 계속 쓸 수 있다. CSS도 hash하고 layout이 생성 manifest를 읽게 하거나, 더 단순하게 WOFF2만 hash/immutable로 하고 stable CSS는 재검증하도록 분리한다. 파일 hash는 최종 bytes에 기반하고 원본 version 경로는 내용 불변을 지킨다. /media/* blanket 규칙도 mutable 파일이 들어오지 않는 계약이 있어야 한다.

[Vercel build 문서](https://vercel.com/docs/builds/configure-a-build#build-command)는 package.json build 및 기본 devDependencies 설치를 지원하므로 build-time 생성 자체는 타당하다. 실제 dashboard override가 next build를 직접 실행하면 npm prebuild를 건너뛸 수 있다. clean checkout에서 npm ci→npm run build, 생성 CSS/WOFF2 존재와 URL 200을 검사하고 배포 build command를 기록한다. 배포는 이번 작업에서 하지 않으므로 Vercel CDN 헤더·설정은 미검증으로 남긴다.

TypeScript scanner를 단순 scan()으로 돌리는 것과 JSX/template/escaped text를 정확히 수집하는 것은 다르다. 이미 설치된 TypeScript AST를 쓰거나 모든 관련 소스 문자를 보수적으로 모으는 정도가 충분하다. 런타임 숫자·문장 조합을 완벽히 추적하는 새 분석기는 과설계다. 누락은 원본 fallback으로 안전하게 처리하고 전송 검증으로 찾는다.

F8. 중간 — “기존 Lenis–ScrollTrigger 연동 추출”은 실제 구현과 다르다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:216`; `src/components/home/promo-scenes.ts:37`, `:334`, `:471`; `src/components/home/promo-motion.tsx:14`, `:23`; `node_modules/lenis/dist/lenis-react.mjs:45`, `:61`.

promo-scenes는 Lenis 이벤트를 자체 frame()에 연결하며 해당 연결이 ScrollTrigger.update를 호출하는 공용 bridge는 아니다. 주석만 보고 추출하면 안 된다. [Lenis 공식 연동 예시](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger)는 ScrollTrigger.update를 연결한다. 다만 여기 ReactLenis는 autoRaf가 이미 켜져 있다. 예시의 gsap ticker→lenis.raf까지 그대로 더하면 RAF 소유권을 중복시킨다.

기존 provider를 유지하고 필요한 최소 update 구독만 연결하며 구독/trigger/context를 소유 범위에서 해제한다. async import 이후 unmount 확인, font/image 준비 뒤 geometry refresh, breakpoint 재구성도 명시한다. /about 모바일에 필요 없는 GSAP을 effect라는 이유만으로 내려받으면 비홈 JS −40KiB 목표가 깨질 수 있다. 라이브러리별 gzip 추정이 아닌 route별 실제 net transfer로 판단한다.

F9. 중간 — 만료 안내가 최신 달을 약속하면서 과거 달로 보낼 수 있다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:82`; `src/lib/schedule.ts:1`; `src/components/layout/schedule-cube.tsx:37`; `src/components/home/schedule-popup.tsx:108`.

scheduleSource는 taxMonth=10&taxYear=2026이다. 11월 이후에도 링크만 이름을 바꾸면 10월 일정으로 간다. 검토한 일정의 출처 URL은 고정해 유지하고 만료 안내용 URL은 서울 현재 연·월로 별도 구성한다. 연말 rollover에서도 실제 href가 맞는지 검사한다. 링크 상태가 “있다”는 시험만으로는 부족하다.

F10. 중간 — API 주석 수정은 범위 위반이다. [VERIFIED]

근거: 계획 `docs/plans/production-fixes/README.md:19`는 src/app/api/**를 고치지 않는다고 하고 `:246`은 api/search/route.ts 수정을 지시한다. 사용자 요구도 untouched다. 이 한 항목을 drop하고 BE 후속에 기록하면 해결된다. API 동작을 바꾸지 않는다는 설명으로 파일 변경 금지를 우회하지 않는다.

F11. 중간 — 두 접근성 수정은 이미 구현됐으며 자동 검사 합격선이 실제 범위를 잘못 나타낸다. [VERIFIED]

근거: `src/components/contact/contact-form.tsx:123`, `:129`; `src/components/clients/stage-picker.tsx:81`; 계획 `docs/plans/production-fixes/README.md:98`, `:171`; `scripts/qa/audit.mjs:9`, `:11`, `:15`; 이전 `docs/plans/ui-ux-remediation/implementation/validation.md` 접근성 잔여 항목.

honeypot과 장식 숫자 모두 이미 aria-hidden 처리돼 있다. 중복 속성 추가는 해결책이 아니다. 현재 audit는 /about와 서비스/블로그 상세를 검사하지 않고 reduced-motion 및 HTTP 3100을 고정한다. 따라서 그 출력이 region 외 0이라고 해서 P4 전체 장면·운영 TLS가 검증되는 것은 아니다. 실제 대상 경로와 HTTPS base URL을 명시한다. 장식 숫자 예외는 사유를 유지하고 의미 있는 글자의 대비 결함만 수정한다. portal의 기간 탭/KPI 버튼(`src/components/home/evidence-demo.tsx:43`, `:51`)은 실기능이므로 작은 데모 글자 예외를 이유로 전체를 접근성 트리에서 제거하면 안 된다.

F12. 중간 — 폼의 최소 수정은 적절하지만 실패/지연 상태 인수 기준을 보완해야 한다. [VERIFIED: 최소 수정의 의미 / PLAUSIBLE: 지연 입력 유실]

근거: 계획 `docs/plans/production-fixes/README.md:94`; `src/components/contact/contact-form.tsx:47`, `:121`, `:221`; `src/components/contact/contact-inquiry.tsx:24`; `tests/e2e/contact-rendering.spec.ts:10`.

[HTML implicit submission 규칙](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission)에 따르면 disabled인 기본 submit 버튼은 Enter로 활성화되지 않는다. POST는 GET URL 노출을 막는 추가 방어다. 이 범위에서 새 endpoint/action을 만들 필요 없다.

단, noscript는 JS가 켜져 있는데 chunk가 실패한 경우에는 보이지 않는다. 기존 직접 연락처는 계속 보여야 한다. 현재 fallback ContactForm과 URL 기반 ContactForm은 교체될 수 있으므로 수화 지연 중 입력 후 교체 시 입력 보존/재입력 안내를 확인한다. 최소 acceptance는 valid fake input+Enter, no navigation/no request, disabled 상태, 지연 chunk 해제 후 정상 enabled, sending 중 disabled 유지다. 실제 메일은 mock으로 차단한다.

F13. 낮음 — 미디어 이동의 비화면 참조와 preload 후속이 빠졌다. [VERIFIED: 참조·누락 / PLAUSIBLE: broken URL]

근거: 계획 `docs/plans/production-fixes/README.md:129`, `:134`; `src/app/layout.tsx:67`, `:72`; `src/components/about/about-opening.tsx:139`, `:167`; `src/components/layout/hero-video.tsx:24`; 검토 `docs/reviews/2026-09-27/ian-production-readiness.md:238`.

home poster는 OG/twitter에도 쓰인다. 이동/삭제 때 metadata·CSS·video·preload를 함께 갱신하거나 구 URL을 유지한다. 새 preload가 실제 선택된 poster와 같고 이중 다운로드가 없는지 확인한다. 이전 검토의 “로고/CSS preload 경고”는 이번 계획 작업/후속 어디에도 명시되지 않았다. 경고 원인을 분류해 불필요한 preload만 없애거나 Next가 생성한 무해한 경고로 근거와 함께 후속 기록한다. 프레임워크 CSS preload를 경고만 보고 일괄 제거하면 안 된다.

F14. 낮음 — 헤더·성능·순서의 기준을 조금 더 정확히 해야 한다. [VERIFIED: 현재 기준 / PLAUSIBLE: 효과]

근거: `src/app/globals.css:2205`, `:2283`; 계획 `docs/plans/production-fixes/README.md:34`, `:122`, `:265`, `:272`.

밝은 막 0.86은 흰 바탕/검정 배경 글자의 단순 합성에서 합리적이다. 실제 굴절 이미지·색·브라우저 fallback은 다르며 @supports fallback은 별도로 0.5+blur를 쓴다. 데스크톱·모바일 Chromium뿐 아니라 WebKit/Firefox에서 메뉴 앞글자의 읽기 대비까지 확인해야 한다. 굴절을 없애거나 alpha를 전역 일괄 변경할 필요는 없다.

모바일 폰트 ≤400KiB와 P0 대비 ≥40%는 658KiB baseline에서 정확히 같은 합격선이 아니다(40% 감소는 약 395KiB). 바이트 종류(transfer/encoded body), 폰트 ready, 캐시 비활성, CLS 관측 종료 시점을 정한다. 저사양 모바일 LCP도 같은 조건에서 전후 기록하고 반복 악화가 있으면 원인을 확인한다. 자동 budget test 하나는 충분하며 새 성능 플랫폼은 과하다.

실행 순서는 P0→P1→P2→P3→P4 직전 기준 고정→P4→P5→P6로 명확히 한다. P2가 글자 metric/로드 시점을 바꾸므로 P4 이전에 끝내야 한다. 모든 단계마다 전 브라우저 build/e2e를 무조건 반복한다는 원칙은 작고 독립적인 정리까지 비싸게 만든다. 공통 렌더·폰트·모션 변경에는 넓은 검증, 국소 문구/주석에는 관련 검사, 마지막에는 전체 gate로 충분하다.

누락·후속 범위 확인

프론트 검토의 큰 항목들은 대부분 포함됐다. 개인정보 처리 안내, 오래된 글 51편, 대시보드 약속 문구, 메뉴 영문, portal 길이, 데스크톱 첫 화면은 §7에 명시적으로 남아 있어 누락으로 보지 않는다. BE-01/02와 서버 no-JS POST도 명확한 후속이다. 그 일을 이 계획에 끌어와 DB/queue/CRM을 추가할 이유는 없다.

추가할 것은 위의 preload 경고 분류, 현재 월 링크 목적지, 신규 폰트 CSS 배포/캐시 계약, /about 장면의 동작 인수 범위, 자산 이동의 metadata 참조다. 가장 큰 과설계 위험은 도구 수를 줄인다는 명분으로 hybrid animation을 전부 scrub로 다시 만드는 것이다. 가장 큰 부채 위험은 반대로 html.js 전역 숨김과 원본 font fallback에 기대어 실패·누락을 조용히 감추는 것이다. 기존 상태·markup를 유지한 작은 CSS/IO/ScrollTrigger 이전과 명확한 clean-build 계약으로 둘 다 피할 수 있다.
