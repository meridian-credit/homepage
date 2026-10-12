"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Change } from "@admin/content/types";
import { whenSaved } from "@admin/lib/format";
import { changesAsText, DiffList } from "@admin/ui/diff-list";
import { Icon } from "@admin/ui/icons";
import type { useEditor } from "./use-editor";

type EditorLike = Pick<
  ReturnType<typeof useEditor>,
  | "bar"
  | "count"
  | "summary"
  | "changes"
  | "issueCount"
  | "invalidMessage"
  | "outcome"
  | "conflict"
  | "save"
  | "discard"
  | "restoreDiscarded"
  | "reloadLatest"
  | "closeBar"
  | "undoWhy"
  | "leave"
>;

/* 저장 막대. 한 화면에 저장 단추는 이것 하나다. 바뀐 것이 생기면 화면 아래에 올라오고, 저장 결과도 같은 자리에서
   알린다 — 눈이 한 곳만 보면 된다. 「저장은 됐지만 반영 실패」는 여기서 닫고 쪽 위의 띠(PublishBanner)가 맡는다. */
export function SaveBar({
  editor,
  object,
  siteUrl,
  onGotoIssue,
}: {
  editor: EditorLike;
  /* 「세무 일정을」 */
  object: string;
  siteUrl?: string;
  onGotoIssue: () => void;
}) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const { bar } = editor;

  /* 충돌이면 바로 창을 띄운다. 창을 닫아도 막대에 「자세히」가 남는다. */
  useEffect(() => {
    if (bar === "conflict" && !dialog.current?.open) dialog.current?.showModal();
  }, [bar]);

  const tone = bar === "saved" ? "is-saved" : ["invalid", "failed", "signed-out", "conflict"].includes(bar) ? "is-error" : "";
  const discard = (
    <button type="button" className="btn btn-ghost" onClick={editor.discard}>
      <Icon name="undo" />
      변경 취소
    </button>
  );
  const close = (
    <button type="button" className="icon-btn" onClick={editor.closeBar} aria-label="알림 닫기" style={{ color: "#fff" }}>
      <Icon name="x" />
    </button>
  );

  let title: React.ReactNode = null;
  let sub: React.ReactNode = null;
  let actions: React.ReactNode = null;
  switch (bar) {
    case "dirty":
      title = (
        <>
          <span className="pip" aria-hidden="true" />
          저장하지 않은 변경 {editor.count}건
        </>
      );
      sub = `${editor.summary} · 저장하면 1~2초 뒤 사이트에 나옵니다.`;
      actions = (
        <>
          {discard}
          <button type="button" className="btn btn-primary" onClick={() => void editor.save()} title="저장하고 반영 (Ctrl+S)">
            저장하고 반영
          </button>
        </>
      );
      break;
    case "invalid":
      title = (
        <>
          <Icon name="alert" />
          {editor.invalidMessage ? "저장하지 않았습니다" : `고칠 곳이 ${editor.issueCount}군데 있어 저장하지 않았습니다`}
        </>
      );
      sub = editor.invalidMessage || "빨간 줄로 표시한 칸을 고친 뒤 다시 저장해 주세요.";
      actions = (
        <>
          {discard}
          {editor.invalidMessage ? (
            <button type="button" className="btn btn-light" onClick={() => void editor.save()}>
              다시 저장
            </button>
          ) : (
            <button type="button" className="btn btn-light" onClick={onGotoIssue}>
              고칠 곳 보기
            </button>
          )}
        </>
      );
      break;
    case "saving":
      title = (
        <>
          <span className="spinner" aria-hidden="true" />
          저장하는 중…
        </>
      );
      sub = "저장한 뒤 사이트에 반영합니다. 잠시만 기다려 주세요.";
      actions = (
        <button type="button" className="btn btn-primary is-loading" disabled>
          저장하는 중…
        </button>
      );
      break;
    case "saved":
      title = (
        <>
          <Icon name="check" />
          저장했습니다
        </>
      );
      sub = editor.outcome?.warnings.length ? `사이트에도 반영됐습니다. 참고: ${editor.outcome.warnings.join(" ")}` : "사이트에도 반영됐습니다.";
      actions = (
        <>
          {siteUrl ? (
            <a className="btn btn-light" href={siteUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="external" />
              사이트에서 보기
            </a>
          ) : null}
          {close}
        </>
      );
      break;
    case "failed":
      title = (
        <>
          <Icon name="alert" />
          저장하지 못했습니다
        </>
      );
      sub =
        "인터넷 연결이 끊겼거나 관리자 화면이 막 새로 바뀌었을 수 있습니다. 다시 해도 안 되면 새로고침해 주세요. 적은 내용은 이 기기에 보관해 두어 다시 열면 이어서 고칠 수 있습니다.";
      actions = (
        <button type="button" className="btn btn-light" onClick={() => void editor.save()}>
          <Icon name="refresh" />
          다시 시도
        </button>
      );
      break;
    case "signed-out":
      title = (
        <>
          <Icon name="alert" />
          로그인이 끝나 저장하지 못했습니다
        </>
      );
      sub = "적은 내용은 이 기기에 보관했습니다. 다시 로그인하면 이 화면으로 돌아와 이어서 저장할 수 있습니다.";
      actions = (
        <a className="btn btn-light" href={`/login?next=${encodeURIComponent(pathname)}`} onClick={editor.leave}>
          다시 로그인
        </a>
      );
      break;
    case "conflict":
      title = (
        <>
          <Icon name="alert" />
          저장을 멈췄습니다
        </>
      );
      sub = "다른 곳에서 먼저 저장했습니다. 덮어쓰지 않았습니다.";
      actions = (
        <button type="button" className="btn btn-light" onClick={() => dialog.current?.showModal()}>
          자세히
        </button>
      );
      break;
    case "discarded":
      title = editor.undoWhy === "resume" ? "남아 있던 변경으로 바꿨습니다" : "변경을 취소했습니다";
      sub = editor.undoWhy === "resume" ? "방금 이 화면에서 고친 것으로 돌아가려면 [되살리기]를 누르세요." : "실수였다면 바로 되살릴 수 있습니다.";
      actions = (
        <>
          <button type="button" className="btn btn-light" onClick={editor.restoreDiscarded}>
            <Icon name="undo" />
            되살리기
          </button>
          {close}
        </>
      );
      break;
  }

  return (
    <>
      <div className={`savebar ${tone}`} role="region" aria-label="저장" aria-live="polite" hidden={bar === "hidden"}>
        <div className="savebar-text">
          <div className="savebar-title" id="savebar-title" tabIndex={-1}>
            {title}
          </div>
          <div className="savebar-sub">{sub}</div>
        </div>
        <div className="actions">{actions}</div>
      </div>
      <ConflictDialog ref={dialog} object={object} latest={editor.conflict} changes={editor.changes} onReload={editor.reloadLatest} />
    </>
  );
}

function ConflictDialog({
  ref,
  object,
  latest,
  changes,
  onReload,
}: {
  ref: React.Ref<HTMLDialogElement>;
  object: string;
  latest: { at: string; actor: string } | null;
  changes: Change[];
  onReload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <dialog className="dialog" ref={ref} aria-labelledby="conflict-h" onClose={() => setCopied(false)}>
      <div className="dialog-head">
        <span className="icon-badge warn">
          <Icon name="alert" />
        </span>
        <h2 id="conflict-h">다른 곳에서 먼저 저장했습니다</h2>
      </div>
      <div className="dialog-body">
        <p>
          {latest ? (
            <>
              <strong>{latest.actor}</strong> 님이 <strong>{whenSaved(latest.at)}</strong>에 {object} 저장했습니다.{" "}
            </>
          ) : null}
          다른 창이나 다른 기기였을 수 있습니다.
        </p>
        <p>덮어쓰지 않도록 저장을 멈췄습니다. 지금 화면의 변경은 아직 저장되지 않았습니다.</p>
        <div className="diff-box">
          <div className="hint" style={{ marginBottom: 8 }}>
            저장하지 못한 내 변경
          </div>
          <DiffList changes={changes} />
        </div>
      </div>
      <div className="dialog-foot">
        <button
          type="button"
          className="btn"
          autoFocus
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(changesAsText(changes));
              setCopied(true);
            } catch {}
          }}
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "복사했습니다" : "내 변경 복사"}
        </button>
        <button type="button" className="btn btn-primary" onClick={onReload}>
          최신 내용 불러오기
        </button>
      </div>
    </dialog>
  );
}
