import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@admin/lib/auth";

/* Better Auth 의 HTTP 길 가운데 이 앱이 쓰는 셋만 연다. 나머지는 없는 주소처럼 404.
   Better Auth 는 켜 둔 기능의 길을 모두 연다. 그대로 두면 이런 일이 생긴다(2026-10-12 critic).
   - /sign-in/email 로 로그인하면 아이디 로그인에 건 시도 제한(15분 10번)을 비켜 간다.
   - /is-username-available · /update-user · /sign-up/email 이 로그인 없이 아이디가 있는지 알려 준다.
   - 로그인한 사람이 /update-user · /change-password 로 아이디 · 비밀번호를 바꾼다.
     계정은 서버에서만 다룬다(admin/scripts/user.mjs).
   열 길을 적어 두는 쪽이라 Better Auth 를 올려 새 길이 생겨도 닫힌 채로 남는다. 서버 쪽 호출(auth.api.*)은
   이 문을 거치지 않는다. */
const OPEN = new Set(["POST /api/auth/sign-in/username", "POST /api/auth/sign-out", "GET /api/auth/get-session"]);

const gate = (handle: (request: Request) => Promise<Response>) => (request: Request) =>
  OPEN.has(`${request.method} ${new URL(request.url).pathname}`) ? handle(request) : new Response(null, { status: 404 });

export const GET = gate((request) => toNextJsHandler(getAuth()).GET(request));
export const POST = gate((request) => toNextJsHandler(getAuth()).POST(request));
