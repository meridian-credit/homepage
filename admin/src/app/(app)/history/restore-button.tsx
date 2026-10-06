"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreBefore } from "../../actions";

export default function RestoreButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      {error ? (
        <span className="msg msg-error" role="alert" style={{ margin: 0, padding: "4px 10px" }}>
          {error}
        </span>
      ) : null}
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`기록 #${id} 직전의 목록으로 되돌리고 사이트에 반영할까요?`)) return;
          startTransition(async () => {
            const result = await restoreBefore(id).catch(() => ({ ok: false as const, error: "요청을 보내지 못했습니다. 새로고침한 뒤 다시 눌러 주세요." }));
            if (!result.ok) return setError(result.error);
            setError(result.published.ok ? "" : `되돌렸지만 사이트 반영에 실패했습니다: ${result.published.detail}`);
            router.refresh();
          });
        }}
      >
        {pending ? "되돌리는 중…" : "이 변경 전으로"}
      </button>
    </>
  );
}
