"use client";

import { useState } from "react";
import { authClient } from "@admin/lib/auth-client";

export default function LoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      {error ? (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          /* 성공하면 Google 로 넘어가므로 이 화면으로 돌아오지 않는다. */
          const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/login" });
          if (error) {
            setError("Google 로그인을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
            setPending(false);
          }
        }}
      >
        {pending ? "Google 로 이동하는 중…" : "Google 계정으로 로그인"}
      </button>
    </>
  );
}
