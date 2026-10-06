"use client";

import { useState, useTransition } from "react";
import { republish } from "../actions";

export default function RepublishButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <>
      {message ? (
        <p className={`msg ${message.ok ? "msg-ok" : "msg-error"}`} role="status">
          {message.text}
        </p>
      ) : null}
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await republish().catch(() => ({ ok: false as const, detail: "요청을 보내지 못했습니다. 새로고침한 뒤 다시 눌러 주세요." }));
            setMessage(result.ok ? { ok: true, text: "사이트에 반영했습니다." } : { ok: false, text: result.detail });
          })
        }
      >
        {pending ? "반영하는 중…" : "사이트에 다시 반영"}
      </button>
    </>
  );
}
