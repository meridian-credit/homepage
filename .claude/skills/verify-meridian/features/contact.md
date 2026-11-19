# 문의 보내기

방문자가 `/contact` 의 폼으로 상담을 요청한다. 서비스 페이지에서 오면 상황 칸이 미리 채워진다.

## Sub-features

- `contact-submit` 폼 제출이 실제 `/api/contact` 에 닿는다.
- `contact-error` 실패하면 직접 연락처를 알리고 쓰던 내용을 남긴다.
- `contact-draft` `?service=` 쿼리로 상황 칸을 미리 채우되, 사용자가 고친 칸은 덮지 않는다.
- `contact-nojs` JavaScript 없이도 폼이 보이고 직접 연락처가 있다.

## How to get to it (user POV)

- 머리말의 「기장 문의하기」 링크.
- 서비스 상세(`/services/<slug>`)의 문의 링크(`/contact`).
- 서비스를 고른 문의 `/contact?service=<slug>`. 상황 칸에 그 서비스 이름이 미리 들어간다.
- 주소 `/contact` 직접.

## Driving it with verify.mjs

- **제출과 실패 처리.** `node .claude/skills/verify-meridian/verify.mjs contact <label>`. 이름(`getByLabel('이름')`),
  이메일(`getByLabel('이메일')`), `getByLabel('현재 상황')` 을 채우고 1초 기다린 뒤(서버의 속도 검사가 900ms 미만을
  막는다) `getByRole('button', { name: '문의 보내기' })`. 끝 상태: 응답 500, `form [role=alert]` 에
  「메일 전송 설정이 완료되지 않았습니다」와 이메일 주소, 상황 칸 값 그대로.
- **초안.** `/contact?service=tax-bookkeeping` 으로 간다. 끝 상태: `getByLabel('현재 상황')` 값에 그 서비스 제목(`src/lib/data.ts`)이 들어 있다.
  기준 구현은 `tests/e2e/acceptance.spec.ts` 의 「all services preserve their inquiry context」.
- **성공 화면.** 메일을 보내야 하므로 여기서 하지 않는다. `npx playwright test tests/e2e/contact-route.spec.ts`(가짜 SES).

## Gotchas

- `next start` 는 운영 모드라 localhost Origin 을 403 으로 막는다. `verify.mjs start` 가 `CONTACT_ALLOWED_ORIGINS` 를 넣는다.
- 1초를 안 기다리면 400(「문의 양식을 새로고침한 뒤」)이 난다. 버그가 아니다.
- 실패 응답 때 콘솔에 「Failed to load resource: 500」 한 줄이 찍히는 것은 정상이다.
- 셸에 `CONTACT_FROM_EMAIL` 과 AWS 키가 있으면 실제 메일이 나간다. doctor 가 막는다.
