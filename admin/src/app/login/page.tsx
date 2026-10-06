import { redirect } from "next/navigation";
import { isAllowedEmail } from "@admin/lib/allowlist";
import { currentSession } from "@admin/lib/session";
import LoginButton from "./login-button";
import SignOutButton from "./sign-out-button";

export const metadata = { title: "로그인" };

/* Better Auth 는 로그인이 실패하면 ?error=<코드> 를 붙여 여기로 돌려보낸다. 등록되지 않은 계정이면
   계정을 만드는 단계에서 막혀 not_allowed 가 온다(auth.ts 의 hook). */
const MESSAGES: Record<string, string> = {
  not_allowed: "관리자로 등록되지 않은 계정입니다. 등록된 Google 계정으로 다시 로그인해 주세요.",
  unable_to_create_user: "관리자로 등록되지 않은 계정입니다. 등록된 Google 계정으로 로그인해 주세요.",
  access_denied: "Google 로그인을 취소했습니다.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;
  const session = await currentSession();
  const allowed = !!session && session.user.emailVerified && isAllowedEmail(session.user.email);
  if (allowed) redirect("/");

  return (
    <main className="login">
      <div className="card">
        <h1>메리디안 관리자</h1>
        <p className="lead">세무 일정과 자주 묻는 질문을 고치는 곳입니다.</p>
        {code ? (
          <p className="msg msg-error" role="alert">
            {Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : "로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요."}
          </p>
        ) : null}
        {session ? (
          <>
            <p className="muted">{session.user.email} 계정은 들어올 수 없습니다.</p>
            <SignOutButton />
          </>
        ) : (
          <LoginButton />
        )}
      </div>
    </main>
  );
}
