"use client";

import { useState, useTransition } from "react";
import type { FaqItem } from "@/lib/faq";
import { saveFaq, type SaveResult } from "../../actions";
import SaveMessage, { UNREACHABLE } from "../save-message";
import { useUnsavedGuard } from "../use-unsaved-guard";

type Row = FaqItem & { key: number };
let nextKey = 0;
const withKeys = (items: FaqItem[]): Row[] => items.map((it) => ({ ...it, key: nextKey++ }));

export default function FaqForm({ initial, revision: initialRevision }: { initial: FaqItem[]; revision: number }) {
  const [rows, setRows] = useState(() => withKeys(initial));
  const [revision, setRevision] = useState(initialRevision);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<SaveResult<unknown> | null>(null);
  const [pending, startTransition] = useTransition();
  useUnsavedGuard(dirty);

  const change = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const move = (i: number, by: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    change(next);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveFaq({ items: rows.map(({ q, a }) => ({ q, a })) }, revision).catch(() => UNREACHABLE);
      setResult(res);
      if (res.ok) {
        setRows(withKeys(res.saved.items));
        setRevision(res.revision);
        setDirty(false);
      }
    });

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <SaveMessage result={result} />
      {rows.map((r, i) => (
        <fieldset key={r.key} className="faq-row" style={{ margin: "0 0 12px" }}>
          <legend className="sr-only">{i + 1}번째 문답</legend>
          <div className="faq-head">
            <strong>{i + 1}</strong>
            <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${i + 1}번째를 위로`}>
              위로
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={i === rows.length - 1}
              onClick={() => move(i, 1)}
              aria-label={`${i + 1}번째를 아래로`}
            >
              아래로
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => change(rows.filter((x) => x.key !== r.key))}
              aria-label={`${i + 1}번째 지우기`}
            >
              지우기
            </button>
          </div>
          <label htmlFor={`q-${r.key}`}>질문</label>
          <input
            id={`q-${r.key}`}
            value={r.q}
            maxLength={100}
            onChange={(e) => change(rows.map((x) => (x.key === r.key ? { ...x, q: e.target.value } : x)))}
          />
          <label htmlFor={`a-${r.key}`}>
            답 <span className="muted">({r.a.length}/600)</span>
          </label>
          <textarea
            id={`a-${r.key}`}
            value={r.a}
            maxLength={600}
            rows={4}
            onChange={(e) => change(rows.map((x) => (x.key === r.key ? { ...x, a: e.target.value } : x)))}
          />
        </fieldset>
      ))}
      <div className="bar">
        <button type="button" className="btn" disabled={rows.length >= 30} onClick={() => change([...rows, ...withKeys([{ q: "", a: "" }])])}>
          문답 추가
        </button>
      </div>
      <div className="bar">
        <button type="submit" className="btn btn-primary" disabled={pending || !dirty}>
          {pending ? "저장하는 중…" : "저장하고 사이트에 반영"}
        </button>
        {dirty ? <span className="muted">저장하지 않은 변경이 있습니다.</span> : null}
      </div>
    </form>
  );
}
