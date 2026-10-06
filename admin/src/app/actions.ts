"use server";

import { z } from "zod";
import { readFaq, readSchedule, writeFaq, writeSchedule, getAudit } from "@admin/lib/content";
import { publishToSite } from "@admin/lib/publish";
import { requireAdmin } from "@admin/lib/session";
import { faqInput, firstIssue, scheduleInput, scheduleWarnings } from "@admin/lib/validate";
import type { FaqItem } from "@/lib/faq";
import type { ScheduleItem } from "@/lib/schedule";

/* 저장 액션. 화면을 거치지 않고도 POST 로 부를 수 있으므로, 매번 로그인과 입력을 처음부터 다시 본다. */

type Published = { ok: true } | { ok: false; detail: string };
export type SaveResult<T> =
  | { ok: true; revision: number; saved: T; warnings: string[]; published: Published }
  | { ok: false; error: string; conflict?: boolean };

const revision = z.number().int().nonnegative();
const CONFLICT = "다른 창이나 다른 사람이 먼저 저장했습니다. 지금 적은 내용은 아직 저장되지 않았습니다. 새로고침해서 최신 내용을 보고 다시 고쳐 주세요.";

export async function saveSchedule(
  input: { items: ScheduleItem[]; reviewedAt: string },
  baseRevision: number
): Promise<SaveResult<{ items: ScheduleItem[]; reviewedAt: string }>> {
  const user = await requireAdmin();
  const parsed = scheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (!revision.safeParse(baseRevision).success) return { ok: false, error: "잘못된 요청입니다." };
  const result = writeSchedule(user.email, parsed.data, baseRevision);
  if (!result.ok) return { ok: false, error: CONFLICT, conflict: true };
  const saved = readSchedule();
  return {
    ok: true,
    revision: result.revision,
    saved: { items: saved.items, reviewedAt: saved.reviewedAt },
    warnings: scheduleWarnings(saved.items),
    published: await publishToSite(),
  };
}

export async function saveFaq(input: { items: FaqItem[] }, baseRevision: number): Promise<SaveResult<{ items: FaqItem[] }>> {
  const user = await requireAdmin();
  const parsed = faqInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (!revision.safeParse(baseRevision).success) return { ok: false, error: "잘못된 요청입니다." };
  const result = writeFaq(user.email, parsed.data, baseRevision);
  if (!result.ok) return { ok: false, error: CONFLICT, conflict: true };
  const saved = readFaq();
  return { ok: true, revision: result.revision, saved: { items: saved.items }, warnings: [], published: await publishToSite() };
}

/* 변경 기록 한 건의 「바꾸기 전」 상태로 되돌린다. 되돌리기도 새 변경으로 기록에 남는다.
   옛 값도 지금의 검사를 통과해야 넣는다 — 검사 규칙이 바뀐 뒤 옛 값이 그대로 들어가지 않게. */
export async function restoreBefore(eventId: number): Promise<{ ok: true; published: Published } | { ok: false; error: string }> {
  const user = await requireAdmin();
  if (!revision.safeParse(eventId).success) return { ok: false, error: "잘못된 요청입니다." };
  const event = getAudit(eventId);
  if (!event) return { ok: false, error: "그 기록을 찾지 못했습니다." };
  const summary = `기록 #${event.id}(${event.summary}) 이전으로 되돌림`;
  if (event.kind === "schedule") {
    const parsed = scheduleInput.safeParse(event.before);
    if (!parsed.success) return { ok: false, error: `되돌릴 수 없습니다 — ${firstIssue(parsed.error)}` };
    const result = writeSchedule(user.email, parsed.data, readSchedule().revision, summary);
    if (!result.ok) return { ok: false, error: CONFLICT };
  } else {
    const parsed = faqInput.safeParse(event.before);
    if (!parsed.success) return { ok: false, error: `되돌릴 수 없습니다 — ${firstIssue(parsed.error)}` };
    const result = writeFaq(user.email, parsed.data, readFaq().revision, summary);
    if (!result.ok) return { ok: false, error: CONFLICT };
  }
  return { ok: true, published: await publishToSite() };
}

/* 저장은 됐는데 사이트 반영이 실패했을 때 다시 시도한다. */
export async function republish(): Promise<Published> {
  await requireAdmin();
  return publishToSite();
}
