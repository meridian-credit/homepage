import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { isAllowedEmail } from "./allowlist";

/* 관리자 화면과 저장 액션은 모두 이것을 먼저 부른다. 프록시나 화면 쪽 검사에 기대지 않는다 —
   서버 액션은 화면을 거치지 않고도 부를 수 있다. 한 요청 안에서는 레이아웃과 쪽이 같은 결과를 나눠 쓴다. */
export const requireAdmin = cache(async () => {
  /* headers() 를 먼저 부른다. 그래야 빌드 때 이 쪽들을 미리 그리지 않고(요청마다 그림) DB 도 열지 않는다. */
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");
  if (!session.user.emailVerified || !isAllowedEmail(session.user.email)) redirect("/login?error=not_allowed");
  return session.user;
});

/* 로그인 화면용. 막지 않고 지금 세션만 알려 준다. */
export async function currentSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}
