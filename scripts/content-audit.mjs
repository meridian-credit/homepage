import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/* 블로그 글 검사는 2026-11-16 에 관리자의 게시 전 검사로 옮겼다(admin/src/content/post.ts publishIssues).
   글이 파일이 아니라 DB 에 있고, 막을 것은 게시하는 그 자리에서 막는다. 여기는 세무 일정만 본다. */
const errors = [];
const warnings = [];

/* 세무 일정이 얼마나 남았나. 다 지나면 헤더가 「이번 달 국세청 일정」 링크로
   바뀌어 망가지지는 않지만, 다음 달 일정을 채울 때가 됐다는 뜻이다.
   경고는 글 경고보다 앞에 찍는다 — 뒤에 붙이면 30개 제한에 가려 안 보인다.
   --schedule-strict 이면 실패로 끝낸다(주간 점검 workflow 가 쓴다).
   schedule.ts 는 TypeScript 라 import 하지 않고 날짜만 읽는다. */
const SCHEDULE_RUNWAY_DAYS = 30;
const scheduleSource = fs.readFileSync(path.join(process.cwd(), "src/lib/schedule.ts"), "utf8");
const scheduleWhens = [...scheduleSource.matchAll(/when:\s*["'`](\d{4}-\d{2}-\d{2})["'`]/g)].map((m) => m[1]).sort();
const seoulToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const lastWhen = scheduleWhens.at(-1);
const runway = lastWhen ? Math.round((Date.parse(`${lastWhen}T00:00:00Z`) - Date.parse(`${seoulToday}T00:00:00Z`)) / 86400000) : -1;
const scheduleShort = runway < SCHEDULE_RUNWAY_DAYS;
if (!lastWhen) {
  errors.push("src/lib/schedule.ts: no schedule dates found");
} else if (scheduleShort) {
  warnings.unshift(
    `schedule: last listed date is ${lastWhen} (${runway} day(s) from ${seoulToday}, Seoul). ` +
      "Add the next officially published NTS months to src/lib/schedule.ts."
  );
}

for (const warning of warnings.slice(0, 30)) {
  console.warn(`warning: ${warning}`);
}

if (warnings.length > 30) {
  console.warn(`warning: ${warnings.length - 30} additional content warning(s) omitted`);
}

for (const error of errors) {
  console.error(`error: ${error}`);
}

console.log(
  `Content audit completed: ${errors.length} error(s), ${warnings.length} warning(s).`
);

if (process.argv.includes("--schedule-strict") && scheduleShort) {
  console.error(`error: tax schedule runway is under ${SCHEDULE_RUNWAY_DAYS} days`);
  process.exitCode = 1;
}

if (errors.length > 0) {
  process.exit(1);
}
