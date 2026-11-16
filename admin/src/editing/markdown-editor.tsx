"use client";

import {
  type CmdKey,
  defaultValueCtx,
  Editor,
  editorViewCtx,
  editorViewOptionsCtx,
  remarkStringifyOptionsCtx,
  rootCtx,
} from "@milkdown/kit/core";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { history, redoCommand, undoCommand } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { trailing } from "@milkdown/kit/plugin/trailing";
import { upload, uploadConfig } from "@milkdown/kit/plugin/upload";
import {
  commonmark,
  insertHrCommand,
  liftListItemCommand,
  sinkListItemCommand,
  toggleEmphasisCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  gfm,
  insertTableCommand,
  setAlignCommand,
  toggleStrikethroughCommand,
} from "@milkdown/kit/preset/gfm";
import { lift } from "@milkdown/kit/prose/commands";
import type { MarkType, Node as PmNode } from "@milkdown/kit/prose/model";
import { NodeSelection, Plugin, TextSelection, type EditorState } from "@milkdown/kit/prose/state";
import { deleteColumn, deleteRow, deleteTable } from "@milkdown/kit/prose/tables";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose, callCommand, getMarkdown, replaceAll } from "@milkdown/kit/utils";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Icon, type IconName } from "@admin/ui/icons";

/* 블로그 본문 편집기(docs/plans/admin-backend/blog.md §2). Milkdown(ProseMirror + remark)으로 위지윅 편집하고,
 * 저장은 GFM Markdown 문자열로 한다. 공개 사이트도 remark 로 그리므로 편집기에서 본 대로 나온다.
 *
 * - 굵은 글씨 뒤 조사: Milkdown 이 굵게 · 기울임 변환을 자기 것으로 덮어써서 「**25%**로」 처럼 적는다. CommonMark 는
 *   닫는 ** 앞이 문장부호이고 뒤가 글자이면 닫는 표시로 보지 않아 사이트에 별표가 찍힌다. 덮어쓴 것을 빼면 remark
 *   기본 변환이 「**25%**&#xB85C;」로 적어 둘 다 굵게 읽는다(remarkStringifyOptionsCtx). e2e 가 지킨다.
 * - 변경 알림(listener)은 0.2초 늦게 온다. 저장은 늦은 값이 아니라 편집기에서 바로 꺼낸다(api.getMarkdown). 치자마자
 *   Ctrl+S · 미리 보기를 누르면 화면은 아직 「바뀐 것 없음」이라, 알리지 않은 변경이 있는지를 api.pending 으로 묻는다.
 * - 바깥에서 값이 바뀌면(변경 취소 · 남은 작업본 이어 쓰기 · 충돌 뒤 불러오기) 편집기 내용을 통째로 바꾼다. 그때
 *   생기는 변경 알림은 무시한다 — 편집기가 다시 적은 모양이 저장된 값과 글자 하나만 달라도 「바뀐 것」이 된다.
 * - 사진: 단추 · 붙여넣기 · 끌어 놓기 모두 onUpload 로 올린 뒤 그 주소로 넣는다. 넣고 나면 설명(대체 글)을 묻는다. */

export type MarkdownEditorApi = { getMarkdown: () => string | null; focus: () => void; pending: () => boolean };
type UploadResult = { ok: true; src: string } | { ok: false; message: string };

type Tools = {
  strong: boolean;
  emphasis: boolean;
  strike: boolean;
  link: boolean;
  block: "paragraph" | "h1" | "h2" | "h3" | "h4" | "other";
  bullet: boolean;
  ordered: boolean;
  quote: boolean;
  table: boolean;
  headerRow: boolean;
  image: { alt: string; pos: number } | null;
};
const NO_TOOLS: Tools = {
  strong: false,
  emphasis: false,
  strike: false,
  link: false,
  block: "paragraph",
  bullet: false,
  ordered: false,
  quote: false,
  table: false,
  headerRow: false,
  image: null,
};

function markActive(state: EditorState, type: MarkType | undefined) {
  if (!type) return false;
  const { from, to, empty, $from } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

function readTools(state: EditorState): Tools {
  const { schema, selection } = state;
  const { $from } = selection;
  const ancestors: string[] = [];
  for (let d = $from.depth; d > 0; d--) ancestors.push($from.node(d).type.name);
  const parent = $from.parent;
  const level = parent.type.name === "heading" ? (parent.attrs.level as number) : 0;
  const nearestList = ancestors.find((n) => n === "bullet_list" || n === "ordered_list");
  const image =
    selection instanceof NodeSelection && selection.node.type.name === "image" ? { alt: String(selection.node.attrs.alt ?? ""), pos: selection.from } : null;
  return {
    strong: markActive(state, schema.marks.strong),
    emphasis: markActive(state, schema.marks.emphasis),
    strike: markActive(state, schema.marks.strike_through),
    link: markActive(state, schema.marks.link),
    block: parent.type.name === "paragraph" ? "paragraph" : level ? (`h${Math.min(level, 4)}` as Tools["block"]) : "other",
    bullet: nearestList === "bullet_list",
    ordered: nearestList === "ordered_list",
    quote: ancestors.includes("blockquote"),
    table: ancestors.includes("table"),
    headerRow: ancestors.includes("table_header_row"),
    image,
  };
}

/* 커서가 있는 링크 한 덩이의 범위와 주소. 같은 주소의 링크가 이어진 글자들(굵게가 섞여도)을 한 덩이로 본다. */
type LinkRun = { from: number; to: number; href: string };
function linkRange(state: EditorState): LinkRun | null {
  const type = state.schema.marks.link;
  const { $from } = state.selection;
  const start = $from.start();
  const runs: LinkRun[] = [];
  $from.parent.forEach((child: PmNode, offset: number) => {
    const mark = type.isInSet(child.marks);
    const a = start + offset;
    const b = a + child.nodeSize;
    const last = runs.at(-1);
    if (!mark) return;
    const href = String(mark.attrs.href ?? "");
    if (last && last.to === a && last.href === href) last.to = b;
    else runs.push({ from: a, to: b, href });
  });
  return runs.find((r) => r.from <= $from.pos && $from.pos <= r.to) ?? null;
}

export const isLinkHref = (v: string) => /^(https?:\/\/[^\s]+|\/[^\s/][^\s]*|\/|#[^\s]*)$/i.test(v.trim());

export function MarkdownEditor({
  value,
  onChange,
  onUpload,
  labelledBy,
  describedBy,
  disabled,
  ref,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onUpload: (file: File) => Promise<UploadResult>;
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
  ref?: React.Ref<MarkdownEditorApi>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const silent = useRef(false);
  /* 문서가 바뀌었는데 아직 onChange 로 알리지 않았다. */
  const pending = useRef(false);
  const latest = useRef({ value, onChange, onUpload });
  const [ready, setReady] = useState(false);
  const [tools, setTools] = useState<Tools>(NO_TOOLS);
  const [status, setStatus] = useState("");
  const [linkDialog, setLinkDialog] = useState<{ href: string; text: string; editing: boolean } | null>(null);
  const [altDialog, setAltDialog] = useState<{ alt: string; pos: number } | null>(null);
  const linkRef = useRef<HTMLDialogElement>(null);
  const altRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    latest.current = { value, onChange, onUpload };
  });

  const view = (): EditorView | null => {
    const e = editorRef.current;
    if (!e) return null;
    try {
      return e.ctx.get(editorViewCtx);
    } catch {
      return null;
    }
  };

  useImperativeHandle(ref, () => ({
    getMarkdown: () => (editorRef.current ? editorRef.current.action(getMarkdown()) : null),
    focus: () => view()?.focus(),
    pending: () => pending.current,
  }));

  /* 편집기는 한 번만 만든다. 개발 모드(StrictMode)는 두 번 붙였다 떼므로 늦게 끝난 쪽을 버린다. */
  useEffect(() => {
    let cancelled = false;
    let made: Editor | null = null;
    let frame = 0;
    const toolsPlugin = $prose(
      () =>
        new Plugin({
          view: () => ({
            update: (v: EditorView, prev: EditorState) => {
              if (!silent.current && !v.state.doc.eq(prev.doc)) pending.current = true;
              cancelAnimationFrame(frame);
              frame = requestAnimationFrame(() => setTools(readTools(v.state)));
            },
          }),
        })
    );
    void (async () => {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root.current!);
          ctx.set(defaultValueCtx, latest.current.value);
          ctx.update(remarkStringifyOptionsCtx, (o) => {
            const { strong: _strong, emphasis: _emphasis, ...handlers } = (o.handlers ?? {}) as Record<string, unknown>;
            void _strong;
            void _emphasis;
            return { ...o, handlers } as typeof o;
          });
          ctx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            attributes: {
              class: "pm",
              role: "textbox",
              "aria-multiline": "true",
              "aria-labelledby": labelledBy,
              ...(describedBy ? { "aria-describedby": describedBy } : {}),
            },
          }));
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            pending.current = false;
            if (!silent.current) latest.current.onChange(markdown);
          });
          ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            enableHtmlFileUploader: false,
            uploader: async (files, schema) => {
              const nodes: PmNode[] = [];
              for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) continue;
                setStatus(`사진을 올리는 중… (${file.name})`);
                const result = await latest.current.onUpload(file);
                if (result.ok) {
                  const node = schema.nodes.image.createAndFill({ src: result.src, alt: "", title: "" });
                  if (node) nodes.push(node);
                  setStatus("사진을 넣었습니다. 사진을 누르고 「사진 설명」을 적어 주세요.");
                } else setStatus(result.message);
              }
              return nodes;
            },
          }));
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(clipboard)
        .use(cursor)
        .use(trailing)
        .use(upload)
        .use(toolsPlugin)
        .create();
      if (cancelled) {
        editor.destroy();
        return;
      }
      made = editor;
      editorRef.current = editor;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      made?.destroy();
      editorRef.current = null;
    };
    // 편집기는 처음 값으로 한 번만 만든다. 그 뒤의 값은 아래 effect 가 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 바깥에서 값이 바뀌었을 때만 편집기를 맞춘다. 편집기가 보낸 값이 돌아온 것이면 그대로 둔다. */
  useEffect(() => {
    const e = editorRef.current;
    if (!ready || !e) return;
    const current = e.action(getMarkdown());
    if (current.trimEnd() === value.trimEnd()) return;
    silent.current = true;
    e.action(replaceAll(value, true));
    /* 변경 알림은 0.2초 뒤에 온다. 그 알림까지 무시한다. */
    setTimeout(() => {
      silent.current = false;
    }, 400);
  }, [value, ready]);

  useEffect(() => {
    const v = view();
    if (v) v.setProps({ editable: () => !disabled });
  }, [disabled, ready]);

  /* 명령마다 받는 값의 모양이 다르다(제목 수준 · 표 크기 · 정렬). 여기서는 넘기기만 한다. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = (key: CmdKey<any>, payload?: unknown) => {
    editorRef.current?.action(callCommand(key, payload));
    view()?.focus();
  };
  const prose = (cmd: (state: EditorState, dispatch?: EditorView["dispatch"]) => boolean) => {
    const v = view();
    if (!v) return;
    cmd(v.state, v.dispatch);
    v.focus();
  };

  const setBlock = (value: string) => {
    if (value === "paragraph") run(turnIntoTextCommand.key);
    else run(wrapInHeadingCommand.key, Number(value.slice(1)));
  };
  const toggleList = (kind: "bullet" | "ordered") => {
    if ((kind === "bullet" && tools.bullet) || (kind === "ordered" && tools.ordered)) run(liftListItemCommand.key);
    else run(kind === "bullet" ? wrapInBulletListCommand.key : wrapInOrderedListCommand.key);
  };
  const toggleQuote = () => (tools.quote ? prose(lift) : run(wrapInBlockquoteCommand.key));

  /* ── 링크 ── */
  const openLink = () => {
    const v = view();
    if (!v) return;
    const range = linkRange(v.state);
    const { from, to } = v.state.selection;
    setLinkDialog({ href: range?.href ?? "", text: range || from !== to ? "" : "", editing: !!range });
    requestAnimationFrame(() => {
      linkRef.current?.showModal();
      document.getElementById("md-link-href")?.focus();
    });
  };
  const applyLink = (href: string, text: string) => {
    const v = view();
    if (!v) return;
    const { state } = v;
    const type = state.schema.marks.link;
    const range = linkRange(state);
    let tr = state.tr;
    if (range) {
      tr = tr.removeMark(range.from, range.to, type).addMark(range.from, range.to, type.create({ href }));
    } else if (!state.selection.empty) {
      tr = tr.addMark(state.selection.from, state.selection.to, type.create({ href }));
    } else {
      const label = text.trim() || href;
      const from = state.selection.from;
      tr = tr.insertText(label, from).addMark(from, from + label.length, type.create({ href }));
      tr = tr.setSelection(TextSelection.create(tr.doc, from + label.length));
    }
    v.dispatch(tr);
    v.focus();
  };
  const removeLink = () => {
    const v = view();
    if (!v) return;
    const range = linkRange(v.state);
    if (range) v.dispatch(v.state.tr.removeMark(range.from, range.to, v.state.schema.marks.link));
    else v.dispatch(v.state.tr.removeMark(v.state.selection.from, v.state.selection.to, v.state.schema.marks.link));
    v.focus();
  };

  /* ── 사진 ── */
  const insertImage = async (file: File) => {
    setStatus(`사진을 올리는 중… (${file.name})`);
    const result = await onUpload(file);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    const v = view();
    if (!v) return;
    const node = v.state.schema.nodes.image.create({ src: result.src, alt: "", title: "" });
    const tr = v.state.tr.replaceSelectionWith(node);
    const pos = tr.selection.from - node.nodeSize;
    v.dispatch(tr.setSelection(NodeSelection.create(tr.doc, Math.max(0, pos))));
    setStatus("사진을 넣었습니다. 사진 설명을 적어 주세요.");
    openAlt({ alt: "", pos: Math.max(0, pos) });
  };
  const openAlt = (target: { alt: string; pos: number }) => {
    setAltDialog(target);
    requestAnimationFrame(() => {
      altRef.current?.showModal();
      document.getElementById("md-image-alt")?.focus();
    });
  };
  const applyAlt = (alt: string) => {
    const v = view();
    if (!v || !altDialog) return;
    const node = v.state.doc.nodeAt(altDialog.pos);
    if (node?.type.name === "image") v.dispatch(v.state.tr.setNodeMarkup(altDialog.pos, undefined, { ...node.attrs, alt: alt.trim() }));
    v.focus();
  };

  const button = (icon: IconName, label: string, onClick: () => void, opts: { pressed?: boolean; disabled?: boolean; keys?: string } = {}) => (
    <button
      type="button"
      className="tool"
      aria-label={label}
      title={opts.keys ? `${label} (${opts.keys})` : label}
      aria-pressed={opts.pressed}
      disabled={!ready || disabled || opts.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
  const mod = "Ctrl/⌘";

  return (
    <div className={`md-editor ${ready ? "is-ready" : ""}`}>
      <div className="md-toolbar" role="toolbar" aria-label="본문 서식" aria-controls="post-body-editor">
        <select
          className="tool-select"
          aria-label="문단 종류"
          value={tools.block === "h2" || tools.block === "h3" || tools.block === "paragraph" ? tools.block : "other"}
          disabled={!ready || disabled}
          onChange={(e) => setBlock(e.target.value)}
        >
          <option value="paragraph">본문</option>
          <option value="h2">소제목</option>
          <option value="h3">작은 제목</option>
          <option value="other" disabled hidden>
            {tools.block === "h1" ? "제목 1" : "—"}
          </option>
        </select>
        <span className="tool-sep" aria-hidden="true" />
        {button("bold", "굵게", () => run(toggleStrongCommand.key), { pressed: tools.strong, keys: `${mod}+B` })}
        {button("italic", "기울임", () => run(toggleEmphasisCommand.key), { pressed: tools.emphasis, keys: `${mod}+I` })}
        {button("strike", "취소선", () => run(toggleStrikethroughCommand.key), { pressed: tools.strike })}
        {button("link", tools.link ? "링크 고치기" : "링크", openLink, { pressed: tools.link, keys: `${mod}+K` })}
        <span className="tool-sep" aria-hidden="true" />
        {button("list-ul", "글머리 목록", () => toggleList("bullet"), { pressed: tools.bullet })}
        {button("list-ol", "번호 목록", () => toggleList("ordered"), { pressed: tools.ordered })}
        {button("indent", "들여쓰기", () => run(sinkListItemCommand.key), { disabled: !tools.bullet && !tools.ordered })}
        {button("outdent", "내어쓰기", () => run(liftListItemCommand.key), { disabled: !tools.bullet && !tools.ordered })}
        {button("quote", "인용", toggleQuote, { pressed: tools.quote })}
        {button("hr", "구분선", () => run(insertHrCommand.key))}
        <span className="tool-sep" aria-hidden="true" />
        {button("table", "표 넣기", () => run(insertTableCommand.key, { row: 3, col: 3 }), { disabled: tools.table })}
        {button("image", "사진 넣기", () => fileRef.current?.click())}
        {tools.image ? (
          <button type="button" className="tool tool-text" disabled={!ready || disabled} onClick={() => openAlt(tools.image!)}>
            사진 설명{tools.image.alt ? "" : " (비어 있음)"}
          </button>
        ) : null}
        <span className="tool-sep" aria-hidden="true" />
        {button("undo", "실행 취소", () => run(undoCommand.key), { keys: `${mod}+Z` })}
        {button("redo", "다시 실행", () => run(redoCommand.key), { keys: `${mod}+Shift+Z` })}
      </div>

      {tools.table ? (
        <div className="md-toolbar md-toolbar-sub" role="toolbar" aria-label="표">
          <span className="tool-label">표</span>
          {button("row-add", "아래에 행 더하기", () => run(addRowAfterCommand.key))}
          {button("row-add", "위에 행 더하기", () => run(addRowBeforeCommand.key), { disabled: tools.headerRow })}
          {button("row-del", "이 행 지우기", () => prose(deleteRow), { disabled: tools.headerRow })}
          <span className="tool-sep" aria-hidden="true" />
          {button("col-add", "오른쪽에 열 더하기", () => run(addColAfterCommand.key))}
          {button("col-add", "왼쪽에 열 더하기", () => run(addColBeforeCommand.key))}
          {button("col-del", "이 열 지우기", () => prose(deleteColumn))}
          <span className="tool-sep" aria-hidden="true" />
          {button("align-left", "이 열 왼쪽 정렬", () => run(setAlignCommand.key, "left"))}
          {button("align-center", "이 열 가운데 정렬", () => run(setAlignCommand.key, "center"))}
          {button("align-right", "이 열 오른쪽 정렬(숫자)", () => run(setAlignCommand.key, "right"))}
          <span className="tool-sep" aria-hidden="true" />
          <button type="button" className="tool tool-text danger" disabled={!ready || disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => prose(deleteTable)}>
            표 지우기
          </button>
        </div>
      ) : null}

      <div
        className="md-surface"
        id="post-body-editor"
        ref={root}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            openLink();
          }
        }}
      />
      {!ready ? <p className="hint md-loading">편집기를 여는 중…</p> : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {status ? (
        <p className="hint md-status" aria-hidden="true">
          {status}
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        data-testid="md-image-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void insertImage(file);
        }}
      />

      <LinkDialog
        ref={linkRef}
        state={linkDialog}
        onApply={(href, text) => {
          applyLink(href, text);
          linkRef.current?.close();
        }}
        onRemove={() => {
          removeLink();
          linkRef.current?.close();
        }}
        onClose={() => setLinkDialog(null)}
      />
      <dialog className="dialog" ref={altRef} aria-labelledby="md-alt-h" onClose={() => setAltDialog(null)}>
        {altDialog ? (
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              applyAlt(String(new FormData(e.currentTarget).get("alt") ?? ""));
              altRef.current?.close();
            }}
          >
            <div className="dialog-head">
              <span className="icon-badge">
                <Icon name="image" />
              </span>
              <h2 id="md-alt-h">사진 설명</h2>
            </div>
            <div className="dialog-body">
              <div className="field">
                <label className="field-label" htmlFor="md-image-alt">
                  사진에 무엇이 있는지 한 문장으로
                </label>
                <input className="input" id="md-image-alt" name="alt" defaultValue={altDialog.alt} maxLength={200} autoComplete="off" />
                <p className="hint">화면 낭독기와 검색엔진이 읽습니다. 예: 2026년 법인세율 구간표</p>
              </div>
            </div>
            <div className="dialog-foot">
              <button type="button" className="btn" onClick={() => altRef.current?.close()}>
                닫기
              </button>
              <button type="submit" className="btn btn-primary">
                설명 넣기
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}

function LinkDialog({
  ref,
  state,
  onApply,
  onRemove,
  onClose,
}: {
  ref: React.Ref<HTMLDialogElement>;
  state: { href: string; text: string; editing: boolean } | null;
  onApply: (href: string, text: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <dialog
      className="dialog"
      ref={ref}
      aria-labelledby="md-link-h"
      onClose={() => {
        setError("");
        onClose();
      }}
    >
      {state ? (
        <form
          method="dialog"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const href = String(form.get("href") ?? "").trim();
            if (!isLinkHref(href)) {
              setError("https:// 로 시작하는 웹 주소나, 사이트 안 주소(/contact 처럼)를 적어 주세요.");
              document.getElementById("md-link-href")?.focus();
              return;
            }
            onApply(href, String(form.get("text") ?? ""));
          }}
        >
          <div className="dialog-head">
            <span className="icon-badge">
              <Icon name="link" />
            </span>
            <h2 id="md-link-h">{state.editing ? "링크 고치기" : "링크 넣기"}</h2>
          </div>
          <div className="dialog-body">
            <div className={`field ${error ? "has-error" : ""}`}>
              <label className="field-label" htmlFor="md-link-href">
                주소
              </label>
              <input
                className="input"
                id="md-link-href"
                name="href"
                defaultValue={state.href}
                placeholder="https://www.law.go.kr/…"
                inputMode="url"
                autoComplete="off"
                aria-invalid={!!error || undefined}
                aria-describedby="md-link-msg"
              />
              <div id="md-link-msg">
                {error ? (
                  <div className="error-text">
                    <Icon name="alert" />
                    <span>{error}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {!state.editing ? (
              <div className="field">
                <label className="field-label" htmlFor="md-link-text">
                  보일 글자 <span className="hint">(글자를 골라 두었으면 비워 두세요)</span>
                </label>
                <input className="input" id="md-link-text" name="text" autoComplete="off" />
              </div>
            ) : null}
          </div>
          <div className="dialog-foot">
            {state.editing ? (
              <button type="button" className="btn btn-danger" onClick={onRemove}>
                <Icon name="unlink" />
                링크 빼기
              </button>
            ) : null}
            <button type="button" className="btn" onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement).close()}>
              닫기
            </button>
            <button type="submit" className="btn btn-primary">
              {state.editing ? "고치기" : "넣기"}
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
