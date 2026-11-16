/* 관리자에서 고치는 콘텐츠(세무 일정 · FAQ · 블로그 글 · 사진)의 SQLite 구조. 원본은 여기 하나다.
 *
 * - 쓰는 쪽은 관리자 앱(admin/) 하나다. 앱이 뜰 때 아래 MIGRATIONS 를 차례로 적용한다.
 * - 공개 사이트는 읽기만 한다(src/lib/content/read.ts). 표를 만들거나 고치지 않는다.
 * - 이전은 더하기만 한다. 칸을 지우거나 이름을 바꾸는 것은 공개 사이트가 새 칸을 읽게 된 다음 배포로 미룬다.
 *   공개 사이트는 앞 커밋의 코드로 같은 파일을 읽고 있을 수 있다.
 * - 새 칸은 NULL 을 받거나 DEFAULT 를 둔다. 관리자가 앞 이미지로 되돌려지면 옛 코드가 새 칸을 모른 채 INSERT 한다.
 * - PRAGMA user_version 이 적용한 이전의 수다.
 * - 관리자 로그인 표(user · session · account · verification)는 Better Auth 가 같은 파일에 따로 만든다.
 */

export const MIGRATIONS: string[] = [
  `CREATE TABLE schedule_item (
     id INTEGER PRIMARY KEY,
     position INTEGER NOT NULL,
     what TEXT NOT NULL,
     due_date TEXT NOT NULL,
     period TEXT NOT NULL
   );
   CREATE TABLE faq_item (
     id INTEGER PRIMARY KEY,
     position INTEGER NOT NULL,
     question TEXT NOT NULL,
     answer TEXT NOT NULL
   );
   CREATE TABLE content_meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );
   CREATE TABLE audit_event (
     id INTEGER PRIMARY KEY,
     at TEXT NOT NULL,
     actor TEXT NOT NULL,
     kind TEXT NOT NULL,
     summary TEXT NOT NULL,
     before_json TEXT NOT NULL,
     after_json TEXT NOT NULL
   );`,
  /* 블로그 글(2026-11-16, docs/plans/admin-backend/blog.md §3).
     - post 는 관리자의 작업본이다. 공개 사이트는 미리 보기 말고는 읽지 않는다.
     - post_public 은 지금 사이트에 나온 글이다. 공개 사이트는 이 표만 읽는다. 게시하면 작업본을 여기로 복사하고,
       내리면 그 줄을 지운다. 상태 칸을 보고 거르다가 초안이 새어 나갈 자리가 없게.
     - 글 내용은 칸이 아니라 JSON 이다. 글 정보가 하나 늘 때마다 이전을 쌓지 않으려고(이전은 더하기만 한다).
       옛 코드는 모르는 키를 무시하고, 새 코드는 없는 키를 기본값으로 읽는다.
     - slug 는 비어 있을 수 있다(새 글). NULL 끼리는 UNIQUE 에 걸리지 않는다.
     - 사진은 파일이 아니라 BLOB 이다. 백업 · 빌드 스냅샷 · 복원이 그대로 사진까지 맡는다.
     - 글의 변경 기록은 audit_event 가 아니라 post_event 에 둔다. 앞 이미지의 관리자는 audit_event 의 kind 가 일정 ·
       FAQ 뿐이라고 보고 그린다 — 글 기록이 섞이면 되돌린 관리자의 홈과 변경 기록이 깨진다. post_id 에 외래 키를
       걸지 않는다: 글을 지워도 「지웠다」는 기록은 남는다. */
  `CREATE TABLE post (
     id INTEGER PRIMARY KEY,
     slug TEXT UNIQUE,
     draft TEXT NOT NULL,
     revision INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL,
     created_by TEXT NOT NULL,
     saved_at TEXT,
     saved_by TEXT,
     trashed_at TEXT
   );
   CREATE TABLE post_public (
     post_id INTEGER PRIMARY KEY REFERENCES post(id),
     slug TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL,
     published_at TEXT NOT NULL,
     published_by TEXT NOT NULL
   );
   CREATE TABLE upload (
     name TEXT PRIMARY KEY,
     width INTEGER NOT NULL,
     height INTEGER NOT NULL,
     bytes BLOB NOT NULL,
     original_name TEXT,
     created_at TEXT NOT NULL,
     created_by TEXT NOT NULL
   );
   CREATE TABLE post_event (
     id INTEGER PRIMARY KEY,
     post_id INTEGER NOT NULL,
     at TEXT NOT NULL,
     actor TEXT NOT NULL,
     summary TEXT NOT NULL,
     before_json TEXT NOT NULL,
     after_json TEXT NOT NULL
   );
   CREATE INDEX post_event_post ON post_event (post_id, id);`,
];

/* content_meta 의 키. */
export const META = {
  scheduleReviewedAt: "schedule.reviewedAt",
  scheduleRevision: "schedule.revision",
  faqRevision: "faq.revision",
  seededAt: "seededAt",
} as const;
