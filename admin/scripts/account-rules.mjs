/* 관리자 계정의 아이디와 비밀번호 규칙. 앱(admin/src/lib/auth.ts)과 계정 관리 스크립트(user.mjs)가 같이 읽는다.
   user.mjs 는 컨테이너 안에서 빌드 없이 node 로 바로 돌기 때문에, 그 옆에 빌드가 필요 없는 .mjs 로 둔다.
   아이디의 점은 가운데에만, 연달아 쓰지 않는다. 아이디로 만드는 자리 이메일(<아이디>@users.invalid)이
   이메일 검사를 통과해야 한다. */
export const USERNAME = { min: 3, max: 30, pattern: /^[a-z0-9_]+(\.[a-z0-9_]+)*$/ };
export const PASSWORD = { min: 12, max: 128 };

export const isValidUsername = (name) =>
  name.length >= USERNAME.min && name.length <= USERNAME.max && USERNAME.pattern.test(name);
export const isValidPassword = (password) => password.length >= PASSWORD.min && password.length <= PASSWORD.max;
