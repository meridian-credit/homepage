/* 공개 사이트를 사용자처럼 구동해 증거를 남기는 도구. 쓰는 법은 같은 폴더 SKILL.md.
     node .claude/skills/verify-meridian/verify.mjs start            빌드된 사이트를 :3100 에 띄운다(먼저 npm run build)
     node .claude/skills/verify-meridian/verify.mjs doctor           이 서버를 구동해도 되는지 읽기만 하고 판정
     node .claude/skills/verify-meridian/verify.mjs contact <label>  /contact 문의 흐름을 실제 경로로 구동, 증거 저장
     node .claude/skills/verify-meridian/verify.mjs search <label>   머리말 검색 열기, 결과, 숨김 페이지, 키보드 이동
     node .claude/skills/verify-meridian/verify.mjs schedule <label> 머리말 일정 큐브와 일정이 다 지난 뒤의 포털 팝업
     node .claude/skills/verify-meridian/verify.mjs blog <label>     블로그 목록(JS 유무 같음)과 첫 글 (CONTENT_DB 빌드 필요)
     node .claude/skills/verify-meridian/verify.mjs stop             start 가 띄운 서버만 끈다 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const STATE = path.join(ROOT, "temp/verify");
const PIDFILE = path.join(STATE, "server.pid");
const [cmd, label = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")] = process.argv.slice(2);

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const ourPid = () => (existsSync(PIDFILE) ? Number(readFileSync(PIDFILE, "utf8")) : null);
const answers = async () => {
  try {
    return (await fetch(`${BASE}/`, { redirect: "manual" })).status;
  } catch {
    return null;
  }
};

const newestSource = (dir) => {
  let newest = 0;
  for (const e of readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true }))
    if (e.isFile()) newest = Math.max(newest, statSync(path.join(e.parentPath, e.name)).mtimeMs);
  return newest;
};

async function doctor() {
  const problems = [];
  const buildId = path.join(ROOT, ".next/BUILD_ID");
  if (!existsSync(buildId)) problems.push("빌드가 없다. npm run build 를 먼저 돌린다.");
  else if (newestSource("src") > statSync(buildId).mtimeMs) problems.push("src 가 빌드보다 새롭다. npm run build 를 다시 돌린다.");
  if (process.env.CONTACT_FROM_EMAIL) problems.push("CONTACT_FROM_EMAIL 이 셸에 있다. 이 상태로 문의를 보내면 실제 메일이 나간다.");
  const pid = ourPid();
  const status = await answers();
  if (status === null) problems.push(`:${PORT} 이 응답하지 않는다. start 를 돌린다.`);
  else if (!pid || !alive(pid)) problems.push(`:${PORT} 의 서버는 이 도구가 띄운 것이 아니다. 남의 서버를 구동하지 않는다.`);
  else if (status !== 200) problems.push(`/ 가 ${status} 로 답한다.`);
  if (problems.length) {
    console.error(`doctor: 구동하지 않는다\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`doctor: 정상 (pid ${pid}, ${BASE}, 빌드 ${readFileSync(buildId, "utf8").trim()})`);
}

async function start() {
  if (await answers()) {
    console.error(`:${PORT} 에 이미 서버가 있다. 이 도구가 띄운 것이면 stop 을 먼저 돌린다.`);
    process.exit(1);
  }
  if (!existsSync(path.join(ROOT, ".next/BUILD_ID"))) {
    console.error("빌드가 없다. npm run build 를 먼저 돌린다.");
    process.exit(1);
  }
  mkdirSync(STATE, { recursive: true });
  const log = openSync(path.join(STATE, "server.log"), "w");
  /* 운영 빌드(next start)는 localhost Origin 을 막는다. 이 서버에서만 :3100 을 허용한다.
     CONTACT_FROM_EMAIL 은 지워서 문의가 메일로 나가지 않게 한다. */
  const env = { ...process.env, CONTACT_ALLOWED_ORIGINS: BASE, CONTACT_FROM_EMAIL: "" };
  const child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "--port", String(PORT)], {
    cwd: ROOT,
    env,
    detached: true,
    stdio: ["ignore", log, log],
  });
  writeFileSync(PIDFILE, String(child.pid));
  child.unref();
  for (let i = 0; i < 60; i++) {
    if ((await answers()) === 200) return console.log(`start: ${BASE} 준비됨 (pid ${child.pid}, 로그 temp/verify/server.log)`);
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error("start: 30초 안에 / 가 200 으로 답하지 않았다. temp/verify/server.log 를 본다.");
  process.exit(1);
}

function stop() {
  const pid = ourPid();
  if (!pid) return console.log("stop: 이 도구가 띄운 서버가 없다.");
  if (alive(pid)) {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-pid, "SIGTERM");
  }
  rmSync(PIDFILE);
  console.log(`stop: pid ${pid} 를 껐다. 증거(artifacts/verify/)는 남긴다.`);
}

/* 실제 /api/contact 를 거친다. 이 서버에는 보내는 주소가 없으므로 경로는 끝까지 돌되 메일은 나가지 않고 500 으로 답한다.
   증명하는 것: 폼 제출이 진짜 라우트에 닿는다(Origin, 속도 검사, 필수값 통과), 실패를 알리는 문구가 직접 연락처를 주고,
   쓰던 내용이 남는다. 성공 화면은 메일을 보내야 하므로 tests/e2e/contact-route.spec.ts(가짜 SES)가 맡는다. */
async function contact() {
  const { chromium } = await import("playwright");
  const out = path.join(ROOT, "artifacts/verify", label, "contact");
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  await page.goto(`${BASE}/contact`);
  await page.getByRole("button", { name: "문의 보내기" }).waitFor();
  await page.getByLabel("이름", { exact: false }).fill("검증 사용자");
  await page.getByLabel("이메일", { exact: false }).fill("verify@example.com");
  await page.getByLabel("현재 상황").fill("검증 도구가 보낸 문의입니다.");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, "1-filled.png") });
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/contact") && r.request().method() === "POST"),
    page.getByRole("button", { name: "문의 보내기" }).click(),
  ]);
  const alert = page.locator("form [role=alert]");
  await alert.waitFor();
  const result = {
    status: response.status(),
    alertText: (await alert.innerText()).trim(),
    messageKept: await page.getByLabel("현재 상황").inputValue(),
    consoleErrors,
  };
  await page.screenshot({ path: path.join(out, "2-after-submit.png") });
  await browser.close();
  writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
  const ok =
    result.status === 500 &&
    result.alertText.includes("메일 전송 설정이 완료되지 않았습니다") &&
    result.messageKept === "검증 도구가 보낸 문의입니다.";
  console.log(`${ok ? "contact: 통과" : "contact: 실패"} (${path.relative(ROOT, out)})\n${JSON.stringify(result, null, 2)}`);
  process.exit(ok ? 0 : 1);
}

/* 여정 공통: 브라우저를 열고, 끝나면 결과와 판정을 artifacts/verify/<label>/<이름>/result.json 에 남긴다. */
async function journey(name, run) {
  const { chromium } = await import("playwright");
  const out = path.join(ROOT, "artifacts/verify", label, name);
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let result;
  try {
    result = await run(context, out);
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
  console.log(`${result.ok ? `${name}: 통과` : `${name}: 실패`} (${path.relative(ROOT, out)})\n${JSON.stringify(result, null, 2)}`);
  process.exit(result.ok ? 0 : 1);
}

/* 머리말 검색. 검색창은 데스크톱과 모바일 메뉴에 하나씩 있어 이름만으로 찾으면 둘이 잡힌다. 데스크톱 것(.first())을 쓴다. */
const search = () =>
  journey("search", async (context, out) => {
    const page = await context.newPage();
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: "검색 열기" }).click();
    const expanded = await page.getByRole("button", { name: "검색 닫기" }).first().getAttribute("aria-expanded");
    const box = page.getByRole("combobox", { name: "사이트 검색" }).first();
    await box.fill("기장");
    const options = page.getByRole("listbox", { name: "검색 결과" }).first().getByRole("option");
    await options.first().waitFor();
    const firstHref = await options.first().getAttribute("href");
    const count = await options.count();
    await page.screenshot({ path: path.join(out, "1-results.png") });
    await box.fill("수임료");
    await page.waitForTimeout(300);
    const pricingHits = await page.locator('[role=option][href="/pricing"]').count();
    await box.fill("기장");
    await options.first().waitFor();
    await box.press("ArrowDown");
    await box.press("Enter");
    await page.waitForURL((url) => url.pathname !== "/");
    const landed = new URL(page.url()).pathname;
    await page.screenshot({ path: path.join(out, "2-landed.png") });
    return { expanded, count, firstHref, pricingHits, landed, ok: expanded === "true" && count > 0 && firstHref?.startsWith("/services/") && pricingHits === 0 && landed.startsWith("/services/") };
  });

/* 머리말 세무 일정. 시계를 고정해야 결과가 날마다 바뀌지 않는다. 일정 배열은 코드에서 읽는다(CONTENT_DB 없는 빌드). */
const schedule = () =>
  journey("schedule", async (context, out) => {
    const { scheduleDates, ntsThisMonthUrl, seoulToday } = await import(pathToFileURL(path.join(ROOT, "src/lib/schedule.ts")).href);
    const first = await context.newPage();
    await first.clock.setFixedTime(new Date(`${scheduleDates[0].when}T09:00:00+09:00`));
    await first.goto(`${BASE}/`);
    const cubeText = (await first.locator(".site-header .sched-cube li").first().innerText()).replace(/\s+/g, " ");
    await first.screenshot({ path: path.join(out, "1-first-date.png") });
    const after = new Date(`${scheduleDates.at(-1).when}T00:00:00+09:00`);
    after.setDate(after.getDate() + 1);
    const expectedHref = ntsThisMonthUrl(seoulToday(after));
    const portal = await context.newPage();
    await portal.clock.setFixedTime(after);
    await portal.goto(`${BASE}/portal`);
    await portal.locator("#schedOpen").click();
    const popupLink = portal.getByRole("dialog").getByRole("link", { name: "이번 달 세무일정 · 국세청" });
    await popupLink.waitFor();
    const popupHref = await popupLink.getAttribute("href");
    await portal.screenshot({ path: path.join(out, "2-runout-popup.png") });
    return { cubeText, expectedFirst: scheduleDates[0].what, popupHref, expectedHref, ok: cubeText.includes(scheduleDates[0].what) && popupHref === expectedHref };
  });

/* 블로그. 글은 CONTENT_DB 로 빌드해야 생긴다(SKILL.md Launch). 글이 없는 빌드면 "전제 없음"으로 실패한다. 통과로 적지 않는다. */
const blog = () =>
  journey("blog", async (context, out) => {
    const slugs = (page) =>
      page.$$eval('a[href^="/blog/"]', (links) => [...new Set(links.map((a) => a.getAttribute("href")))].filter((h) => /^\/blog\/[a-z0-9-]+$/.test(h)).sort());
    const browser = context.browser();
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(`${BASE}/blog`);
    const withoutJs = await slugs(staticPage);
    await noJs.close();
    if (!withoutJs.length) return { ok: false, reason: "전제 없음: 공개 글이 없다. CONTENT_DB 로 다시 빌드한다." };
    const page = await context.newPage();
    await page.goto(`${BASE}/blog`);
    await page.waitForLoadState("networkidle");
    const withJs = await slugs(page);
    await page.screenshot({ path: path.join(out, "1-list.png") });
    await page.locator(`a[href="${withJs[0]}"]`).first().click();
    await page.waitForURL(`**${withJs[0]}`);
    const article = page.locator("article[data-published-at]");
    await article.waitFor();
    const publishedAt = await article.getAttribute("data-published-at");
    const title = (await page.getByRole("heading", { level: 1 }).first().innerText()).trim();
    await page.screenshot({ path: path.join(out, "2-post.png") });
    const sameList = JSON.stringify(withoutJs) === JSON.stringify(withJs);
    return { withoutJs, withJs, sameList, opened: withJs[0], publishedAt, title, ok: sameList && Boolean(publishedAt) && title.length > 0 };
  });

const commands = { start, doctor, stop, contact, search, schedule, blog };
if (!commands[cmd]) {
  console.error("쓰는 법: verify.mjs start | doctor | contact|search|schedule|blog [label] | stop");
  process.exit(2);
}
await commands[cmd]();
