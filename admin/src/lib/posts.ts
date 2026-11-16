import "server-only";
import { EMPTY_POST, normalizePost, postJson, uploadsIn, type PostData } from "@/lib/content/post-data";
import { orderedServices } from "@/lib/constants";
import { seoulToday } from "@/lib/schedule";
import { describePostEvent, type PostContext, type PostSnapshot } from "@admin/content/post";
import { getDb } from "./db";

/* 블로그 글 읽기 · 쓰기(docs/plans/admin-backend/blog.md §4). 쓰기는 늘 한 트랜잭션: 글의 판 번호 확인 → 작업본 ·
 * 게시본 바꾸기 → 쓰이지 않게 된 사진 지우기 → 변경 기록(post_event).
 * - 작업본은 post.draft, 사이트에 나온 것은 post_public. 공개 사이트는 post_public 만 읽는다.
 * - 판 번호는 글마다 있다. 저장 · 게시 · 내리기 · 휴지통 모두 올린다 — 다른 탭이 방금 내린 글을 이 탭이 모르고
 *   다시 게시하지 않게. */

export type PostRow = {
  id: number;
  draft: PostData;
  revision: number;
  createdAt: string;
  savedAt: string | null;
  savedBy: string | null;
  trashedAt: string | null;
  live: { slug: string; data: PostData; publishedAt: string; publishedBy: string; dirty: boolean } | null;
};

type Raw = {
  id: number;
  slug: string | null;
  draft: string;
  revision: number;
  created_at: string;
  created_by: string;
  saved_at: string | null;
  saved_by: string | null;
  trashed_at: string | null;
  live_slug: string | null;
  live_data: string | null;
  published_at: string | null;
  published_by: string | null;
};

const SELECT = `SELECT p.*, pub.slug AS live_slug, pub.data AS live_data, pub.published_at, pub.published_by
  FROM post p LEFT JOIN post_public pub ON pub.post_id = p.id`;

function toRow(r: Raw): PostRow {
  const draft = normalizePost(JSON.parse(r.draft));
  const liveData = r.live_data ? normalizePost(JSON.parse(r.live_data)) : null;
  return {
    id: r.id,
    draft,
    revision: r.revision,
    createdAt: r.created_at,
    savedAt: r.saved_at,
    savedBy: r.saved_by,
    trashedAt: r.trashed_at,
    live: liveData
      ? { slug: r.live_slug!, data: liveData, publishedAt: r.published_at!, publishedBy: r.published_by!, dirty: postJson(liveData) !== postJson(draft) }
      : null,
  };
}

export function listPosts(): PostRow[] {
  return (getDb().prepare(`${SELECT} ORDER BY COALESCE(p.saved_at, p.created_at) DESC, p.id DESC`).all() as Raw[]).map(toRow);
}

export function readPost(id: number): PostRow | null {
  const r = getDb().prepare(`${SELECT} WHERE p.id = ?`).get(id) as Raw | undefined;
  return r ? toRow(r) : null;
}

const snapshot = (row: PostRow | null): PostSnapshot => (row ? { draft: row.draft, live: !!row.live, trashed: !!row.trashedAt } : null);

/* 검사에 필요한 주변 사정: 다른 글이 쓰는 주소, 게시 중인 주소, 게시된 다른 글, 고를 수 있는 서비스. */
export function postContext(id: number, rows = listPosts()): PostContext {
  const self = rows.find((r) => r.id === id);
  const taken: Record<string, string> = {};
  for (const r of rows) {
    if (r.id === id) continue;
    const label = `${r.draft.title.trim() || "제목 없음"}${r.trashedAt ? " (휴지통)" : ""}`;
    if (r.draft.slug) taken[r.draft.slug] = label;
    if (r.live) taken[r.live.slug] = label;
  }
  return {
    today: seoulToday(),
    taken,
    liveSlug: self?.live?.slug ?? null,
    published: rows.filter((r) => r.id !== id && r.live).map((r) => r.live!.slug),
    services: orderedServices.map((s) => s.slug),
  };
}

/* 저장할 JSON. 이 코드가 모르는 키(더 새 관리자가 더한 칸)는 앞의 값에서 그대로 옮긴다 — 앞 이미지로 되돌린
   관리자가 한 번 저장했다고 새 칸이 사라지지 않게. */
function storeJson(next: PostData, previousRaw?: string) {
  const known = JSON.parse(postJson(next)) as Record<string, unknown>;
  const previous = previousRaw ? (JSON.parse(previousRaw) as Record<string, unknown>) : {};
  const extra = Object.fromEntries(Object.entries(previous).filter(([k]) => !(k in EMPTY_POST)));
  return JSON.stringify({ ...known, ...extra });
}

function record(postId: number, actor: string, before: PostSnapshot, after: PostSnapshot, prefix = "") {
  getDb()
    .prepare(`INSERT INTO post_event (post_id, at, actor, summary, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(postId, new Date().toISOString(), actor, prefix + describePostEvent(before, after).summary, JSON.stringify(before), JSON.stringify(after));
}

/* 지금 어느 글의 작업본에도 게시본에도 없는 사진을 지운다. names 를 주면 그것만 본다(방금 뺀 사진).
   주지 않으면 하루 넘게 어디에도 쓰이지 않은 사진을 모두 지운다 — 올리고 저장하지 않은 것.
   기록(post_event)에만 남은 사진은 쓰인 것으로 치지 않는다. 고객 자료가 찍힌 사진을 글에서 빼면 사이트 주소에서도
   사라져야 한다. 그 기록으로 되돌리면 게시 전 검사가 「사진을 찾을 수 없습니다」로 알린다. */
function purgeUploads(names?: string[]) {
  const db = getDb();
  const candidates =
    names ??
    (db.prepare(`SELECT name FROM upload WHERE created_at < ?`).all(new Date(Date.now() - 86_400_000).toISOString()) as { name: string }[]).map(
      (r) => r.name
    );
  const used = db.prepare(
    `SELECT 1 FROM post WHERE instr(draft, ?) > 0 UNION ALL SELECT 1 FROM post_public WHERE instr(data, ?) > 0 LIMIT 1`
  );
  const remove = db.prepare(`DELETE FROM upload WHERE name = ?`);
  for (const name of candidates) if (!used.get(name, name)) remove.run(name);
}

const uploadsOf = (row: PostRow) => [...new Set([...uploadsIn(row.draft), ...(row.live ? uploadsIn(row.live.data) : [])])];

export type PostWrite =
  | { ok: true; revision: number; saved: PostData; row: PostRow }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "conflict"; latest: { at: string; actor: string } | null }
  | { ok: false; reason: "invalid"; message: string };

const conflict = (row: PostRow): PostWrite => ({
  ok: false,
  reason: "conflict",
  latest: row.savedAt && row.savedBy ? { at: row.savedAt, actor: row.savedBy } : null,
});

/* 새 글. 빈 초안을 만들고 id 를 돌려준다. 열기만 하고 아무것도 저장하지 않은 지 하루 넘은 빈 초안은 이때 치운다.
   빈 초안을 다시 쓰지 않는다 — 두 탭이 [새 글]을 누르면 한 글을 나눠 쓰다 이 기기 보관이 서로 덮인다. */
export function createPost(actor: string) {
  const db = getDb();
  return db.transaction(() => {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    db.prepare(
      `DELETE FROM post WHERE revision = 0 AND saved_at IS NULL AND created_at < ? AND id NOT IN (SELECT post_id FROM post_public)`
    ).run(dayAgo);
    purgeUploads();
    const at = new Date().toISOString();
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO post (slug, draft, revision, created_at, created_by) VALUES (NULL, ?, 0, ?, ?)`)
      .run(storeJson(EMPTY_POST), at, actor);
    return Number(lastInsertRowid);
  })();
}

/* 초안 저장(mode "draft") · 게시(mode "publish"). 게시는 화면의 내용을 저장하면서 게시본으로 복사한다. */
export function writePost(
  actor: string,
  id: number,
  next: PostData,
  baseRevision: number,
  mode: "draft" | "publish",
  opts: { touchUpdated?: boolean } = {}
): PostWrite {
  const db = getDb();
  return db.transaction((): PostWrite => {
    const row = readPost(id);
    if (!row || row.trashedAt) return { ok: false, reason: "missing" };
    if (row.revision !== baseRevision) return conflict(row);
    const today = seoulToday();
    const draft = normalizePost(next);
    draft.slug = draft.slug.trim();
    if (mode === "publish") {
      if (!draft.date) draft.date = today;
      if (opts.touchUpdated && row.live) draft.updatedAt = today;
    }
    if (row.live && draft.slug !== row.live.slug) return { ok: false, reason: "invalid", message: `게시 중인 글은 주소를 바꿀 수 없습니다(지금 주소: ${row.live.slug}). 바꾸려면 먼저 내리세요.` };
    if (draft.slug) {
      const other = db.prepare(`SELECT draft FROM post WHERE slug = ? AND id <> ?`).get(draft.slug, id) as { draft: string } | undefined;
      if (other) return { ok: false, reason: "invalid", message: `「${normalizePost(JSON.parse(other.draft)).title || "제목 없음"}」 글이 이미 이 주소를 씁니다.` };
    }
    const at = new Date().toISOString();
    const raw = (db.prepare(`SELECT draft FROM post WHERE id = ?`).get(id) as { draft: string }).draft;
    db.prepare(`UPDATE post SET slug = ?, draft = ?, revision = revision + 1, saved_at = ?, saved_by = ? WHERE id = ?`).run(
      draft.slug || null,
      storeJson(draft, raw),
      at,
      actor,
      id
    );
    if (mode === "publish") {
      db.prepare(
        `INSERT INTO post_public (post_id, slug, data, published_at, published_by) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(post_id) DO UPDATE SET slug = excluded.slug, data = excluded.data,
           published_at = excluded.published_at, published_by = excluded.published_by`
      ).run(id, draft.slug, storeJson(draft, raw), at, actor);
    }
    const after = readPost(id)!;
    purgeUploads(uploadsOf(row));
    record(id, actor, snapshot(row), snapshot(after));
    return { ok: true, revision: after.revision, saved: after.draft, row: after };
  })();
}

/* 내리기 · 휴지통 · 되살리기 · 완전히 지우기. 작업본의 내용은 바꾸지 않는다. */
export function changePostState(actor: string, id: number, baseRevision: number, action: "unpublish" | "trash" | "untrash" | "delete"): PostWrite {
  const db = getDb();
  return db.transaction((): PostWrite => {
    const row = readPost(id);
    if (!row) return { ok: false, reason: "missing" };
    if (row.revision !== baseRevision) return conflict(row);
    const at = new Date().toISOString();
    const bump = () => db.prepare(`UPDATE post SET revision = revision + 1, saved_at = ?, saved_by = ? WHERE id = ?`).run(at, actor, id);
    if (action === "unpublish") {
      if (!row.live) return { ok: false, reason: "invalid", message: "게시되지 않은 글입니다." };
      db.prepare(`DELETE FROM post_public WHERE post_id = ?`).run(id);
      bump();
    } else if (action === "trash") {
      if (row.live) return { ok: false, reason: "invalid", message: "게시 중인 글은 먼저 내려 주세요." };
      if (row.trashedAt) return { ok: false, reason: "invalid", message: "이미 휴지통에 있습니다." };
      db.prepare(`UPDATE post SET trashed_at = ? WHERE id = ?`).run(at, id);
      bump();
    } else if (action === "untrash") {
      if (!row.trashedAt) return { ok: false, reason: "invalid", message: "휴지통에 있는 글이 아닙니다." };
      db.prepare(`UPDATE post SET trashed_at = NULL WHERE id = ?`).run(id);
      bump();
    } else {
      if (!row.trashedAt) return { ok: false, reason: "invalid", message: "휴지통에 넣은 글만 완전히 지울 수 있습니다." };
      /* 완전히 지우면 그 글의 기록도 지운다. 기록에 본문이 통째로 남아 있다 — 지운 글의 내용이 관리자 안에 계속
         남지 않게. 「지웠다」는 한 줄만 제목과 함께 남긴다. 사진도 다른 글이 쓰지 않으면 함께 지운다. */
      db.prepare(`DELETE FROM post_event WHERE post_id = ?`).run(id);
      db.prepare(`DELETE FROM post WHERE id = ?`).run(id);
      purgeUploads(uploadsOf(row));
      record(id, actor, { draft: { ...EMPTY_POST, title: row.draft.title }, live: false, trashed: true }, null);
      return { ok: true, revision: row.revision + 1, saved: row.draft, row };
    }
    const after = readPost(id)!;
    record(id, actor, snapshot(row), snapshot(after));
    return { ok: true, revision: after.revision, saved: after.draft, row: after };
  })();
}

/* ── 변경 기록 ── */

export type PostEvent = { id: number; postId: number; at: string; actor: string; summary: string; before: PostSnapshot; after: PostSnapshot };
type EventRaw = { id: number; post_id: number; at: string; actor: string; summary: string; before_json: string; after_json: string };
const toEvent = (r: EventRaw): PostEvent => {
  const parse = (s: string): PostSnapshot => {
    const v = JSON.parse(s) as { draft: unknown; live: boolean; trashed: boolean } | null;
    return v ? { draft: normalizePost(v.draft), live: !!v.live, trashed: !!v.trashed } : null;
  };
  return { id: r.id, postId: r.post_id, at: r.at, actor: r.actor, summary: r.summary, before: parse(r.before_json), after: parse(r.after_json) };
};

export function listPostEvents({ postId, limit = 50 }: { postId?: number; limit?: number } = {}): PostEvent[] {
  const rows =
    postId !== undefined
      ? getDb().prepare(`SELECT * FROM post_event WHERE post_id = ? ORDER BY id DESC LIMIT ?`).all(postId, limit)
      : getDb().prepare(`SELECT * FROM post_event ORDER BY id DESC LIMIT ?`).all(limit);
  return (rows as EventRaw[]).map(toEvent);
}

export function getPostEvent(id: number): PostEvent | null {
  const r = getDb().prepare(`SELECT * FROM post_event WHERE id = ?`).get(id) as EventRaw | undefined;
  return r ? toEvent(r) : null;
}

export const countLaterPostSaves = (event: PostEvent) =>
  (getDb().prepare(`SELECT COUNT(*) AS n FROM post_event WHERE post_id = ? AND id > ?`).get(event.postId, event.id) as { n: number }).n;

export function lastPostSave(): { at: string; actor: string } | null {
  return (getDb().prepare(`SELECT at, actor FROM post_event ORDER BY id DESC LIMIT 1`).get() as { at: string; actor: string } | undefined) ?? null;
}

/* 기록 한 건의 「바꾸기 전」 작업본으로 되돌린다. 게시본은 그대로다 — 사이트에 내려면 편집 화면에서 [게시].
   게시 중인 글이면 주소는 지금 주소를 둔다(게시 중에는 주소를 바꿀 수 없다). */
export function restorePostDraft(actor: string, event: PostEvent, expectedRevision: number, label: string): PostWrite {
  const db = getDb();
  return db.transaction((): PostWrite => {
    const row = readPost(event.postId);
    if (!row || !event.before) return { ok: false, reason: "missing" };
    if (row.revision !== expectedRevision) return conflict(row);
    const draft = { ...event.before.draft, slug: row.live ? row.live.slug : event.before.draft.slug };
    if (draft.slug) {
      const other = db.prepare(`SELECT 1 FROM post WHERE slug = ? AND id <> ?`).get(draft.slug, row.id);
      if (other) draft.slug = row.draft.slug;
    }
    const raw = (db.prepare(`SELECT draft FROM post WHERE id = ?`).get(row.id) as { draft: string }).draft;
    db.prepare(`UPDATE post SET slug = ?, draft = ?, revision = revision + 1, saved_at = ?, saved_by = ? WHERE id = ?`).run(
      draft.slug || null,
      storeJson(draft, raw),
      new Date().toISOString(),
      actor,
      row.id
    );
    const after = readPost(row.id)!;
    record(row.id, actor, snapshot(row), snapshot(after), `되돌림: ${label} · `);
    return { ok: true, revision: after.revision, saved: after.draft, row: after };
  })();
}

/* ── 사진 ── */

export function saveUpload(actor: string, u: { name: string; width: number; height: number; bytes: Buffer; originalName: string }) {
  getDb()
    .prepare(`INSERT OR IGNORE INTO upload (name, width, height, bytes, original_name, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(u.name, u.width, u.height, u.bytes, u.originalName.slice(0, 200), new Date().toISOString(), actor);
}

export function readUpload(name: string): { bytes: Buffer } | null {
  return (getDb().prepare(`SELECT bytes FROM upload WHERE name = ?`).get(name) as { bytes: Buffer } | undefined) ?? null;
}

export function knownUploads(names: string[]) {
  const get = getDb().prepare(`SELECT 1 FROM upload WHERE name = ?`);
  return new Set(names.filter((n) => get.get(n)));
}
