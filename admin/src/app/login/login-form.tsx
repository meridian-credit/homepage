"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { authClient } from "@admin/lib/auth-client";
import { Icon } from "@admin/ui/icons";

/* 아이디 · 비밀번호 로그인. 로그인은 Better Auth 의 /api/auth/sign-in/username 으로 보낸다 — 그 길에만
   시도 횟수 제한이 걸린다(서버 액션으로 부르면 제한을 건너뛴다).
   - 화면이 살아나기(수화) 전에는 단추를 막는다. 그 전에 눌리면 브라우저가 폼을 그냥 보내 버린다.
   - 그래도 method="post" 로 둔다. 기본(GET)이면 비밀번호가 주소에 붙어 프록시 기록에 남는다.
   - 틀린 아이디와 틀린 비밀번호는 같은 말로 답한다(있는 아이디를 알려 주지 않는다). */
const subscribeNothing = () => () => {};

export default function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  /* 서버 HTML 에서는 false, 수화된 뒤에는 true(공개 사이트 문의 폼과 같은 방법). */
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <>
      {next && !error ? (
        <div className="banner info" role="status" style={{ marginTop: 20 }}>
          <Icon name="info" />
          <div className="banner-body">
            <p className="banner-text" style={{ margin: 0 }}>
              로그인이 끝났습니다. 다시 로그인하면 보던 화면으로 돌아가고, 적던 내용은 그 화면에서 이어서 고칠 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="banner danger" role="alert" style={{ marginTop: 20 }}>
          <Icon name="alert" />
          <div className="banner-body">
            <p className="banner-title">{error}</p>
          </div>
        </div>
      ) : null}
      <form
        className="login-form"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          const { error } = await authClient.signIn
            .username({ username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") })
            .catch(() => ({ error: { status: 0 } }));
          if (!error) {
            router.replace(next ?? "/");
            router.refresh();
            return;
          }
          setPending(false);
          setError(
            error.status === 429
              ? "로그인 시도가 너무 많습니다. 15분쯤 뒤에 다시 해 주세요."
              : error.status === 401 || error.status === 422 || error.status === 400
                ? "아이디 또는 비밀번호가 맞지 않습니다."
                : "로그인하지 못했습니다. 인터넷 연결을 확인하고 잠시 뒤 다시 해 주세요."
          );
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="username">
            아이디
          </label>
          <input className="input" id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">
            비밀번호
          </label>
          <div className="pw-wrap">
            <input
              className="input"
              id="password"
              name="password"
              type={shown ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-describedby="caps"
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={shown ? "비밀번호 숨기기" : "비밀번호 보기"}
              aria-pressed={shown}
              onClick={() => setShown((s) => !s)}
            >
              <Icon name={shown ? "eye-off" : "eye"} />
            </button>
          </div>
          <div id="caps" className="warn-text" hidden={!caps}>
            <Icon name="alert" />
            <span>Caps Lock 이 켜져 있습니다.</span>
          </div>
        </div>
        <button type="submit" className={`btn btn-primary${pending ? " is-loading" : ""}`} disabled={!hydrated || pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          {pending ? "확인하는 중…" : "로그인"}
        </button>
      </form>
    </>
  );
}
