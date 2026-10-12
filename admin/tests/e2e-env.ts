import path from "node:path";

/* 관리자 시험용 값. 시험 서버 둘(관리자 · 공개)과 시험 코드가 같이 쓴다. 비밀값은 이 시험에서만 쓰는 고정 문자열이다.
   포트는 공개 사이트 시험(:3100)과 겹치지 않게 따로 둔다. */
export const ADMIN = "http://localhost:3310";
export const PUBLIC = "http://localhost:3210";
export const DIR = path.resolve(__dirname, "../.e2e/db");
export const CONTENT_DB = path.join(DIR, "content.db");

export const ENV = {
  CONTENT_DB,
  BETTER_AUTH_SECRET: "e2e-only-better-auth-secret-0123456789abcdef",
  REVALIDATE_SECRET: "e2e-only-revalidate-secret",
  ADMIN_URL: ADMIN,
  PUBLIC_SITE_INTERNAL_URL: PUBLIC,
  PUBLIC_SITE_URL: PUBLIC,
};
