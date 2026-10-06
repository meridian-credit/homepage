/* 관리자에서 고치는 콘텐츠(세무 일정 · FAQ)의 SQLite 구조. 원본은 여기 하나다.
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
];

/* content_meta 의 키. */
export const META = {
  scheduleReviewedAt: "schedule.reviewedAt",
  scheduleRevision: "schedule.revision",
  faqRevision: "faq.revision",
  seededAt: "seededAt",
} as const;
