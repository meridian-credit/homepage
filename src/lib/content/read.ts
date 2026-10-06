import "server-only";
import Database from "better-sqlite3";
import { contactFaq, type FaqItem } from "@/lib/faq";
import { scheduleDates, scheduleReviewedAt, type ScheduleItem } from "@/lib/schedule";
import { META } from "./schema";

/* 세무 일정 · FAQ 를 읽는다. 공개 사이트는 이 두 함수로만 읽는다.
 *
 * - CONTENT_DB 가 있으면(개발 서버) 관리자 앱이 고친 SQLite 파일을 읽는다. 파일이 없거나 열리지 않으면
 *   그대로 실패한다. 조용히 코드 값으로 돌아가면, 관리자에서 고친 내용이 배포 뒤 사라진 것처럼 보인다.
 * - 없으면(운영 · CI · 로컬) 코드에 적힌 값(schedule.ts · faq.ts)을 쓴다. 운영이 우리 서버로 옮겨 DB 를
 *   읽게 되면 그때 이 갈래와 코드의 배열을 지운다.
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
