import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { ADMIN, CONTENT_DB, ENV, PUBLIC } from "./e2e-env";

/* 관리자 앱: 로그인 없이 막히는가, 등록되지 않은 계정이 막히는가, 저장이 공개 사이트에 반영되는가,
   화면을 거치지 않은 저장 요청도 막히는가, 되돌리기가 되는가.
   시험 세션은 Google 을 거치지 않고 Better Auth 의 testUtils 로 같은 DB 에 바로 만든다. */

test.describe.configure({ mode: "serial" });

type Cookie = { name: string; value: string; domain: string; path: string };
const sessions: Record<"admin" | "intruder", Cookie[]> = { admin: [], intruder: [] };

const db = () => new Database(CONTENT_DB, { readonly: true });
const meta = (key: string) => {
  const conn = db();
  try {
    return (conn.prepare(`SELECT value FROM content_meta WHERE key = ?`).get(key) as { value: string }).value;
  } finally {
    conn.close();
  }
};
const auditCount = () => {
  const conn = db();
  try {
    return (conn.prepare(`SELECT count(*) AS n FROM audit_event`).get() as { n: number }).n;
  } finally {
    conn.close();
  }
};
const publicHtml = async (path: string) => {
  const ctx = await playwrightRequest.newContext();
  try {
    return await (await ctx.get(`${PUBLIC}${path}`)).text();
  } finally {
    await ctx.dispose();
  }
};

test.beforeAll(async () => {
  const conn = new Database(CONTENT_DB);
  const auth = betterAuth({ baseURL: ADMIN, secret: ENV.BETTER_AUTH_SECRET, database: conn, plugins: [testUtils()] });
  const ctx = await auth.$context;
  for (const [key, email] of [
    ["admin", "admin@example.com"],
    ["intruder", "intruder@example.com"],
  ] as const) {
    const user = await ctx.test.saveUser(ctx.test.createUser({ email, name: email, emailVerified: true }));
    sessions[key] = (await ctx.test.login({ userId: user.id })).cookies;
  }
  conn.close();
});

const signIn = async (page: Page, who: "admin" | "intruder") => page.context().addCookies(sessions[who]);

test("로그인 없이는 어느 화면도 열리지 않는다", async ({ page }) => {
  for (const path of ["/", "/schedule", "/faq", "/history"]) {
    const response = await page.goto(`${ADMIN}${path}`);
    await expect(page).toHaveURL(`${ADMIN}/login`);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  }
  await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
});

test("Google 로그인은 이 앱의 콜백 주소로 간다", async ({ page }) => {
  let google: URL | null = null;
  await page.route("https://accounts.google.com/**", (route) => {
    google = new URL(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "google" });
  });
  await page.goto(`${ADMIN}/login`);
  await page.getByRole("button", { name: "Google 계정으로 로그인" }).click();
  await expect.poll(() => google?.searchParams.get("redirect_uri")).toBe(`${ADMIN}/api/auth/callback/google`);
  expect(google!.searchParams.get("client_id")).toBe(ENV.GOOGLE_CLIENT_ID);
  expect(google!.searchParams.get("prompt")).toBe("select_account");
});

test("등록되지 않은 계정은 로그인돼 있어도 막힌다", async ({ page }) => {
  await signIn(page, "intruder");
  await page.goto(`${ADMIN}/faq`);
  await expect(page).toHaveURL(`${ADMIN}/login?error=not_allowed`);
  await expect(page.locator(".msg[role=alert]")).toContainText("관리자로 등록되지 않은 계정");
  await expect(page.getByRole("button", { name: "다른 계정으로 로그인" })).toBeVisible();
});

test("FAQ 를 고치면 공개 사이트의 FAQ · 문의 쪽에 반영된다", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto(`${ADMIN}/faq`);
  const answer = page.getByLabel("답").first();
  await answer.fill("E2E 로 바꾼 첫 답입니다.");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.getByRole("status").first()).toHaveText("저장하고 개발 사이트에 반영했습니다.");
  expect(meta("faq.revision")).toBe("1");
  for (const path of ["/faq", "/contact"]) {
    await expect.poll(() => publicHtml(path)).toContain("E2E 로 바꾼 첫 답입니다.");
  }
});

test("입력이 틀리면 저장하지 않고 몇 번째 줄인지 알려 준다", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto(`${ADMIN}/faq`);
  await page.getByLabel("질문").first().fill("   ");
  await page.getByRole("button", { name: "저장하고 사이트에 반영" }).click();
  await expect(page.locator(".msg[role=alert]")).toHaveText("1번째 줄: 질문을 적어 주세요.");
  expect(meta("faq.revision")).toBe("1");
});

test("저장 요청이 서버에 닿지 못해도 적던 내용은 화면에 남는다", async ({ page }) => {
  await signIn(page, "admin");
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
  await context.addCookies(sessions.admin);
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

test("화면을 거치지 않은 저장 요청도 로그인과 허용 목록을 본다", async ({ page }) => {
  await signIn(page, "admin");
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
  await replay(sessions.intruder, "등록되지 않은 계정이 보낸 답");
  expect(auditCount()).toBe(before);
  const html = await publicHtml("/faq");
  expect(html).not.toContain("로그인 없이 보낸 답");
  expect(html).not.toContain("등록되지 않은 계정이 보낸 답");

  /* 같은 요청을 관리자 세션으로 보내면 저장된다 — 위의 「막혔다」가 요청 모양이 틀려서가 아님을 확인한다. */
  await replay(sessions.admin, "관리자 세션으로 다시 보낸 답");
  expect(auditCount()).toBe(before + 1);
});

test("같은 항목 · 기한의 일정이 둘이면 저장하지 않는다", async ({ page }) => {
  await signIn(page, "admin");
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
  await signIn(page, "admin");
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
  await signIn(page, "admin");
  await page.goto(`${ADMIN}/history`);
  const card = page.locator("section.card", { hasText: "E2E 시험 일정" }).first();
  await expect(card).toContainText("＋");
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "이 변경 전으로" }).click();
  await expect(page.locator("section.card").first()).toContainText("이전으로 되돌림");
  await expect.poll(() => publicHtml("/")).not.toContain("E2E 시험 일정");
});
