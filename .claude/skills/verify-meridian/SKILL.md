---
name: verify-meridian
description: Drive the MERIDIAN public site (www.meridianco.kr, Next.js) the way a visitor does and capture evidence. Use when a change to a page, the contact form, search, the tax calendar or the blog must be proven in the real built app, not only by reading the diff, and before writing the PR's 검증 증거.
---

# verify-meridian

> PC 전역 스킬 `verify-app` 의 이 저장소 인스턴스다. 불변 규칙과 자기 교정(도구가 틀렸을 때 도구를 고치는 절차)은
> `~/.agents/skills/verify-app/SKILL.md` 3절, 4절을 따른다. 이 도구가 틀린 결과를 내면 그 절차대로 이 폴더를 고치고 기록한다.

공개 사이트를 빌드한 그대로 띄워 방문자처럼 구동하고, 그 결과를 PR 의 「검증 증거」에 붙인다.
관리자 앱(admin/)은 이 도구가 띄우지 않는다. 관리자는 `npx playwright test -c admin/playwright.config.ts` 가
DB 와 계정을 만든 채로 :3310 과 :3210 을 띄운다(`admin/tests/e2e-env.ts`).

모든 명령은 저장소 루트에서 돈다. 도구는 `node .claude/skills/verify-meridian/verify.mjs <명령>` 하나다.

## Launch

1. `npm run build` (폰트 서브셋 다음 next build, 2~4분). `CONTENT_DB` 가 없으면 블로그 글은 0개이고 일정과 FAQ 는
   `src/lib/schedule.ts`, `src/lib/faq.ts` 배열로 그린다. CI 와 같은 상태다.
2. `node .claude/skills/verify-meridian/verify.mjs start`
   - `next start --port 3100` 을 띄우고 pid 를 `temp/verify/server.pid` 에 적는다. 로그는 `temp/verify/server.log`.
   - `CONTACT_ALLOWED_ORIGINS=http://localhost:3100` 을 넣는다. 운영 빌드는 localhost Origin 을 막기 때문이다.
   - `CONTACT_FROM_EMAIL` 을 비운다. 그래서 이 서버의 문의는 메일로 나가지 않는다.
   - 준비 신호: `/` 가 200. 30초 안에 안 되면 실패하고 로그를 본다.
3. :3100 에 이미 서버가 있으면 시작하지 않는다. 다른 세션이나 Playwright 가 띄운 서버일 수 있다.

## Doctor

`node .claude/skills/verify-meridian/verify.mjs doctor`. 무엇이든 이상하면 먼저 이것을 돌린다. 읽기만 한다.

- 빌드가 있고 `src/` 보다 새로운가(아니면 다시 빌드한다)
- :3100 이 이 도구가 띄운 pid 인가(아니면 구동하지 않는다)
- 셸에 `CONTACT_FROM_EMAIL` 이 없는가(있으면 실제 메일이 나갈 수 있다)

## Drive

- **문의 흐름(도구에 들어 있음):** `verify.mjs contact <label>`. 실제 `/api/contact` 를 거친다. 기대 결과는 500,
  「메일 전송 설정이 완료되지 않았습니다」 알림과 직접 연락처, 쓰던 내용 보존. 성공 화면은 메일을 보내야 하므로
  가짜 SES 를 쓰는 `tests/e2e/contact-route.spec.ts` 가 맡는다.
- **검색:** `verify.mjs search <label>`. **세무 일정:** `verify.mjs schedule <label>`. **블로그:** `verify.mjs blog <label>`
  (글이 있는 빌드가 필요하다. 만드는 법은 `features/blog.md`).
- **그 밖의 화면:** 기능 지도 `features/` 의 각 파일에 있는 선택자로 Playwright 를 직접 짠다. 접근 가능한 이름
  (`getByRole`, `getByLabel`)을 먼저 쓰고, 좌표와 탭 순서는 쓰지 않는다.
- **레이아웃:** 눈대중이 아니라 측정값. `BASE=http://localhost:3100 OUT=artifacts/verify/<label>/measure node scripts/qa/measure.mjs`
  (가로 넘침, CLS/LCP, 콘솔 오류, 작은 탭 영역). 화면 묶음은 `npm run qa:capture -- verify-<label>`.
- **운영 CSP 로 봐야 할 때(헤더, CSP, 외부 출처 변경):** `node scripts/qa/https.mjs` 를 앞에 두고 `https://localhost:3443` 으로 구동한다.
- 이미 있는 e2e 는 이 서버를 다시 쓴다(`reuseExistingServer`). `npx playwright test tests/e2e/<file> --project=desktop`.

## Evidence

- 저장 위치: `artifacts/verify/<label>/` (gitignore 됨). 여정마다 `<여정>/` 폴더에 전후 화면과 `result.json`(판정 `ok` 포함).
- 증명 기준: 방문자가 쓰는 경로를 실제로 거친다. 테스트 전용 경로나 내부 setter 를 쓰지 않는다. 행동과 그 뒤의 상태를
  둘 다 남긴다. 보이는 것과 함께 부수 결과(응답 코드, 보존된 입력, 콘솔 오류)를 적는다.
- PR 에는 명령, 결과 요약, 증거 경로를 붙인다(`.github/pull_request_template.md`).

## Cleanup

`node .claude/skills/verify-meridian/verify.mjs stop`. start 가 적은 pid 와 그 자식만 끈다(Windows 는 `taskkill /T`).
프로세스 이름으로 죽이지 않는다. `artifacts/verify/` 의 증거는 지우지 않는다.

## 기능 지도

`features/README.md`. 기능을 고치면 그 파일의 경로와 끝 상태도 고친다. 한 진입점만 구동하고 끝내지 않는다.
