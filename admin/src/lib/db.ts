import "server-only";
import Database from "better-sqlite3";
import { META, MIGRATIONS } from "@/lib/content/schema";
import { contactFaq } from "@/lib/faq";
import { scheduleDates, scheduleReviewedAt } from "@/lib/schedule";

/* 콘텐츠 DB(SQLite 파일 하나). 이 앱이 유일하게 쓰는 쪽이다. 공개 사이트는 같은 파일을 읽기만 한다.
   WAL 이라 공개 사이트가 읽는 동안에도 저장이 막히지 않는다. */
let connection: Database.Database | null = null;

export function getDb() {
  if (connection) return connection;
  const file = process.env.CONTENT_DB;
  if (!file) throw new Error("CONTENT_DB(콘텐츠 DB 파일 경로)가 설정되지 않았습니다.");
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  connection = db;
  return db;
}

/* 앱이 뜰 때 한 번(instrumentation.ts). 이전은 PRAGMA user_version 다음 것부터 하나씩, 각자 트랜잭션으로. */
export function migrate(db = getDb()) {
  const done = db.pragma("user_version", { simple: true }) as number;
  for (let i = done; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]);
      db.pragma(`user_version = ${i + 1}`);
    })();
  }
}

/* 처음 한 번만 코드의 값(schedule.ts · faq.ts)을 넣는다. 관리자가 목록을 다 지워도 다시 채우지 않도록
   seededAt 으로 표시해 둔다. */
export function seed(db = getDb()) {
  const seeded = db.prepare(`SELECT 1 FROM content_meta WHERE key = ?`).get(META.seededAt);
  if (seeded) return;
  db.transaction(() => {
    const addSchedule = db.prepare(
      `INSERT INTO schedule_item (position, what, due_date, period) VALUES (?, ?, ?, ?)`
    );
    scheduleDates.forEach((it, i) => addSchedule.run(i, it.what, it.when, it.period));
    const addFaq = db.prepare(`INSERT INTO faq_item (position, question, answer) VALUES (?, ?, ?)`);
    contactFaq.forEach((it, i) => addFaq.run(i, it.q, it.a));
    const meta = db.prepare(`INSERT INTO content_meta (key, value) VALUES (?, ?)`);
    meta.run(META.scheduleReviewedAt, scheduleReviewedAt);
    meta.run(META.scheduleRevision, "0");
    meta.run(META.faqRevision, "0");
    meta.run(META.seededAt, new Date().toISOString());
  })();
}
