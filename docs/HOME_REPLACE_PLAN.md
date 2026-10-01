# 홈 교체 계획 — feat/home-redesign

> **끝난 옛 계획이다 (2026-09-30 확인).**
> - 홈은 `51c6c53`(2026-08-11)에서 이 계획대로 바뀌었고, 그 뒤 `ian` 리뉴얼에서 다시 고쳐졌다.
> - 아래 ⬜ 표시는 갱신하지 않은 것이다.
> - 지금은 없는 것: 브랜치 `feat/home-redesign`, 워크트리 `~/mh-home`, 원본 `~/hometax-promo/`, `diagnostic-checklist.tsx`, `motion` 의존성, 문의 API 의 `type`·`bottleneck`·`desiredOutput`·`timeline` 처리(2026-10-01 삭제. 쿼리 초안은 `contact-inquiry.tsx` 가 본문에 합친다).
> - 현재 구조는 `AGENTS.md`, 디자인 규칙은 `docs/DESIGN_SYSTEM.md` 를 본다.

> 만든 날: 2026-08-11
> 브랜치: `feat/home-redesign` (origin/main 에서 팜)
> 작업 위치: `~/mh-home` (git worktree)

---

## 한 줄

홈(`/`)을 **홈택스 대시보드 홍보 홈**으로 바꾼다.
화면은 홍보 홈 그대로, 내용만 **실제 데이터**와 연결한다.

원본: `~/hometax-promo/index.html` (2,290줄 단일 HTML, 로컬 :8090)

---

## 1. 무엇을 옮기나

| 항목 | 원본 | 옮길 곳 |
|---|---|---|
| 화면 구조 14구역 | `index.html` `<body>` | `src/app/page.tsx` |
| CSS 토큰·컴포넌트 | `index.html` `<style>` (약 1,030줄) | `src/app/promo.css` (새 파일) |
| 스크롤 동작 | `index.html` `<script>` (약 514줄) | `src/components/home/promo-motion.tsx` |
| 디자인 규칙 | — | `docs/DESIGN_SYSTEM.md` ✅ 완료 |

### 구역 14개

`hero` → `db-card` → `stats` → `why` → `feat` → `menu` → `evid` → `creed` → `svc` → `flow` → `vs` → `who` → `insight` → `end`

---

## 2. 실제 데이터로 연결할 것

### 2-1. 인사이트 → `getAllPosts()`

홍보 홈은 글 4건이 하드코딩돼 있다. 실제 글 목록으로 바꾼다.
글을 쓰면 홈에 자동 반영된다.

```
분류 · 제목 · 날짜  →  post.category / post.title / post.date
링크                →  /blog/{post.slug}
```

### 2-2. 하는 일 6칸 → `services`

**⚠ 여기서 문제가 있다. 아래 3번 참고.**

```
제목 · 설명  →  service.title / service.description
링크         →  /services/{service.slug}
```

---

## 3. ⚠ 확인이 필요한 것 — 서비스 6칸이 실제와 다름

홍보 홈의 "하는 일" 6칸은 **실제 서비스 목록과 내용이 다르다.**
홍보 홈을 만들 때 지어낸 것이고, 실제 `lib/data.ts` 와 맞지 않는다.

| # | 홍보 홈 (지어냄) | 실제 서비스 (`lib/data.ts`) |
|---|---|---|
| 1 | 세무 기장 | **세무 기장** ← 유일하게 일치 |
| 2 | 부가가치세 | 세무 조정 |
| 3 | 법인세 · 종합소득세 | 세무 자문 |
| 4 | 급여 · 4대보험 | 기업가치평가 |
| 5 | 결산 · 재무제표 | M&A · IPO 자문 |
| 6 | 세무 자문 | 회계감사 · 회계자문 |

**고를 것**

| 안 | 무엇 | 결과 |
|---|---|---|
| A | 실제 서비스로 교체 | 링크가 다 살아난다. 글이 바뀐다 |
| B | 홍보 홈 글 유지 + 링크 없음 | 화면 그대로. 클릭이 안 된다 |
| C | 실제 서비스에 세무 3종을 추가 | `lib/data.ts` 를 건드려야 한다 |

**지금은 A 로 진행하되, 되돌리기 쉽게 한 곳에 모아둔다.**

---

## 4. 살려야 할 것 — 손대지 않는다

### 4-1. 백엔드

| 무엇 | 어디 | 상태 |
|---|---|---|
| 문의 접수 API | `src/app/api/contact/route.ts` | **손대지 않음** |
| 메일 발송 (Resend) | 같은 파일 | 환경변수는 Vercel 에 있음 |
| 요청 제한 (Upstash) | 같은 파일 | — |
| `llms.txt` | `src/app/llms.txt/route.ts` | — |

### 4-2. CTA 흐름

홈에서 나가는 링크는 **전부 기존 목적지를 지킨다.**

| 홍보 홈의 버튼 | 가야 할 곳 |
|---|---|
| 기장 이관 상담 / 상담하기 | `/contact` |
| 화면 먼저 보기 | `/contact` |
| 하는 일 → 자세히 | `/services/{slug}` |
| 모든 글 보기 | `/blog` |
| 각 글 | `/blog/{slug}` |
| 프로필 전체 보기 | `/about` |
| 전화로 문의 | `/contact` |
| 카카오 채널 | `siteConfig.kakaoChannelUrl` |

**모달·팝업은 원래 없다.** 전부 페이지 이동이다.

### 4-3. 공통 헤더·푸터

`src/app/layout.tsx` 의 `<Header />` `<Footer />` 는 그대로 둔다.
홍보 홈에 들어 있는 자체 헤더·푸터는 **뺀다** (중복).

---

## 5. 🔴 이번에 안 고치는, 이미 깨져 있던 것

**이 브랜치가 만든 문제가 아니다.** 작업 전부터 있었다. PR 에 적어 남긴다.

### 문의 폼 프리필 3개가 버려지고 있음

CTA 가 문의 폼에 값을 미리 채우려고 쿼리를 보내는데, 받는 쪽이 안 읽는다.

| 보내는 쪽 | 보내는 값 | 결과 |
|---|---|---|
| `components/home/diagnostic-checklist.tsx:145` | `?type=` `?bottleneck=` `?output=` | ❌ 셋 다 버려짐 |
| `app/services/[slug]/page.tsx:322` | `?type=` `?output=` | ❌ 둘 다 버려짐 |

**원인**

- `app/contact/page.tsx:22` — `searchParams` 타입이 `{ message?: ... }` 하나뿐
- `components/contact/contact-form.tsx:24` — `initialValues` 가 `Pick<FormData, "message">`

**API 는 준비돼 있다.** `api/contact/route.ts` 는 `type` `bottleneck` `desiredOutput` `timeline` 을 다 처리한다. **폼이 안 채워서 빈 채로 갈 뿐이다.**

→ 기능 수정이라 이 브랜치에서는 **안 건드린다.** 별도로 처리한다.

### 빈 링크

`app/preview/page.tsx:142` 에 `href="#"` 하나. 그대로 둔다.

---

## 6. 나머지 10개 페이지

**큰 틀은 안 바꾼다.** 디자인 시스템에서 크게 어긋난 것만 잡는다.

대상: `/about` `/services` `/services/[slug]` `/blog` `/blog/[slug]` `/clients` `/contact` `/members` `/pricing` `/preview`

**잡을 것 (어긋난 것만)**

| # | 무엇 | 왜 |
|---|---|---|
| 1 | 한글에 `<br>` 로 줄 나눈 곳 | 좁은 화면에서 낱말이 붙는다 |
| 2 | 지정 색 밖의 색 | 색은 9개로 묶여 있다 |
| 3 | 글자 크기 6단계 밖의 값 | 위계가 안 보인다 |
| 4 | 본문 폭이 제각각인 곳 | 1600 / 1280 두 종류만 |
| 5 | Pretendard 가 아닌 본문 글꼴 | Inter 등 |

**안 잡을 것:** 배치, 구조, 기능, 글 내용

---

## 7. 라이브러리

| 이름 | 상태 |
|---|---|
| `gsap` | ✅ 이번에 설치 (`^3.15.0`) |
| `lenis` | 이미 있음 (`^1.3.23`) |
| `motion` | 이미 있음 — 기존 페이지들이 씀 |

홍보 홈이 CDN 으로 부르던 걸 npm 으로 바꾼다. CDN 장애에 안 흔들린다.

---

## 8. 순서

1. ✅ 브랜치 `feat/home-redesign` + 워크트리 `~/mh-home`
2. ✅ `gsap` 설치
3. ✅ `docs/DESIGN_SYSTEM.md`
4. ✅ 이 계획서
5. ⬜ CSS 옮기기 → `src/app/promo.css`
6. ⬜ 화면 옮기기 → `src/app/page.tsx` (헤더·푸터 빼고)
7. ⬜ 동작 옮기기 → `promo-motion.tsx`
8. ⬜ 실제 데이터 연결 (글 / 서비스)
9. ⬜ CTA 링크 연결
10. ⬜ 타입체크 · 빌드 · 5개 폭 확인
11. ⬜ 나머지 10개 페이지 어긋난 것만 교정
12. ⬜ PR (5번 문제를 본문에 적기)

---

## 9. 커밋

**아직 아무것도 커밋·푸시하지 않았다.** 지시가 있을 때만 한다.
