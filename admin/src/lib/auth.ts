import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "./db";
import { isAllowedEmail } from "./allowlist";

/* 관리자 로그인. Google 계정만 받고, ADMIN_EMAILS 에 적힌 주소만 계정을 만들 수 있다.
   비밀번호 로그인은 끈다. 세션은 이 호스트에만 붙는 쿠키다(공개 사이트와 나누지 않는다).

   빌드 때는 DB 도 비밀값도 없다. 그래서 처음 쓸 때 만든다 — 모듈 맨 위에서 만들면 next build 가
   라우트를 읽는 순간 DB 를 열려다 멈춘다.
   설정을 따로 내보내는 것은 앱이 뜰 때 로그인 표를 먼저 만들기 위해서다(instrumentation.ts). 인스턴스를
   먼저 만들면 Better Auth 가 표가 없다고 오류를 한 번 찍는다. */
export function authOptions() {
  return {
    appName: "메리디안 관리자",
    baseURL: process.env.ADMIN_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: getDb(),
    emailAndPassword: { enabled: false },
    /* 로그인 확인에만 쓰고 Google API 는 부르지 않지만, Better Auth 는 받은 토큰을 DB 에 둔다. 사본 · 백업 파일에
       맨 토큰이 남지 않게 암호화한다. */
    account: { encryptOAuthTokens: true },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isAllowedEmail(user.email)) {
              /* code 가 있어야 Better Auth 가 JSON 을 내지 않고 /login?error=not_allowed 로 돌려보낸다. */
              throw new APIError("FORBIDDEN", { code: "not_allowed", message: "관리자로 등록되지 않은 계정입니다." });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

let instance: ReturnType<typeof betterAuth<ReturnType<typeof authOptions>>> | null = null;
export function getAuth() {
  instance ??= betterAuth(authOptions());
  return instance;
}
