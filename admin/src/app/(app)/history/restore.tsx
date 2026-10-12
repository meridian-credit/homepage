"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useRef, useState } from "react";
import { previewRestore, restoreBefore, type RestorePreview } from "@admin/app/actions";
import { contentType } from "@admin/content/registry";
import { whenSaved } from "@admin/lib/format";
import { DiffList } from "@admin/ui/diff-list";
import { Icon } from "@admin/ui/icons";

/* 되돌리기. 누르면 먼저 「지금과 달라지는 점」을 보인다(docs/plans/admin-backend/ui.md).
   기록은 목록 통째의 사진이라, 옛 저장으로 되돌리면 그 뒤의 변경도 함께 되돌아간다. 그것을 확인 창에 숨기지 않는다.
   미리 본 때의 판 번호로 되돌린다 — 그 사이 누가 저장했으면 서버가 거절하고, 다시 보여 준다. */

const OpenRestore = createContext<(id: number) => void>(() => {});
const SPOKEN = { add: "다시 들어감: ", del: "빠짐: ", mod: "바뀜: " } as const;

/* 미리 보기는 어느 기록의 것인지 같이 들고 다닌다. A 를 열었다 닫고 B 를 열 때 A 의 답이 늦게 와도, 확인 단추는
   보이는 미리 보기의 기록만 되돌린다. */
type Preview = Extract<RestorePreview, { ok: true }> & { id: number };
type View =
  | { step: "loading" }
  | { step: "preview"; preview: Preview }
  | { step: "restoring"; preview: Preview }
  | { step: "error"; message: string; preview?: Preview };

export function RestoreScope({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const opened = useRef<number | null>(null);
  const [view, setView] = useState<View>({ step: "loading" });
  const [done, setDone] = useState<{ subject: string; label: string } | null>(null);

  const load = async (id: number) => {
    setView({ step: "loading" });
    const result = await previewRestore(id).catch(() => null);
    if (opened.current !== id) return;
    if (!result) setView({ step: "error", message: "확인하지 못했습니다. 연결을 확인하고 다시 눌러 주세요." });
    else if (result.ok) setView({ step: "preview", preview: { ...result, id } });
    else if (result.reason === "signed-out") setView({ step: "error", message: "로그인이 끝났습니다. 새로고침해서 다시 로그인해 주세요." });
    else setView({ step: "error", message: "그 기록을 찾지 못했습니다. 새로고침해 주세요." });
  };

  const open = (id: number) => {
    opened.current = id;
    setDone(null);
    dialog.current?.showModal();
    void load(id);
  };

  const confirm = async (preview: Preview) => {
    setView({ step: "restoring", preview });
    const result = await restoreBefore(preview.id, preview.revision).catch(() => null);
    const type = contentType(preview.kind);
    if (result?.ok) {
      dialog.current?.close();
      setDone({ subject: type.subject, label: `${whenSaved(preview.at)} 저장 이전으로` });
      /* 반영 실패면 서버가 기억하고, 다시 그린 쪽 위에 띠가 뜬다. */
      router.refresh();
      return;
    }
    const message = !result
      ? "되돌리지 못했습니다. 연결을 확인하고 다시 눌러 주세요."
      : result.reason === "conflict"
        ? `미리 본 뒤에 ${type.object} 누가 저장했습니다. 달라지는 점을 다시 확인해 주세요.`
        : result.reason === "signed-out"
          ? "로그인이 끝났습니다. 새로고침해서 다시 로그인해 주세요."
          : result.reason === "invalid"
            ? result.message
            : "그 기록을 찾지 못했습니다. 새로고침해 주세요.";
    if (result && !result.ok && result.reason === "conflict") {
      await load(preview.id);
      setView((v) => (v.step === "preview" ? { step: "error", message, preview: v.preview } : v));
      return;
    }
    setView({ step: "error", message, preview });
  };

  const preview = view.step === "loading" ? undefined : view.preview;
  const type = preview ? contentType(preview.kind) : null;
  const blocked = preview?.blocked ?? null;

  return (
    <OpenRestore value={open}>
      {done ? (
        <div className="page-banners">
          <div className="banner ok" role="status">
            <Icon name="check" />
            <div className="banner-body">
              <div className="banner-title">되돌렸습니다</div>
              <p className="banner-text">
                {done.subject} {done.label} 돌아갔습니다. 아래 맨 위에 새 기록으로 남았습니다.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {children}
      <dialog className="dialog" ref={dialog} aria-labelledby="restore-h">
        <div className="dialog-head">
          <span className="icon-badge info">
            <Icon name="undo" />
          </span>
          <h2 id="restore-h">
            {!preview
              ? "달라지는 점을 확인하는 중…"
              : blocked
                ? preview.changes.length
                  ? "되돌릴 수 없습니다"
                  : "되돌릴 것이 없습니다"
                : `${whenSaved(preview.at)} 저장 이전으로 되돌릴까요?`}
          </h2>
        </div>
        <div className="dialog-body" aria-live="polite">
          {view.step === "loading" ? (
            <p>
              <span className="spinner" aria-hidden="true" /> 잠시만 기다려 주세요.
            </p>
          ) : null}
          {preview && type ? (
            blocked ? (
              <p>{blocked}</p>
            ) : (
              <>
                <p>
                  {type.subject} 그 저장 직전 모습으로 돌아갑니다.{" "}
                  {preview.later ? <strong>이 저장 뒤에 한 변경 {preview.later}건도 함께 되돌아갑니다.</strong> : null} 지금과 달라지는 점:
                </p>
                <div className="diff-box">
                  <DiffList changes={preview.changes} labels={SPOKEN} blockLabels={["지금", "되돌린 뒤"]} />
                </div>
                <p>되돌린 것도 새 기록으로 남으니, 마음이 바뀌면 다시 되돌릴 수 있습니다. 사이트에도 바로 반영됩니다.</p>
              </>
            )
          ) : null}
          {view.step === "error" ? (
            <div className="error-text" role="alert">
              <Icon name="alert" />
              <span>{view.message}</span>
            </div>
          ) : null}
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn" autoFocus onClick={() => dialog.current?.close()}>
            {preview && !blocked ? "취소" : "닫기"}
          </button>
          {preview && !blocked ? (
            <button
              type="button"
              className={`btn btn-primary${view.step === "restoring" ? " is-loading" : ""}`}
              disabled={view.step === "restoring"}
              onClick={() => void confirm(preview)}
            >
              {view.step === "restoring" ? <span className="spinner" aria-hidden="true" /> : null}
              {view.step === "restoring" ? "되돌리는 중…" : "되돌리고 반영"}
            </button>
          ) : null}
        </div>
      </dialog>
    </OpenRestore>
  );
}

export function RestoreButton({ id }: { id: number }) {
  const open = use(OpenRestore);
  return (
    <button type="button" className="btn" onClick={() => open(id)}>
      <Icon name="undo" />이 저장 이전으로 되돌리기
    </button>
  );
}
