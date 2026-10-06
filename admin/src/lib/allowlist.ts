/* 관리자에 들어올 수 있는 Google 계정. 서버 환경 변수 ADMIN_EMAILS(쉼표로 구분)에서 읽는다.
   계정을 처음 만들 때(로그인 첫 회)와 요청마다 둘 다 본다 — 목록에서 빼면 다음 요청부터 막힌다. */
export function allowedEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined) {
  return !!email && allowedEmails().includes(email.trim().toLowerCase());
}
