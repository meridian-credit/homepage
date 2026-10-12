import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { testUtils, username } from "better-auth/plugins";
import { ADMIN, CONTENT_DB, ENV, PUBLIC } from "./e2e-env";

/* 관리자 앱: 아이디 · 비밀번호 로그인과 시도 횟수 제한, 비밀번호를 바꾸거나 계정을 지우면 세션이 끊기는가,
   저장이 공개 사이트에 반영되는가, 화면을 거치지 않은 저장 요청도 막히는가, 되돌리기가 되는가.
   계정은 서버에서처럼 admin/scripts/user.mjs 로 만든다. 로그인 화면을 보지 않는 시험의 세션은 testUtils 로 DB 에
   바로 만든다(시도 횟수 제한을 쓰지 않으려고). 시도 횟수는 X-Real-IP 별로 세므로 시험마다 다른 주소를 쓴다. */

test.describe.configure({ mode: "serial" });

type Cookie = { name: string; value: string; domain: string; path: string };
const PASSWORD = "e2e-only-password-0123";
const ROOT = path.resolve(__dirname, "../..");
let adminCookies: Cookie[] = [];
let removedCookies: Cookie[] = [];

const userCli = (args: string[], input?: string) =>
  execFileSync("node", ["admin/scripts/user.mjs", ...args], { cwd: ROOT, input, env: { ...process.env, ...ENV }, encoding: "utf8" });

const loginCookies = async (name: string) => {
  const conn = new Database(CONTENT_DB);
  try {
    const auth = betterAuth({ baseURL: ADMIN, secret: ENV.BETTER_AUTH_SECRET, database: conn, plugins: [username(), testUtils()] });
    const ctx = await auth.$context;
    const user = await ctx.adapter.findOne<{ id: string }>({ model: "user", where: [{ field: "username", value: name }] });
    return (await ctx.test.login({ userId: user!.id })).cookies as Cookie[];
  } finally {
    conn.close();
  }
};

const query = <T>(sql: string) => {
  const conn = new Database(CONTENT_DB, { readonly: true });
  try {
    return conn.prepare(sql).get() as T;
  } finally {
    conn.close();
  }
};
const meta = (key: string) => query<{ value: string }>(`SELECT value FROM content_meta WHERE key = '${key}'`).value;
const auditCount = () => query<{ n: number }>(`SELECT count(*) AS n FROM audit_event`).n;
const userCount = () => query<{ n: number }>(`SELECT count(*) AS n FROM user`).n;
const publicHtml = async (path: string) => {
  const ctx = await playwrightRequest.newContext();
  try {
    return await (await ctx.get(`${PUBLIC}${path}`)).text();
  } finally {
    await ctx.dispose();
  }
};

test.beforeAll(async () => {
  userCli(["add", "admin"], PASSWORD);
  adminCookies = await loginCookies("admin");
});

const signIn = async (page: Page) => page.context().addCookies(adminCookies);

const submitLogin = async (page: Page, name: string, password: string) => {
  await page.getByLabel("아이디").fill(name);
  await page.getByLabel("비밀번호").fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/sign-in/username"));
  await page.getByRole("button", { name: "로그인" }).click();
  return (await response).status();
};

test("로그인 없이는 어느 화면도 열리지 않는다", async ({ page }) => {
  for (const path of ["/", "/schedule", "/faq", "/history"]) {
    const response = await page.goto(`${ADMIN}${path}`);
    await expect(page).toHaveURL(`${ADMIN}/login`);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  }
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});

test("아이디 · 비밀번호로 로그인하고, 로그아웃하면 다시 막힌다", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": "203.0.113.10" });
  await page.goto(`${ADMIN}/login`);
  /* 아이디는 대소문자를 가리지 않는다. */
  expect(await submitLogin(page, "Admin", PASSWORD)).toBe(200);
  await expect(page).toHaveURL(`${ADMIN}/`);
  await expect(page.locator(".who")).toContainText("admin");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(`${ADMIN}/login`);
  await page.goto(`${ADMIN}/faq`);
  await expect(page).toHaveURL(`${ADMIN}/login`);
});

test("틀린 비밀번호와 없는 아이디는 같은 말로 막는다", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": "203.0.113.11" });
  await page.goto(`${ADMIN}/login`);
  for (const [name, password] of [
    ["admin", "wrong-password-123"],
    ["nobody", PASSWORD],
  ]) {
    expect(await submitLogin(page, name, password)).toBe(401);
    await expect(page.locator(".msg[role=alert]")).toHaveText("아이디 또는 비밀번호가 맞지 않습니다.");
    await expect(page).toHaveURL(`${ADMIN}/login`);
  }
});

test("한 곳에서 로그인 시도가 너무 많으면 그곳만 잠시 막힌다", async ({ page }) => {
  const ctx = await playwrightRequest.newContext();
  const attempt = async (ip: string, password: string) =>
    (
      await ctx.post(`${ADMIN}/api/auth/sign-in/username`, {
        headers: { origin: ADMIN, "x-real-ip": ip },
        data: { username: "admin", password },
      })
    ).status();
  for (let i = 0; i < 10; i++) expect(await attempt("203.0.113.12", "wrong-password-123")).toBe(401);
  /* 맞는 비밀번호도 15분 동안은 받지 않는다. */
  expect(await attempt("203.0.113.12", PASSWORD)).toBe(429);
  /* 다른 곳에서는 그대로 들어온다. */
  expect(await attempt("203.0.113.13", PASSWORD)).toBe(200);
  await ctx.dispose();

  await page.setExtraHTTPHeaders({ "x-real-ip": "203.0.113.12" });
  await page.goto(`${ADMIN}/login`);
  expect(await submitLogin(page, "admin", PASSWORD)).toBe(429);
  await expect(page.locator(".msg[role=alert]")).toContainText("로그인 시도가 너무 많습니다");
});

test("쓰지 않는 로그인 길은 로그인한 채로도 닫혀 있다", async () => {
  const before = userCount();
  /* 관리자 세션을 달고 보낸다 — 로그인한 사람도 아이디 · 비밀번호를 HTTP 로 바꾸지 못해야 한다. */
  const ctx = await playwrightRequest.newContext({
    storageState: { cookies: adminCookies.map((c) => ({ ...c, expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const })), origins: [] },
  });
  const closed: [string, object][] = [
    ["/api/auth/sign-up/email", { email: "new@example.com", password: "long-enough-password", name: "new", username: "admin" }],
    ["/api/auth/sign-in/email", { email: "admin@users.invalid", password: PASSWORD }],
    ["/api/auth/is-username-available", { username: "admin" }],
    ["/api/auth/update-user", { username: "renamed" }],
    ["/api/auth/change-password", { currentPassword: PASSWORD, newPassword: "another-password-789" }],
  ];
  for (const [path, data] of closed) {
    const res = await ctx.post(`${ADMIN}${path}`, { headers: { origin: ADMIN, "x-real-ip": "203.0.113.14" }, data });
    expect(res.status(), path).toBe(404);
  }
  expect(userCount()).toBe(before);
  /* 열어 둔 길은 그대로 돈다. */
  const session = await ctx.get(`${ADMIN}/api/auth/get-session`, { headers: { "x-real-ip": "203.0.113.14" } });
  expect((await session.json()).user.username).toBe("admin");
  await ctx.dispose();
});

test("비밀번호를 바꾸거나 계정을 지우면 열려 있던 세션도 막힌다", async ({ page }) => {
  userCli(["add", "temp.user"], PASSWORD);
  await page.context().addCookies(await loginCookies("temp.user"));
  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(`${ADMIN}/`);

  expect(userCli(["passwd", "temp.user"], "another-password-456")).toContain("세션을 모두 지웠습니다");
  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(`${ADMIN}/login`);

  await page.context().clearCookies();
  removedCookies = await loginCookies("temp.user");
  await page.context().addCookies(removedCookies);
  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(`${ADMIN}/`);
  userCli(["remove", "temp.user"]);
  await page.goto(`${ADMIN}/`);
  await expect(page).toHaveURL(`${ADMIN}/login`);
  expect(userCli(["list"])).not.toContain("temp.user");
});

test("FAQ 를 고치면 공개 사이트의 FAQ · 문의 쪽에 반영된다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  const answer = page.getByLabel("답").first();
  await answer.fill("E2E 로 바꾼 첫 답입니다.");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.getByRole("status").first()).toHaveText("저장하고 개발 사이트에 반영했습니다.");
  expect(meta("faq.revision")).toBe("1");
  /* 변경 기록에는 아이디가 남는다. */
  expect(query<{ actor: string }>(`SELECT actor FROM audit_event ORDER BY id DESC LIMIT 1`).actor).toBe("admin");
  for (const path of ["/faq", "/contact"]) {
    await expect.poll(() => publicHtml(path)).toContain("E2E 로 바꾼 첫 답입니다.");
  }
});

test("입력이 틀리면 저장하지 않고 몇 번째 줄인지 알려 준다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  await page.getByLabel("질문").first().fill("   ");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.locator(".msg[role=alert]")).toHaveText("1번째 줄: 질문을 적어 주세요.");
  expect(meta("faq.revision")).toBe("1");
});

test("저장 요청이 서버에 닿지 못해도 적던 내용은 화면에 남는다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  await page.route(`${ADMIN}/faq`, (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.getByLabel("답").first().fill("보내지 못한 답");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.locator(".msg[role=alert]")).toContainText("저장하지 못했습니다");
  await expect(page.getByLabel("답").first()).toHaveValue("보내지 못한 답");
  expect(meta("faq.revision")).toBe("1");
});

test("다른 창에서 먼저 저장했으면 덮어쓰지 않는다", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies(adminCookies);
  const [a, b] = [await context.newPage(), await context.newPage()];
  await a.goto(`${ADMIN}/faq`);
  await b.goto(`${ADMIN}/faq`);
  await a.getByLabel("답").nth(1).fill("A 창에서 저장한 답");
  await a.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(a.getByRole("status").first()).toHaveText("저장하고 개발 사이트에 반영했습니다.");
  await b.getByLabel("답").nth(1).fill("B 창에서 저장하려던 답");
  await b.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(b.locator(".msg[role=alert]")).toContainText("먼저 저장했습니다");
  expect(meta("faq.revision")).toBe("2");
  await expect.poll(() => publicHtml("/faq")).toContain("A 창에서 저장한 답");
  expect(await publicHtml("/faq")).not.toContain("B 창에서 저장하려던 답");
  await context.close();
});

test("화면을 거치지 않은 저장 요청도 로그인을 본다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  /* 화면에서 한 번 저장해 실제 요청의 모양(액션 번호 · 본문)을 얻는다. */
  const sent = page.waitForRequest((r) => r.method() === "POST" && !!r.headers()["next-action"]);
  await page.getByLabel("답").nth(2).fill("화면에서 저장한 답");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  const original = await sent;
  await expect(page.getByRole("status").first()).toHaveText("저장하고 개발 사이트에 반영했습니다.");

  const replay = async (cookies: Cookie[], text: string) => {
    const [input] = JSON.parse(original.postData()!) as [{ items: { q: string; a: string }[] }, number];
    input.items[2].a = text;
    const ctx = await playwrightRequest.newContext({ storageState: { cookies: cookies.map((c) => ({ ...c, expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const })), origins: [] } });
    try {
      await ctx.post(`${ADMIN}/faq`, {
        headers: {
          "next-action": original.headers()["next-action"],
          "content-type": original.headers()["content-type"],
          accept: "text/x-component",
          origin: ADMIN,
        },
        data: JSON.stringify([input, Number(meta("faq.revision"))]),
        maxRedirects: 0,
      });
    } finally {
      await ctx.dispose();
    }
  };

  const before = auditCount();
  await replay([], "로그인 없이 보낸 답");
  await replay(removedCookies, "지운 계정의 세션으로 보낸 답");
  expect(auditCount()).toBe(before);
  const html = await publicHtml("/faq");
  expect(html).not.toContain("로그인 없이 보낸 답");
  expect(html).not.toContain("지운 계정의 세션으로 보낸 답");

  /* 같은 요청을 관리자 세션으로 보내면 저장된다 — 위의 「막혔다」가 요청 모양이 틀려서가 아님을 확인한다. */
  await replay(adminCookies, "관리자 세션으로 다시 보낸 답");
  expect(auditCount()).toBe(before + 1);
});

test("같은 항목 · 기한의 일정이 둘이면 저장하지 않는다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/schedule`);
  const first = page.locator("tbody tr").first();
  const [what, when, period] = await Promise.all(
    [/번째 항목/, /번째 기한/, /번째 대상 기간/].map((label) => first.getByLabel(label).inputValue())
  );
  await page.getByRole("button", { name: "줄 추가" }).click();
  const last = page.locator("tbody tr").last();
  await last.getByLabel(/번째 항목/).fill(what);
  await last.getByLabel(/번째 기한/).fill(when);
  await last.getByLabel(/번째 대상 기간/).fill(period);
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.locator(".msg[role=alert]")).toHaveText("같은 항목 · 기한이 두 번 있습니다.");
  expect(meta("schedule.revision")).toBe("0");
});

test("일정을 더하면 공개 사이트 머리글 일정에 들어간다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/schedule`);
  const due = new Date(Date.now() + 40 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await page.getByRole("button", { name: "줄 추가" }).click();
  const last = page.locator("tbody tr").last();
  await last.getByLabel(/번째 항목/).fill("E2E 시험 일정");
  await last.getByLabel(/번째 기한/).fill(due);
  await last.getByLabel(/번째 대상 기간/).fill("시험분");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.getByRole("status").first()).toHaveText("저장하고 개발 사이트에 반영했습니다.");
  await expect.poll(() => publicHtml("/")).toContain("E2E 시험 일정");
  /* 날짜순으로 다시 정렬돼 돌아온다. */
  const dates = await page.locator('tbody input[type="date"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(dates).toEqual([...dates].sort());
});

test("변경 기록에서 되돌리면 공개 사이트도 되돌아간다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/history`);
  const card = page.locator("section.card", { hasText: "E2E 시험 일정" }).first();
  await expect(card).toContainText("＋");
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "이 변경 전으로" }).click();
  await expect(page.locator("section.card").first()).toContainText("이전으로 되돌림");
  await expect.poll(() => publicHtml("/")).not.toContain("E2E 시험 일정");
});
