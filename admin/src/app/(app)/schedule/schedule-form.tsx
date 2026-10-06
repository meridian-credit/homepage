"use client";

import { useState, useTransition } from "react";
import type { ScheduleItem } from "@/lib/schedule";
import { saveSchedule, type SaveResult } from "../../actions";
import SaveMessage, { UNREACHABLE } from "../save-message";
import { useUnsavedGuard } from "../use-unsaved-guard";

type Row = ScheduleItem & { key: number };
let nextKey = 0;
const withKeys = (items: ScheduleItem[]): Row[] => items.map((it) => ({ ...it, key: nextKey++ }));

export default function ScheduleForm({
  initial,
  revision: initialRevision,
  today,
}: {
  initial: { items: ScheduleItem[]; reviewedAt: string };
  revision: number;
  today: string;
}) {
  const [rows, setRows] = useState(() => withKeys(initial.items));
  const [reviewedAt, setReviewedAt] = useState(initial.reviewedAt);
  const [revision, setRevision] = useState(initialRevision);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<SaveResult<unknown> | null>(null);
  const [pending, startTransition] = useTransition();
  useUnsavedGuard(dirty);

  const edit = (key: number, field: keyof ScheduleItem, value: string) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const items = rows.map(({ what, when, period }) => ({ what, when, period }));
      const res = await saveSchedule({ items, reviewedAt }, revision).catch(() => UNREACHABLE);
      setResult(res);
      if (res.ok) {
        setRows(withKeys(res.saved.items));
        setReviewedAt(res.saved.reviewedAt);
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
      <table className="sched-table">
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">기한</th>
            <th scope="col">대상 기간</th>
            <th scope="col">
              <span className="sr-only">지우기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key}>
              <td>
                <input
                  aria-label={`${i + 1}번째 항목`}
                  value={r.what}
                  maxLength={30}
                  placeholder="원천세 납부"
                  onChange={(e) => edit(r.key, "what", e.target.value)}
                />
              </td>
              <td>
                <input
                  aria-label={`${i + 1}번째 기한`}
                  type="date"
                  value={r.when}
                  onChange={(e) => edit(r.key, "when", e.target.value)}
                />
              </td>
              <td>
                <input
                  aria-label={`${i + 1}번째 대상 기간`}
                  value={r.period}
                  maxLength={30}
                  placeholder="2026년 9월분"
                  onChange={(e) => edit(r.key, "period", e.target.value)}
                />
              </td>
              <td className="row-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    setRows((rs) => rs.filter((x) => x.key !== r.key));
                    setDirty(true);
                  }}
                >
                  지우기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bar">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setRows((rs) => [...rs, ...withKeys([{ what: "", when: "", period: "" }])]);
            setDirty(true);
          }}
        >
          줄 추가
        </button>
        <span className="muted">저장하면 날짜순으로 정리됩니다.</span>
      </div>

      <div className="bar">
        <label htmlFor="reviewed-at">국세청 표를 확인한 날</label>
        <input
          id="reviewed-at"
          type="date"
          value={reviewedAt}
          max={today}
          style={{ width: "auto" }}
          onChange={(e) => {
            setReviewedAt(e.target.value);
            setDirty(true);
          }}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setReviewedAt(today);
            setDirty(true);
          }}
        >
          오늘로
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
