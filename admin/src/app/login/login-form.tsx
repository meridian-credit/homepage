"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { authClient } from "@admin/lib/auth-client";

/* 아이디 · 비밀번호 로그인. 로그인은 Better Auth 의 /api/auth/sign-in/username 으로 보낸다 — 그 길에만
   시도 횟수 제한이 걸린다(서버 액션으로 부르면 제한을 건너뛴다).
   - 화면이 살아나기(수화) 전에는 단추를 막는다. 그 전에 눌리면 브라우저가 폼을 그냥 보내 버린다.
   - 그래도 method="post" 로 둔다. 기본(GET)이면 비밀번호가 주소에 붙어 프록시 기록에 남는다. */
const subscribeNothing = () => () => {};

export default function LoginForm() {
  const router = useRouter();
  /* 서버 HTML 에서는 false, 수화된 뒤에는 true(공개 사이트 문의 폼과 같은 방법). */
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      method="post"
      style={{ display: "grid", gap: 10, textAlign: "left" }}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError("");
        const { error } = await authClient.signIn
          .username({ username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") })
          .catch(() => ({ error: { status: 0 } }));
        if (!error) {
          router.replace("/");
          router.refresh();
          return;
        }
        setPending(false);
        setError(
          error.status === 429
            ? "로그인 시도가 너무 많습니다. 15분쯤 뒤에 다시 해 주세요."
            : error.status === 401 || error.status === 422 || error.status === 400
              ? "아이디 또는 비밀번호가 맞지 않습니다."
              : "로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요."
        );
      }}
    >
      {error ? (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      ) : null}
      <label htmlFor="username">아이디</label>
      <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      <label htmlFor="password">비밀번호</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit" className="btn btn-primary" disabled={!hydrated || pending} style={{ marginTop: 6, justifyContent: "center" }}>
        {pending ? "확인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
