"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/faq";
import { saveFaq } from "@admin/app/actions";
import { describeFaq, faqRowIssues, FAQ_A_MAX, FAQ_Q_MAX, FAQ_ROWS_MAX, type FaqData } from "@admin/content/faq";
import { EditorNotices } from "@admin/editing/editor-notices";
import { SaveBar } from "@admin/editing/save-bar";
import { useEditor } from "@admin/editing/use-editor";
import { Icon } from "@admin/ui/icons";

/* 자주 묻는 질문 편집(docs/plans/admin-backend/ui.md).
   - 질문 + 답 첫 줄의 목록. 질문을 누르면 그 자리에서 펼쳐 고친다. 한 번에 하나만 편다 — 옆 문답의 말투와
     겹치는 질문이 보여야 하므로 서랍이나 창으로 가리지 않는다.
   - 순서는 한 해에 한두 번 바꾼다. 끌어 옮기기 대신 「순서 바꾸기」의 위 · 아래 단추(키보드 · 휴대폰에서도 같다).
   - 지우기는 「지울 예정」 + [되살리기]. 저장은 목록 통째로 한 번. */

type Item = FaqItem & { id: string; orig: FaqItem | null; del: boolean };
type State = { items: Item[] };
type Problems = Partial<Record<"q" | "a", string>>;

let seq = 0;
const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;
const toState = (d: FaqData): State => ({ items: d.items.map((it, i) => ({ ...it, id: `s${i}`, orig: it, del: false })) });
const live = (s: State) => s.items.filter((x) => !x.del);
const payload = (s: State): FaqData => ({ items: live(s).map((x) => ({ q: x.q.trim(), a: x.a.trim() })) });
const statusOf = (x: Item) => (x.del ? "del" : !x.orig ? "new" : x.q !== x.orig.q || x.a !== x.orig.a ? "edit" : "same");

function problems(x: Item, list: Item[]): Problems {
  const out = faqRowIssues(x);
  if (!out.q) {
    const i = list.indexOf(x);
    const earlier = list.slice(0, Math.max(i, 0)).findIndex((o) => o.q.trim() === x.q.trim());
    if (earlier >= 0) out.q = `같은 질문이 이미 있습니다 — ${earlier + 1}번`;
  }
  return out;
}
const bad = (p: Problems) => !!(p.q || p.a);
const firstBad = (s: State) => live(s).find((x) => bad(problems(x, live(s))));
const countIssues = (s: State) => {
  const l = live(s);
  return l.filter((x) => bad(problems(x, l))).length + (l.length === 0 || l.length > FAQ_ROWS_MAX ? 1 : 0);
};
const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

export default function FaqEditor({ data, revision, siteUrl }: { data: FaqData; revision: number; siteUrl?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [reorder, setReorder] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const openItem = (x: Item, field: "q" | "a" = "q") => {
    setReorder(false);
    setOpen(x.id);
    focusSoon(`${field}-${x.id}`);
  };

  const editor = useEditor<FaqData, State>({
    kind: "faq",
    data,
    revision,
    toState,
    payload,
    describe: describeFaq,
    issues: countIssues,
    save: saveFaq,
    onInvalid: (s) => {
      const x = firstBad(s);
      if (!x) return focusSoon("qa-add");
      openItem(x, problems(x, live(s)).q ? "q" : "a");
    },
    onSaved: () => {
      setOpen(null);
      setReorder(false);
      setMoved(null);
    },
  });
  const { state, setState } = editor;
  const items = live(state);

  const update = (id: string, change: Partial<Item>) =>
    setState((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, ...change } : x)) }));

  /* 앞뒤의 (지우지 않은) 문답과 자리를 바꾼다. */
  const move = (x: Item, by: -1 | 1) => {
    const i = items.indexOf(x);
    const other = items[i + by];
    if (!other) return;
    setState((s) => {
      const next = [...s.items];
      const a = next.findIndex((y) => y.id === x.id);
      const b = next.findIndex((y) => y.id === other.id);
      [next[a], next[b]] = [next[b], next[a]];
      return { items: next };
    });
    setMoved(x.id);
    setAnnounce(`「${x.q.trim() || "새 질문"}」을(를) ${i + by + 1}번째로 옮겼습니다.`);
    /* 끝에 닿아 그 단추가 막히면 반대쪽 단추로 초점을 둔다. */
    const edge = (by < 0 && i + by === 0) || (by > 0 && i + by === items.length - 1);
    focusSoon(`${edge ? (by < 0 ? "down" : "up") : by < 0 ? "up" : "down"}-${x.id}`);
  };

  const remove = (x: Item) => {
    setState((s) => ({ items: x.orig ? s.items.map((y) => (y.id === x.id ? { ...y, del: true } : y)) : s.items.filter((y) => y.id !== x.id) }));
    setOpen(null);
    focusSoon(x.orig ? `undel-${x.id}` : "qa-add");
  };

  const add = () => {
    if (items.length >= FAQ_ROWS_MAX) return;
    const x: Item = { id: newId(), q: "", a: "", orig: null, del: false };
    setState((s) => ({ items: [...s.items, x] }));
    setReorder(false);
    setOpen(x.id);
    requestAnimationFrame(() => {
      document.getElementById(`qa-t-${x.id}`)?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      document.getElementById(`q-${x.id}`)?.focus();
    });
  };

  const counter = (len: number, max: number) => <span className={`counter ${len > max ? "over" : ""}`}>{len}/{max}</span>;
  const errorLine = (msg?: string) =>
    msg ? (
      <div className="error-text">
        <Icon name="alert" />
        <span>{msg}</span>
      </div>
    ) : null;

  return (
    <>
      <EditorNotices draft={editor.draft} lost={editor.lost} onResume={editor.resumeDraft} onDrop={editor.dropDraft} onDismissLost={editor.dismissLost} />

      <section className="card" aria-labelledby="qa-title" inert={editor.saving}>
        <div className="card-head">
          <div className="list-toolbar">
            <div className="left">
              <h2 id="qa-title">문답 {items.length}개</h2>
              <span className="sub">{reorder ? "화살표로 옮기면 사이트에도 이 순서대로 나옵니다." : `최대 ${FAQ_ROWS_MAX}개 · 사이트에 이 순서대로 나옵니다`}</span>
            </div>
          </div>
          <div className="head-actions">
            <button
              type="button"
              className={`btn ${reorder ? "btn-primary" : ""}`}
              id="qa-reorder"
              aria-pressed={reorder}
              disabled={items.length < 2}
              onClick={() => {
                setReorder((r) => !r);
                setOpen(null);
                setMoved(null);
              }}
            >
              <Icon name={reorder ? "check" : "swap"} />
              {reorder ? "순서 바꾸기 마침" : "순서 바꾸기"}
            </button>
            {reorder ? null : (
              <button
                type="button"
                className="btn btn-primary"
                id="qa-add"
                disabled={items.length >= FAQ_ROWS_MAX}
                title={items.length >= FAQ_ROWS_MAX ? `문답은 ${FAQ_ROWS_MAX}개까지 둘 수 있습니다` : undefined}
                onClick={add}
              >
                <Icon name="plus" />
                문답 추가
              </button>
            )}
          </div>
        </div>

        {reorder ? (
          <ol className="qa-list" aria-label="문답 순서">
            {items.map((x, i) => (
              <li key={x.id} className={`reorder-row ${moved === x.id ? "just-moved" : ""}`}>
                <span className="qa-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{x.q}</span>
                <span className="moves">
                  <button type="button" className="icon-btn" id={`up-${x.id}`} aria-label={`「${x.q}」 위로`} disabled={i === 0} onClick={() => move(x, -1)}>
                    <Icon name="up" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    id={`down-${x.id}`}
                    aria-label={`「${x.q}」 아래로`}
                    disabled={i === items.length - 1}
                    onClick={() => move(x, 1)}
                  >
                    <Icon name="down" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="qa-list" aria-label="문답 목록">
            {state.items.map((x) => {
              const status = statusOf(x);
              const isOpen = open === x.id && status !== "del";
              const p = status === "del" ? {} : problems(x, items);
              const err = bad(p);
              const n = items.indexOf(x);
              return (
                <li key={x.id} className={["qa", isOpen ? "is-open" : "", status !== "same" ? `is-${status}` : "", err ? "is-err" : ""].join(" ")}>
                  <button
                    type="button"
                    className="qa-toggle"
                    id={`qa-t-${x.id}`}
                    aria-expanded={isOpen}
                    aria-controls={`qa-e-${x.id}`}
                    disabled={status === "del"}
                    onClick={() => {
                      if (isOpen) {
                        setOpen(null);
                        focusSoon(`qa-t-${x.id}`);
                      } else openItem(x, p.q ? "q" : p.a ? "a" : "q");
                    }}
                  >
                    <span className="qa-num" aria-hidden="true">
                      {status === "del" ? "×" : n + 1}
                    </span>
                    <span>
                      <span className="qa-q">
                        <span className="text">{x.q.trim() || "새 질문"}</span>
                        {status === "new" ? <span className="badge new">새 문답</span> : null}
                        {status === "edit" ? <span className="badge edit">고침 · 저장 전</span> : null}
                        {status === "del" ? <span className="badge del">지울 예정</span> : null}
                        {err && !isOpen ? <span className="badge err">고칠 곳 있음</span> : null}
                      </span>
                      <span className="qa-a">{x.a.trim() || "답을 적어 주세요"}</span>
                    </span>
                    {status === "del" ? null : <Icon name="chevron" className="qa-chev" />}
                  </button>

                  {status === "del" ? (
                    <div className="qa-del-row">
                      <span>저장하면 사이트에서 빠집니다.</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        id={`undel-${x.id}`}
                        onClick={() => {
                          update(x.id, { del: false });
                          focusSoon(`qa-t-${x.id}`);
                        }}
                      >
                        <Icon name="undo" small />
                        되살리기
                      </button>
                    </div>
                  ) : isOpen ? (
                    <div
                      className="qa-edit"
                      id={`qa-e-${x.id}`}
                      role="group"
                      aria-labelledby={`qa-t-${x.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setOpen(null);
                          focusSoon(`qa-t-${x.id}`);
                        }
                      }}
                    >
                      <div className={`field ${p.q ? "has-error" : ""}`}>
                        <label className="field-label" htmlFor={`q-${x.id}`}>
                          <span>질문</span>
                          {counter(x.q.trim().length, FAQ_Q_MAX)}
                        </label>
                        <input
                          className="input"
                          id={`q-${x.id}`}
                          value={x.q}
                          autoComplete="off"
                          aria-invalid={!!p.q || undefined}
                          aria-describedby={`q-${x.id}-msg`}
                          onChange={(e) => update(x.id, { q: e.target.value })}
                        />
                        <div id={`q-${x.id}-msg`}>{errorLine(p.q)}</div>
                      </div>
                      <div className={`field ${p.a ? "has-error" : ""}`}>
                        <label className="field-label" htmlFor={`a-${x.id}`}>
                          <span>답</span>
                          {counter(x.a.trim().length, FAQ_A_MAX)}
                        </label>
                        <textarea
                          className="textarea"
                          id={`a-${x.id}`}
                          rows={4}
                          value={x.a}
                          aria-invalid={!!p.a || undefined}
                          aria-describedby={`a-${x.id}-msg a-${x.id}-hint`}
                          onChange={(e) => update(x.id, { a: e.target.value })}
                        />
                        <div id={`a-${x.id}-msg`}>{errorLine(p.a)}</div>
                        <p className="hint" id={`a-${x.id}-hint`}>
                          줄을 바꾸면 사이트에서도 줄이 바뀝니다. 두세 문장이 읽기 좋습니다.
                        </p>
                      </div>
                      <div className="qa-edit-foot">
                        <div className="group">
                          <button type="button" className="btn btn-sm" id={`up-${x.id}`} disabled={n === 0} onClick={() => move(x, -1)}>
                            <Icon name="up" small />
                            위로
                          </button>
                          <button type="button" className="btn btn-sm" id={`down-${x.id}`} disabled={n === items.length - 1} onClick={() => move(x, 1)}>
                            <Icon name="down" small />
                            아래로
                          </button>
                        </div>
                        <div className="group">
                          {status === "edit" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                update(x.id, { q: x.orig!.q, a: x.orig!.a });
                                focusSoon(`a-${x.id}`);
                              }}
                            >
                              <Icon name="undo" small />
                              원래대로
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={items.length === 1}
                            title={items.length === 1 ? "문답이 하나는 있어야 합니다" : undefined}
                            onClick={() => remove(x)}
                          >
                            <Icon name="trash" small />이 문답 지우기
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setOpen(null);
                              focusSoon(`qa-t-${x.id}`);
                            }}
                          >
                            <Icon name="check" small />
                            접기
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
      </section>

      <SaveBar
        editor={editor}
        object="자주 묻는 질문을"
        siteUrl={siteUrl}
        onGotoIssue={() => {
          const x = firstBad(state);
          if (x) openItem(x, problems(x, items).q ? "q" : "a");
          else focusSoon("qa-add");
        }}
      />
    </>
  );
}
