import { describeFaq, type FaqData } from "./faq";
import type { ContentKind } from "./registry";
import { describeSchedule, type ScheduleData } from "./schedule";
import type { Change } from "./types";

/* 변경 기록 한 건을 사람이 읽을 모양으로. 저장할 때 남긴 summary 대신 전 · 후를 다시 비교한다 —
   옛 기록(「일정 6건 → 7건」)도 같은 말로 읽히게. 되돌림인지는 summary 의 머리로 안다. */
export function describeEvent(event: { kind: ContentKind; summary: string; before: unknown; after: unknown }, today: string) {
  const { changes, summary } =
    event.kind === "schedule"
      ? describeSchedule(event.before as ScheduleData, event.after as ScheduleData, today)
      : describeFaq(event.before as FaqData, event.after as FaqData);
  /* 지금: 「되돌림: 10월 7일 11:02 저장 이전으로」. 2026-10-12 전: 「기록 #5(…) 이전으로 되돌림」. */
  const restore = event.summary.startsWith("되돌림")
    ? event.summary.replace(/^되돌림:?\s*/, "")
    : (/^기록 #(\d+)\(.*이전으로 되돌림$/.exec(event.summary)?.[1] ?? null);
  const restoreLine = restore === null ? null : /^\d+$/.test(restore) ? `기록 #${restore} 이전으로` : restore;
  const first = changes[0] ? plain(changes[0]) : "";
  const detail = changes.length > 1 ? `${first} 외 ${changes.length - 1}건` : first;
  return { title: summary, detail, changes, restore: restoreLine };
}

export function plain(c: Change) {
  if (c.op === "mod" && c.before !== undefined && !c.block) return `${c.text} ${c.before} → ${c.after}`;
  return c.text;
}
