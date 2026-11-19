/* AGENTS.md 「Corrections become checks」 표의 규칙 중 빌드 없이 소스만 보고 판정할 수 있는 것을 검사한다.
   CI 가 lint 앞에서 돌린다. 실패하면 무엇을 어디서 고칠지 적고 1 로 끝난다. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
const errors = [];

/* 1. /contract 의 정확한 rewrite 가 와일드카드보다 먼저 와야 한다. 순서가 바뀌면 Vercel 이 끝에 슬래시를 붙여
      무한 리디렉트가 나는데, 로컬 next start 에서는 재현되지 않는다. */
const { default: nextConfig } = await import(new URL("../next.config.ts", import.meta.url));
const rewrites = await nextConfig.rewrites();
const list = Array.isArray(rewrites) ? rewrites : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? [])];
const exact = list.findIndex((r) => r.source === "/contract");
const wildcard = list.findIndex((r) => r.source.startsWith("/contract/:"));
if (exact === -1 || wildcard === -1 || exact > wildcard)
  errors.push('next.config.ts rewrites(): "/contract" 규칙을 "/contract/:path*" 보다 앞에 두세요.');

/* 2. 무대 장면의 CSS 미디어쿼리는 src/lib/use-scroll-progress.ts 의 STAGE_MEDIA 로 시작해야 한다.
      JS 는 STAGE_MEDIA 로 무대를 켜고 CSS 는 미디어쿼리로 레이아웃을 바꾸므로, 둘이 어긋나면 반쪽만 켜진다. */
const stageMedia = read("src/lib/use-scroll-progress.ts").match(/export const STAGE_MEDIA = "([^"]+)"/)?.[1];
if (!stageMedia) errors.push("src/lib/use-scroll-progress.ts 에서 STAGE_MEDIA 문자열을 찾지 못했습니다.");

const cssFiles = (dir) =>
  readdirSync(path.join(root, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".css"))
    .map((e) => path.relative(root, path.join(e.parentPath, e.name)).replaceAll("\\", "/"));

for (const file of cssFiles("src")) {
  const css = read(file);
  const lineOf = (index) => css.slice(0, index).split("\n").length;

  if (stageMedia) {
    for (const m of css.matchAll(/@media\s+([^{]+)\{/g)) {
      const query = m[1].trim();
      const isStage = /\(\s*width\s*>/.test(query) && query.includes("(scripting: enabled)");
      if (isStage && !query.startsWith(stageMedia))
        errors.push(`${file}:${lineOf(m.index)} 무대 미디어쿼리가 STAGE_MEDIA 와 다릅니다. 둘을 같이 바꾸세요.`);
    }
  }

  /* 3. Lightning CSS(Next 의 압축기)는 transform 과 같은 규칙에 있는 scale 속성을 지운다. scale 은 transform 안에 쓴다. */
  for (const m of css.matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
    if (/(^|[;\s])scale\s*:/.test(body) && /(^|[;\s])transform\s*:/.test(body))
      errors.push(`${file}:${lineOf(m.index)} scale 속성과 transform 이 한 규칙에 있습니다. scale() 을 transform 안에 쓰세요.`);
  }
}

/* 4. /pricing 과 /preview 는 자기 metadata 가 noindex 다. /preview 는 운영에서 404 라 e2e 가 볼 수 없어서 소스로 본다.
      사이트맵, 검색, robots 쪽은 tests/e2e/noindex-pages.spec.ts 가 본다. */
for (const page of ["src/app/pricing/page.tsx", "src/app/preview/page.tsx"])
  if (!/robots:\s*\{\s*index:\s*false/.test(read(page))) errors.push(`${page}: metadata 에 robots: { index: false } 가 있어야 합니다.`);

/* 5. 관리자 아이디, 비밀번호 규칙은 admin/scripts/account-rules.mjs 한 곳에 있다(앱과 user.mjs 가 같이 읽는다).
      아이디가 자리 이메일(<아이디>@users.invalid)이 되므로 점은 가운데에만 온다. */
const { isValidUsername, isValidPassword } = await import(new URL("../admin/scripts/account-rules.mjs", import.meta.url));
const usernameCases = { "ian.park": true, admin_01: true, ab: false, ".ian": false, "ian.": false, "ian..park": false, "Ian": false };
for (const [name, ok] of Object.entries(usernameCases))
  if (isValidUsername(name) !== ok) errors.push(`admin/scripts/account-rules.mjs: 아이디 "${name}" 판정이 ${ok} 가 아닙니다.`);
if (isValidPassword("x".repeat(11)) || !isValidPassword("x".repeat(12)) || isValidPassword("x".repeat(129)))
  errors.push("admin/scripts/account-rules.mjs: 비밀번호 길이 경계(12, 128)가 맞지 않습니다.");
for (const [file, needle] of [["admin/src/lib/auth.ts", "account-rules.mjs"], ["admin/scripts/user.mjs", "./account-rules.mjs"]])
  if (!read(file).includes(needle)) errors.push(`${file}: 아이디, 비밀번호 규칙을 admin/scripts/account-rules.mjs 에서 가져오세요.`);

if (errors.length) {
  console.error(`규칙 검사 실패 ${errors.length}건 (AGENTS.md 「Corrections become checks」)\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("규칙 검사 통과: /contract rewrite 순서, STAGE_MEDIA, scale/transform, noindex metadata, 관리자 계정 규칙");
