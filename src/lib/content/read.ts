import "server-only";
import Database from "better-sqlite3";
import { contactFaq, type FaqItem } from "@/lib/faq";
import { scheduleDates, scheduleReviewedAt, type ScheduleItem } from "@/lib/schedule";
import { normalizePost, type PostData } from "./post-data";
import { META } from "./schema";

/* 관리자 앱이 고친 콘텐츠를 읽는다. 공개 사이트는 이 파일의 함수로만 DB 를 읽는다.
 *
 * - CONTENT_DB 가 있으면(운영 www.meridianco.kr · 개발 서버) 관리자 앱의 SQLite 파일을 읽기 전용으로 연다. 파일이
 *   없거나 열리지 않으면 그대로 실패한다. 조용히 코드 값으로 돌아가면, 관리자에서 고친 내용이 배포 뒤 사라진
 *   것처럼 보인다.
 * - 없으면(CI · 로컬) 세무 일정 · FAQ 는 코드에 적힌 값(schedule.ts · faq.ts)을 쓰고, 블로그 글은 없다.
 * 결과를 모듈에 담아 두지 않는다. 관리자가 저장하면 쪽을 다시 만드는데, 그때 새로 읽어야 한다. */

let connection: Database.Database | null = null;

function open() {
  const file = process.env.CONTENT_DB;
  if (!file) return null;
  connection ??= new Database(file, { readonly: true, fileMustExist: true });
  return connection;
}

export function getSchedule(): { items: ScheduleItem[]; reviewedAt: string } {
  const db = open();
  if (!db) return { items: scheduleDates, reviewedAt: scheduleReviewedAt };
  const items = db
    .prepare(`SELECT what, due_date AS "when", period FROM schedule_item ORDER BY due_date, position`)
    .all() as ScheduleItem[];
  const reviewed = db.prepare(`SELECT value FROM content_meta WHERE key = ?`).get(META.scheduleReviewedAt) as
    | { value: string }
    | undefined;
  return { items, reviewedAt: reviewed?.value ?? "" };
}

export function getFaq(): FaqItem[] {
  const db = open();
  if (!db) return contactFaq;
  return db.prepare(`SELECT question AS q, answer AS a FROM faq_item ORDER BY position`).all() as FaqItem[];
}

/* ── 블로그 글(docs/plans/admin-backend/blog.md) ── */

export type PublishedPost = { id: number; data: PostData; publishedAt: string };

/* 지금 사이트에 나온 글(post_public) 전부. 초안은 이 표에 없다. */
export function getPublishedPosts(): PublishedPost[] {
  const db = open();
  if (!db) return [];
  const rows = db.prepare(`SELECT post_id, data, published_at FROM post_public`).all() as {
    post_id: number;
    data: string;
    published_at: string;
  }[];
  return rows.map((r) => ({ id: r.post_id, data: normalizePost(JSON.parse(r.data)), publishedAt: r.published_at }));
}

export function getPublishedPost(slug: string): PublishedPost | null {
  const db = open();
  if (!db) return null;
  const r = db.prepare(`SELECT post_id, data, published_at FROM post_public WHERE slug = ?`).get(slug) as
    | { post_id: number; data: string; published_at: string }
    | undefined;
  return r ? { id: r.post_id, data: normalizePost(JSON.parse(r.data)), publishedAt: r.published_at } : null;
}

/* 미리 보기: 관리자에 저장된 작업본. 서명된 주소로만 부른다(blog-preview). 휴지통의 글은 없는 셈 친다. */
export function getPostDraft(id: number): { data: PostData; publishedAt: string | null } | null {
  const db = open();
  if (!db) return null;
  const r = db
    .prepare(
      `SELECT p.draft, pub.published_at FROM post p LEFT JOIN post_public pub ON pub.post_id = p.id
       WHERE p.id = ? AND p.trashed_at IS NULL`
    )
    .get(id) as { draft: string; published_at: string | null } | undefined;
  return r ? { data: normalizePost(JSON.parse(r.draft)), publishedAt: r.published_at } : null;
}

export function getUpload(name: string): { bytes: Buffer; width: number; height: number } | null {
  const db = open();
  if (!db) return null;
  return (db.prepare(`SELECT bytes, width, height FROM upload WHERE name = ?`).get(name) as
    | { bytes: Buffer; width: number; height: number }
    | undefined) ?? null;
}

/* 본문 사진의 가로 · 세로. <img> 에 붙여 사진이 늦게 와도 글이 밀리지 않게 한다. */
export function getUploadSizes(names: string[]): Map<string, { width: number; height: number }> {
  const db = open();
  const sizes = new Map<string, { width: number; height: number }>();
  if (!db || !names.length) return sizes;
  const get = db.prepare(`SELECT width, height FROM upload WHERE name = ?`);
  for (const name of names) {
    const r = get.get(name) as { width: number; height: number } | undefined;
    if (r) sizes.set(name, r);
  }
  return sizes;
}
