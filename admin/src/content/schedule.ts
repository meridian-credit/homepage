import { z } from "zod";
import { daysLeft, seoulToday, type ScheduleItem } from "@/lib/schedule";
import { addDays, isYmd, monthDay, weekday } from "@admin/lib/format";
import type { Change } from "./types";

/* 세무 일정의 규칙 · 비교 · 상태. 편집 화면(브라우저)과 저장 액션(서버)이 같은 것을 쓴다 — 브라우저에서 바로
   알려 주고, 서버에서 다시 막는다. 글자 수 상한은 화면 자리에서 나왔다(일정 큐브 한 면). */

export type ScheduleData = { items: ScheduleItem[]; reviewedAt: string };
export const SCHEDULE_TEXT_MAX = 30;
export const SCHEDULE_ROWS_MAX = 60;

const ymd = (empty: string) => z.string().min(1, empty).refine(isYmd, "없는 날짜입니다.");

/* 기한은 2년 안쪽만. 연도를 잘못 쳐(2062) 목록에 빈 달이 수백 개 생기는 것을 막는다. 국세청은 몇 달 치만 게시한다. */
export const scheduleRow = z.object({
  when: ymd("기한을 골라 주세요.").refine((d) => daysLeft(d, seoulToday()) <= 730, "기한이 2년 넘게 남았습니다. 연도를 확인해 주세요."),
  what: z.string().trim().min(1, "항목을 적어 주세요.").max(SCHEDULE_TEXT_MAX, `항목은 ${SCHEDULE_TEXT_MAX}자 안으로 적어 주세요.`),
  period: z
    .string()
    .trim()
    .min(1, "대상 기간을 적어 주세요.")
    .max(SCHEDULE_TEXT_MAX, `대상 기간은 ${SCHEDULE_TEXT_MAX}자 안으로 적어 주세요.`),
});

/* 일정 큐브가 항목 + 기한을 열쇠로 쓴다. 같은 것이 둘이면 하나가 사라진다. */
export const scheduleKey = (it: { what: string; when: string }) => `${it.what.trim()}\u0000${it.when}`;

export const scheduleInput = z.object({
  items: z
    .array(scheduleRow)
    .max(SCHEDULE_ROWS_MAX, `일정은 ${SCHEDULE_ROWS_MAX}개까지 둘 수 있습니다.`)
    .refine((rows) => new Set(rows.map(scheduleKey)).size === rows.length, "같은 항목 · 기한이 두 번 있습니다."),
  reviewedAt: ymd("국세청 확인일을 골라 주세요.").refine((d) => daysLeft(d, seoulToday()) <= 0, "확인일은 오늘이나 그 전이어야 합니다."),
});

export type ScheduleField = "when" | "what" | "period";

/* 한 줄의 칸별 오류. 같은 일정(항목 + 기한)이 이미 있는지는 목록을 아는 쪽이 따로 본다. */
export function scheduleRowIssues(row: ScheduleItem): Partial<Record<ScheduleField, string>> {
  const parsed = scheduleRow.safeParse(row);
  if (parsed.success) return {};
  const out: Partial<Record<ScheduleField, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ScheduleField;
    out[field] ??= issue.message;
  }
  return out;
}

/* 지금 사이트가 보이는 범위. 「일정이 채워진 날」까지 30일이 안 남으면 채울 때다. */
export function scheduleStatus(items: ScheduleItem[], today: string) {
  const upcoming = items.filter((it) => daysLeft(it.when, today) >= 0).sort((a, b) => a.when.localeCompare(b.when));
  const last = upcoming.at(-1);
  const runway = last ? daysLeft(last.when, today) : -1;
  const level: "ok" | "warn" | "danger" = runway < 0 ? "danger" : runway < 30 ? "warn" : "ok";
  return { upcoming, last, runway, level, remindFrom: last ? addDays(last.when, -30) : null, past: items.length - upcoming.length };
}

/* 저장한 뒤 알릴 것. 막지는 않는다. */
export function scheduleWarnings(items: ScheduleItem[], today = seoulToday()) {
  const { upcoming, last, runway, past } = scheduleStatus(items, today);
  const warnings: string[] = [];
  if (!upcoming.length) warnings.push("앞으로 남은 일정이 없어 사이트에는 국세청 이번 달 일정 링크가 나옵니다.");
  else if (last && runway < 30) warnings.push(`마지막 일정(${monthDay(last.when, today)})까지 30일이 안 남았습니다.`);
  if (past > 0) warnings.push(`지난 일정 ${past}건은 사이트에 보이지 않습니다.`);
  return warnings;
}

const dateText = (ymd: string, today: string) => (isYmd(ymd) ? `${monthDay(ymd, today)} (${weekday(ymd)})` : ymd || "없음");
export const scheduleLine = (it: ScheduleItem, today: string) => `${dateText(it.when, today)} ${it.what} · ${it.period}`;

/* 두 상태의 차이를 사람이 읽을 줄로. 기한만 옮긴 일정은 「지움 + 추가」가 아니라 「기한 고침」으로 읽힌다. */
export function describeSchedule(before: Partial<ScheduleData>, after: Partial<ScheduleData>, today: string) {
  const a = before.items ?? [];
  const b = after.items ?? [];
  const aByKey = new Map(a.map((it) => [scheduleKey(it), it]));
  const bByKey = new Map(b.map((it) => [scheduleKey(it), it]));
  const added: Change[] = [];
  const edited: Change[] = [];
  const removed: Change[] = [];

  for (const it of b) {
    const was = aByKey.get(scheduleKey(it));
    if (was && was.period !== it.period)
      edited.push({ op: "mod", text: `${dateText(it.when, today)} ${it.what} — 대상 기간`, before: was.period, after: it.period });
  }
  const arrived = b.filter((it) => !aByKey.has(scheduleKey(it)));
  for (const it of a.filter((x) => !bByKey.has(scheduleKey(x)))) {
    const i = arrived.findIndex((x) => x.what === it.what && x.period === it.period);
    if (i < 0) {
      removed.push({ op: "del", text: scheduleLine(it, today) });
      continue;
    }
    const [moved] = arrived.splice(i, 1);
    edited.push({ op: "mod", text: `${it.what} · ${it.period} — 기한`, before: dateText(it.when, today), after: dateText(moved.when, today) });
  }
  for (const it of arrived) added.push({ op: "add", text: scheduleLine(it, today) });

  const reviewed = (before.reviewedAt ?? "") !== (after.reviewedAt ?? "");
  const changes: Change[] = [...added, ...edited, ...removed];
  if (reviewed)
    changes.push({ op: "mod", text: "국세청 확인일", before: dateText(before.reviewedAt ?? "", today), after: dateText(after.reviewedAt ?? "", today) });

  const counts = [
    added.length && `${added.length}건 추가`,
    edited.length && `${edited.length}건 고침`,
    removed.length && `${removed.length}건 지움`,
  ].filter(Boolean);
  const summary =
    [counts.length ? `일정 ${counts.join(" · ")}` : "", reviewed ? "확인일 바꿈" : ""].filter(Boolean).join(" · ") || "바뀐 것 없음";
  return { changes, summary };
}
