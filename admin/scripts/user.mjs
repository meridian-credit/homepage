/* 관리자 계정 관리. 관리자 앱에는 가입 화면이 없고, 계정은 이것으로만 만들고 지운다. 서버에서는 관리자 컨테이너 안에서 돈다.
     printf '%s' "$PW" | docker exec -i accounting_admin node admin/scripts/user.mjs add <아이디>
     printf '%s' "$PW" | docker exec -i accounting_admin node admin/scripts/user.mjs passwd <아이디>
     docker exec accounting_admin node admin/scripts/user.mjs remove <아이디>
     docker exec accounting_admin node admin/scripts/user.mjs list
   - 비밀번호는 표준 입력으로만 받는다. 명령줄 인자는 ps 와 셸 기록에 남는다.
   - 비밀번호를 바꾸거나 계정을 지우면 그 계정의 로그인 세션도 모두 지운다.
   - 규칙(아이디 3–30자 영문 · 숫자 · _ · ., 비밀번호 12–128자)은 admin/src/lib/auth.ts 와 같아야 한다.
   필요한 환경 변수: CONTENT_DB, BETTER_AUTH_SECRET (관리자 컨테이너에는 이미 있다). */
import fs from "node:fs";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { username as usernamePlugin } from "better-auth/plugins";

const [command, rawName] = process.argv.slice(2);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (!["add", "passwd", "remove", "list"].includes(command ?? "")) fail("쓰는 법: user.mjs add|passwd|remove <아이디> · user.mjs list");
if (!process.env.CONTENT_DB || !process.env.BETTER_AUTH_SECRET) fail("CONTENT_DB 와 BETTER_AUTH_SECRET 이 필요합니다.");

/* 앱과 같은 DB · 같은 표 구조(username 플러그인)를 쓰는 별도 인스턴스. HTTP 로 열리지 않으므로 여기서만 가입을 켠다. */
const auth = betterAuth({
  baseURL: process.env.ADMIN_URL ?? "http://localhost",
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Database(process.env.CONTENT_DB, { fileMustExist: true }),
  emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 12, maxPasswordLength: 128 },
  plugins: [usernamePlugin()],
});
const ctx = await auth.$context;

if (command === "list") {
  const users = await ctx.adapter.findMany({ model: "user", sortBy: { field: "createdAt", direction: "asc" } });
  for (const u of users) console.log(`${u.username ?? "(아이디 없음)"}\t만든 날 ${new Date(u.createdAt).toISOString().slice(0, 10)}`);
  if (!users.length) console.log("계정이 없습니다.");
  process.exit(0);
}

if (!rawName) fail("아이디를 적어 주세요.");
const name = rawName.toLowerCase();
/* 점은 가운데에만, 연달아 쓰지 않는다 — 아이디로 만드는 자리 이메일(<아이디>@users.invalid)이 이메일 검사를 통과해야 한다. */
if (name.length < 3 || name.length > 30 || !/^[a-z0-9_]+(\.[a-z0-9_]+)*$/.test(name))
  fail("아이디는 3–30자의 영문 · 숫자 · _ 로 적어 주세요(. 은 가운데에만).");
const findUser = () => ctx.adapter.findOne({ model: "user", where: [{ field: "username", value: name }] });

const readPassword = () => {
  if (process.stdin.isTTY) fail("비밀번호는 파이프로 넘겨 주세요: printf '%s' \"$PW\" | docker exec -i ...");
  const password = fs.readFileSync(0, "utf8").replace(/\r?\n$/, "");
  if (password.length < 12 || password.length > 128) fail("비밀번호는 12–128자여야 합니다.");
  return password;
};

if (command === "add") {
  if (await findUser()) fail(`이미 있는 아이디입니다: ${name}`);
  const password = readPassword();
  /* user 표가 이메일을 꼭 요구한다. 쓰지 않는 자리라 예약된 .invalid 주소를 넣는다. */
  try {
    await auth.api.signUpEmail({ body: { email: `${name}@users.invalid`, password, name, username: name } });
  } catch (error) {
    fail(`만들지 못했습니다: ${error?.body?.message ?? error?.message ?? error}`);
  }
  console.log(`만들었습니다: ${name}`);
} else if (command === "passwd") {
  const user = await findUser();
  if (!user) fail(`없는 아이디입니다: ${name}`);
  if (!(await ctx.internalAdapter.findCredentialAccount(user.id))) fail(`비밀번호로 로그인하는 계정이 아닙니다: ${name}`);
  const password = readPassword();
  await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(password));
  await ctx.internalAdapter.deleteUserSessions(user.id);
  console.log(`비밀번호를 바꾸고 로그인 세션을 모두 지웠습니다: ${name}`);
} else if (command === "remove") {
  const user = await findUser();
  if (!user) fail(`없는 아이디입니다: ${name}`);
  await ctx.internalAdapter.deleteUser(user.id);
  console.log(`지웠습니다(세션 포함): ${name}`);
}
