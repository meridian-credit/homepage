import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, request as playwrightRequest, test, type Browser, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { testUtils, username } from "better-auth/plugins";
import sharp from "sharp";
import { ADMIN, CONTENT_DB, ENV, PUBLIC } from "./e2e-env";

/* 블로그 글(docs/plans/admin-backend/blog.md §9). 관리자에서 쓰고 게시한 글이 공개 사이트 곳곳에 나오는가, 초안은
   새지 않는가, 굵은 글씨 뒤 조사가 사이트에서도 굵게 나오는가, 사진의 위치 정보가 지워지는가, 내린 글은 404 인가,
   두 탭이 서로 덮지 않는가, 기록에서 되돌리는가, 화면을 거치지 않은 요청도 막히는가.
   admin.spec.ts 와 같은 서버 · DB 를 쓴다(그 시험이 먼저 돈다). 계정은 따로 만든다. */

test.describe.configure({ mode: "serial" });

type Cookie = { name: string; value: string; domain: string; path: string };
const PASSWORD = "e2e-only-password-0123";
const ROOT = path.resolve(__dirname, "../..");
const SLUG = "corporate-tax-rate-2027";
const TITLE = "법인세율이 1%p 오릅니다";
const DESCRIPTION = "2027년 귀속분부터 법인세 과세표준 구간별 세율이 1%p 오릅니다. 중소기업이 먼저 확인할 점을 정리했습니다.";
let cookies: Cookie[] = [];
let postId = 0;
let imageName = "";

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

const query = <T>(sql: string, ...params: unknown[]) => {
  const conn = new Database(CONTENT_DB, { readonly: true });
  try {
    return conn.prepare(sql).get(...params) as T;
  } finally {
    conn.close();
  }
};

const fetchPublic = async (p: string) => {
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.get(`${PUBLIC}${p}`, { maxRedirects: 0 });
    return { status: res.status(), body: await res.text(), headers: res.headers() };
  } finally {
    await ctx.dispose();
  }
};

const signIn = async (page: Page) => page.context().addCookies(cookies);
const saveBar = (page: Page) => page.getByRole("region", { name: "저장" });
const body = (page: Page) => page.locator(".md-surface .pm");
const openPost = async (page: Page) => {
  await page.goto(`${ADMIN}/posts/${postId}`);
  await expect(page.locator(".md-editor.is-ready")).toBeVisible();
};
const saveDraft = async (page: Page) => {
  await page.keyboard.press("ControlOrMeta+s");
  await expect(saveBar(page)).toContainText("초안을 저장했습니다");
};
const publish = async (page: Page) => {
  await page.locator("#post-publish").click();
  const confirm = page.locator("#post-publish-confirm");
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(saveBar(page)).toContainText("게시했습니다", { timeout: 20000 });
};

test.beforeAll(async () => {
  userCli(["add", "writer"], PASSWORD);
  cookies = await loginCookies("writer");
});

test("새 글을 쓰고 초안으로 저장하면 사이트에는 나오지 않는다", async ({ page }) => {
  await signIn(page);
  await page.goto(`${ADMIN}/posts`);
  await expect(page.getByRole("heading", { name: "아직 글이 없습니다" })).toBeVisible();
  await page.locator("#post-new").click();
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  postId = Number(page.url().split("/").pop());
  await expect(page.locator(".md-editor.is-ready")).toBeVisible();

  await page.locator("#post-title").fill(TITLE);
  await page.locator("#post-slug").fill(SLUG);
  await page.locator("#post-category").selectOption("법인세");
  await page.locator("#post-description").fill(DESCRIPTION);

  /* 본문: 굵은 글씨 뒤 조사, 표, 링크. */
  await body(page).click();
  await page.keyboard.type("세율이 ");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("25%");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("로 오릅니다.");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "링크", exact: true }).click();
  await page.locator("#md-link-href").fill("https://www.law.go.kr/법령/법인세법");
  await page.locator("#md-link-text").fill("법인세법");
  await page.getByRole("dialog").getByRole("button", { name: "넣기" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "표 넣기" }).click();
  await page.keyboard.type("과세표준");
  await page.keyboard.press("Tab");
  await page.keyboard.type("세율");

  await page.getByRole("button", { name: "줄 더하기" }).click();
  await page.getByLabel("1번째 근거 이름").fill("법인세법 제55조");
  await page.getByLabel("1번째 근거 주소").fill("https://www.law.go.kr/법령/법인세법/제55조");
  await page.getByRole("button", { name: "오늘 검토함" }).click();

  await saveDraft(page);
  const row = query<{ slug: string; draft: string }>(`SELECT slug, draft FROM post WHERE id = ?`, postId);
  expect(row.slug).toBe(SLUG);
  const saved = JSON.parse(row.draft) as { body: string; title: string };
  expect(saved.title).toBe(TITLE);
  /* 편집기가 조사를 문자 참조로 적어 CommonMark 가 굵게 닫을 수 있게 한다(markdown-editor.tsx). */
  expect(saved.body).toContain("**25%**&#xB85C;");
  expect(saved.body).toContain("[법인세법](https://www.law.go.kr/법령/법인세법)");
  expect(saved.body).toContain("| 과세표준");

  expect((await fetchPublic(`/blog/${SLUG}`)).status).toBe(404);
  expect((await fetchPublic("/blog")).body).not.toContain(`/blog/${SLUG}`);
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM post_public`).n).toBe(0);
});

test("미리 보기는 저장한 초안을 사이트 화면으로 그리고, 서명을 바꾸면 404 다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  const popup = page.waitForEvent("popup");
  await page.locator("#post-preview").click();
  const preview = await popup;
  await preview.waitForURL(/\/blog-preview\/\d+\?t=/);
  await expect(preview.locator(".post-preview-band")).toContainText("미리 보기");
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(TITLE);
  await expect(preview.locator("article strong")).toHaveText("25%");
  const url = new URL(preview.url());
  const robots = await preview.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
  await preview.close();

  const [exp, sig] = url.searchParams.get("t")!.split(".");
  const flipped = `${exp}.${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`;
  expect((await fetchPublic(`/blog-preview/${postId}?t=${flipped}`)).status).toBe(404);
  expect((await fetchPublic(`/blog-preview/${postId + 1}?t=${url.searchParams.get("t")}`)).status).toBe(404);
  expect((await fetchPublic(`/blog-preview/${postId}?t=${Number(exp) + 86400}.${sig}`)).status).toBe(404);
});

test("게시 전 검사가 빈 요약을 막고 그 칸으로 간다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  await page.locator("#post-description").fill("");
  await page.locator("#post-publish").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("게시할 수 없습니다");
  await expect(dialog).toContainText("요약을 적어 주세요");
  await expect(page.locator("#post-publish-confirm")).toHaveCount(0);
  await dialog.getByRole("listitem").filter({ hasText: "요약을 적어 주세요" }).getByRole("button", { name: "그 칸으로" }).click();
  await expect(page.locator("#post-description")).toBeFocused();
  await page.locator("#post-description").fill(DESCRIPTION);
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM post_public`).n).toBe(0);
});

test("세율 · 기한 글이라도 근거 자료가 없으면 막지 않고 경고만 한다", async ({ page }) => {
  /* 주인 결정 2026-11-18. 검토 기준일은 그대로 막는다. */
  await signIn(page);
  await openPost(page);
  await page.getByRole("button", { name: "1번째 근거 지우기" }).click();
  await page.locator("#post-publish").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("list", { name: "확인할 것" })).toContainText("세율 · 기한을 다루는 글인데 근거 자료가 없습니다");
  await expect(dialog.getByRole("list", { name: "고칠 곳" })).toHaveCount(0);
  await expect(page.locator("#post-publish-confirm")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#post-publish-confirm")).toBeHidden();
  await saveBar(page).getByRole("button", { name: "변경 취소" }).click();
  await expect(page.getByLabel("1번째 근거 이름")).toHaveValue("법인세법 제55조");
});

test("게시하면 블로그 · 글 쪽 · 홈 · 검색 · sitemap · llms.txt 에 나오고, 굵은 글씨 뒤 조사도 굵게 나온다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  await page.locator("#post-publish").click();
  /* 키워드가 없다는 경고는 확인하고 넘어간다. */
  await expect(page.getByRole("dialog")).toContainText("키워드가 없습니다");
  await page.locator("#post-publish-confirm").click();
  await expect(saveBar(page)).toContainText("게시했습니다", { timeout: 20000 });

  const article = await fetchPublic(`/blog/${SLUG}`);
  expect(article.status).toBe(200);
  expect(article.body).toContain("<strong>25%</strong>로 오릅니다.");
  expect(article.body).toMatch(/<a href="https:\/\/www\.law\.go\.kr\/[^"]*" rel="noopener noreferrer">법인세법<\/a>/);
  expect(article.body).toContain('<div class="table-scroll"><table>');
  expect(article.body).toContain("검토에 사용한 근거");
  expect(article.body).toContain("법인세법 제55조");
  expect(article.body).toContain('"@type":"BlogPosting"');

  /* JS 없이 받은 /blog 에도 글이 있다(정적 HTML 의 목록, blog-rendering.spec.ts 의 밀림 방지). */
  expect((await fetchPublic("/blog")).body).toContain(`href="/blog/${SLUG}"`);
  expect((await fetchPublic("/")).body).toContain(TITLE);
  expect((await fetchPublic("/sitemap.xml")).body).toContain(`/blog/${SLUG}`);
  expect((await fetchPublic("/llms.txt")).body).toContain(`/blog/${SLUG}`);
  const search = JSON.parse((await fetchPublic("/api/search")).body) as { href: string }[];
  expect(search.some((it) => it.href === `/blog/${SLUG}`)).toBe(true);

  await page.goto(`${ADMIN}/posts`);
  await expect(page.locator(".post-row").filter({ hasText: TITLE })).toContainText("게시됨");
});

test("게시한 글을 고쳐 초안만 저장하면 사이트는 그대로이고, 변경 게시하면 바뀐다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  await body(page).locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("초안에만 있는 문단입니다.");
  await saveDraft(page);
  expect((await fetchPublic(`/blog/${SLUG}`)).body).not.toContain("초안에만 있는 문단입니다.");
  await page.goto(`${ADMIN}/posts`);
  await expect(page.locator(".post-row").filter({ hasText: TITLE })).toContainText("고친 내용 미게시");

  await openPost(page);
  await publish(page);
  expect((await fetchPublic(`/blog/${SLUG}`)).body).toContain("초안에만 있는 문단입니다.");
});

test("두 탭에서 같은 글을 고치면 나중 저장은 덮어쓰지 않고 멈춘다", async ({ browser }) => {
  const open = async (b: Browser) => {
    const ctx = await b.newContext();
    const page = await ctx.newPage();
    await signIn(page);
    await openPost(page);
    return page;
  };
  const a = await open(browser);
  const b = await open(browser);
  await a.locator("#post-title").fill(`${TITLE} (A)`);
  await saveDraft(a);
  await b.locator("#post-title").fill(`${TITLE} (B)`);
  await b.keyboard.press("ControlOrMeta+s");
  await expect(b.getByRole("dialog")).toContainText("다른 곳에서 먼저 저장했습니다");
  expect(JSON.parse(query<{ draft: string }>(`SELECT draft FROM post WHERE id = ?`, postId).draft).title).toBe(`${TITLE} (A)`);
  /* 제목을 되돌려 둔다. */
  await a.locator("#post-title").fill(TITLE);
  await saveDraft(a);
  await a.context().close();
  await b.context().close();
});

test("사진은 WebP 로 다시 굽고 위치 정보를 지운다. SVG 는 받지 않는다", async ({ page }) => {
  const jpeg = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#4a7bd0" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "e2e", Make: "PhoneCo" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "37/1 33/1 0/1" } })
    .toBuffer();
  expect((await sharp(jpeg).metadata()).exif).toBeTruthy();

  await signIn(page);
  await openPost(page);
  await body(page).locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.getByTestId("md-image-input").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: jpeg });
  const alt = page.locator("#md-image-alt");
  await expect(alt).toBeVisible({ timeout: 15000 });
  await alt.fill("법인세율 구간표");
  await page.getByRole("button", { name: "설명 넣기" }).click();
  await expect(body(page).locator('img[alt="법인세율 구간표"]')).toBeVisible();

  const row = query<{ name: string; width: number; height: number; bytes: Buffer }>(`SELECT name, width, height, bytes FROM upload ORDER BY created_at DESC LIMIT 1`);
  imageName = row.name;
  expect(row.name).toMatch(/^[a-f0-9]{24}\.webp$/);
  const meta = await sharp(row.bytes).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.exif).toBeUndefined();
  expect([row.width, row.height]).toEqual([1200, 900]);

  await page.getByTestId("md-image-input").setInputFiles({
    name: "evil.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  });
  await expect(page.locator(".md-status")).toContainText("JPG · PNG · WebP 사진만");

  await publish(page);
  const article = await fetchPublic(`/blog/${SLUG}`);
  expect(article.body).toContain(`src="/uploads/${imageName}"`);
  expect(article.body).toMatch(new RegExp(`<img src="/uploads/${imageName}" alt="법인세율 구간표" width="1200" height="900"`));
  const image = await fetchPublic(`/uploads/${imageName}`);
  expect(image.status).toBe(200);
  expect(image.headers["content-type"]).toBe("image/webp");
  expect(image.headers["cache-control"]).toContain("immutable");
});

test("변경 기록에서 이전 초안으로 되돌리면 초안만 돌아가고 사이트는 그대로다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  await page.locator("#post-title").fill("잘못 고친 제목");
  await saveDraft(page);
  await page.goto(`${ADMIN}/history?type=post&post=${postId}`);
  const entry = page.locator("details.entry").filter({ hasText: "잘못 고친 제목" }).first();
  await entry.locator("summary").click();
  await entry.getByRole("button", { name: "이 저장 이전으로 되돌리기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("잘못 고친 제목");
  await dialog.getByRole("button", { name: "초안 되돌리기" }).click();
  await expect(page.getByText("되돌렸습니다")).toBeVisible();
  expect(JSON.parse(query<{ draft: string }>(`SELECT draft FROM post WHERE id = ?`, postId).draft).title).toBe(TITLE);
  expect((await fetchPublic(`/blog/${SLUG}`)).body).not.toContain("잘못 고친 제목");
});

test("화면을 거치지 않은 글 저장 요청도 로그인을 본다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  const sent = page.waitForRequest((r) => r.method() === "POST" && !!r.headers()["next-action"]);
  await page.locator("#post-author").fill("e2e 글쓴이");
  await page.keyboard.press("ControlOrMeta+s");
  const original = await sent;
  await expect(saveBar(page)).toContainText("초안을 저장했습니다");
  const events = () => query<{ n: number }>(`SELECT count(*) AS n FROM post_event`).n;
  const before = events();
  const args = JSON.parse(original.postData()!) as [number, { author: string }, number, string, unknown];
  args[1].author = "로그인 없이 보낸 글쓴이";
  args[2] = query<{ revision: number }>(`SELECT revision FROM post WHERE id = ?`, postId).revision;
  const ctx = await playwrightRequest.newContext();
  try {
    await ctx.post(`${ADMIN}/posts/${postId}`, {
      headers: { "next-action": original.headers()["next-action"], "content-type": original.headers()["content-type"], accept: "text/x-component", origin: ADMIN },
      data: JSON.stringify(args),
      maxRedirects: 0,
    });
  } finally {
    await ctx.dispose();
  }
  expect(events()).toBe(before);
  expect(JSON.parse(query<{ draft: string }>(`SELECT draft FROM post WHERE id = ?`, postId).draft).author).toBe("e2e 글쓴이");
});

test("내린 글은 404 가 되고, 휴지통에서 되살리거나 완전히 지울 수 있다. 지우면 사진도 사라진다", async ({ page }) => {
  await signIn(page);
  await openPost(page);
  await page.locator("#post-unpublish").click();
  await page.locator("#post-confirm-action").click();
  await expect(page.getByText("사이트에서 내렸습니다")).toBeVisible({ timeout: 20000 });
  expect((await fetchPublic(`/blog/${SLUG}`)).status).toBe(404);
  expect((await fetchPublic("/blog")).body).not.toContain(`/blog/${SLUG}`);
  const search = JSON.parse((await fetchPublic("/api/search")).body) as { href: string }[];
  expect(search.some((it) => it.href === `/blog/${SLUG}`)).toBe(false);

  await page.locator("#post-trash").click();
  await page.locator("#post-confirm-action").click();
  await expect(page).toHaveURL(`${ADMIN}/posts`);
  await page.getByRole("button", { name: /휴지통/ }).click();
  await page.locator(".post-row").filter({ hasText: TITLE }).click();
  await page.getByRole("button", { name: "되살리기" }).click();
  await expect(page.getByText("휴지통에서 되살렸습니다")).toBeVisible();

  await page.locator("#post-trash").click();
  await page.locator("#post-confirm-action").click();
  await expect(page).toHaveURL(`${ADMIN}/posts`);
  await page.goto(`${ADMIN}/posts/${postId}`);
  await page.getByRole("button", { name: "완전히 지우기" }).click();
  await page.locator("#post-confirm-action").click();
  await expect(page).toHaveURL(`${ADMIN}/posts`);
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM post WHERE id = ?`, postId).n).toBe(0);
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM post_event WHERE post_id = ? AND after_json <> 'null'`, postId).n).toBe(0);
  expect((await fetchPublic(`/uploads/${imageName}`)).status).toBe(404);

  /* 지운 글의 번호를 새 글이 다시 받지 않는다. 받으면 지운 글의 기록 · 미리 보기 주소가 새 글에 붙는다. */
  await page.locator("#post-new").click();
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  expect(Number(page.url().split("/").pop())).toBeGreaterThan(postId);
  expect(query<{ n: number }>(`SELECT count(*) AS n FROM post_event WHERE post_id = ? AND after_json = 'null'`, postId).n).toBe(1);
});
