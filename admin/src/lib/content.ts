import "server-only";
import { META } from "@/lib/content/schema";
import type { FaqItem } from "@/lib/faq";
import type { ScheduleItem } from "@/lib/schedule";
import type { ContentKind } from "@admin/content/registry";
import { getDb } from "./db";

/* 관리자 쪽 읽기 · 쓰기. 쓰기는 늘 「판 번호 확인 → 목록 통째로 바꾸기 → 변경 기록」을 한 트랜잭션으로 한다.
   판 번호(revision)는 두 사람이 같은 목록을 동시에 고칠 때 나중 저장이 앞 저장을 몰래 덮지 않게 한다. */

export type ScheduleState = { items: ScheduleItem[]; reviewedAt: string; revision: number };
export type FaqState = { items: FaqItem[]; revision: number };
export type AuditEvent = {
  id: number;
  at: string;
  actor: string;
  kind: ContentKind;
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
const deleteMeta = (key: string) => getDb().prepare(`DELETE FROM content_meta WHERE key = ?`).run(key);

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

function record(actor: string, kind: ContentKind, summary: string, before: unknown, after: unknown) {
  getDb()
    .prepare(`INSERT INTO audit_event (at, actor, kind, summary, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(new Date().toISOString(), actor, kind, summary, JSON.stringify(before), JSON.stringify(after));
}

/* summarize 는 트랜잭션 안에서 읽은 「바꾸기 전」으로 기록의 한 줄 요약을 만든다. 화면은 전 · 후를 다시 비교해
   그리므로, 이 값은 DB 를 직접 볼 때의 도움말이다. */
export function writeSchedule(
  actor: string,
  next: { items: ScheduleItem[]; reviewedAt: string },
  baseRevision: number,
  summarize: (before: ScheduleState) => string
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
    record(actor, "schedule", summarize(before), { items: before.items, reviewedAt: before.reviewedAt }, { items, reviewedAt: next.reviewedAt });
    return { ok: true, revision };
  })();
}

export function writeFaq(
  actor: string,
  next: { items: FaqItem[] },
  baseRevision: number,
  summarize: (before: FaqState) => string
): WriteResult {
  const db = getDb();
  return db.transaction((): WriteResult => {
    const before = readFaq();
    if (before.revision !== baseRevision) return { ok: false, reason: "conflict" };
    db.prepare(`DELETE FROM faq_item`).run();
    const add = db.prepare(`INSERT INTO faq_item (position, question, answer) VALUES (?, ?, ?)`);
    next.items.forEach((it, i) => add.run(i, it.q, it.a));
    const revision = before.revision + 1;
    setMeta(META.faqRevision, String(revision));
    record(actor, "faq", summarize(before), { items: before.items }, { items: next.items });
    return { ok: true, revision };
  })();
}

type AuditRow = { id: number; at: string; actor: string; kind: ContentKind; summary: string; before_json: string; after_json: string };
const toEvent = (r: AuditRow): AuditEvent => ({
  id: r.id,
  at: r.at,
  actor: r.actor,
  kind: r.kind,
  summary: r.summary,
  before: JSON.parse(r.before_json),
  after: JSON.parse(r.after_json),
});

export function listAudit({ kind, limit = 50 }: { kind?: ContentKind; limit?: number } = {}): AuditEvent[] {
  const rows = kind
    ? getDb().prepare(`SELECT * FROM audit_event WHERE kind = ? ORDER BY id DESC LIMIT ?`).all(kind, limit)
    : getDb().prepare(`SELECT * FROM audit_event ORDER BY id DESC LIMIT ?`).all(limit);
  return (rows as AuditRow[]).map(toEvent);
}

export function getAudit(id: number): AuditEvent | null {
  const row = getDb().prepare(`SELECT * FROM audit_event WHERE id = ?`).get(id) as AuditRow | undefined;
  return row ? toEvent(row) : null;
}

/* 그 기록 뒤에 같은 종류를 몇 번 더 저장했나 — 되돌리면 그것들도 함께 되돌아간다. */
export const countLaterSaves = (event: AuditEvent) =>
  (getDb().prepare(`SELECT COUNT(*) AS n FROM audit_event WHERE kind = ? AND id > ?`).get(event.kind, event.id) as { n: number }).n;

/* 종류마다 마지막 저장(누가 · 언제). 홈과 충돌 창이 쓴다. */
export function lastSaves(): Partial<Record<ContentKind, { at: string; actor: string }>> {
  const rows = getDb()
    .prepare(`SELECT kind, at, actor FROM audit_event WHERE id IN (SELECT MAX(id) FROM audit_event GROUP BY kind)`)
    .all() as { kind: ContentKind; at: string; actor: string }[];
  return Object.fromEntries(rows.map((r) => [r.kind, { at: r.at, actor: r.actor }]));
}

/* 사이트 반영 실패를 기억해 둔다. 저장 결과 메시지만으로는 다른 화면으로 옮기면 잊힌다 — 모든 화면 위의 띠와
   홈이 이것을 읽는다. 다음 반영이 성공하면 지운다. 공개 사이트는 이 키를 읽지 않는다. */
const PUBLISH_FAILED = "admin.publishFailed";
/* what: 「세무 일정을」 — 띠의 「…에 저장한 세무 일정을 사이트가 아직 그리지 못했습니다」에 들어간다. */
export type PublishFailure = { at: string; detail: string; what: string };

export function readPublishFailure(): PublishFailure | null {
  const raw = meta(PUBLISH_FAILED);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublishFailure;
  } catch {
    return null;
  }
}

export function rememberPublish(result: { ok: true } | { ok: false; detail: string }, what?: string) {
  if (result.ok) return void deleteMeta(PUBLISH_FAILED);
  /* 다시 반영이 또 실패하면(what 없음) 띠의 「…에 저장한」 시각과 이름은 처음 실패한 저장의 것을 그대로 둔다. */
  const previous = readPublishFailure();
  const keep = !what && previous;
  setMeta(
    PUBLISH_FAILED,
    JSON.stringify({
      at: keep ? previous.at : new Date().toISOString(),
      detail: result.detail,
      what: what ?? previous?.what ?? "내용을",
    })
  );
}
