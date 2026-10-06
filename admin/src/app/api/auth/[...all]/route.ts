import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@admin/lib/auth";

/* Google 로그인 왕복(시작 · 콜백 · 로그아웃 · 세션). Better Auth 가 처리한다. */
export const GET = (request: Request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) => toNextJsHandler(getAuth()).POST(request);
