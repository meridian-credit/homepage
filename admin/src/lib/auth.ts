import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { getDb } from "./db";

/* 관리자 로그인. 아이디 · 비밀번호만 받는다(주인 결정 2026-10-12, Google 로그인 대신).
   - 가입 화면이 없다. 계정은 서버에서 admin/scripts/user.mjs 로만 만들고 지운다. 이 앱은 사용자를 만들 수 없다
     (disableSignUp + 만들기 직전 hook). 그래서 「계정이 있다」가 곧 「들어와도 된다」이다.
   - 로그인 시도는 접속 IP 하나당 15분에 10번으로 묶는다. IP 는 안쪽 NPM 이 넣는 X-Real-IP 로 읽는다.
     X-Forwarded-For 는 Caddy → NPM 두 겹을 지나며 값이 둘이 되어 Better Auth 가 IP 를 못 정하고, 그러면 모두가
     한 칸을 나눠 써서 남이 틀린 비밀번호를 몇 번 넣는 것만으로 모두의 로그인이 막힌다. 손님이 보낸 X-Real-IP 는
     NPM 이 실제 접속 주소로 덮는다(2026-10-12 위조 헤더로 확인).
   - 세션은 이 호스트에만 붙는 쿠키다(공개 사이트와 나누지 않는다).

   빌드 때는 DB 도 비밀값도 없다. 그래서 처음 쓸 때 만든다 — 모듈 맨 위에서 만들면 next build 가
   라우트를 읽는 순간 DB 를 열려다 멈춘다.
   설정을 따로 내보내는 것은 앱이 뜰 때 로그인 표를 먼저 만들기 위해서다(instrumentation.ts). 인스턴스를
   먼저 만들면 Better Auth 가 표가 없다고 오류를 한 번 찍는다.
   비밀번호 · 아이디 규칙은 admin/scripts/user.mjs 에도 같은 값이 있다. 바꿀 때 같이 바꾼다. */
export function authOptions() {
  return {
    appName: "메리디안 관리자",
    baseURL: process.env.ADMIN_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: getDb(),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    /* 로그인 유지 30일(주인 결정 2026-10-12, 2단계 인증 없이). 한 달에 한 번쯤 들어와도 다시 로그인하지 않게.
       하루에 한 번 이상 쓰면 그날부터 다시 30일로 늘어난다(updateAge). 서버에서 비밀번호를 바꾸거나 계정을 지우면
       user.mjs 가 그 사람의 세션을 지우므로, 기간이 길어도 바로 끊을 수 있다. */
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      customRules: { "/sign-in/username": { window: 15 * 60, max: 10 } },
    },
    advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            throw new APIError("FORBIDDEN", { code: "signup_disabled", message: "계정은 서버에서만 만듭니다." });
          },
        },
      },
    },
    plugins: [username(), nextCookies()],
  } satisfies BetterAuthOptions;
}

let instance: ReturnType<typeof betterAuth<ReturnType<typeof authOptions>>> | null = null;
export function getAuth() {
  instance ??= betterAuth(authOptions());
  return instance;
}
