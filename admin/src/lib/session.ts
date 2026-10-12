import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

/* 관리자 화면과 저장 액션은 모두 이것을 먼저 부른다. 프록시나 화면 쪽 검사에 기대지 않는다 —
   서버 액션은 화면을 거치지 않고도 부를 수 있다. 한 요청 안에서는 레이아웃과 쪽이 같은 결과를 나눠 쓴다.
   계정은 서버에서만 만들므로 세션이 있으면 관리자다. 계정을 지우거나 비밀번호를 바꾸면 세션도 지워져
   다음 요청부터 막힌다(admin/scripts/user.mjs). 아이디가 없는 사용자(Google 로그인 시절에 생길 수 있던 것)의
   세션은 세션으로 치지 않는다 — 그런 계정은 user.mjs 로 찾지도 지우지도 못한다. */
const adminSession = async () => {
  /* headers() 를 먼저 부른다. 그래야 빌드 때 이 쪽들을 미리 그리지 않고(요청마다 그림) DB 도 열지 않는다. */
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session?.user.username ? { ...session, username: session.user.username } : null;
};

export const requireAdmin = cache(async () => {
  const session = await adminSession();
  if (!session) redirect("/login");
  return { ...session.user, actor: session.username };
});

/* 로그인 화면용. 막지 않고 지금 세션만 알려 준다. */
export const currentSession = adminSession;
