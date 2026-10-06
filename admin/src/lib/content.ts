import "server-only";
import { META } from "@/lib/content/schema";
import type { FaqItem } from "@/lib/faq";
import type { ScheduleItem } from "@/lib/schedule";
import { getDb } from "./db";

/* 관리자 쪽 읽기 · 쓰기. 쓰기는 늘 「판 번호 확인 → 목록 통째로 바꾸기 → 변경 기록」을 한 트랜잭션으로 한다.
   판 번호(revision)는 두 사람이 같은 목록을 동시에 고칠 때 나중 저장이 앞 저장을 몰래 덮지 않게 한다. */

export type ScheduleState = { items: ScheduleItem[]; reviewedAt: string; revision: number };
export type FaqState = { items: FaqItem[]; revision: number };
export type AuditEvent = {
  id: number;
  at: string;
  actor: string;
  kind: "schedule" | "faq";
  summary: string;
  before: unknown;
  after: unknown;
};

const meta = (key: string) =>
  (getDb().prepare(`SELECT value FROM content_meta WHERE key = ?`).get(key) as { value: string } | undefined)?.value;
const setMeta = (key: string, value: string) =>
  getDb()
    .prepare(`INSERT INTO content_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, value);

export function readSchedule(): ScheduleState {
  const items = getDb()
    .prepare(`SELECT what, due_date AS "when", period FROM schedule_item ORDER BY due_date, position`)
    .all() as ScheduleItem[];
  return { items, reviewedAt: meta(META.scheduleReviewedAt) ?? "", revision: Number(meta(META.scheduleRevision) ?? 0) };
}

export function readFaq(): FaqState {
  const items = getDb().prepare(`SELECT question AS q, answer AS a FROM faq_item ORDER BY position`).all() as FaqItem[];
  return { items, revision: Number(meta(META.faqRevision) ?? 0) };
}

type WriteResult = { ok: true; revision: number } | { ok: false; reason: "conflict" };

function record(actor: string, kind: AuditEvent["kind"], summary: string, before: unknown, after: unknown) {
  getDb()
    .prepare(
      `INSERT INTO audit_event (at, actor, kind, summary, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(new Date().toISOString(), actor, kind, summary, JSON.stringify(before), JSON.stringify(after));
}

export function writeSchedule(
  actor: string,
  next: { items: ScheduleItem[]; reviewedAt: string },
  baseRevision: number,
  summary?: string
): WriteResult {
  const db = getDb();
  return db.transaction((): WriteResult => {
    const before = readSchedule();
    if (before.revision !== baseRevision) return { ok: false, reason: "conflict" };
    /* 날짜순으로 담는다. 같은 날이면 적은 순서대로. */
    const items = next.items
      .map((it, i) => ({ ...it, i }))
      .sort((a, b) => a.when.localeCompare(b.when) || a.i - b.i)
      .map(({ what, when, period }) => ({ what, when, period }));
    db.prepare(`DELETE FROM schedule_item`).run();
    const add = db.prepare(`INSERT INTO schedule_item (position, what, due_date, period) VALUES (?, ?, ?, ?)`);
    items.forEach((it, i) => add.run(i, it.what, it.when, it.period));
    const revision = before.revision + 1;
    setMeta(META.scheduleReviewedAt, next.reviewedAt);
    setMeta(META.scheduleRevision, String(revision));
    const after = { items, reviewedAt: next.reviewedAt };
    record(
      actor,
      "schedule",
      summary ?? `일정 ${before.items.length}건 → ${items.length}건, 확인일 ${next.reviewedAt}`,
      { items: before.items, reviewedAt: before.reviewedAt },
      after
    );
    return { ok: true, revision };
  })();
}

export function writeFaq(actor: string, next: { items: FaqItem[] }, baseRevision: number, summary?: string): WriteResult {
  const db = getDb();
  return db.transaction((): WriteResult => {
    const before = readFaq();
    if (before.revision !== baseRevision) return { ok: false, reason: "conflict" };
    db.prepare(`DELETE FROM faq_item`).run();
    const add = db.prepare(`INSERT INTO faq_item (position, question, answer) VALUES (?, ?, ?)`);
    next.items.forEach((it, i) => add.run(i, it.q, it.a));
    const revision = before.revision + 1;
    setMeta(META.faqRevision, String(revision));
    record(actor, "faq", summary ?? `문답 ${before.items.length}개 → ${next.items.length}개`, { items: before.items }, next);
    return { ok: true, revision };
  })();
}

type AuditRow = { id: number; at: string; actor: string; kind: AuditEvent["kind"]; summary: string; before_json: string; after_json: string };
const toEvent = (r: AuditRow): AuditEvent => ({
  id: r.id,
  at: r.at,
  actor: r.actor,
  kind: r.kind,
  summary: r.summary,
  before: JSON.parse(r.before_json),
  after: JSON.parse(r.after_json),
});

export function listAudit(limit = 50): AuditEvent[] {
  return (getDb().prepare(`SELECT * FROM audit_event ORDER BY id DESC LIMIT ?`).all(limit) as AuditRow[]).map(toEvent);
}

export function getAudit(id: number): AuditEvent | null {
  const row = getDb().prepare(`SELECT * FROM audit_event WHERE id = ?`).get(id) as AuditRow | undefined;
  return row ? toEvent(row) : null;
}
