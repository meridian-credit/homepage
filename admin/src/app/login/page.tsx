import { redirect } from "next/navigation";
import { currentSession } from "@admin/lib/session";
import { BrandMark } from "@admin/ui/icons";
import LoginForm from "./login-form";

export const metadata = { title: "로그인" };

/* next: 로그인한 뒤 돌아갈 곳. 저장 막대의 「다시 로그인」이 붙인다. 이 앱 안의 경로만 받는다.
   - 글자 검사만으로는 막지 못한다: 브라우저는 주소의 탭 · 줄바꿈을 지우므로 「/<탭>/다른.호스트」가 「//다른.호스트」가 된다.
     그래서 제어 문자와 \ 를 거절하고, 이 앱 주소에 붙여 풀어 본 뒤 같은 곳일 때만 그 경로를 다시 짜서 쓴다. */
const HERE = "http://admin.invalid";
function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return null;
  try {
    const url = new URL(next, HERE);
    return url.origin === HERE ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentSession()) redirect(next ?? "/");
  return (
    <main className="login-page" id="main">
      <div style={{ width: "min(420px, 100%)" }}>
        <div className="login-card">
          <div className="login-brand">
            <BrandMark />
            <span className="brand-word">
              <strong>MERIDIAN</strong>
              <span>메리디안 택스 어드바이저리</span>
            </span>
          </div>
          <h1>사이트 관리</h1>
          <p className="lead">세무 일정과 자주 묻는 질문을 고치는 곳입니다.</p>
          <LoginForm next={next} />
          <p className="login-help">비밀번호를 잊었거나 계정이 필요하면 사이트 담당 개발자에게 연락해 주세요. 이 화면에서는 비밀번호를 바꿀 수 없습니다.</p>
        </div>
        <p className="login-foot">로그인은 30일 동안 유지됩니다. 함께 쓰는 컴퓨터라면 다 쓴 뒤 로그아웃해 주세요.</p>
      </div>
    </main>
  );
}
