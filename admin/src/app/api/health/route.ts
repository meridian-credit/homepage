import { getDb } from "@admin/lib/db";

/* 배포 스크립트가 새 컨테이너를 확인할 때 부른다. DB 를 열고 표가 있는지까지 본다. */
export function GET() {
  const version = getDb().pragma("user_version", { simple: true });
  return Response.json({ ok: true, schema: version });
}
