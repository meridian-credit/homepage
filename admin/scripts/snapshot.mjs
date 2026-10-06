/* 공개 사이트를 빌드하기 직전에 콘텐츠 DB 의 사본을 뜬다. 배포 스크립트가 관리자 컨테이너 안에서 부른다.
     node admin/scripts/snapshot.mjs [출력 경로]   (기본: CONTENT_DB 옆의 build.db)
   공개 빌드는 이 사본을 읽기 전용으로 붙여 쪽을 미리 그린다. 원본(WAL)을 그대로 붙이면 읽기 전용으로 열 수 없고,
   빌드 중에 관리자가 저장하면 반쯤 쓴 상태를 읽을 수 있다. 사본은 한순간의 상태이고 WAL 이 아니다.
   사본에는 로그인 표(세션 등)도 들어 있다. 서버는 이것을 담는 디렉터리(data/)를 700 으로 막는다 — 파일을 600 으로
   두면 공개 빌드에 사본을 넘기는 docker 클라이언트(ubuntu)가 읽지 못한다. */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const source = process.env.CONTENT_DB;
if (!source) {
  console.error("CONTENT_DB 가 없습니다.");
  process.exit(1);
}
const out = process.argv[2] ?? path.join(path.dirname(source), "build.db");
const tmp = `${out}.tmp`;
fs.rmSync(tmp, { force: true });

const db = new Database(source, { readonly: true, fileMustExist: true });
await db.backup(tmp);
db.close();

const copy = new Database(tmp);
copy.pragma("journal_mode = DELETE");
copy.close();
fs.renameSync(tmp, out);
console.log(`사본: ${out}`);
