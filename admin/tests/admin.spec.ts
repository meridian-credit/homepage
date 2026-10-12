import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { testUtils, username } from "better-auth/plugins";
import { ADMIN, CONTENT_DB, ENV, PUBLIC } from "./e2e-env";

/* 관리자 앱: 아이디 · 비밀번호 로그인과 시도 횟수 제한, 비밀번호를 바꾸거나 계정을 지우면 세션이 끊기는가,
   저장이 공개 사이트에 반영되는가, 화면을 거치지 않은 저장 요청도 막히는가, 적던 내용이 연결 끊김 · 로그인 만료 ·
   충돌 뒤에도 남는가, 되돌리기가 달라지는 점을 먼저 보이고 그 사이의 저장을 덮지 않는가, 반영 실패를 기억하는가.
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

const write = (sql: string, ...params: unknown[]) => {
  const conn = new Database(CONTENT_DB);
  try {
    conn.prepare(sql).run(...params);
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
const saveBar = (page: Page) => page.getByRole("region", { name: "저장" });
const save = (page: Page) => saveBar(page).getByRole("button", { name: "저장하고 반영" }).click();
/* FAQ 의 n번째 문답을 펴고 그 답 칸을 돌려준다. 펴면 다음 프레임에 질문 칸으로 초점이 가므로, 그것을 기다린 뒤에
   답 칸을 채운다(안 그러면 빠른 입력이 질문 칸으로 들어간다). */
const openAnswer = async (page: Page, n: number) => {
  await page.locator(".qa-toggle").nth(n).click();
  await expect(page.locator(".qa.is-open input")).toBeFocused();
  return page.locator(".qa.is-open textarea");
};

const submitLogin = async (page: Page, name: string, password: string) => {
  await page.getByLabel("아이디").fill(name);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
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
  await expect(page.locator(".sidebar .who")).toContainText("admin");
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
    await expect(page.locator(".login-card [role=alert]")).toHaveText("아이디 또는 비밀번호가 맞지 않습니다.");
    await expect(page).toHaveURL(`${ADMIN}/login`);
  }
});

test("로그인 뒤 돌아갈 곳(next)은 이 앱 안의 경로만 받는다", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": "203.0.113.16" });
  /* 「/<탭>/evil.example」: 브라우저가 탭을 지우면 「//evil.example」 — 다른 호스트로 보내는 길이 된다. */
  await page.goto(`${ADMIN}/login?next=%2F%09%2Fevil.example`);
  expect(await submitLogin(page, "admin", PASSWORD)).toBe(200);
  await expect(page).toHaveURL(`${ADMIN}/`);
  /* 이미 로그인한 채로 열면 서버가 바로 보낸다. 그 길도 같은 검사를 거친다. */
  for (const next of ["/\t/evil.example", "//evil.example", "/\\evil.example", "https://evil.example", "/%09/evil.example"]) {
    await page.goto(`${ADMIN}/login?next=${encodeURIComponent(next)}`);
    expect(new URL(page.url()).origin, next).toBe(ADMIN);
  }
  await page.goto(`${ADMIN}/login?next=${encodeURIComponent("/history?type=faq")}`);
  await expect(page).toHaveURL(`${ADMIN}/history?type=faq`);
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
  await expect(page.locator(".login-card [role=alert]")).toContainText("로그인 시도가 너무 많습니다");
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
  await (await openAnswer(page, 0)).fill("E2E 로 바꾼 첫 답입니다.");
  await expect(saveBar(page)).toContainText("저장하지 않은 변경 1건");
  await expect(saveBar(page)).toContainText("답 1개 고침");
  await save(page);
  await expect(saveBar(page)).toContainText("저장했습니다");
  await expect(saveBar(page)).toContainText("사이트에도 반영됐습니다");
  expect(meta("faq.revision")).toBe("1");
  /* 변경 기록에는 아이디와 사람이 읽을 요약이 남는다. */
  expect(query<{ actor: string; summary: string }>(`SELECT actor, summary FROM audit_event ORDER BY id DESC LIMIT 1`)).toEqual({
    actor: "admin",
    summary: "답 1개 고침",
  });
  for (const path of ["/faq", "/contact"]) {
    await expect.poll(() => publicHtml(path)).toContain("E2E 로 바꾼 첫 답입니다.");
  }
});

test("입력이 틀리면 저장하지 않고 그 칸을 알려 준다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  await page.locator(".qa-toggle").first().click();
  await page.locator(".qa.is-open input").fill("   ");
  await page.locator(".qa-toggle").first().click();
  await save(page);
  await expect(saveBar(page)).toContainText("고칠 곳이 1군데 있어 저장하지 않았습니다");
  /* 고칠 문답을 다시 펴고 그 칸으로 초점을 옮긴다. */
  await expect(page.locator(".qa.is-open input")).toBeFocused();
  await expect(page.locator(".qa.is-open .field.has-error")).toContainText("질문을 적어 주세요.");
  expect(meta("faq.revision")).toBe("1");
});

test("저장 요청이 서버에 닿지 못해도 적던 내용은 남고, 새로고침해도 이어서 고칠 수 있다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  await page.route(`${ADMIN}/faq`, (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await (await openAnswer(page, 0)).fill("보내지 못한 답");
  await save(page);
  await expect(saveBar(page)).toContainText("저장하지 못했습니다");
  await expect(page.locator(".qa.is-open textarea")).toHaveValue("보내지 못한 답");
  expect(meta("faq.revision")).toBe("1");

  await page.unroute(`${ADMIN}/faq`);
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByText("저장하지 않은 변경이 이 기기에 남아 있습니다")).toBeVisible();
  await page.getByRole("button", { name: "이어서 고치기" }).click();
  await expect(page.locator(".qa").first()).toContainText("고침 · 저장 전");
  await expect(await openAnswer(page, 0)).toHaveValue("보내지 못한 답");
  await saveBar(page).getByRole("button", { name: "변경 취소" }).click();
  await expect(saveBar(page)).toContainText("변경을 취소했습니다");
  expect(await page.evaluate(() => localStorage.getItem("meridian-admin:draft:faq"))).toBeNull();
});

test("남은 작업본을 묻는 동안 새로 고친 것도 이 기기에 보관한다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  await (await openAnswer(page, 0)).fill("첫 작업본의 답");
  /* 메뉴로 옮기면(화면 안 이동) 떠날 때 경고 없이 작업본만 이 기기에 남는다. */
  await page.locator(".sidebar").getByRole("link", { name: "세무 일정" }).click();
  await expect(page).toHaveURL(`${ADMIN}/schedule`);
  await page.locator(".sidebar").getByRole("link", { name: "자주 묻는 질문" }).click();
  await expect(page.getByText("저장하지 않은 변경이 이 기기에 남아 있습니다")).toBeVisible();
  /* 띠에 답하지 않고 다른 문답을 고친다. 그것도 보관돼야 한다. */
  await (await openAnswer(page, 1)).fill("띠를 두고 새로 적은 답");
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "이어서 고치기" }).click();
  await expect(await openAnswer(page, 1)).toHaveValue("띠를 두고 새로 적은 답");
  await saveBar(page).getByRole("button", { name: "변경 취소" }).click();
  expect(meta("faq.revision")).toBe("1");
});

test("다른 창에서 먼저 저장했으면 덮어쓰지 않고, 최신 내용을 불러와 내 변경을 보여 준다", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies(adminCookies);
  const [a, b] = [await context.newPage(), await context.newPage()];
  await a.goto(`${ADMIN}/faq`);
  await b.goto(`${ADMIN}/faq`);
  await (await openAnswer(a, 1)).fill("A 창에서 저장한 답");
  await save(a);
  await expect(saveBar(a)).toContainText("저장했습니다");
  await (await openAnswer(b, 1)).fill("B 창에서 저장하려던 답");
  /* 새 문답도 하나 더한다. 충돌 뒤 그 답까지 남아야 한다(질문만 남으면 긴 답을 다시 써야 한다). */
  await b.getByRole("button", { name: "문답 추가" }).click();
  await expect(b.locator(".qa.is-open input")).toBeFocused();
  await b.locator(".qa.is-open input").fill("B 창의 새 질문");
  await b.locator(".qa.is-open textarea").fill("B 창에서 새로 적은 긴 답");
  await save(b);
  const dialog = b.getByRole("dialog", { name: "다른 곳에서 먼저 저장했습니다" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("admin 님이");
  await expect(dialog).toContainText("상담 비용이 있나요?");
  expect(meta("faq.revision")).toBe("2");
  await expect.poll(() => publicHtml("/faq")).toContain("A 창에서 저장한 답");
  expect(await publicHtml("/faq")).not.toContain("B 창에서 저장하려던 답");

  await dialog.getByRole("button", { name: "최신 내용 불러오기" }).click();
  await expect(b.getByText("최신 내용을 불러왔습니다. 저장하지 못한 내 변경은 아래와 같습니다")).toBeVisible();
  await expect(b.locator(".page-banners")).toContainText("B 창에서 저장하려던 답");
  await expect(b.locator(".page-banners")).toContainText("B 창에서 새로 적은 긴 답");
  await expect(await openAnswer(b, 1)).toHaveValue("A 창에서 저장한 답");
  await context.close();
});

test("화면을 거치지 않은 저장 요청도 로그인과 입력을 본다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  /* 화면에서 한 번 저장해 실제 요청의 모양(액션 번호 · 본문)을 얻는다. */
  const sent = page.waitForRequest((r) => r.method() === "POST" && !!r.headers()["next-action"]);
  await (await openAnswer(page, 2)).fill("화면에서 저장한 답");
  await save(page);
  const original = await sent;
  await expect(saveBar(page)).toContainText("저장했습니다");

  const replay = async (cookies: Cookie[], change: (items: { q: string; a: string }[]) => void) => {
    const [input] = JSON.parse(original.postData()!) as [{ items: { q: string; a: string }[] }, number];
    change(input.items);
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
  await replay([], (items) => (items[2].a = "로그인 없이 보낸 답"));
  await replay(removedCookies, (items) => (items[2].a = "지운 계정의 세션으로 보낸 답"));
  /* 화면의 검사를 건너뛴 틀린 입력도 서버가 막는다. */
  await replay(adminCookies, (items) => (items[2].q = "   "));
  await replay(adminCookies, (items) => (items[3].q = items[2].q));
  expect(auditCount()).toBe(before);
  const html = await publicHtml("/faq");
  expect(html).not.toContain("로그인 없이 보낸 답");
  expect(html).not.toContain("지운 계정의 세션으로 보낸 답");

  /* 같은 요청을 관리자 세션으로 보내면 저장된다 — 위의 「막혔다」가 요청 모양이 틀려서가 아님을 확인한다. */
  await replay(adminCookies, (items) => (items[2].a = "관리자 세션으로 다시 보낸 답"));
  expect(auditCount()).toBe(before + 1);
});

test("로그인이 끝난 뒤 저장하면, 다시 로그인하고 같은 화면에서 이어서 저장한다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/faq`);
  const revision = meta("faq.revision");
  await (await openAnswer(page, 3)).fill("로그인이 끝난 뒤 적은 답");
  await page.context().clearCookies();
  await save(page);
  await expect(saveBar(page)).toContainText("로그인이 끝나 저장하지 못했습니다");
  expect(meta("faq.revision")).toBe(revision);

  await page.setExtraHTTPHeaders({ "x-real-ip": "203.0.113.15" });
  page.on("dialog", (dialog) => dialog.accept());
  await saveBar(page).getByRole("link", { name: "다시 로그인" }).click();
  await expect(page).toHaveURL(`${ADMIN}/login?next=%2Ffaq`);
  await expect(page.locator(".login-card")).toContainText("보던 화면으로 돌아가고");
  expect(await submitLogin(page, "admin", PASSWORD)).toBe(200);
  await expect(page).toHaveURL(`${ADMIN}/faq`);
  await page.getByRole("button", { name: "이어서 고치기" }).click();
  await save(page);
  await expect(saveBar(page)).toContainText("저장했습니다");
  expect(meta("faq.revision")).toBe(String(Number(revision) + 1));
  await expect.poll(() => publicHtml("/faq")).toContain("로그인이 끝난 뒤 적은 답");
});

test("같은 항목 · 기한의 일정은 목록에 넣지 않는다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/schedule`);
  const first = query<{ what: string; due_date: string; period: string }>(`SELECT what, due_date, period FROM schedule_item ORDER BY due_date LIMIT 1`);
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await page.locator("#add-when").fill(first.due_date);
  await page.locator("#add-what").fill(first.what);
  await page.locator("#add-period").fill(first.period);
  await page.getByRole("button", { name: "목록에 추가" }).click();
  await expect(page.locator("#add-panel [role=alert]")).toContainText("같은 일정이 이미 있습니다");
  await expect(page.locator("#add-what")).toHaveAttribute("aria-invalid", "true");
  await expect(saveBar(page)).toBeHidden();
  expect(meta("schedule.revision")).toBe("0");
});

const dueIn = (days: number) => new Date(Date.now() + days * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const addSchedule = async (page: Page, what: string, due: string) => {
  await page.getByRole("button", { name: "일정 추가", exact: true }).click();
  await page.locator("#add-when").fill(due);
  await page.locator("#add-what").fill(what);
  await page.locator("#add-period").fill("시험분");
  await page.getByRole("button", { name: "목록에 추가" }).click();
  await expect(page.locator(".add-done")).toContainText("목록에 넣었습니다");
};

test("일정을 더하면 공개 사이트 머리글 일정에 들어간다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/schedule`);
  await addSchedule(page, "E2E 시험 일정", dueIn(40));
  await expect(page.locator(".row.is-new")).toContainText("E2E 시험 일정");
  /* 새 일정 칸에 적다 만 것이 있으면 저장을 막는다 — 저장하며 칸이 닫히면 소리 없이 사라진다. */
  await page.locator("#add-what").fill("적다 만 일정");
  await save(page);
  await expect(saveBar(page)).toContainText("새 일정 칸에 적은 것이 아직 목록에 들어가지 않았습니다");
  await expect(page.locator("#add-what")).toBeFocused();
  expect(meta("schedule.revision")).toBe("0");
  await page.locator("#add-what").fill("");
  await saveBar(page).getByRole("button", { name: "다시 저장" }).click();
  await expect(saveBar(page)).toContainText("저장했습니다");
  await expect.poll(() => publicHtml("/")).toContain("E2E 시험 일정");
  /* 날짜순으로 담긴다. */
  const conn = new Database(CONTENT_DB, { readonly: true });
  const dates = (conn.prepare(`SELECT due_date FROM schedule_item ORDER BY position`).all() as { due_date: string }[]).map((r) => r.due_date);
  conn.close();
  expect(dates).toEqual([...dates].sort());
  expect(query<{ summary: string }>(`SELECT summary FROM audit_event ORDER BY id DESC LIMIT 1`).summary).toBe("일정 1건 추가");
});

test("되돌리기는 달라지는 점을 먼저 보이고, 미리 본 뒤 누가 저장했으면 거절한다", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies(adminCookies);
  const [a, b] = [await context.newPage(), await context.newPage()];
  await a.goto(`${ADMIN}/history?type=schedule`);
  const entry = a.locator("details.entry", { hasText: "E2E 시험 일정" }).first();
  await entry.locator("summary").click();
  await entry.getByRole("button", { name: "이 저장 이전으로 되돌리기" }).click();
  const dialog = a.getByRole("dialog");
  await expect(dialog).toContainText("E2E 시험 일정");
  await expect(dialog).not.toContainText("함께 되돌아갑니다");

  /* 미리 보는 사이에 다른 창에서 일정을 하나 더 저장한다. */
  await b.goto(`${ADMIN}/schedule`);
  await addSchedule(b, "E2E 두 번째 일정", dueIn(45));
  await save(b);
  await expect(saveBar(b)).toContainText("저장했습니다");
  const revision = meta("schedule.revision");

  await dialog.getByRole("button", { name: "되돌리고 반영" }).click();
  await expect(dialog.getByRole("alert")).toContainText("미리 본 뒤에");
  expect(meta("schedule.revision")).toBe(revision);
  /* 다시 보여 준 미리 보기에는 그 뒤의 저장도 함께 되돌아간다고 적혀 있다. */
  await expect(dialog).toContainText("이 저장 뒤에 한 변경 1건도 함께 되돌아갑니다");
  await expect(dialog).toContainText("E2E 두 번째 일정");
  await dialog.getByRole("button", { name: "되돌리고 반영" }).click();
  await expect(a.getByText("되돌렸습니다", { exact: true })).toBeVisible();
  await expect(a.locator("details.entry").first()).toContainText("되돌림");
  await expect.poll(() => publicHtml("/")).not.toContain("E2E 시험 일정");
  expect(await publicHtml("/")).not.toContain("E2E 두 번째 일정");
  await context.close();
});

test("사이트 반영 실패는 어느 화면에서든 보이고, 다시 반영하면 사라진다", async ({ page }) => {
  write(
    `INSERT INTO content_meta (key, value) VALUES ('admin.publishFailed', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    JSON.stringify({ at: new Date().toISOString(), detail: "공개 사이트가 502 로 답했습니다.", what: "자주 묻는 질문을" })
  );
  await signIn(page);
  await page.goto(`${ADMIN}/`);
  await expect(page.getByRole("heading", { name: "저장한 내용이 사이트에 아직 나오지 않습니다" })).toBeVisible();
  await page.goto(`${ADMIN}/schedule`);
  const banner = page.getByRole("alert").filter({ hasText: "저장은 됐지만, 사이트에는 아직 나오지 않습니다" });
  await expect(banner).toContainText("자주 묻는 질문을");
  await banner.getByRole("button", { name: "다시 반영" }).click();
  await expect(page.getByText("사이트에 반영했습니다").first()).toBeVisible();
  await expect(banner).toBeHidden();
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM content_meta WHERE key = 'admin.publishFailed'`).n).toBe(0);
});
