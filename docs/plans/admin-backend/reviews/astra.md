<!-- gpt-6-astra, reasoning effort medium (codex exec), 2026-09-30. 같은 brief(../brief.md)로 따로 세운 계획. 원문 그대로. -->

# MERIDIAN 데이터베이스·백엔드·관리자 구축 계획

## 1. 권고안과 전제

**관리형 PostgreSQL을 콘텐츠 저장소로 도입하고, 기존 Next.js 앱 안에 한국어 관리자 화면을 구축한다.** 기본 조합은 **Neon PostgreSQL + Drizzle + 제한된 리치 텍스트 편집기 + S3 호환 객체 저장소**다. 공개 사이트는 사전 렌더링과 캐시를 유지하고, 문의 내용은 DB에 저장하지 않는다.

운영자는 비개발자 1–3명, 게시 빈도는 주 수회 이하라고 가정한다. 개발자가 콘텐츠 수정마다 배포하는 의존성을 없애되, 범용 CMS나 고객 관리 시스템까지 만들지는 않는다.

확인한 기준 커밋은 `37fc011`이다. 파일 읽기와 읽기 전용 조사만 수행했으며, 파일 수정·설치·빌드·커밋·배포는 하지 않았다. `temp/`에서는 지정된 brief만 읽었다.

현재 MDX는 54개이며, frontmatter 기준 공개 51개·비공개 3개다. 모두 명시적인 `sourceLinks`가 있었다. 간단한 패턴 검사에서는 모듈 import/export와 대문자 JSX 태그가 발견되지 않았다. **전체 MDX 문법의 무손실 변환 가능성은 UNVERIFIED**이며, 실제 이전에서는 AST 검사가 필요하다.

기존의 "DB·CMS를 만들지 않는다"는 판단은 당시 편집 수요를 전제로 했다. 이제 비개발자 편집이라는 요구가 명시되었으므로 콘텐츠 DB의 근거는 생겼다. 다만 문의 저장, CRM, 메일 큐를 기각했던 이유는 여전히 유효하다. (`docs/plans/ui-ux-remediation/backend-backlog.md:88`, `:128`)

## 2. 데이터베이스 선택

| 후보 | 이 사이트에서의 장점 | 비용·운영·이전 부담 | 판단 |
|---|---|---|---|
| **관리형 PostgreSQL—Neon** | Vercel과 자체 서버가 같은 표준 DB에 연결한다. 트랜잭션, 관계 검증, 이력 저장에 적합하다. | 외부 서비스 비용과 네트워크 의존성, 휴면 복귀 지연을 측정해야 한다. 백업 정책도 직접 설정해야 한다. | **기본 추천** |
| **관리형 PostgreSQL—Supabase** | DB·인증·업로드를 한 공급자로 묶을 수 있다. | 플랫폼 기능을 넓게 사용할수록 이전 범위가 커진다. 필요한 기능에 비해 서비스 표면이 넓다. | 공급자 수를 줄이는 것이 우선이면 대안 |
| **기존 서버의 PostgreSQL** | 직접 통제하며 기존 서버 자원을 활용한다. 표준 SQL이라 이전하기 쉽다. | 패치, 모니터링, 용량, 외부 백업, 복구 책임이 생긴다. 사이트와 DB의 장애 원인이 겹친다. Vercel 연결을 위한 안전한 접근 경로도 필요하다. | 운영 담당자가 명시될 때만 |
| **로컬 SQLite** | 이 규모의 읽기·쓰기에는 충분하고 구성 요소가 적다. | Vercel과 공유할 영속 파일이 없다. 자체 서버 단일 인스턴스와 볼륨·백업 운용을 먼저 확정해야 한다. | Vercel 이전이 선행된다면 재검토 |
| **libSQL/Turso** | 원격 접속으로 파일 배포 문제를 피하고 작은 데이터에 적합하다. | 원격 서비스·복구 정책은 여전히 운영해야 한다. PostgreSQL 대비 이 사이트만의 결정적 이점은 작다. | 가능하지만 우선순위 낮음 |
| **Git 기반 CMS—Keystatic/Tina/Decap** | 기존 Markdown, 코드 리뷰, Git 이력, 정적 빌드를 활용한다. DB 관리가 없다. | 공개 저장소의 초안도 공개된다. 게시에 빌드·배포가 필요하고, 편집자에게 Git 권한·충돌·실패 상태를 설명해야 한다. 비공개 콘텐츠 저장소를 추가하면 배포 인증도 달라진다. | 편집이 드물고 배포 지연을 허용하면 가장 단순한 대안 |

SQLite를 배제하는 이유는 데이터 규모가 아니다. 단일 파일 저장과 현재의 이중 호스팅 방식이 맞지 않는 것이 핵심이다. SQLite 공식 문서도 서버형 DB 선택을 동시 쓰기와 배포 구조 관점에서 설명한다. [SQLite 사용 적합성](https://www.sqlite.org/whentouse.html)

Keystatic은 GitHub 저장 방식과 브랜치 기반 편집을 지원한다. 그러나 공개 저장소에 기록한 초안의 비밀성을 해결해 주지는 않는다. [Keystatic GitHub 모드](https://keystatic.com/docs/github-mode)

Neon의 유료 요금은 사용량 기반이며 복구 이력 보관 범위도 요금제에 따라 다르다. Supabase는 유료 프로젝트의 일일 백업을 제공하지만 객체 파일 복구까지 동일하게 해결한다고 가정해서는 안 된다. [Neon 요금·복구 정책](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md), [Supabase 백업](https://supabase.com/docs/guides/platform/backups)

**비용 제안:** 앱 호스팅·메일을 제외한 DB·파일·외부 백업에 월 US$20–50의 초기 예산을 잡는다. 이는 견적이 아닌 예산 가정이다. 지역, 상시 가동 여부, 복구 기간, 개발 환경 수를 결정한 뒤 다시 산정한다. 무료 요금제의 존재를 운영 복구 보장으로 취급하지 않는다.

추천을 바꿀 조건은 다음과 같다.

- 자체 서버 이전이 먼저 끝나고 영속 볼륨과 복구 담당자가 확정되면 SQLite가 경쟁력이 있다.
- 월 1회 이하 편집이고 비공개 초안이 필요 없다면 Git 기반 CMS가 더 경제적이다.
- 인증·스토리지까지 한 공급자에서 운영하기 원하면 Supabase를 우선 비교한다.
- 국내 저장 위치가 필수이면 해당 조건을 만족하는 PostgreSQL 공급자를 다시 선정한다. **선택 지역과 데이터 이전 조건은 UNVERIFIED**다.

## 3. 백엔드 구조와 데이터 모델

### 3.1 애플리케이션 경계

별도 Express/Nest 서버 없이 Next.js를 모듈형 단일 앱으로 유지한다.

| 영역 | 제안 위치 | 역할 |
|---|---|---|
| 콘텐츠 스키마 | `src/lib/content/schema/` | 관리자 입력·이전·발행·공개 DTO 검증 |
| DB 접근 | `src/server/db/` | Drizzle 스키마, 연결, SQL 마이그레이션 |
| 콘텐츠 서비스 | `src/server/content/` | 저장, 검증, 게시, 복원, 공개 조회 |
| 인증 | `src/server/auth/` | 세션·역할·호스트 검증 |
| 미디어 | `src/server/media/` | 업로드 권한, 파일 검사, 참조 관리 |
| 관리자 | `src/app/(admin)/admin/` | 한국어 편집 UI |
| 공개 렌더러 | `src/components/content/` | 실제 페이지와 미리보기가 공유 |
| 이전 도구 | `scripts/content/` | 읽기 전용 비교, import/export |

Drizzle을 선택하는 이유는 TypeScript 스키마와 SQL 중심 접근을 함께 사용할 수 있기 때문이다. 생성된 SQL을 검토하고, 배포 때 명시적으로 실행한다. 운영에서 자동 schema push는 사용하지 않는다. [Drizzle 공식 설명](https://orm.drizzle.team/docs/overview)

Zod 등의 런타임 스키마를 함께 사용한다. TypeScript 타입만으로 외부 입력을 신뢰하지 않는다. 공개 컴포넌트에는 공개 DTO만 전달하고, 세션·초안·감사 정보가 포함된 DB 행을 직렬화하지 않는다.

### 3.2 저장 구조

규모에 맞게 공통 저장 구조는 작게 유지한다.

- `content_items`: UUID, 콘텐츠 종류, 고정 key/slug, 정렬값, 현재 초안 revision, 공개 revision, 잠금 버전, 생성·수정 시각.
- `content_revisions`: item FK, revision 번호, 스키마 버전, 검증된 JSONB 내용, 작성자, 변경 설명, 생성 시각. 저장된 revision은 수정하지 않는다.
- `content_references`: revision별 참조 대상 콘텐츠·미디어. 삭제 방지와 영향 범위 계산에 사용한다.
- `media_assets`: 객체 key, 형식, 크기, 가로·세로, 상태, 작성자, 시각.
- `audit_events`: 행위자, 작업, 대상, 이전·이후 revision, 성공 시각. 비밀 값과 문의 내용은 저장하지 않는다.
- 인증 라이브러리의 사용자·계정·세션 테이블.

콘텐츠 JSONB는 임의 필드 저장소가 아니다. 종류별 고정 스키마를 적용한다. 관계 대상은 발행 트랜잭션에서 존재·종류·공개 상태를 검증하고 FK로 삭제를 제한한다. 이 규모에서는 목록 배열까지 수십 개 테이블로 나누는 이익이 작다.

| 콘텐츠 종류 | 스키마와 편집 범위 |
|---|---|
| **블로그** | slug, 제목, 설명, 작성일, 수정일, 검토일, 적용일, 분류, 작성자 표시명/선택적 구성원 참조, 표지, 본문, keywords, 순서 있는 관련 글, 서비스 참조, 출처 배열, 세무 기준 포함 여부 |
| **서비스** | 현재 `Service`의 설명, CTA, details, deliverables/cards, applicableScenarios, regulations, keywords, mainWork, childSlugs, compare, postTopics를 보존. 아이콘은 등록된 이름만 선택 |
| **서비스 그룹** | 고정 ID, 제목, 설명, 순서 있는 서비스 참조. 4그룹·8서비스 및 별도 분류 페이지 관계를 검증 |
| **구성원** | 이름, 역할, 소개, 사진, 자격, 전문 영역, 경력, placeholder, 순서 |
| **고객 유형** | slug, 제목, 영문 라벨, 소개, 병목, 제공 결과, 적합 서비스 참조. 현재 `|` 줄바꿈 표시는 명시적 줄 배열로 변환 |
| **FAQ** | 질문, 답변, 순서, 노출 위치. `/faq`와 `/contact`는 같은 공개 데이터 사용 |
| **세무 일정** | 제목, 기한 DATE, 대상 기간, 공식 출처 URL, 확인일. 분기 단위 편집·일괄 게시 지원 |
| **사무소 정보** | 이름, 소개, 공개 이메일·전화·주소, 구조화 주소, 소속 안내, 허용된 외부 연락 링크 |
| **고정 페이지 문구** | 홈·소개·포털·문의의 정해진 섹션별 제목·본문·CTA. 기존 템플릿 안에서 편집 |
| **법적 안내** | 승인된 개인정보 안내 문안, 시행일, 검토자, revision. 보유 기간을 개발자가 임의 지정하지 않음 |
| **분류** | 기존 category label과 URL query slug 대응 유지. 첫 버전은 고정 목록 선택 |

현재 필드의 근거는 `src/lib/data.ts:1`, `:39`, `:50`, `src/lib/posts.ts:21`, `src/lib/constants.ts:11`, `:47`, `src/lib/faq.ts:6`, `src/lib/schedule.ts:9`다.

다음 항목은 코드에 남긴다.

- canonical origin, 라우팅, redirect, `sitePages`, 메뉴의 구조: SEO와 보안에 연결되므로 개발자 관리.
- `pricing.ts`의 요금표·공식·입력 상태 직렬화: 참고 계산기의 일관성을 테스트와 함께 변경. 초기 관리자에서는 읽기 전용 안내.
- `contact-options.ts`: 실제 사용 경로를 정리한 뒤 필요한 enum만 유지.
- `evidence-demo.ts`: 승인된 가상 예시이며 화면 동작과 결합되어 있으므로 개발자 관리.
- 애니메이션, 레이아웃, CSS, 영상 구성: 콘텐츠 편집 대상으로 만들지 않는다.

현재 수임료 계산과 공유 URL은 서로 연결되어 있다. 금액만 DB로 옮겨 과거 공유 링크의 의미가 바뀌는 일을 피한다. (`src/lib/pricing.ts:486`, `:771`, `src/lib/evidence-demo.ts:1`)

### 3.3 저장·발행·복원

초안 저장은 공개 revision을 건드리지 않는다. 저장 요청에는 예상 잠금 버전을 포함하고, 다른 편집자의 변경이 있으면 덮어쓰지 않는다.

발행은 하나의 DB 트랜잭션에서 다음을 수행한다.

1. 세션·권한 확인.
2. 대상 revision과 잠금 버전 확인.
3. 필드·출처·참조·미디어·URL 검증.
4. 공개 revision 변경.
5. 감사 이벤트와 사이트 콘텐츠 변경 번호 증가.

버전 복원은 과거 revision을 새로운 초안으로 복사한다. 복원 즉시 게시하지 않는다. 게시 취소도 별도 확인을 거치며 참조 중인 서비스는 임의 삭제할 수 없다.

DB 커밋과 Next 캐시 갱신은 하나의 원자적 작업이 아니다. UI에서 **"저장됨"과 "사이트 반영 확인됨"을 구분**하고, 실패하면 반영 재시도를 제공한다.

## 4. 관리자 UX

### 4.1 화면 구성

관리자는 `admin.meridianco.kr/admin`을 기본 주소로 제안한다.

| 메뉴 | 주요 기능 |
|---|---|
| **오늘 할 일** | 내 초안, 오래된 검토일, 세무 일정 부족, 게시 반영 실패 |
| **글 관리** | 공개/초안/보관 필터, 검색, 새 글, 수정 이력 |
| **서비스·고객 유형** | 실제 사이트 순서대로 편집, 연결 관계 확인 |
| **구성원** | 프로필·사진·순서 |
| **자주 묻는 질문** | 질문·답변·순서·노출 위치 |
| **세무 일정** | 월별 표, 공식 출처, 분기 일괄 미리보기 |
| **사이트 문구·사무소 정보** | 정해진 섹션과 연락처 편집 |
| **사진 자료실** | 이미지, 대체 텍스트, 사용 위치 |
| **변경 이력·계정** | 게시·복원 기록, 계정 비활성화 |

기본 버튼은 `초안 저장`, `실제 화면 미리보기`, `게시`다. 저장 완료 시각과 공개 상태를 항상 보인다. 게시에는 변경 내용과 영향을 받는 페이지를 확인하는 한 단계만 둔다.

### 4.2 본문 편집

비개발자에게 MDX를 노출하지 않는다. Tiptap 기반 제한된 리치 텍스트를 사용하고 JSON을 저장한다. 지원 요소는 문단, H2/H3, 목록, 인용, 링크, 표, 이미지·설명 정도다. Tiptap은 JSON 기반 저장을 지원한다. [Tiptap 저장 방식](https://tiptap.dev/docs/editor/core-concepts/persistence)

임의 JSX, HTML, script, iframe, 스타일 입력은 허용하지 않는다. 공개 본문은 허용한 노드만 서버에서 React로 렌더링한다. 관리자 입력을 `MDXRemote`로 실행하지 않는다. 현재 렌더러는 MDX를 평가하는 구조다. (`src/components/mdx/mdx-content.tsx:1`)

출처는 본문과 별도 입력란으로 제공한다.

- 자료명, URL, 유형, 근거 설명.
- "세율·금액 기준·기한·법 개정 내용이 있나요?" 확인.
- 해당하면 출처와 검토일을 필수로 요구.
- 공식 자료 우선 안내와 게시자의 실제 검토 확인.
- 링크 자동 수집이나 법적 정확성 자동 판정은 하지 않는다.

예시 오류는 "내용이 올바르지 않습니다" 대신 **"신고기한을 설명하는 글에는 근거 자료와 검토일이 필요합니다"**처럼 해결 방법을 알려준다.

### 4.3 실제 디자인 미리보기

인증된 관리자 호스트의 `/admin/preview/...`에서 저장된 revision을 직접 읽고 실제 사이트 렌더러를 재사용한다. 별도의 모사 화면을 만들지 않는다.

새 탭에서 데스크톱·모바일 폭을 선택하고 `미게시 초안` 배너를 표시한다. 관리자 프레임 안에 공개 사이트를 iframe으로 넣지 않아 기존 `frame-ancestors 'none'` 정책을 유지한다.

공개 페이지에 초안 쿠키 검사나 인증 분기를 추가하지 않는다. Next Draft Mode도 검토했지만 첫 버전에서는 사용하지 않는다. 별도 인증 경로가 정적 페이지 유지와 초안 격리를 더 명확하게 만든다.

### 4.4 대표 작업 흐름

**FAQ 추가:** `새 질문` → 질문·답변 입력 → 노출 위치 선택 → `/faq`와 `/contact` 미리보기 → 게시.

**블로그 발행:** 제목·분류 → 본문 작성 → 출처·검토일 → 관련 서비스·글 → 표지·대체 텍스트 → 실제 디자인 확인 → 게시. URL은 최초 발행 이후 잠근다.

**다음 분기 일정:** 공식 월별 페이지 열기 → 게시된 달의 일정 입력 → 출처·확인일 기입 → 날짜순 검토 → 분기 일괄 게시. 남은 날짜는 서울 시간으로 계산하며 저장하지 않는다. (`src/lib/schedule.ts:1`, `:18`)

## 5. 공개 성능과 캐시 전략

### 5.1 적용할 Next 모델

현재 `next.config.ts`에는 Cache Components 활성화가 없다. 첫 구현은 **현재 설치 버전이 문서화한 기존 캐시 모델**을 사용한다.

- DB 공개 조회를 `unstable_cache`로 감싼다.
- 기본 재검증 주기는 300초로 제안한다.
- `posts`, `services`, `faq`, `schedule`, `site-settings` 태그를 사용한다.
- 공개 조회에는 세션·cookies·headers를 넣지 않는다.
- 관리자·미리보기는 캐시하지 않는다.

`unstable_cache`는 Next 16에서 `use cache`로 대체 권고된 API다. 이를 숨기지 않는다. 다만 Cache Components 활성화는 라우트 설정과 prerender 동작까지 바꾸므로 CMS 도입과 한 번에 묶지 않는다. 캐시 호출은 작은 어댑터 하나에 모으고, 별도 검증 후 이전할 수 있게 한다.

참조한 설치 문서:

- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`
- `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`

### 5.2 발행 후 갱신

관리자 저장·발행에는 Server Actions를 사용한다. 게시 후 `updateTag`로 데이터를 만료시키고 영향을 받는 경로를 `revalidatePath`로 갱신한다.

`revalidateTag(tag, 'max')`는 이전 값을 제공하면서 백그라운드 갱신하므로 게시 직후 확인이나 게시 취소에 그대로 사용하지 않는다. Route Handler에서 즉시 만료가 필요하면 `{ expire: 0 }`을 사용한다.

| 변경 | 갱신 대상 |
|---|---|
| 글 | 상세, 블로그 목록, 관련 글 영역, 연결 서비스, 헤더 글 목록, 검색, sitemap, llms |
| FAQ | FAQ 페이지, 문의 페이지, FAQ JSON-LD |
| 일정 | 헤더·포털의 일정 데이터 |
| 서비스·고객 유형 | 홈, 서비스·고객 페이지, 메뉴, 검색, sitemap |
| 사무소 정보 | 헤더·푸터·메타데이터·구조화 데이터 등 전체 영향 영역 |

문서상 재검증 호출은 모든 페이지가 즉시 새로 생성되었다는 뜻이 아니다. 변경된 경로를 요청해 revision 반영을 확인하고 게시 상태를 갱신한다. 300초 TTL은 요청이 들어와야 작동하는 복구 수단이지 정확한 반영 시간 보장이 아니다.

참조: 설치 문서의 `04-functions/updateTag.md`, `revalidateTag.md`, `revalidatePath.md`, `02-guides/server-actions.md`.

### 5.3 정적 페이지·신규 URL

`/contact`는 정적으로 유지한다. uncontrolled 필드, 수화 전 제출 차단, 독립된 query draft 처리를 보존한다. FAQ를 DB에서 읽더라도 캐시된 공개 값만 사용한다. (`tests/e2e/contact-rendering.spec.ts:4`, `:41`)

`/blog`는 초기 HTML에 목록을 넣는 현재 Suspense fallback을 유지한다. (`src/app/blog/page.tsx:64`, `tests/e2e/blog-rendering.spec.ts:7`)

기존 글은 `generateStaticParams`로 생성한다. 신규 slug는 배포 없이 생성되도록 공개 상세 라우트의 static/ISR 설정을 명시한다. `generateStaticParams`가 재검증 때 다시 실행된다고 가정하지 않는다. 신규 글, 이전 404 URL 재사용, 게시 취소를 별도 테스트한다.

참조: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`.

### 5.4 검색·sitemap·llms

검색은 기존 브라우저 필터 방식을 유지한다. 메모리 전역 변수 대신 공개 콘텐츠 캐시에서 작은 JSON 색인을 생성한다. 검색 서버는 추가하지 않는다. 현재 전역 캐시는 발행 이후에도 오래 남을 수 있다. (`src/app/api/search/route.ts:22`)

검색·sitemap·llms는 공개 revision만 읽는다. 게시 때 함께 무효화하고 응답의 브라우저/CDN 캐시 기간도 조정한다. Next 내부 캐시를 비워도 브라우저의 기존 `max-age=3600` 응답이 사라지지는 않는다. (`src/app/api/search/route.ts:66`, `src/app/llms.txt/route.ts:53`)

sitemap 수정일은 실제 공개 수정 시각으로 바꾼다. `/pricing`, 기존 `/preview`, 관리자·초안은 검색 노출 대상에서 계속 제외한다. (`src/app/sitemap.ts:8`, `:55`, `src/lib/constants.ts:196`)

## 6. 인증·보안·문의·미디어

### 6.1 인증 — 주인/메인 스레드 판단 필요

기본 제안은 **Better Auth + 지정된 Google 계정 로그인 + DB 세션**이다. 공개 가입은 막고 명시적으로 등록된 사용자만 허용한다. Google 계정 사용 여부와 MFA·복구 운영은 주인이 결정해야 한다. Better Auth는 Next Route Handler와 서버 세션 조회 통합을 제공한다. [공식 Next 통합](https://better-auth.com/docs/integrations/next)

역할은 `관리자`와 `편집자` 둘만 둔다. 편집자는 콘텐츠 작성·게시, 관리자는 계정과 민감한 사무소·법적 안내를 관리한다. 별도 승인자 역할은 실제 요구가 생기면 추가한다.

세션은 Secure·HttpOnly·host-only 쿠키로 관리하고 상위 도메인 공유를 금지한다. 로그아웃·계정 비활성화 시 서버 세션을 폐기한다. 모든 Action과 Handler에서 세션과 권한을 다시 확인한다.

현재 `/contract`는 별도 앱을 공개 사이트 origin에서 실행한다. 따라서 관리자 세션을 `www`에 두지 않는다. 같은 배포에 관리자 호스트를 연결하되 다음 경계를 적용한다.

- 공개 호스트에서는 관리자·인증 경로를 제공하지 않는다.
- 관리자 호스트에서는 `/contract` rewrite를 허용하지 않는다.
- `proxy.ts`는 호스트·경로 분리만 담당한다.
- DB 권한 검사는 서버 DAL에서 수행한다.
- 관리자 응답은 `private, no-store`와 `noindex`를 사용한다.

참조: `next.config.ts:66`, 설치 문서 `02-guides/authentication.md`, `01-getting-started/16-proxy.md`.

Server Actions의 Origin 검사를 유지하고 proxy 허용 origin을 정확히 제한한다. 업로드·인증 등 Route Handler에는 해당 라이브러리의 CSRF 보호와 명시적 Origin 검사를 적용한다. `SameSite`나 CORS만으로 보호되었다고 보지 않는다.

인증 rate limit은 DB 저장 방식으로 공유할 수 있다. 공개 문의는 기존 Upstash를 유지하되 require-shared 모드에서 timeout도 실패로 처리한다. [Better Auth rate limit](https://better-auth.com/docs/concepts/rate-limit), `src/app/api/contact/route.ts:240`.

### 6.2 문의는 저장하지 않는다

DB 도입 목적은 콘텐츠 관리다. 문의함·CRM은 만들지 않는다.

첫 단계에서 Resend의 `{ error }`와 `data.id`를 검사하고, 발신 주소 누락은 설정 오류로 처리한다. 테스트 수신함은 환경 변수로 분리한다. API 접수 성공을 최종 메일 배달 보장으로 표현하지 않는다. (`src/app/api/contact/route.ts:449`, `:476`, `:512`)

메일함과 메일 공급자의 보관은 여전히 남는다. 개인정보 안내·실제 파기 관행·국외 처리 조건은 주인과 법무 검토 사항이다. 구체적인 법적 적합성은 **UNVERIFIED**이며 이 계획에서 확정하지 않는다. (`docs/plans/ui-ux-remediation/backend-backlog.md:94`)

### 6.3 이미지 저장

신규 이미지는 R2 등 S3 호환 객체 저장소에 저장한다. 컨테이너 파일 시스템과 Git을 업로드 저장소로 사용하지 않는다. S3 호환 API를 좁은 어댑터로 감싼다. [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/)

초안 업로드는 비공개 영역에 두고 인증된 미리보기로만 제공한다. 파일 크기·실제 형식·픽셀 수를 검사하고 EXIF를 제거한다. 최초 지원은 JPEG/PNG/WebP로 제한한다. SVG·HTML·일반 첨부파일은 받지 않는다.

게시할 때 검증된 이미지를 불변 key의 공개 영역으로 옮긴다. 재업로드로 기존 객체를 덮어쓰지 않는다. 이미지 dimensions와 대체 텍스트를 요구한다. 공개 CSP에는 정확한 이미지 호스트만 추가한다.

미사용 파일은 유예 기간 뒤 정리하되 공개 revision·복원 가능 revision의 참조를 먼저 확인한다. DB 백업과 객체 백업은 별도로 관리한다. 공개한 이미지의 외부 캐시까지 즉시 회수할 수 있다고 약속하지 않는다.

## 7. 데이터 이전과 운영

### 7.1 이전 — 주인/메인 스레드 판단 필요

이전은 종류별로 진행하며, 같은 종류를 TS와 DB 양쪽에서 동시에 편집하지 않는다.

1. TS·MDX의 원본 값과 현재 공개 렌더링 결과를 함께 추출한다.
2. slug·고정 key 기반 재실행 가능한 import를 만든다.
3. 원본 체크섬과 import 버전을 기록한다.
4. 관계·날짜·출처·본문 AST를 검증한다.
5. DB와 현재 사이트의 텍스트·링크·메타·구조화 데이터를 비교한다.
6. 짧은 편집 동결 후 최종 import와 읽기 경로 전환을 한다.

현재 `posts.ts`는 누락된 출처·키워드에 기본값을 보충한다. 이전기는 원본과 보충값을 구분해야 하며 자동값을 검토 완료로 표시해서는 안 된다. 관련 글 점수·날짜 정렬도 보존한다. (`src/lib/posts.ts:286`, `:389`)

공개 저장소에 이미 존재하는 비공개 글 3개는 DB로 옮겨도 과거 Git 이력에서 사라지지 않는다. 새 초안부터 비공개 저장을 보장한다.

`content-audit.mjs`의 규칙은 공유 검증 모듈로 옮긴다. 현재 출처 누락은 경고지만 새 발행에서는 세무 기준을 설명하는 글의 출처를 필수화한다. 과거 글은 예외 목록을 명시하여 검토하고, 일괄 검토일 갱신으로 통과시키지 않는다. (`scripts/content-audit.mjs:34`, `:64`, `docs/content-system.md:43`)

### 7.2 환경별 배치

| 환경 | 앱 | DB·파일 |
|---|---|---|
| 현재 운영 | Vercel | 운영 Neon 프로젝트·운영 버킷 |
| 현재 개발 | 기존 자체 서버 | 별도 개발 DB·버킷 |
| Vercel 이전 후 | 단일 Next Node 컨테이너 | 우선 같은 관리형 DB·버킷 유지 |
| 로컬·CI | 로컬 Next | 일회용 PostgreSQL·가짜 스토리지/메일 |

운영 앱 이전과 DB 공급자 이전을 동시에 하지 않는다. 자체 서버 한 인스턴스에서는 기본 Next 캐시를 사용한다. 다중 인스턴스로 바꿀 때 공유 캐시·tag 전파를 별도 설계한다. 설치 문서 `02-guides/self-hosting.md:87`이 기본 캐시의 인스턴스별 저장을 설명한다.

운영 빌드는 읽기 전용 공개 데이터 권한을 사용한다. 비공개 초안·세션을 읽을 권한은 주지 않는다. DB 장애로 빌드할 수 없으면 기존 배포를 유지한다. 런타임 캐시 미스와 DB 장애가 겹치면 실패할 수 있으므로 "DB가 없어도 항상 제공된다"는 보장은 하지 않는다.

### 7.3 백업·환경 변수·배포

초기 운영 목표는 외부 백업 기준 RPO 24시간, RTO 4시간으로 제안한다. 승인 후 실제 복구 훈련으로 확인한다.

- 공급자 복구 이력 설정.
- 매일 암호화된 DB export와 객체 목록 백업.
- 별도 장애 영역에 파일 복사.
- 분기별 독립 DB·버킷 복원 시험.
- 코드 rollback과 데이터 복원이 다른 절차임을 문서화.
- schema는 expand/contract 방식으로 변경하고 이전 앱 버전과 호환 기간 확보.

환경 변수에는 DB 읽기/쓰기 URL, 별도 migration URL, 인증 secret·provider 설정, 관리자 origin, 객체 저장소 설정, `CONTACT_TO_EMAIL`, 기존 메일·rate-limit 설정을 추가한다. 자체 호스팅의 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`는 배포 간 일관되게 관리한다. 실제 값은 문서나 저장소에 넣지 않는다.

CI는 운영 비밀 없이 PostgreSQL 서비스와 fixture로 migration·import·발행·복원·권한을 테스트한다. 기존 공급망 검사와 TLS 기반 4개 브라우저 e2e를 유지한다. 현재 CI는 PR과 `main` push만 대상으로 한다. DB migration을 도입하기 전에 `dev` 배포도 검증된 SHA만 소비하도록 변경해야 한다. (`.github/workflows/ci.yml:3`, `:63`, `:75`)

서버의 실제 deploy 스크립트·Docker 설정은 이번 조사에서 확인하지 않았으므로 변경 방식은 **UNVERIFIED**다. migration을 매분 polling이나 컨테이너 시작마다 무조건 실행하지 않는다.

## 8. 단계별 실행 계획

공수는 숙련 개발자 1명 기준이며 콘텐츠 검토·주인 의사결정 대기 시간은 제외한다.

| 단계 | 범위·변경 영역 | 수용 기준 | 공수 | 되돌리기 |
|---|---|---|---|---|
| **1. 문의 신뢰성 개선** | contact route/form, 메일 설정, 실제 API 통합 테스트 | Resend 반환 오류·연결 실패에서 성공 응답 없음, 테스트 메일 격리, 시계 차이 처리 | 1–2일 | 독립 변경 단위로 복원. DB와 무관하게 가치 제공 |
| **2. 기반과 FAQ 수직 구현** | DB/schema, auth, 관리자 호스트, FAQ 편집·revision·공개 캐시 | 비개발자가 FAQ 저장→미리보기→게시→복원. 무권한 접근 차단. `/contact` 정적 유지 | 5–7일 | FAQ 편집 동결 후 기존 데이터 읽기로 복귀; 신규 revision export |
| **3. 글·이미지 이전** | 리치 텍스트, 미디어, posts DAL, 검색·sitemap·llms, import | 54개 import 검증, 공개 51개 유지, 새 slug 배포 없이 게시, 초안 누출 없음 | 7–10일 | 최신 DB export 보존 후 이전 앱으로 복원. 최초 MDX로 무조건 회귀하지 않음 |
| **4. 나머지 콘텐츠** | 일정, 서비스, 구성원, 고객 유형, 사무소·고정 문구 | 모든 지정 필드 편집 가능, 관계·날짜·JSON-LD 일치, 코드 관리 항목 명시 | 5–7일 | 종류별 읽기 전환 rollback; 해당 종류 편집 중단 |
| **5. 운영 전환 검증** | backup/restore, CI, 배포 migration, 모니터링, 운영 문서 | 복구 훈련 성공, 배포 중 편집 충돌 대응, 브라우저·성능 검사 통과 | 3–5일 | 이전 호환 앱 이미지 사용; DB downgrade 없이 호환 schema 유지 |

총 21–31 개발일을 예상한다. 2단계가 끝나면 주인이 실제 편집 흐름을 사용해 보고 이후 범위를 확정할 수 있다.

**Vercel 이탈은 별도 후속 단계**다. HSTS, HTML 캐시, 검색엔진 확인 메타, `/contract` 전달 제한, 인증 callback, 이미지 최적화, 이전 SHA 복귀를 검증한다. (`docs/plans/ui-ux-remediation/backend-backlog.md:106`)

## 9. 회귀 위험과 검증 기준

- **정적 렌더링:** 기존 `/contact`·`/blog` prerender manifest 검사를 유지한다. 관리자 인증을 공개 root layout에 넣지 않는다.
- **공통 layout:** 공개 헤더·푸터·모션을 public route group으로 분리할 때 URL을 유지하고 모든 주요 경로를 검사한다.
- **글:** 표, 링크, 제목 계층, 출처, 읽기 시간, 날짜, 관련 글, 서비스별 업무경험 연결을 비교한다.
- **SEO:** 기존 slug·canonical·category query를 보존한다. 최초 버전에서는 발행 후 slug 변경을 잠근다. 새 글 메타와 sitemap 포함, 게시 취소 후 제외를 검사한다.
- **CSP:** 관리자 정책을 별도로 적용하며 공개 정책을 넓히지 않는다. 실제 HTTPS 조건에서 로그인·이미지·미리보기를 검사한다.
- **폰트:** DB에서 새로 추가한 한글은 기존 원본 unicode-range 폰트로 표시한다. 다음 빌드부터 공개 콘텐츠 snapshot도 subset 입력에 포함한다. 게시마다 폰트를 재빌드하지 않는다. (`scripts/fonts/subset.mjs:95`, `src/app/layout.tsx:6`)
- **성능:** 관리자 편집기·인증 JS가 공개 번들에 들어가지 않도록 확인한다. `/blog` CLS < 0.1, 홈 CLS ≤ 0.0858 및 기존 폰트·JS 예산을 유지한다. P0의 알려진 결함 수치를 허용 기준으로 삼지 않는다. (`docs/plans/production-fixes/README.md:320`)
- **시간 경계:** 서울 자정·연말·지난 일정만 남은 상태를 검사한다. 공식 월별 링크 fallback을 유지한다.
- **실패 경로:** DB commit 후 invalidation 실패, DB 중단, 동시 편집, 배포 도중 오래된 Action ID, 업로드 실패, 미디어 참조 삭제를 검증한다.
- **배포:** Vercel과 자체 서버에서 게시 반영을 각각 검사한다. 같은 배포의 관리자·공개 호스트 간 캐시 갱신은 **실측 전 UNVERIFIED**다.

## 10. 과설계 점검과 주인 결정 목록

이번 범위에서는 마이크로서비스, GraphQL, 범용 페이지 빌더, 실시간 공동 편집, 예약 발행 worker, 외부 검색 서버, 자동 세무 일정 수집, AI 법률 검수, CRM, 문의 DB, 메일 outbox·큐, 포털·계약 앱 재구축을 만들지 않는다.

가장 큰 과설계 후보는 **직접 만드는 revision·발행·관리자 시스템**이다. Payload 같은 기존 CMS를 사용하면 일반 기능을 줄일 가능성이 있다. Payload는 Next 앱 통합을 제공한다. 다만 이 저장소의 정확한 Next 버전·CSP·정적 렌더링과의 호환성은 **UNVERIFIED**다. [Payload 설치 문서](https://payloadcms.com/docs/getting-started/installation)

2단계 시작 시 대표 FAQ·블로그 스키마로 짧게 적합성을 비교한다. 한국어 UI 조정과 권한·preview 요구를 설정 수준으로 충족한다면 Payload 채택이 더 적은 부채일 수 있다. 반대로 많은 내부 override가 필요하면 위의 제한된 맞춤 관리자를 유지한다. 직접 만드는 안을 자동으로 더 단순하다고 보지 않는다.

| 결정 | 권장 기본값 |
|---|---|
| DB 공급자·비용 | Neon 유료 운영, 개발 환경 분리, 예산 알림 |
| 저장 지역·외부 처리 조건 | 운영 담당자와 주인이 확인 후 확정 |
| **인증 방식** | 지정 Google 계정 + MFA 운영 + Better Auth DB 세션 |
| 관리자 주소 | 별도 admin 호스트, host-only 쿠키 |
| 편집자 권한 | 일반 콘텐츠 게시 가능, 계정·법적 안내는 관리자만 |
| **이전 방식·시점** | 종류별 전환, 짧은 편집 동결, 일방향 import |
| MDX 변환 실패 처리 | 손실 없이 수동 변환 후 해당 글 전환 |
| 과거 콘텐츠 검증 | 명시적 예외 목록과 실제 검토, 자동 검토일 갱신 금지 |
| 문의 보관 | DB 저장 없음; 메일함 정책·안내는 주인/법무 확정 |
| 복구 목표 | RPO 24시간·RTO 4시간, 훈련으로 검증 |
| 관리자 구현 방식 | 제한된 맞춤 UI 기본, 초기 CMS 적합성 비교 후 확정 |
| Vercel 이전 | 콘텐츠 전환 안정화 후 별도 실시 |

이 결정들은 구현을 위한 권고이며, 인증 계정 체계·데이터 이전·운영 공급자 선택에 대한 승인을 대신하지 않는다.
