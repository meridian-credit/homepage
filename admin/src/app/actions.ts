"use server";

import { z } from "zod";
import { seoulToday } from "@/lib/schedule";
import { describeFaq, faqInput, type FaqData } from "@admin/content/faq";
import { contentType } from "@admin/content/registry";
import { describeSchedule, scheduleInput, scheduleWarnings, type ScheduleData } from "@admin/content/schedule";
import type { Change, Published, SaveResult } from "@admin/content/types";
import { countLaterSaves, getAudit, lastSaves, readFaq, readSchedule, writeFaq, writeSchedule } from "@admin/lib/content";
import { whenSaved } from "@admin/lib/format";
import { publishToSite } from "@admin/lib/publish";
import { adminOrNull } from "@admin/lib/session";

/* 저장 액션. 화면을 거치지 않고도 POST 로 부를 수 있으므로, 매번 로그인과 입력을 처음부터 다시 본다.
   로그인이 끝났으면 로그인 화면으로 보내지 않고 「signed-out」으로 답한다 — 보내면 적던 내용이 화면과 함께 사라진다. */

const revision = z.number().int().nonnegative();
const SIGNED_OUT = { ok: false, reason: "signed-out" } as const;
const invalid = (message: string) => ({ ok: false, reason: "invalid", message }) as const;

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "입력을 확인해 주세요.";
  const [list, index] = issue.path;
  const row = list === "items" && typeof index === "number" ? `${index + 1}번째 줄: ` : "";
  return row + issue.message;
}

export async function saveSchedule(input: ScheduleData, baseRevision: number): Promise<SaveResult<ScheduleData>> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  const parsed = scheduleInput.safeParse(input);
  if (!parsed.success) return invalid(firstIssue(parsed.error));
  if (!revision.safeParse(baseRevision).success) return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const today = seoulToday();
  const result = writeSchedule(user.actor, parsed.data, baseRevision, (before) => describeSchedule(before, parsed.data, today).summary);
  if (!result.ok) return { ok: false, reason: "conflict", latest: lastSaves().schedule ?? null };
  const saved = readSchedule();
  return {
    ok: true,
    revision: result.revision,
    saved: { items: saved.items, reviewedAt: saved.reviewedAt },
    warnings: scheduleWarnings(saved.items, today),
    published: await publishToSite(contentType("schedule").object),
  };
}

export async function saveFaq(input: FaqData, baseRevision: number): Promise<SaveResult<FaqData>> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  const parsed = faqInput.safeParse(input);
  if (!parsed.success) return invalid(firstIssue(parsed.error));
  if (!revision.safeParse(baseRevision).success) return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const result = writeFaq(user.actor, parsed.data, baseRevision, (before) => describeFaq(before, parsed.data).summary);
  if (!result.ok) return { ok: false, reason: "conflict", latest: lastSaves().faq ?? null };
  const saved = readFaq();
  return {
    ok: true,
    revision: result.revision,
    saved: { items: saved.items },
    warnings: [],
    published: await publishToSite(contentType("faq").object),
  };
}

/* 되돌리기 전에 보여 줄 것: 그 저장 직전과 「지금」의 차이, 그 뒤에 쌓인 저장 수, 지금의 판 번호.
   기록은 목록 통째의 사진이라, 옛 저장으로 되돌리면 그 뒤의 변경도 함께 되돌아간다. 그것을 숨기지 않는다. */
export type RestorePreview =
  | { ok: true; kind: "schedule" | "faq"; at: string; changes: Change[]; later: number; blocked: string | null; revision: number }
  | { ok: false; reason: "signed-out" | "missing" };

export async function previewRestore(eventId: number): Promise<RestorePreview> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  const event = revision.safeParse(eventId).success ? getAudit(eventId) : null;
  if (!event) return { ok: false, reason: "missing" };
  const common = { ok: true, kind: event.kind, at: event.at, later: countLaterSaves(event) } as const;
  if (event.kind === "schedule") {
    const now = readSchedule();
    const parsed = scheduleInput.safeParse(event.before);
    const { changes } = describeSchedule(now, event.before as ScheduleData, seoulToday());
    return { ...common, changes, revision: now.revision, blocked: blockedReason(parsed, changes) };
  }
  const now = readFaq();
  const parsed = faqInput.safeParse(event.before);
  const { changes } = describeFaq(now, event.before as FaqData);
  return { ...common, changes, revision: now.revision, blocked: blockedReason(parsed, changes) };
}

/* 옛 값도 지금의 검사를 통과해야 넣는다 — 검사 규칙이 바뀐 뒤 옛 값이 그대로 들어가지 않게. */
function blockedReason(parsed: { success: boolean; error?: z.ZodError }, changes: Change[]) {
  if (!parsed.success && parsed.error) return `지금 규칙에 맞지 않아 되돌릴 수 없습니다 — ${firstIssue(parsed.error)}`;
  if (!changes.length) return "지금 내용이 이미 그 저장 이전과 같습니다.";
  return null;
}

/* 변경 기록 한 건의 「바꾸기 전」 상태로 되돌린다. 되돌리기도 새 변경으로 기록에 남는다.
   expectedRevision 은 미리 보기를 열었을 때의 판 번호다. 그 사이 누가 저장했으면 거절한다 — 미리 본 것과 다른
   결과를 몰래 만들지 않는다. */
export type RestoreResult =
  | { ok: true; published: Published }
  | { ok: false; reason: "signed-out" | "missing" | "conflict" }
  | { ok: false; reason: "invalid"; message: string };

export async function restoreBefore(eventId: number, expectedRevision: number): Promise<RestoreResult> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  if (!revision.safeParse(expectedRevision).success) return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const event = revision.safeParse(eventId).success ? getAudit(eventId) : null;
  if (!event) return { ok: false, reason: "missing" };
  const summary = () => `되돌림: ${whenSaved(event.at)} 저장 이전으로`;
  const type = contentType(event.kind);
  if (event.kind === "schedule") {
    const parsed = scheduleInput.safeParse(event.before);
    if (!parsed.success) return invalid(firstIssue(parsed.error));
    if (!writeSchedule(user.actor, parsed.data, expectedRevision, summary).ok) return { ok: false, reason: "conflict" };
  } else {
    const parsed = faqInput.safeParse(event.before);
    if (!parsed.success) return invalid(firstIssue(parsed.error));
    if (!writeFaq(user.actor, parsed.data, expectedRevision, summary).ok) return { ok: false, reason: "conflict" };
  }
  return { ok: true, published: await publishToSite(type.object) };
}

/* 저장은 됐는데 사이트 반영이 실패했을 때 다시 시도한다. */
export async function republish(): Promise<Published | { ok: false; reason: "signed-out" }> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  return publishToSite();
}
