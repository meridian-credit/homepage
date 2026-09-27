"use client";

/**
 * 주요 세무 일정. 페이지에 들어오면 팝업으로 뜬다.
 *
 * 세무를 맡기려는 사장님이 제일 먼저 궁금해하는 게 다음 마감일이다.
 * 그래서 먼저 보여주되, "24시간 다시 보지 않기"로 매번 막지 않는다.
 *
 * 닫아도 히어로에 남는 작은 버튼으로 언제든 다시 열 수 있다.
 */

import { useEffect, useRef, useState, useCallback } from "react";

const KEY = "meridian.sched.hideUntil";

import { daysLeft, dday as ddayLabel, ntsThisMonthUrl, type ScheduleItem } from "@/lib/schedule";
import { useToday } from "@/lib/use-today";
import { useDialog } from "@/lib/use-dialog";
const dotted = (ymd: string) => ymd.replaceAll('-', '.');

/* 히어로에 남는 작은 버튼. 마감이 제일 가까운 한 건을 보여준다.
   서버에서 그리면 배포 시점 날짜로 굳으므로, 브라우저에서 한 번 더 센다. */
export function ScheduleButton({ items }: { items: ScheduleItem[] }) {
  const today = useToday();
  const next = today ? items.find(it => daysLeft(it.when, today) >= 0) : undefined;
  const label = next ? `${next.what.replace(/ .*$/, "")} ${ddayLabel(next.when)}` : today ? "이번 달 일정" : null;

  return (
    <button type="button" id="schedOpen" className="sched-open">
      <span className="lb">주요 세무 일정</span>
      {/* 계산 전에는 비워 둔다. 잘못된 숫자가 한 프레임이라도 보이면 안 된다. */}
      <span className="dd"><span>{label ?? "\u00a0"}</span></span>
    </button>
  );
}

/* auto — 들어오자마자 스스로 뜰지. 포탈은 홈이 아니라서 스스로 뜨지 않는다.
   거기서는 화면 안 버튼을 눌렀을 때만 열린다. */
export default function SchedulePopup({ items, trigger, auto = true }: { items: ScheduleItem[]; trigger?: string; auto?: boolean }) {
  const [open, setOpen] = useState(false);
  const today = useToday();
  const liveItems = today ? items.filter(it => daysLeft(it.when, today) >= 0) : [];
  const [dontShow, setDontShow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    if (dontShow) { try { localStorage.setItem(KEY, String(Date.now() + 86400000)); } catch {} }
    setOpen(false);
  }, [dontShow]);
  useDialog(open, panelRef, close, triggerRef);

  // 처음 들어오면 뜬다. 24시간 안 보기를 눌렀으면 안 뜬다.
  useEffect(() => {
    let hidden = false;
    try {
      const until = Number(localStorage.getItem(KEY) || 0);
      hidden = until > Date.now();
    } catch {
      // 로컬 저장이 막힌 브라우저(시크릿 모드 등). 그냥 띄운다.
    }
    if (hidden || !auto) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [auto]);

  // 히어로의 "일정 보기" 버튼으로도 열린다
  useEffect(() => {
    if (!trigger) return;
    const btn = document.getElementById(trigger);
    if (!btn) return;
    triggerRef.current = btn;
    const onClick = () => setOpen(true);
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, [trigger]);

  if (!open) return null;

  return (
    <div className="schp" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="schp-panel glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schp-title"
        ref={panelRef}
      >
        <div className="schp-hd">
          <div>
            <h2 id="schp-title">주요 세무 일정</h2>
            <time dateTime={today || undefined}>{today ? dotted(today) : ""} 기준</time>
          </div>
          <button type="button" className="schp-x" onClick={close} aria-label="닫기">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <ol className="schp-list">
          {liveItems.map((it, i) => (
            <li key={i} className={i === 0 ? "near" : undefined}>
              <span className="what">{it.what}</span>
              <span className="dday">{ddayLabel(it.when)}</span>
              <span className="when">{dotted(it.when)}</span>
            </li>
          ))}
        </ol>

        {/* 적어 둔 일정이 다 지났을 때. 결함처럼 읽히는 빈 문구 대신 오늘 달의 국세청 표로 보낸다. */}
        {today && !liveItems.length && <p><a href={ntsThisMonthUrl(today)} target="_blank" rel="noopener noreferrer">이번 달 세무일정 · 국세청</a></p>}
        <p className="schp-note">
          <span className="s">국세청 기준 주요 신고·납부 기한.</span>
          <span className="s">담당 법인의 신고 의무 및 마감일은</span>
          <span className="s">실제와 상이할 수 있습니다.</span>
        </p>

        <div className="schp-ft">
          <label className="schp-chk">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            <span>24시간 동안 보지 않기</span>
          </label>
          <button type="button" className="btn btn-fill schp-close" onClick={close}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
