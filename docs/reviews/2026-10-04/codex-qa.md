# NOT READY

개인정보를 받는 문의 폼에 공개된 처리방침이 없고(QA-01), 서로 다른 세무 설명이 실제로는 부당해고 사건인 동일한 판례를 근거로 제시합니다(QA-02). 이 두 항목은 출시 차단 사유입니다. 모바일 검색 뒤 메뉴와 스크롤 잠금이 남는 문제, 블로그 6편의 가로 넘침, 중간예납 면제 대상의 잘못된 설명, 산재보험 판례의 잘못된 연결, 문의 실패 후 대안 안내도 출시 전에 수정하는 편이 좋습니다. 일반 경로의 로딩이나 문의 입력값 손실은 발견하지 않았습니다.

## 검사 범위와 증거 읽는 법

- 검사일: 2026-10-04, Asia/Seoul. 대상: **https://accounting.teamcredit.kr**, 브리프가 지정한 배포 `37fc011`.
- 기본 검사: Chromium 1440×900, 터치 WebKit 390×844에서 **71개 경로씩, 142회 전체 방문**. Android 대용 Chromium 360×800과 Firefox 1440×900에서 주요 11개 경로 및 공통 기능을 추가 확인했습니다.
- sitemap의 공개 경로 69개에 `/pricing`, `/preview`를 더했습니다. 404, 레거시 리다이렉트, 쿼리·앵커 주소, 별도 앱도 별도로 확인했습니다.
- 기존 사이트 https://www.meridianco.kr 는 64개 경로를 읽기만 했습니다. 폼 제출은 하지 않았습니다.
- 개발 사이트 실제 문의 POST는 **총 2회**입니다. `QA 테스트`, `qa@example.com` 등 가짜 정보를 썼습니다. 두 번 누르기를 각각 한 번의 요청으로 제한하는지도 확인했습니다. 메일 설정 부재와 HTTP 500 자체는 의도된 개발 환경 조건으로 판정에서 제외했습니다.
- 순차 방문과 GET으로 검사했습니다. 서버·배포·저장소를 수정하지 않았고 커밋·푸시하지 않았습니다. 다른 QA 폴더를 읽지 않았습니다. 로컬 :3100 및 저장소 Playwright 테스트 설정을 사용하지 않았습니다.
- 아래 증거 파일명은 모두 `temp/qa-2026-10-04/codex/` 기준입니다. 스크린샷 390개를 남겼습니다. 전체 페이지 스크린샷은 `desktop-<경로>.png`, `iphone-<경로>.png`이며 `/`는 `home`, 경로 안의 `/`는 `--`로 바꿨습니다. 원시 측정과 실행 절차는 같은 폴더의 `.mjs`에 있습니다.
- 코드 위치는 원인 추적용입니다. 배포되지 않은 로컬 문의 API 변경 `9fe32e7`의 동작을 배포 결과로 취급하지 않았습니다.

## Findings

### QA-01 · P0 · 문의 개인정보 처리방침이 공개되어 있지 않음

**CONFIRMED** — https://accounting.teamcredit.kr/contact, 공통 푸터. Chromium 1440×900, WebKit 390×844.

**재현:** 문의 폼에서 이름·이메일·전화번호·현재 상황 입력 항목을 확인하고 폼 전후 및 푸터에서 개인정보 안내 링크를 찾습니다. sitemap과 전체 71개 경로의 링크도 검색합니다.

**기대 / 실제:** 개인정보 처리 주체, 목적, 보유 기간, 파기 및 권리 행사 방법을 쉽게 확인할 수 있어야 합니다. 공개된 처리방침 링크가 **0개**이며, 문의 폼에도 처리 안내가 없습니다. 문의 FAQ의 짧은 관리 설명으로는 이 내용을 확인할 수 없습니다. 관례적 후보 `/privacy`, `/privacy-policy`는 모두 404입니다. 후보 주소의 404 자체보다 전체 공개 경로에서 방침을 찾을 수 없다는 것이 결함입니다.

**증거:** `privacy-form-settled.png`, `privacy-footer.png`; `finding-data.mjs`의 `privacy-absence`에 링크 배열 `[]`와 실제 폼 텍스트가 있습니다. [개인정보 보호법 제30조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032645945)는 처리방침 수립 및 공개를 요구합니다.

**최소 수정:** 실제 운영 주체와 문의 처리 절차에 맞는 정적 처리방침 한 페이지를 만들고, `src/components/contact/contact-form.tsx:221` 부근과 `src/components/layout/footer.tsx:16`의 링크 목록에서 연결합니다. SES 및 실제 사용하는 수탁 서비스도 해당 여부를 확인해 반영합니다. 수집 근거를 먼저 확정하고, 동의가 필요한 방식이라면 필요한 고지와 동의 항목을 붙입니다. 동의 체크박스가 모든 문의에 무조건 필요한 것으로 단정하지 않습니다. CRM이나 별도 개인정보 관리 시스템 도입은 이 결함의 수정 요건이 아닙니다.

### QA-02 · P0 · 세무 글 두 편이 부당해고 판례를 세금 판례로 인용

**CONFIRMED** — 아래 두 URL. Chromium 1440×900에서 본문 대조, WebKit 390×844 전체 방문.

- https://accounting.teamcredit.kr/blog/vat-changes-april-2026
- https://accounting.teamcredit.kr/blog/late-income-tax-filing

**재현:** 각 글의 `관련 판례`에서 `2019두52386`을 읽고 사건번호와 선고일을 공식 판결 자료와 대조합니다.

**기대 / 실제:** 사건번호·선고일·쟁점이 해당 설명을 뒷받침해야 합니다. 첫 글은 이 사건을 **2019.08.30 부가세 부정행위·10년 제척기간**, 두 번째는 **2022.01.14 가산세 면제 사유** 판례로 설명합니다. 실제 `2019두52386`은 **2020.02.20 부당해고구제재심판정취소** 사건입니다. 세무 설명의 근거가 될 수 없습니다. [대법원 공식 판결 요지](https://scourt.go.kr/supreme/news/NewsViewAction2.work?gubun=4&seqnum=7000).

**증거:** `content-evidence-vat-changes-april-2026.png`, `content-evidence-late-income-tax-filing.png`; `final-data.mjs`의 `content-evidence`에 배포 본문 문자열과 화면 좌표가 있습니다.

**최소 수정:** `content/posts/vat-changes-april-2026.mdx:69`, `content/posts/late-income-tax-filing.mdx:48`의 잘못된 인용을 삭제하거나, 담당 회계사가 실제로 해당 법리를 판시한 판결을 확인하여 사건번호·일자·요지·원문 링크를 함께 교체합니다. 링크만 고치고 잘못된 인용 설명을 남기면 해결되지 않습니다. 두 글은 수정 전까지 공개에서 빼는 것도 작은 적절한 조치입니다. 이 오류는 기존 사이트에도 있는 콘텐츠이므로 리뉴얼이 새로 만든 결함이라고 단정하지 않습니다.

### QA-03 · P1 · 모바일 검색 후 새 페이지 위에 메뉴와 스크롤 잠금이 남음

**CONFIRMED** — https://accounting.teamcredit.kr/services → https://accounting.teamcredit.kr/services/transaction-advisory. WebKit 390×844, 모바일 Chromium 360×800.

**재현:** 메뉴를 열고 검색창에 `기업실사`를 입력합니다. 결과를 탭합니다. 같은 과정을 결과 선택 후 Enter로도 반복합니다.

**기대 / 실제:** 페이지 이동과 함께 모바일 메뉴가 닫히고 본문을 사용할 수 있어야 합니다. 주소는 목적지로 바뀌지만 메뉴가 그대로 덮고 있습니다. 이동 후에도 `body.style.overflow === "hidden"`, `main`의 `inert` 속성이 남습니다. 닫기 버튼을 별도로 눌러야 정상화됩니다. 탭과 Enter 모두 두 모바일 브라우저에서 재현했습니다.

**증거:** `iphone-search-navigation-click.png`, `iphone-search-navigation-enter.png`, `android-search-navigation-click.png`; `supplement-data.mjs`의 `mobile-search-navigation` 항목에 `menuVisible: true`, `mainInert: ""`, `bodyOverflow: "hidden"`이 기록되어 있습니다.

**최소 수정:** `src/components/layout/header.tsx:220`의 모바일 `SiteSearch`에도 기존 `MobileNav`처럼 닫기 콜백을 전달합니다. `src/components/layout/site-search.tsx:126`의 키보드 이동 함수와 `:204`의 결과 클릭에서 같은 콜백을 호출합니다. 기존 메뉴 닫기 처리가 스크롤 잠금과 inert를 해제하도록 그대로 사용하면 됩니다. 전역 라우트 감시 관리자나 새 모달 상태 라이브러리는 필요 없습니다.

**인접 영향:** 검색 자체의 결과 탐색은 정상인데, 검색의 내부 열림 상태만 닫으면서 바깥 모바일 메뉴 상태가 남습니다. 동일 메뉴 안의 일반 링크 이동은 정상입니다.

### QA-04 · P1 · 블로그 계산식이 모바일 문서 전체를 가로로 늘림

**CONFIRMED** — 아래 6개 URL. WebKit 390×844, 모바일 Chromium 360×800.

| URL의 `/blog/` 뒤 경로 | WebKit 문서 폭 / 기준 390px |
|---|---:|
| `home-office-expense-deduction` | 421px |
| `interim-corporate-tax-2025` | 789px |
| `combined-income-tax-filing` | 412px |
| `vat-preliminary-q1-2025` | 418px |
| `corporate-tax-filing-prep` | 525px |
| `vat-final-q4-checklist` | 393px |

**재현:** 예를 들어 https://accounting.teamcredit.kr/blog/interim-corporate-tax-2025 를 열고 계산식 코드 블록으로 스크롤합니다. 다른 다섯 글에서도 긴 계산식 블록을 확인합니다.

**기대 / 실제:** 본문 폭은 화면 안에 있고 긴 계산식은 해당 블록에서 줄바꿈하거나 블록 안에서만 스크롤되어야 합니다. `pre`가 `white-space: pre`, `overflow-x: visible` 상태여서 문서 밖으로 밀어냅니다. Android에서는 일부 페이지의 레이아웃 뷰포트 자체가 확대되어 `innerWidth`와 문서 폭이 같이 커집니다. 따라서 Android의 `scrollWidth === innerWidth`만 보고 정상이라고 판단하면 놓칩니다. 가장 큰 글은 360px 기기에서 레이아웃 폭이 782px였습니다.

**증거:** `iphone-overflow-interim-corporate-tax-2025.png`, `android-overflow-interim-corporate-tax-2025.png`; 다른 다섯 글도 같은 `iphone-overflow-<slug>.png`, `android-overflow-<slug>.png`가 있습니다. `finding-data.mjs`에 블록 폭, scrollWidth, CSS, 문서 폭이 있습니다.

**최소 수정:** `src/app/globals.css:538`의 `.prose code` 주변에 **블록 코드 전용** `.prose pre` 규칙을 추가하여 `max-width: 100%; overflow-x: auto`로 제한하거나 계산식에 맞게 줄바꿈합니다. `body` 전체에 `overflow-x: hidden`을 넣으면 긴 내용만 잘려 나가므로 적절하지 않습니다.

**인접 영향:** 공통 MDX 스타일의 문제이므로 한 글의 마크다운만 줄이는 임시 조치보다 공통 블록 규칙을 수정하고 6편을 다시 측정해야 합니다. 나머지 65개 기본 경로에서는 같은 가로 넘침을 발견하지 않았습니다.

### QA-05 · P1 · 중간예납 면제 대상 설명에 잘못된 예외와 누락된 조건

**CONFIRMED** — https://accounting.teamcredit.kr/blog/interim-corporate-tax-2025. Chromium 1440×900, WebKit 390×844.

**재현:** 중간예납 대상이 아닌 법인 문단과 마지막 신청·납부 설명을 읽습니다.

**기대 / 실제:** 신설 법인 및 휴업 법인의 적용 조건을 정확히 설명해야 합니다. 본문에는 **“해당 사업연도 설립 법인(단, 첫 사업연도 제외)”**이라고 되어 있습니다. 공식 안내의 신설 법인 예외는 **합병 또는 분할로 신설된 법인**입니다. 또한 휴업만으로 면제된다고 쓰지만 공식 안내는 중간예납 기간에 휴업 등의 사유로 **수입금액이 없는** 법인을 말합니다. 뒤의 신설 법인 실적 기준 신고 설명도 일반 신설 법인이 면제 대상이라는 설명과 조정해야 합니다. [국세청 중간예납 의무가 없는 법인 안내](https://j.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7992&mi=6566).

**증거:** `content-evidence-interim-corporate-tax-2025.png`, `final-data.mjs`의 배포 문단. 단순 날짜 경과가 아니라 납부 대상 판단을 잘못 안내하는 문제입니다.

**최소 수정:** `content/posts/interim-corporate-tax-2025.mdx:31`, `:97`의 해당 두 문단을 공식 요건대로 교정하고 국세청 직접 링크를 출처에 추가합니다. 글 전체를 새로운 가이드로 다시 만드는 작업은 필요 없습니다.

### QA-06 · P1 · 산재 미가입 사업주 징수 위험에 다른 법률 쟁점의 판례를 연결

**CONFIRMED** — https://accounting.teamcredit.kr/blog/four-insurance-employer-guide. Chromium 1440×900, WebKit 390×844.

**재현:** `가입 누락 리스크`의 `2021다241618` 인용을 확인합니다.

**기대 / 실제:** 산재보험 미가입 기간의 사고로 사업주에게 보험급여 일부가 징수되는 설명에는 그 제도의 직접 근거가 연결되어야 합니다. 해당 문단은 `2021다241618`이 **이러한 징수금의 법적 성격과 적용 관계**를 다뤘다고 안내합니다. 실제 사건의 핵심은 공단의 **제3자 가해자에 대한 손해배상청구권 대위 범위와 과실상계**입니다. 미가입 사업주에 대한 징수 제도의 근거 판례로 이어 붙이는 것은 부정확합니다. 미가입 위험 자체가 없다는 뜻은 아닙니다. [국가법령정보센터 판결 원문](https://law.go.kr/LSW/precInfoP.do?precSeq=222621).

**증거:** `content-evidence-four-insurance-employer-guide.png`, `final-data.mjs`의 해당 문단.

**최소 수정:** `content/posts/four-insurance-employer-guide.mdx:69`에서 이 판례 연결 문장을 빼고, 담당자가 확인한 미가입 보험급여 징수의 직접 법령·공단 안내 링크로 대체합니다. 다른 보험금 구상 문제를 설명하는 별도 장을 추가할 필요는 없습니다.

### QA-07 · P1 · 문의 오류가 설정 문제만 말하고 바로 사용할 대안을 주지 않음

**CONFIRMED** — https://accounting.teamcredit.kr/contact. Chromium 1440×900, WebKit 390×844에서 실제 각 1회 제출.

**재현:** 가짜 정상 형식의 정보를 채우고 문의 보내기를 누릅니다.

**기대 / 실제:** 고객이 접수 실패 여부와 다음 행동을 바로 알 수 있어야 합니다. HTTP 500 후 알림은 **“메일 전송 설정이 완료되지 않았습니다.”**만 표시합니다. 오류 영역에 이메일·전화·카카오 링크가 없습니다. 데스크톱에는 옆의 연락처가 있지만 모바일에서는 다른 구역으로 내려가서 찾아야 합니다. 설정 부재는 이번 개발 환경의 의도된 조건이며, 결함은 이 상황에서의 고객 안내입니다.

**증거:** `desktop-contact-error.png`, `iphone-contact-error.png`; `interaction-data.mjs`의 실제 응답 500, 오류로 이동한 포커스, 보존된 4개 필드와 각 1회 POST. 입력 손실과 중복 전송은 없었습니다.

**최소 수정:** `src/components/contact/contact-form.tsx:79`, `:221`에서 실패 안내 아래에 기존 `siteConfig`의 이메일 또는 전화 링크를 바로 제공합니다. 확실한 실패 응답과 접수 여부가 불확실한 네트워크 오류는 현재 구분을 유지합니다. 서버 내부 설정 표현을 고객용 문장으로 바꿉니다. 재시도 큐·CRM·상담 접수 DB는 이 UX 수정에 필요 없습니다.

### QA-08 · P2 · 기존 세무 자문·개인 고객 안내의 발견성이 줄어듦

**CONFIRMED** — https://accounting.teamcredit.kr/services/tax-advisory, https://accounting.teamcredit.kr/clients 및 홈. Chromium 1440×900, WebKit 390×844. 기존 사이트는 Chromium 읽기 비교.

**재현:** 기존 https://www.meridianco.kr/services/tax-advisory 와 리뉴얼의 같은 URL을 비교하고 홈의 대상 고객을 비교합니다.

**기대 / 실제:** 기존 고객이 양도·상속·증여, 승계, 세무조사·불복 자문을 찾을 수 있어야 합니다. 기존 상세에는 세부 업무 6개, 비교 워크북 등의 산출물과 적용 케이스가 있습니다. 리뉴얼은 같은 주소를 **기장·세무조정·경리 업무 묶음**으로 바꿔 이 설명이 사라집니다. 기존 홈의 `개인사업자 · 프리랜서`, `자산가 (개인)` 안내도 기업 성장 단계 중심으로 대체됩니다. 개인사업자 기장 문구와 상속·증여 관련 글 및 가치평가 설명은 남으므로 개인 고객 정보가 전부 없어졌다는 뜻은 아닙니다.

**증거:** `live-services--tax-advisory.png`, `desktop-services--tax-advisory.png`, `live-home.png`, `desktop-clients.png`; `live-data.mjs`와 `crawl-data.mjs`의 전후 본문. URL은 양쪽 모두 200입니다.

**최소 수정:** 이 업무를 계속 제공한다면 `src/lib/data.ts:237`의 분류 페이지에 기존 자문 범위를 짧게 남기고 알맞은 문의 CTA를 연결합니다. 홈/clients에도 개인 고객을 위한 짧은 안내 하나를 둘 수 있습니다. 4그룹·8서비스 체계를 바꾸거나 새 고객 분류 시스템을 만들 필요는 없습니다. 제공 범위 축소가 의도된 결정이라면 수정 대신 그 결정을 확인해야 합니다. **정보 소실은 확인됐지만 사업 방향 오류인지는 확정하지 않았습니다.**

### QA-09 · P2 · 공동명의 글의 판례 출처 링크가 실제 404

**CONFIRMED** — https://accounting.teamcredit.kr/blog/apartment-joint-vs-sole-ownership. Chromium 1440×900, WebKit 390×844.

**재현:** 출처 목록에서 LegalEngine 판례 원문 링크를 누릅니다.

**기대 / 실제:** 인용한 자료를 읽을 수 있어야 합니다. `https://legalengine.co.kr/amp/cases/KKG2gY1U7Z9t2FimDejmBA`는 GET **404**이고 실제 브라우저에서도 404 페이지가 열립니다.

**증거:** `broken-citation-origin.png`, `broken-citation-404.png`; `link-data.mjs`의 상태 코드와 `finding-data.mjs`의 실제 이동 주소·본문.

**최소 수정:** `content/posts/apartment-joint-vs-sole-ownership.mdx:72`의 출처를 해당 결정의 정상 원문 또는 공식 심판례 주소로 바꿉니다. 다른 사건의 정상 링크로 대체하지 말고 결정번호와 내용을 확인해야 합니다. 사이트 전체 외부 링크 모니터링 서비스는 필요 없습니다.

### QA-10 · P2 · 17개 하위 페이지의 공유 메타가 홈 주소·제목을 상속

**CONFIRMED** — 대표 https://accounting.teamcredit.kr/about, https://accounting.teamcredit.kr/services/tax-bookkeeping, https://accounting.teamcredit.kr/contact. Chromium 1440×900, WebKit 390×844.

**재현:** 각 페이지의 title/canonical과 `og:title`, `og:url`, `twitter:title`을 비교합니다.

**기대 / 실제:** 공유 카드가 해당 페이지의 제목과 주소를 표현해야 합니다. 예를 들어 `/about`의 canonical은 `https://www.meridianco.kr/about`인데 `og:url`은 `https://www.meridianco.kr`, OG 제목은 `MERIDIAN | 메리디안 택스 어드바이저리`입니다. **17개 하위 경로**에서 같은 홈 URL 상속을 확인했습니다: about/services/members/clients/portal/contact, 서비스 9개, pricing/preview. 블로그 및 FAQ는 이 문제의 범위가 아닙니다. 개발 호스트에서 운영 도메인 canonical을 쓰는 것은 의도된 것으로 취급했습니다.

**증거:** `og-about.png`, `og-services--tax-bookkeeping.png`, `og-contact.png`는 해당 페이지 화면이며, 실제 head 측정은 `final-data.mjs`의 `og`와 `crawl-data.mjs`의 `meta`에 있습니다.

**최소 수정:** `src/app/layout.tsx:72`의 기본 OG를 유지하되, 각 페이지 metadata 및 공통 서비스 `src/app/services/[slug]/page.tsx:21`에서 해당 title/description/url을 지정합니다. 공용 OG 이미지 재사용은 가능합니다. 새 이미지 생성 파이프라인은 필요 없습니다.

### QA-11 · P2 · 읽기 전용 체크리스트의 체크박스 17개에 접근성 이름이 없음

**CONFIRMED** — https://accounting.teamcredit.kr/blog/vat-preliminary-q2-2025, https://accounting.teamcredit.kr/blog/vat-preliminary-q1-2025, https://accounting.teamcredit.kr/blog/vat-final-q4-checklist. Chromium 1440×900, WebKit 390×844의 대표 글.

**재현:** 본문 체크리스트를 읽고 axe의 `label` 검사 및 입력 요소의 이름을 확인합니다.

**기대 / 실제:** 항목을 체크박스로 표현한다면 어떤 항목의 상태인지 접근성 이름으로 연결되어야 합니다. GFM `- [ ]`이 이름 없는 `disabled` 체크박스로 출력됩니다. 글별 **6 / 5 / 6개**, 총 17개입니다. 실제 체크 기능이 있는 것처럼 보이지만 눌러도 체크되지 않습니다. 읽기 전용 마크다운이라는 점을 감안해 P2로 분류했습니다.

**증거:** `desktop-settled-blog--vat-preliminary-q2-2025-0.png`, `iphone-settled-blog--vat-preliminary-q2-2025-0.png`; 나머지 두 글 전체 스크린샷과 `crawl-data.mjs`의 axe `label` 결과.

**최소 수정:** `content/posts/vat-preliminary-q2-2025.mdx:126`, `vat-preliminary-q1-2025.mdx:107`, `vat-final-q4-checklist.mdx:101`의 읽기 전용 체크리스트를 일반 불릿 목록으로 바꾸는 것이 가장 작습니다. 체크 형태를 유지한다면 공통 MDX 출력에서 이름을 연결합니다. 체크 상태 저장 기능을 새로 구현할 필요는 없습니다.

### QA-12 · P2 · 전체 FAQ는 JS 없이 7개 답변을 읽을 수 없고 개별 주소도 없음

**CONFIRMED** — https://accounting.teamcredit.kr/faq. Chromium 1440×900의 JS 비활성화 검사; 정상 JS 상태는 4개 브라우저에서 확인.

**재현:** JS를 끄고 FAQ의 마지막 질문을 누릅니다. 정상 JS에서도 마지막 질문을 편 뒤 주소와 질문 ID를 확인합니다.

**기대 / 실제:** 공개 FAQ 답변은 JS 실패 상황에서도 읽을 수 있고 개별 질문을 안내할 주소가 있으면 좋습니다. 질문은 8개지만 서버 HTML의 답변은 처음 열린 **1개뿐**입니다. JS가 없으면 다른 질문 버튼은 동작하지 않습니다. 정상 JS에서 펼침·접힘은 되지만 질문 ID와 `aria-controls`가 없고 주소도 변하지 않아 개별 답변을 가리킬 수 없습니다. 딥링크 부재를 깨진 기존 링크로 주장하지는 않습니다.

**증거:** `faq-nojs-unopened.png`, `faq-no-deeplink.png`; `final-data.mjs`에 `questions: 8`, `answers: 1`과 ID와 controls가 없는 각 항목의 측정값이 있습니다.

**최소 수정:** `src/app/faq/faq-list.tsx:10`, `:24`를 문의 페이지에서 이미 쓰는 native `details/summary` 방식으로 바꾸면 모든 답변이 HTML에 남습니다. 항목에 안정적인 ID를 주고 필요한 경우 그 주소로 열리도록 작은 처리를 더합니다. 공통 FAQ 상태 관리 프레임워크는 필요 없습니다.

### QA-13 · P2 · iPhone 입력 확대 가능성은 실제 기기에서 추가 확인 필요

**SUSPECTED** — https://accounting.teamcredit.kr/contact. 터치 WebKit 390×844.

**재현:** 실제 iPhone Safari에서 이름·이메일·전화번호·문의 내용을 차례로 탭해 가상 키보드와 화면 확대/복귀를 확인합니다.

**기대 / 실제:** 입력 중에도 폼과 제출 버튼을 편하게 볼 수 있어야 합니다. 4개 입력의 계산된 글자 크기는 모두 **15px**입니다. 실제 iOS에서 확대가 발생할 가능성이 있지만, 이번 headless WebKit에는 OS 가상 키보드가 없고 `visualViewport.scale`은 1로 유지됐습니다. **자동 확대를 재현했다고 주장하지 않습니다.**

**증거:** `iphone-input-focused.png`; `supplement-data.mjs`의 `focus-and-input-metrics`에 15px, 포커스 outline 및 viewport 측정이 있습니다.

**최소 수정:** 실제 기기에서 문제가 확인되면 `src/components/contact/contact-form.tsx:166`, `:182`, `:198`, `:216`의 폼 입력에만 16px 이상을 지정합니다. 사이트 전역 기준 글자 크기를 바꾸면 다른 레이아웃에 영향을 주므로 피합니다. 사용자 확대를 막는 viewport 옵션도 사용하지 않습니다.

## Checked and working

### 경로·링크·배포 응답

- 기본 71개 경로 모두 Chromium/WebKit에서 **HTTP 200**, 페이지 자바스크립트 오류 및 일반 페이지 리소스의 4xx/5xx는 **0건**이었습니다. 회원 소개와 모든 서비스 상세, 블로그 51편도 포함합니다.
- 내·외부 링크와 파일 등을 합쳐 **242개 GET**을 확인했습니다. 238개는 200, 4개는 404였습니다. 실제 링크 결함은 QA-09 하나이고, 나머지 세 개는 개인정보/약관 존재 확인용 후보 `/privacy`, `/privacy-policy`, `/terms`입니다. 후보 `/terms`의 부재를 모든 마케팅 사이트에 적용되는 독립 출시 차단 사유로 삼지 않았습니다.
- 외부 URL **120개**를 GET으로 확인했습니다. 정상 HTTP 응답은 자료의 법적 정확성까지 보증하지 않습니다. 출처 인용의 의미는 별도 대조했습니다.
- 일반 본문 CTA·서비스 이동·관련 글·출처 링크 및 공통 푸터/메뉴를 실제 클릭했습니다. `anchor-data.mjs`에는 1,011건의 클릭 시도 기록이 있으며, 초기에 비활성 장면 목차를 클릭한 15건은 활성 상태에서 별도로 모두 재검사했습니다. 내부 이동의 목적지 pathname 불일치는 없었습니다. 외부 일반 링크와 tel/mailto는 클릭 이벤트를 확인하되 OS 앱 실행을 막았고, 웹 목적지는 별도 GET으로 확인했습니다. 별도 앱은 실제 로딩도 확인했습니다.
- `/practice` 및 서비스별 `/practice/*`는 대응하는 `/services/*`로 이동합니다. `/blog?tab=faq`는 `/faq?tab=faq`로 이동하고 정상 FAQ가 보입니다. 없는 주소는 **404 상태와 404 화면**을 제공합니다.
- favicon, icon, apple-icon, OG 포스터는 정상 로딩했습니다. 표시 중인 이미지에서 확정된 깨짐은 없었습니다. 숨겨진 모바일 포털 lazy 이미지의 naturalWidth 0은 미로딩 상태이므로 깨진 이미지로 집계하지 않았습니다.
- 개발의 `X-Robots-Tag: noindex`, enabled preview, 운영 도메인의 sitemap/canonical은 의도된 설정입니다. `/pricing`, `/preview`는 sitemap에서 제외되고 HTML 메타도 noindex입니다.

### 메뉴·검색·서비스 선택

- 데스크톱 SERVICE/BLOG hover, 바깥 이동 시 닫힘, ArrowDown 진입, Tab, Enter 이동, Esc 닫힘과 트리거 포커스 복귀를 확인했습니다. 하위 메뉴 8개 서비스·5개 블로그 분류를 실제 이동으로 확인했습니다.
- 모바일 메뉴 열기·닫기, SERVICE/BLOG 하위 펼침, 일반 링크 이동 후 닫힘, body 스크롤 잠금/해제, 30회 Tab의 포커스 트랩과 Esc 복귀가 정상입니다. **검색 이동의 예외는 QA-03**입니다.
- 검색 `세무기장`, 초성 `ㅅㅁㄱㅈ`, `기업실사`, `부가세`, `회계사`, 빈 검색어 및 없는 검색어를 확인했습니다. 결과·빈 상태·키보드 선택은 정상입니다. 검색 API에만 503을 모의 응답시킨 검사에서는 오류 안내 → 다시 시도 → 실제 검색 복구와 Esc 포커스 복귀가 정상입니다. 실제 서버 검색 장애를 발견했다는 의미는 아닙니다.
- 서비스 선택기 **8개를 4개 브라우저에서 각각 확인**했습니다. 데스크톱 hover/포커스에 맞게 상세 패널이 바뀌고 Enter로 해당 상세에 갑니다. 모바일은 8개 항목 각각 펼침·다시 누르면 접힘·안의 자세히 보기 이동이 정상입니다. 이동해 생기는 이미지도 정상입니다.
- 구성원의 프로필 본문은 읽을 수 있고, 없는 예약 기능이나 팀원별 상세 페이지를 깨진 기능으로 추정하지 않았습니다.

### 캘린더·포털·대상 고객

- 6개 세무 일정의 날짜와 10월 4일 기준 D-day를 확인했습니다: **10/12 D-8, 10/26 D-22, 11/10 D-37, 11/30 D-57, 12/10 D-67, 12/15 D-72**. 특히 10월의 공휴일·주말 조정된 12일/26일은 [국세청 세무일정](https://www.nts.go.kr/nts/ad/taxSchdul/selectList.do?mi=135747&taxMonth=10&taxYear=2026)과 맞습니다.
- 포털 일정 팝업 닫기·Esc·포커스 복귀·Tab 트랩, 24시간 보지 않기 저장 후 새로고침을 확인했습니다. 데스크톱 헤더 일정의 바깥 클릭/ Esc 닫기도 정상입니다.
- 포털 예시의 **4기간 × 4지표 = 16조합**을 네 브라우저에서 확인했습니다. 합계와 증빙 상세가 같이 바뀌고 예시 데이터임을 알리는 문구가 있습니다. 실제 고객 데이터로 연결한 검사는 아닙니다.
- 고객 유형 3개 모두 선택, Home/End/방향키, `#growing-ceo` 직접 진입, 뒤로가기 상태 동기화를 확인했습니다.
- Client Login과 대시보드 시작하기의 목적지 `https://hometax-dashboard.vercel.app/`가 첫 화면까지 열렸습니다(`client-portal-loaded.png`). 로그인·홈택스 연결·고객 정보 입력은 하지 않았습니다.
- `/contract`와 `/contract/`가 첫 화면으로 열리고 기본 로딩에 실패한 리소스가 없었습니다(`contract-loaded.png`). 계약 작성·사진 업로드·제출은 하지 않았습니다. 이번에 공개 경로에서 찾은 링크에는 이 앱의 진입 CTA가 없어 배포 rewrite 주소로 직접 확인했습니다.

### 블로그·FAQ·문의·계산기

- 블로그 5분류의 글 수 **전체 51 / 법인세 12 / 부가세 13 / 소득세 14 / 세무일반 12**, 5페이지 **12/12/12/12/3**를 확인했습니다. 이전/다음, 분류 변경, 검색·없는 결과·검색 지우기, 대표 글 넘기기, 글 진입 후 뒤로가기를 네 브라우저에서 확인했습니다.
- 전체 FAQ 8개는 정상 JS 상태에서 모두 펼침·접힘·Enter가 동작합니다. 문의 페이지의 native FAQ 8개도 정상이고 한 항목씩 열립니다. QA-12는 전체 FAQ의 JS 없는 상태와 개별 주소에 관한 차이입니다.
- 문의의 이름·이메일·내용은 필수, 전화번호는 선택입니다. 빈 제출과 잘못된 이메일에서 첫 문제 필드로 포커스가 이동합니다. 각 필드의 label, email/tel 타입 및 자동완성 값을 확인했습니다. 검증 메시지가 영어였던 것은 테스트 브라우저의 UI 언어에 따른 native 메시지이며 한국어 사이트가 자체 영어 오류를 넣었다고 판정하지 않았습니다.
- 실제 실패 두 번 모두 **4개 입력값 유지**, 오류 role=alert로 포커스 이동, 버튼 재활성화, 각 더블 클릭에 **POST 1개**였습니다. Android/Firefox에서는 검증과 초안만 확인하고 실제 POST를 하지 않았습니다.
- 서비스 CTA의 `type`, `output` 쿼리와 계산기 조건으로 문의 초안이 생성됩니다. 사용자가 이미 고친 문의 내용은 쿼리 변경으로 덮어쓰지 않았습니다. JS 없이 문의 필드·직접 연락처가 읽히고 제출 버튼은 disabled입니다.
- `/pricing`의 사업자 형태 2개, 업종 8개 및 업종 검색/없는 검색, 매출 프리셋 6개, 인원 프리셋·슬라이더 Home/End/방향키, 급여 형태, 기장 시작 상태, 추가 서비스와 별도 협의 조건을 확인했습니다. 선택에 따라 견적·문의 초안이 바뀝니다. 데스크톱에서는 링크/문의/요약 복사 3개와 공유 링크 재진입 시 조건 복원을 실제 clipboard로 확인했습니다. 요율의 사업적 적정성은 검증하지 않았습니다.
- `/preview`도 양 기본 브라우저에서 방문하고 샘플 상담 버튼 3개와 `#` 프로필 링크 3개를 눌렀습니다. 샘플은 실제 상담/프로필 이동을 제공하지 않습니다. 개발 전용 컬러·사진 비교판이며 공개 메뉴에서 제외된 의도적 preview이므로 출시 차단 기능으로 집계하지 않았습니다.

### 시각·모션·접근성·성능

- 가로 폭, 이미지 로딩, 실제 CSS/좌표, 포커스, 메타를 측정했습니다. Android/Firefox 주요 11개 경로의 문서 폭도 기준 화면 안에 있습니다. 모바일 글 6편의 예외는 QA-04입니다. 전체 시각 검토에서 추가로 확정할 만한 본문 겹침·이미지 찌그러짐·지속적인 글꼴 미로딩은 발견하지 않았습니다.
- 홈/포털을 실제 wheel로 내려가며 장면 상태를 수집했습니다. 우측 장면 목차가 활성화된 위치에서 홈 **7개**, 포털 **8개** 앵커를 눌러 정상 이동했습니다. 첫 화면에서 opacity 0·pointer-events none인 목차를 눌렀던 초기 자동화 timeout은 결함에서 제외했습니다.
- reduced-motion으로 주요 7개 페이지를 확인했습니다. 필수 내용은 보이고 영상 source 다운로드는 **0건**, currentSrc도 비어 있습니다. 홈/포털의 평면 구성으로 읽을 수 있습니다. 일반 모드에서 이동 시 video `ERR_ABORTED`는 취소된 요청이며 서버 실패로 집계하지 않았습니다.
- JS 비활성화로 주요 7개 페이지를 확인했습니다. 홈/서비스 등의 필수 내용과 블로그 첫 페이지 **12개 카드**, 문의 직접 연락처가 HTML에 있습니다. FAQ 차이는 QA-12로 기록했습니다.
- axe는 데스크톱 71개 경로와 모바일 비글 경로 및 대표 글에서 검사했습니다. 실제 정지 상태를 추가 검사했습니다. 이름 없는 체크박스는 QA-11입니다. 홈 reveal/포털 장면 전환 중 opacity 때문에 나온 대비 오류는 정적 reduced-motion 재검사에서 사라졌고, clients의 aria-hidden 장식 숫자는 의미 있는 본문 대비 실패로 집계하지 않았습니다. 전체 WCAG 준수 인증을 의미하지는 않습니다.
- 문의 필드에 표시되는 키보드 포커스 outline은 **2px**이며, 메뉴/검색/팝업의 Esc 복귀와 주요 키보드 탐색은 확인했습니다. 실기기 키보드는 QA-13의 한계가 있습니다.

다음은 **새 브라우저 컨텍스트, 모바일 Chromium 390px, 네트워크/CPU 제한 없음, 진입 후 4초 관측** 결과입니다. 바이트는 완료된 Resource Timing 전송량 합계이며 HTML·CSS·JS·폰트·이미지 등이 포함됩니다. 진행 중인 영상의 총 다운로드량을 뜻하지 않습니다. LCP는 ms입니다.

| 경로 | 관측 전송량 | LCP | CLS |
|---|---:|---:|---:|
| `/` | 899,223 B | 200 | 0 |
| `/about` | 1,183,956 B | 184 | 0 |
| `/services` | 789,466 B | 192 | 0 |
| `/members` | 791,044 B | 180 | 0 |
| `/clients` | 782,564 B | 176 | 0 |
| `/portal` | 777,412 B | 188 | 0 |
| `/blog` | 858,903 B | 252 | 0 |
| `/faq` | 754,916 B | 156 | 0 |
| `/contact` | 801,720 B | 164 | 0 |
| `/services/tax-bookkeeping` | 822,013 B | 200 | 0 |

빠른 실험 환경 수치이므로 실제 모바일 사용자의 LCP를 이 값으로 보증하지 않습니다. 지속적인 멈춤이나 큰 로딩 이동은 이번 조건에서 재현되지 않았지만 저사양 기기의 스크롤 프레임 성능은 별도 확인이 필요합니다.

### 기존 사이트와 비교한 회귀

| 항목 | 확인 결과 |
|---|---|
| 기존 공개 64개 경로 | 리뉴얼에도 모두 200. 기존 공개 URL이 404가 되는 사례는 찾지 못함 |
| 블로그 51편 | 동일 slug가 모두 유지됨. 글 인용 오류는 기존에도 있는 출시 위험 |
| 이메일·카카오 | `mscpa@dscpa.co.kr`, `https://pf.kakao.com/_xcAyvn` 유지 |
| 전화·주소 | 리뉴얼에서 `02-6953-2820`, 서울 강서구 마곡중앙로 171 프라이빗타워Ⅱ 1210호 안내 추가. 실제 소유·수신은 확인하지 않음 |
| 운영 명의 | 동성회계법인 소속 및 법정 업무 수행 명의 고지가 남음. 메리디안은 개인 브랜드라는 설명과 충돌하지 않음 |
| Client Login | 푸터와 portal 시작하기에서 유지. 기존 상단의 즉시 로그인 링크는 DASHBOARD 안내로 바뀌어 한 단계 늘지만 목적지는 소실되지 않음 |
| 세무 자문·개인 자산가 안내 | QA-08의 내용/발견성 소실. 정보가 남은 주식·자산 평가 및 관련 글과 구분 |
| 감사 대응·IPO 안내 | 기존 audit/transaction 상세가 재구성됨. PA와 IPO 별도 페이지에서 대응 설명을 찾을 수 있어 업무 전체가 없어졌다고 판정하지 않음 |
| 세무 일정 | 리뉴얼의 10/12·10/26이 공식 날짜와 맞음. 기존 홈의 10/10·10/25 표시를 그대로 복사하지 않은 것은 개선 |

푸터에서 별도 사업자등록번호는 찾지 못했습니다. 다만 온라인 판매 사이트 여부와 실제 계약·운영 주체의 법적 표시 요건을 이 검사만으로 확정할 수 없어 독립 P0로 단정하지 않았습니다. 소속·실명·연락처는 공개되어 있습니다. 운영자가 실제 계약 명의와 주소·전화의 최신성을 확인해야 합니다.

## Not checked / 한계

- **메일 성공 수신, SES/공유 rate limit의 운영 설정, 성공 후 접수 처리:** 개발 호스트에 메일 설정이 없다는 조건을 준수했습니다. 성공 수신을 확인하지 않았고 배포되지 않은 로컬 API 수정으로 대신 판정하지 않았습니다. 실제 전환 직전의 정상 접수 확인은 남아 있습니다.
- **실제 iPhone/Android 가상 키보드, iOS 자동 확대, 자동완성 OS UI, 전화 연결·메일 앱 송신:** 브라우저 엔진/터치 에뮬레이션으로 대체했습니다. tel/mailto의 목적지와 클릭만 확인했습니다.
- **스크린리더 실청취와 완전한 WCAG 검증:** axe·DOM 이름·키보드 검사를 했지만 VoiceOver/TalkBack/NVDA를 직접 사용하지 않았습니다.
- **고객 포털 로그인, 홈택스 인증, 계약 작성·서명·업로드, 별도 앱의 개인정보 처리:** 첫 화면만 확인했습니다. 인증·개인정보 관련 기능은 범위 밖이며 시도하지 않았습니다.
- **51편 모든 세율·법령·심판례의 전문 검증:** 전편을 읽고 출처 링크를 검사했지만 세무사의 전면 내용 감수로 대체할 수 없습니다. QA-02/05/06은 공식 자료와 대조해 확인한 오류입니다. 특히 `employee-benefits-tax-treatment`의 `2023다272511`, `loss-carryforward-guide`의 `2024두45917` 등은 이번 검색에서 해당 원문을 확보하지 못했습니다. 검색 부재만으로 존재하지 않는 판례라고 단정하지 않았으며 담당자의 원문 확인이 필요합니다.
- **R&D 판례의 따옴표 인용 정확성:** `rnd-tax-credit-pre-review`는 동일 사건을 두 번 따옴표로 요약하며 표현이 다릅니다(`content-evidence-rnd-tax-credit-pre-review.png`). [실제 2021두48359 판결](https://www.law.go.kr/LSW/precInfoP.do?precSeq=599749)은 해당 시스템 개발의 과학기술활동 인정과 2013·2014년 전담부서 직접 수행 심리 문제를 다룹니다. 요약을 직접 인용처럼 보이게 하지 않도록 담당자가 원문과 맞춰 정리하는 편이 좋습니다. 이를 “전산시스템 전부를 공제에서 배제한 판결”로 단정하지 않았습니다.
- **세무조사 글의 2020두51181:** 판결 제목만 보면 증여세 사건이지만 [전문](https://law.go.kr/LSW/precInfoP.do?precSeq=238043)에 세무조사 범위 확대 통지 쟁점이 실제로 있습니다. 따라서 사건 제목이 다르다는 이유만으로 잘못된 인용에 포함하지 않았습니다. 본문의 “최초”라는 역사적 주장까지 검증한 것은 아닙니다.
- **사업자등록번호·주소·수신 번호의 실재 및 업무 제공 범위:** 운영자 내부 자료나 전화 수신으로 검증하지 않았습니다. 기존 안내 소실과 사실 오류를 구분했습니다.
- **운영 도메인 전환 후 헤더/캐시/리다이렉트와 SNS 앱의 실제 카드 캐시:** 개발 HTTPS 호스트의 응답과 메타만 검사했습니다. 운영 www 사이트의 폼을 제출하거나 배포를 변경하지 않았습니다.
- **저사양 실기기, 제한된 이동통신, 장시간 프레임 누수/배터리 영향:** 스트레스 검사나 서버 변경 없이 기본 화면 성능과 모션 상태를 확인했습니다. 위 LCP/CLS 수치는 필드 데이터가 아닙니다.

## 실행 자료와 재검사 주의

`crawl.mjs` / `crawl-data.mjs`, `live-links.mjs` / `live-data.mjs`, `link-checks.mjs` / `link-data.mjs`에 전 경로 및 링크 기록이 있습니다. `interactions.mjs`, `supplement.mjs`, `pricing.mjs`, `final-checks.mjs`, `service-picker.mjs`, `spot-checks.mjs`, `anchor-actions.mjs`, `visual-verification.mjs`, `findings-verification.mjs`, `scenes.mjs`와 각각의 `*-data.mjs`에 기능·측정·화면 증거가 있습니다.

초기 blog 분류 선택자 오류, 클릭 직후 라우트 전환 대기 누락, JS 없는 FAQ의 안정화 대기, axe의 명시적 context 생성, 비활성 장면 목차 클릭 등 검사 스크립트의 실패는 후속 검사에서 교정했습니다. 원시 파일의 timeout을 제품 결함으로 그대로 집계하지 않았습니다. 최종 판정은 재현 결과와 위 Findings만을 기준으로 합니다.

**`interactions.mjs`는 다시 실행하면 실제 문의 POST 2회를 추가합니다. 이번 QA의 누적 제출은 이미 2회이며, 브리프의 총 4회 한도를 지켜야 합니다.** 다른 UI·크롤링 스크립트는 문의를 제출하지 않습니다. 전체 스크립트를 병렬 반복하여 서버에 부하를 주는 방식으로 재검사하지 마십시오.

필수 출시 차단 해제는 **QA-01 공개 처리방침과 실제 처리 일치, QA-02 두 글의 잘못된 근거 제거·교정**입니다. QA-03~07은 전환 전에 수정 후 해당 브라우저/문단을 다시 확인하는 것이 좋습니다. P2는 작은 범위로 처리할 수 있으며 CMS·CRM·큐·모니터링 스택은 출시 요건이 아닙니다.
