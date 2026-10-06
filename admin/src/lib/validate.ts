import { z } from "zod";
import { daysLeft, seoulToday } from "@/lib/schedule";

/* 저장 전 검사. 오류는 저장을 막고, 경고는 저장한 뒤 알려 준다.
   글자 수 상한은 화면 자리에서 나왔다 — 일정 큐브 한 면, FAQ 한 줄. */

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 2026-10-26 처럼 적어 주세요.")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "없는 날짜입니다.");

const scheduleRow = z.object({
  what: z.string().trim().min(1, "항목을 적어 주세요.").max(30, "항목은 30자 안으로 적어 주세요."),
  when: ymd,
  period: z.string().trim().min(1, "대상 기간을 적어 주세요.").max(30, "대상 기간은 30자 안으로 적어 주세요."),
});

export const scheduleInput = z.object({
  items: z
    .array(scheduleRow)
    .max(60, "일정은 60개까지 둘 수 있습니다.")
    /* 일정 큐브가 항목 + 기한을 열쇠로 쓴다. 같은 것이 둘이면 하나가 사라진다. */
    .refine((rows) => new Set(rows.map((r) => `${r.what}\u0000${r.when}`)).size === rows.length, "같은 항목 · 기한이 두 번 있습니다."),
  reviewedAt: ymd.refine((d) => daysLeft(d, seoulToday()) <= 0, "확인일은 오늘이나 그 전이어야 합니다."),
});

const faqRow = z.object({
  q: z.string().trim().min(1, "질문을 적어 주세요.").max(100, "질문은 100자 안으로 적어 주세요."),
  a: z.string().trim().min(1, "답을 적어 주세요.").max(600, "답은 600자 안으로 적어 주세요."),
});

export const faqInput = z.object({
  items: z
    .array(faqRow)
    .min(1, "문답이 하나는 있어야 합니다.")
    .max(30, "문답은 30개까지 둘 수 있습니다.")
    /* 화면이 질문을 열쇠로 쓴다. 같은 질문이 둘이면 하나가 사라진다. */
    .refine((rows) => new Set(rows.map((r) => r.q)).size === rows.length, "같은 질문이 두 번 있습니다."),
});

/* 저장 뒤 알릴 것. 막지는 않는다. */
export function scheduleWarnings(items: { when: string }[], today = seoulToday()) {
  const warnings: string[] = [];
  const upcoming = items.filter((it) => daysLeft(it.when, today) >= 0);
  const last = [...items].sort((a, b) => a.when.localeCompare(b.when)).at(-1);
  if (!upcoming.length) warnings.push("앞으로 남은 일정이 없습니다. 사이트에는 국세청 이번 달 일정 링크가 대신 나옵니다.");
  else if (last && daysLeft(last.when, today) < 30)
    warnings.push(`마지막 일정(${last.when})까지 30일이 안 남았습니다. 국세청이 다음 달 일정을 올리면 채워 주세요.`);
  const past = items.length - upcoming.length;
  if (past > 0) warnings.push(`지난 일정 ${past}건은 사이트에 보이지 않습니다. 지워도 됩니다.`);
  return warnings;
}

export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "입력을 확인해 주세요.";
  const [list, index] = issue.path;
  const row = list === "items" && typeof index === "number" ? `${index + 1}번째 줄: ` : "";
  return row + issue.message;
}
