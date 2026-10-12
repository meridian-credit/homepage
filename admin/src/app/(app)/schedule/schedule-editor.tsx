"use client";

import { useCallback, useState } from "react";
import { daysLeft, dday, ntsMonthUrl, type ScheduleItem } from "@/lib/schedule";
import { saveSchedule } from "@admin/app/actions";
import {
  describeSchedule,
  scheduleKey,
  scheduleRowIssues,
  scheduleStatus,
  SCHEDULE_ROWS_MAX,
  SCHEDULE_TEXT_MAX,
  type ScheduleData,
  type ScheduleField,
} from "@admin/content/schedule";
import { EditorNotices } from "@admin/editing/editor-notices";
import { SaveBar } from "@admin/editing/save-bar";
import { useEditor } from "@admin/editing/use-editor";
import { ddayTone, isYmd, monthDay, monthDot, weekday } from "@admin/lib/format";
import { Icon } from "@admin/ui/icons";

/* 세무 일정 편집(docs/plans/admin-backend/ui.md).
   - 읽기가 기본이다. 달별로 묶은 표에서 고칠 줄만 그 자리에서 입력칸으로 바뀐다(엑셀처럼).
   - 매달 하는 일(국세청 표를 보고 다음 달 채우기)이 목록 끝의 「아직 없음」 칸으로 놓인다.
   - 지우기는 확인 창 없이 「지울 예정」으로 표시하고 [되살리기]를 둔다. 저장 전까지는 그편이 빠르고 안전하다.
   - 순서는 날짜로 저절로 정해진다. 저장은 목록 통째 + 확인일 한 번이다(기록도 한 줄). */

type Row = ScheduleItem & { id: string; orig: ScheduleItem | null; del: boolean };
type State = { rows: Row[]; reviewedAt: string };
type Problems = { fields: Partial<Record<ScheduleField, string>>; dup: string | null };

/* 처음 줄의 번호는 순서로 매긴다(서버 HTML 과 브라우저가 같아야 한다). 새 줄만 시각을 섞는다. */
let seq = 0;
const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;
const toState = (d: ScheduleData): State => ({
  rows: d.items.map((it, i) => ({ ...it, id: `s${i}`, orig: it, del: false })),
  reviewedAt: d.reviewedAt,
});
const live = (s: State) => s.rows.filter((r) => !r.del);
const payload = (s: State): ScheduleData => ({
  items: live(s).map((r) => ({ what: r.what.trim(), when: r.when, period: r.period.trim() })),
  reviewedAt: s.reviewedAt,
});
const statusOf = (r: Row) =>
  r.del ? "del" : !r.orig ? "new" : r.what !== r.orig.what || r.when !== r.orig.when || r.period !== r.orig.period ? "edit" : "same";

function problems(r: Row | ScheduleItem, list: Row[]): Problems {
  const fields = scheduleRowIssues(r);
  let dup: string | null = null;
  if (!fields.when && !fields.what) {
    const i = list.indexOf(r as Row);
    const earlier = i < 0 ? list : list.slice(0, i);
    if (earlier.some((o) => scheduleKey(o) === scheduleKey(r)))
      dup = `같은 일정이 이미 있습니다 — ${monthDay(r.when)} ${r.what.trim()}. 기한이나 항목을 확인해 주세요.`;
  }
  return { fields, dup };
}
const hasProblem = (p: Problems) => Object.keys(p.fields).length > 0 || !!p.dup;
const marked = (p: Problems, f: ScheduleField) => !!p.fields[f] || (!!p.dup && (f === "when" || f === "what"));
const firstBad = (s: State) => live(s).find((r) => hasProblem(problems(r, live(s))));
const countIssues = (s: State) =>
  live(s).filter((r) => hasProblem(problems(r, live(s)))).length + (live(s).length > SCHEDULE_ROWS_MAX ? 1 : 0);

const monthKey = (ymd: string) => ymd.slice(0, 7);
const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
const EMPTY: ScheduleItem = { when: "", what: "", period: "" };

export default function ScheduleEditor({
  data,
  revision,
  today,
  siteUrl,
}: {
  data: ScheduleData;
  revision: number;
  today: string;
  siteUrl?: string;
}) {
  const [editing, setEditing] = useState<{ id: string; anchor: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMonth, setAddMonth] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<ScheduleItem>(EMPTY);
  const [addProblems, setAddProblems] = useState<Problems | null>(null);
  const [addDone, setAddDone] = useState<{ text: string; past: boolean } | null>(null);
  const describe = useCallback((a: ScheduleData, b: ScheduleData) => describeSchedule(a, b, today), [today]);

  const openEdit = (r: Row, field: ScheduleField = "when") => {
    setEditing({ id: r.id, anchor: isYmd(r.when) ? r.when : (r.orig?.when ?? today) });
    focusSoon(`e-${field}-${r.id}`);
  };

  const editor = useEditor<ScheduleData, State>({
    kind: "schedule",
    data,
    revision,
    toState,
    payload,
    describe,
    issues: countIssues,
    save: saveSchedule,
    onInvalid: (s) => {
      const bad = firstBad(s);
      if (!bad) return focusSoon("sched-add-open");
      const p = problems(bad, live(s));
      openEdit(bad, (["when", "what", "period"] as const).find((f) => marked(p, f)) ?? "when");
    },
    onSaved: () => {
      setEditing(null);
      setAddOpen(false);
      setAddProblems(null);
      setAddDone(null);
    },
    blocker: () =>
      addOpen && (candidate.when || candidate.what.trim() || candidate.period.trim())
        ? {
            message: "새 일정 칸에 적은 것이 아직 목록에 들어가지 않았습니다. [목록에 추가]를 누르거나 칸을 비운 뒤 다시 저장해 주세요.",
            focus: () => focusSoon("add-what"),
          }
        : null,
  });
  const { state, setState } = editor;
  const rows = live(state);

  const update = (id: string, change: Partial<Row>) =>
    setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === id ? { ...r, ...change } : r)) }));
  const remove = (r: Row) => {
    setState((s) => ({ ...s, rows: r.orig ? s.rows.map((x) => (x.id === r.id ? { ...x, del: true } : x)) : s.rows.filter((x) => x.id !== r.id) }));
    if (editing?.id === r.id) setEditing(null);
    focusSoon(r.orig ? `undel-${r.id}` : "sched-add-open");
  };
  const closeEdit = () => {
    const id = editing?.id;
    setEditing(null);
    if (id) focusSoon(`edit-${id}`);
  };

  /* ── 새 일정 ── */
  const openAdd = (month?: string) => {
    setAddOpen(true);
    setAddMonth(month ?? null);
    focusSoon("add-when");
  };
  /* 닫으면 적던 것도 버린다(닫기는 일부러 누르는 것이다). 다시 열었을 때 옛 값이 남아 있지 않게. */
  const closeAdd = () => {
    setCandidate(EMPTY);
    setAddOpen(false);
    setAddMonth(null);
    setAddProblems(null);
    setAddDone(null);
    focusSoon("sched-add-open");
  };
  const submitAdd = () => {
    const p = problems(candidate, rows);
    if (rows.length >= SCHEDULE_ROWS_MAX) p.fields.when = `일정은 ${SCHEDULE_ROWS_MAX}개까지 둘 수 있습니다. 지난 일정을 먼저 지워 주세요.`;
    if (hasProblem(p)) {
      setAddProblems(p);
      setAddDone(null);
      focusSoon(`add-${(["when", "what", "period"] as const).find((f) => marked(p, f))}`);
      return;
    }
    const item = { when: candidate.when, what: candidate.what.trim(), period: candidate.period.trim() };
    setState((s) => ({ ...s, rows: [...s.rows, { ...item, id: newId(), orig: null, del: false }] }));
    setAddProblems(null);
    setAddDone({
      past: daysLeft(item.when, today) < 0,
      text:
        daysLeft(item.when, today) < 0
          ? `${monthDay(item.when, today)} ${item.what}을(를) 넣었습니다. 지난 날짜라 사이트에는 보이지 않습니다.`
          : `${monthDay(item.when, today)} ${item.what}을(를) 목록에 넣었습니다. 더 넣거나, 다 넣었으면 [저장하고 반영]을 누르세요.`,
    });
    setCandidate(EMPTY);
    focusSoon("add-when");
  };

  /* ── 달별 묶음 ── 고치는 줄은 고치기 시작할 때의 자리에 둔다(날짜를 고치는 동안 줄이 옮겨 다니지 않게). */
  const anchorOf = (r: Row) => (editing?.id === r.id ? editing.anchor : isYmd(r.when) ? r.when : (r.orig?.when ?? today));
  const ordered = state.rows
    .map((r, i) => ({ r, i, at: anchorOf(r) }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.i - b.i);
  const upcoming = ordered.filter((x) => daysLeft(x.at, today) >= 0);
  const past = ordered.filter((x) => daysLeft(x.at, today) < 0);
  const months: string[] = [];
  for (let ym = monthKey(today), stop = nextMonth(upcoming.length ? monthKey(upcoming.at(-1)!.at) : monthKey(today)); ym <= stop; ym = nextMonth(ym))
    months.push(ym);
  const names = [...new Set(rows.map((r) => r.what.trim()).filter(Boolean))].sort();

  /* ── 숫자판: 작업본 기준. 고치는 대로 「일정이 채워진 날」이 바뀐다. ── */
  const st = scheduleStatus(
    rows.filter((r) => isYmd(r.when)),
    today
  );
  const next = st.upcoming[0];
  const reviewedChanged = state.reviewedAt !== editor.base.reviewedAt;
  const added = state.rows.some((r) => statusOf(r) === "new");
  const nudge = added && state.reviewedAt !== today;
  const ago = isYmd(state.reviewedAt) ? -daysLeft(state.reviewedAt, today) : null;
  const [ty, tm] = today.split("-").map(Number);

  const renderRow = (r: Row) => {
    const status = statusOf(r);
    const p = problems(r, rows);
    const bad = status !== "del" && hasProblem(p);
    const label = `${isYmd(r.when) ? monthDay(r.when, today) : "날짜 없음"} ${r.what.trim() || "(항목 없음)"}`;
    if (editing?.id === r.id && status !== "del") {
      const field = (f: ScheduleField, title: string, type: "date" | "text") => {
        const id = `e-${f}-${r.id}`;
        const len = r[f].trim().length;
        return (
          <div className={`field ${marked(p, f) ? "has-error" : ""}`}>
            <label className="field-label" htmlFor={id}>
              <span>{title}</span>
              {type === "text" ? <span className={`counter ${len > SCHEDULE_TEXT_MAX ? "over" : ""}`}>{len}/{SCHEDULE_TEXT_MAX}</span> : null}
            </label>
            <input
              className="input"
              id={id}
              type={type}
              value={r[f]}
              list={f === "what" ? "what-list" : undefined}
              autoComplete="off"
              aria-invalid={marked(p, f) || undefined}
              aria-describedby={`${id}-msg`}
              onChange={(e) => update(r.id, { [f]: e.target.value })}
            />
            <div id={`${id}-msg`}>
              {p.fields[f] ? (
                <div className="error-text">
                  <Icon name="alert" />
                  <span>{p.fields[f]}</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      };
      return (
        <div
          key={r.id}
          className="row-edit"
          role="group"
          aria-label={`${label} 고치는 중`}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT")) {
              e.preventDefault();
              closeEdit();
            }
          }}
        >
          <div className="add-grid">
            {field("when", "기한", "date")}
            {field("what", "항목", "text")}
            {field("period", "대상 기간", "text")}
            <div className="edit-actions">
              <button type="button" className="btn" onClick={closeEdit}>
                <Icon name="check" />
                완료
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (r.orig) update(r.id, { ...r.orig });
                  else remove(r);
                  setEditing(null);
                  focusSoon(r.orig ? `edit-${r.id}` : "sched-add-open");
                }}
              >
                {r.orig ? "되돌리기" : "빼기"}
              </button>
            </div>
            <div className="dup-msg" role="alert">
              {p.dup ? (
                <div className="error-text">
                  <Icon name="alert" />
                  <span>{p.dup}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }
    const at = anchorOf(r);
    return (
      <div
        key={r.id}
        className={`row ${status === "same" ? "" : `is-${status}`} ${bad ? "is-err" : ""}`}
        onClick={(e) => {
          /* 줄 아무 데나 눌러도 고친다(마우스용). 키보드는 연필 단추로 같은 일을 한다. */
          if (status !== "del" && !(e.target as HTMLElement).closest("button, a")) openEdit(r, "what");
        }}
      >
        <div className="r-date num">
          {monthDot(at)}
          <small>({weekday(at)})</small>
        </div>
        <span className={`dday ${ddayTone(at, today)}`}>{dday(at, today)}</span>
        <div className="r-what">
          {r.what}{" "}
          {status === "new" ? <span className="badge new">새로</span> : null}
          {status === "edit" ? <span className="badge edit">고침</span> : null}
          {status === "del" ? <span className="badge del">지울 예정</span> : null}
          {bad ? <span className="badge err">고칠 곳 있음</span> : null}
        </div>
        <div className="r-period">{r.period}</div>
        <div className="r-actions">
          {status === "del" ? (
            <button
              type="button"
              className="btn btn-sm"
              id={`undel-${r.id}`}
              onClick={() => {
                update(r.id, { del: false });
                focusSoon(`del-${r.id}`);
              }}
            >
              <Icon name="undo" small />
              되살리기
            </button>
          ) : (
            <>
              <button type="button" className="icon-btn" id={`edit-${r.id}`} aria-label={`${label} 고치기`} title="고치기" onClick={() => openEdit(r)}>
                <Icon name="pencil" />
              </button>
              <button type="button" className="icon-btn danger" id={`del-${r.id}`} aria-label={`${label} 지우기`} title="지우기" onClick={() => remove(r)}>
                <Icon name="trash" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const addField = (f: ScheduleField, title: string, type: "date" | "text", placeholder?: string) => {
    const len = candidate[f].trim().length;
    const bad = addProblems ? marked(addProblems, f) : false;
    return (
      <div className={`field ${bad ? "has-error" : ""}`}>
        <label className="field-label" htmlFor={`add-${f}`}>
          <span>{title}</span>
          {type === "text" ? <span className={`counter ${len > SCHEDULE_TEXT_MAX ? "over" : ""}`}>{len}/{SCHEDULE_TEXT_MAX}</span> : null}
        </label>
        <input
          className="input"
          id={`add-${f}`}
          type={type}
          value={candidate[f]}
          min={type === "date" && addMonth ? `${addMonth}-01` : undefined}
          placeholder={placeholder}
          list={f === "what" ? "what-list" : undefined}
          autoComplete="off"
          aria-invalid={bad || undefined}
          aria-describedby={`add-${f}-msg`}
          onChange={(e) => setCandidate((c) => ({ ...c, [f]: e.target.value }))}
        />
        <div id={`add-${f}-msg`}>
          {addProblems?.fields[f] ? (
            <div className="error-text">
              <Icon name="alert" />
              <span>{addProblems.fields[f]}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <EditorNotices draft={editor.draft} lost={editor.lost} onResume={editor.resumeDraft} onDrop={editor.dropDraft} onDismissLost={editor.dismissLost} />

      <div inert={editor.saving}>
        <section className="card" aria-labelledby="stats-h">
          <h2 className="sr-only" id="stats-h">
            지금 사이트 상태
          </h2>
          <div className="stats">
            <div className={`stat ${st.upcoming.length ? "" : "danger"}`}>
              <div className="stat-label">다가오는 일정</div>
              <div className="stat-value">{st.upcoming.length}건</div>
              <div className="stat-sub">
                {next
                  ? daysLeft(next.when, today) === 0
                    ? `오늘 마감: ${next.what}`
                    : `다음: ${next.what} · ${monthDay(next.when, today)}`
                  : "보일 일정이 없습니다."}
              </div>
            </div>
            <div className={`stat ${st.level === "ok" ? "" : st.level}`}>
              <div className="stat-label">일정이 채워진 날</div>
              <div className="stat-value">
                {st.last ? (
                  <>
                    {monthDay(st.last.when, today)}까지<small>{st.runway}일 남음</small>
                  </>
                ) : (
                  "없음"
                )}
              </div>
              <div className="stat-sub">
                {st.level === "ok"
                  ? `${monthDay(st.remindFrom!, today)}부터 홈에 ‘일정 채우기’ 알림이 뜹니다.`
                  : st.level === "warn"
                    ? "30일이 안 남았습니다. 국세청이 다음 달 일정을 올렸는지 확인해 주세요."
                    : "사이트 머리글에 일정 대신 국세청 이번 달 일정 링크가 나옵니다."}
              </div>
            </div>
            <div className={`stat ${nudge ? "nudge" : ""}`}>
              <div className="stat-label">국세청 표 확인일</div>
              <div className="stat-value stat-row">
                {isYmd(state.reviewedAt) ? monthDay(state.reviewedAt, today) : "없음"}
                {ago !== null ? <small>{ago === 0 ? "오늘" : `${ago}일 전`}</small> : null}
                {reviewedChanged ? <span className="badge edit">바꿈</span> : null}
              </div>
              <div className="stat-sub">
                {nudge
                  ? "새 일정을 국세청 표에서 옮겼다면 확인일도 오늘로 바꿔 주세요."
                  : "사이트에는 나오지 않습니다. 국세청 표와 언제 맞춰 봤는지 남겨 둡니다."}
              </div>
              {state.reviewedAt !== today ? (
                <button type="button" className="btn btn-sm" onClick={() => setState((s) => ({ ...s, reviewedAt: today }))}>
                  <Icon name="check" small />
                  오늘 확인함
                </button>
              ) : reviewedChanged ? (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setState((s) => ({ ...s, reviewedAt: editor.base.reviewedAt }))}>
                  <Icon name="undo" small />
                  확인일 되돌리기
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="list-h">
          <div className="card-head">
            <div className="list-toolbar">
              <div className="left">
                <h2 id="list-h">일정 목록</h2>
                <span className="sub">{rows.length}건 · 날짜순</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              id="sched-add-open"
              aria-expanded={addOpen}
              aria-controls="add-panel"
              onClick={() => (addOpen ? focusSoon("add-when") : openAdd())}
            >
              <Icon name="plus" />
              일정 추가
            </button>
          </div>

          <form
            className="add-panel"
            id="add-panel"
            hidden={!addOpen}
            noValidate
            aria-labelledby="add-h"
            onSubmit={(e) => {
              e.preventDefault();
              submitAdd();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeAdd();
            }}
          >
            <h3>
              <span id="add-h">{addMonth ? `새 일정 — ${Number(addMonth.slice(5))}월` : "새 일정"}</span>
              <button type="button" className="icon-btn" aria-label="새 일정 닫기" onClick={closeAdd}>
                <Icon name="x" />
              </button>
            </h3>
            <div className="add-grid">
              {addField("when", "기한", "date")}
              {addField("what", "항목", "text", "예: 원천세 납부")}
              {addField("period", "대상 기간", "text", `예: ${ty}년 ${tm}월분`)}
              <button type="submit" className="btn btn-primary">
                <Icon name="plus" />
                목록에 추가
              </button>
              <div className="dup-msg" role="alert">
                {addProblems?.dup ? (
                  <div className="error-text">
                    <Icon name="alert" />
                    <span>{addProblems.dup}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="hint">국세청 표에 적힌 날짜를 그대로 적어 주세요. 목록에 추가한 일정은 아래 [저장하고 반영]을 눌러야 사이트에 나옵니다.</p>
            <div className="add-done" role="status" aria-live="polite">
              {addDone ? (
                addDone.past ? (
                  <span className="warn-text">
                    <Icon name="alert" />
                    {addDone.text}
                  </span>
                ) : (
                  <>
                    <Icon name="check" small />
                    {addDone.text}
                  </>
                )
              ) : null}
            </div>
            <datalist id="what-list">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </form>

          {!state.rows.length ? (
            <div className="empty">
              <span className="empty-ic">
                <Icon name="calendar" />
              </span>
              <h3>사이트에 보일 세무 일정이 없습니다</h3>
              <p>지금 사이트 머리글에는 일정 대신 국세청 이번 달 일정 링크가 나옵니다. 국세청 표를 열어 이번 달과 다음 달 기한을 넣어 주세요.</p>
              <div className="btns">
                <a className="btn" href={ntsMonthUrl(ty, tm)} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" />
                  국세청 {tm}월 표 열기
                </a>
                <button type="button" className="btn btn-primary" onClick={() => openAdd()}>
                  <Icon name="plus" />첫 일정 추가
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="list-cols" aria-hidden="true">
                <span>기한</span>
                <span>D-day</span>
                <span>항목</span>
                <span>대상 기간</span>
                <span />
              </div>
              {months.map((ym) => {
                const [y, m] = ym.split("-").map(Number);
                const inMonth = upcoming.filter((x) => monthKey(x.at) === ym);
                const link = (
                  <a href={ntsMonthUrl(y, m)} target="_blank" rel="noopener noreferrer">
                    국세청 {m}월 표<Icon name="external" small />
                    <span className="sr-only">(새 창)</span>
                  </a>
                );
                if (!inMonth.length)
                  return (
                    <div key={ym} className="month is-missing">
                      <div className="month-head">
                        <span>
                          <strong>
                            {y}년 {m}월
                          </strong>
                          <span className="count">아직 없음</span>
                        </span>
                        {link}
                      </div>
                      <div className="month-empty">
                        <span>국세청이 {m}월 표를 올렸는지 확인하고, 올렸으면 넣어 주세요.</span>
                        <button type="button" className="btn btn-sm" onClick={() => openAdd(ym)}>
                          <Icon name="plus" small />
                          {m}월 일정 추가
                        </button>
                      </div>
                    </div>
                  );
                return (
                  <div key={ym} className="month">
                    <div className="month-head">
                      <span>
                        <strong>
                          {y}년 {m}월
                        </strong>
                        <span className="count">{inMonth.filter((x) => !x.r.del).length}건</span>
                      </span>
                      {link}
                    </div>
                    {inMonth.map((x) => renderRow(x.r))}
                  </div>
                );
              })}
              {past.length ? (
                <details className="past-group month">
                  <summary>
                    <Icon name="chevron" small />
                    지난 일정 {past.length}건 · 사이트에 보이지 않습니다
                  </summary>
                  {past.map((x) => renderRow(x.r))}
                  <div className="month-empty">
                    <span>지난 일정은 지워도 사이트에 변화가 없습니다.</span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          rows: s.rows
                            .filter((r) => r.orig || daysLeft(anchorOf(r), today) >= 0)
                            .map((r) => (daysLeft(anchorOf(r), today) < 0 ? { ...r, del: true } : r)),
                        }))
                      }
                    >
                      지난 일정 모두 지우기
                    </button>
                  </div>
                </details>
              ) : null}
            </div>
          )}

          <p className="rule-note">
            <Icon name="info" />
            <span>
              국세청이 게시한 달만 적습니다. 게시되지 않은 달은 짐작해 넣지 않습니다. 주말·공휴일로 미뤄진 기한은 국세청 표에 적힌 날짜를 그대로 씁니다.
            </span>
          </p>
        </section>
      </div>

      <SaveBar
        editor={editor}
        object="세무 일정을"
        siteUrl={siteUrl}
        onGotoIssue={() => {
          const bad = firstBad(state);
          if (bad) {
            const p = problems(bad, rows);
            openEdit(bad, (["when", "what", "period"] as const).find((f) => marked(p, f)) ?? "when");
          } else focusSoon("sched-add-open");
        }}
      />
    </>
  );
}
