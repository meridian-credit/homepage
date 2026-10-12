"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { republish } from "@admin/app/actions";
import { whenSaved } from "@admin/lib/format";
import { Icon } from "./icons";

/* 「저장은 됐지만 사이트에 아직 나오지 않습니다」 띠와 [다시 반영] 단추.
   서버가 반영 실패를 기억하므로(content_meta) 어느 화면에서든 같은 띠가 뜨고, 반영이 성공하면 사라진다. */
export function PublishBanner({ failure }: { failure: { at: string; detail: string; what: string } | null }) {
  const [done, setDone] = useState(false);

  if (!failure)
    return done ? (
      <div className="page-banners">
        <div className="banner ok" role="status">
          <Icon name="check" />
          <div className="banner-body">
            <div className="banner-title">사이트에 반영했습니다</div>
            <p className="banner-text">이제 사이트에 저장한 내용이 나옵니다.</p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="page-banners">
      <div className="banner danger" role="alert">
        <Icon name="alert" />
        <div className="banner-body">
          <div className="banner-title">저장은 됐지만, 사이트에는 아직 나오지 않습니다</div>
          <p className="banner-text">
            {whenSaved(failure.at)}에 저장한 {failure.what} 사이트가 아직 그리지 못했습니다. 저장은 되어 있으니 [다시 반영]만 누르면
            됩니다. 두 번 해도 안 되면 담당 개발자에게 알려 주세요.
          </p>
          <details>
            <summary>개발자에게 전할 내용</summary>
            {failure.detail}
          </details>
          <RepublishButton onDone={() => setDone(true)} />
        </div>
      </div>
    </div>
  );
}

/* 사이트에 다시 반영. 결과는 서버가 기억하므로 끝나면 화면을 서버 값으로 다시 그린다(띠가 사라지거나 시각이 바뀐다). */
export function RepublishButton({ onDone, label = "다시 반영", plain }: { onDone?: () => void; label?: string; plain?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <>
      {message ? (
        <p className={message.ok ? "ok-text" : "error-text"} role="status" style={{ marginTop: 8 }}>
          <Icon name={message.ok ? "check" : "alert"} small />
          <span>{message.text}</span>
        </p>
      ) : null}
      <div className="banner-actions">
        <button
          type="button"
          className={`btn ${plain ? "" : "btn-primary"}${pending ? " is-loading" : ""}`}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await republish().catch(() => ({ ok: false as const, detail: "요청을 보내지 못했습니다. 새로고침한 뒤 다시 눌러 주세요." }));
              if (result.ok) {
                setMessage({ ok: true, text: "사이트에 반영했습니다." });
                onDone?.();
              } else if ("reason" in result) setMessage({ ok: false, text: "로그인이 끝났습니다. 새로고침해서 다시 로그인해 주세요." });
              else setMessage({ ok: false, text: `이번에도 반영하지 못했습니다. ${result.detail}` });
              router.refresh();
            })
          }
        >
          {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="refresh" />}
          {pending ? "반영하는 중…" : label}
        </button>
      </div>
    </>
  );
}
