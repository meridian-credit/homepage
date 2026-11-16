import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/* 블로그 초안 미리 보기 주소의 서명(/blog-preview/<id>?t=<만료>.<서명>). 관리자가 만들고 공개 사이트가 확인한다.
 * - 관리자 세션은 다른 호스트(admin.…)에 있어 공개 사이트가 읽을 수 없다. 그래서 세션 대신 짧은 서명을 쓴다.
 * - 열쇠는 두 앱이 이미 가진 REVALIDATE_SECRET 에서 용도를 붙여 끌어낸다. 같은 값을 다시 그리기 요청과 섞어
 *   쓰지 않게(이 서명으로 다시 그리기를 부를 수 없고, 그 반대도 안 된다). 서버 설정을 늘리지 않는다.
 * - 한 시간이 지나면 닫힌다. 서명은 글 id 와 만료 시각에 묶여, 다른 글이나 더 긴 시간으로 바꿀 수 없다. */
export const PREVIEW_TTL_SECONDS = 60 * 60;

function key() {
  const secret = process.env.REVALIDATE_SECRET;
  return secret ? createHmac("sha256", secret).update("meridian:post-preview:v1").digest() : null;
}

const sign = (k: Buffer, id: number, exp: number) => createHmac("sha256", k).update(`${id}.${exp}`).digest("base64url");

export function signPreview(id: number, now = Date.now()) {
  const k = key();
  if (!k) return null;
  const exp = Math.floor(now / 1000) + PREVIEW_TTL_SECONDS;
  return `${exp}.${sign(k, id, exp)}`;
}

export function verifyPreview(id: number, token: unknown, now = Date.now()) {
  const k = key();
  if (!k || typeof token !== "string" || !Number.isSafeInteger(id) || id <= 0) return false;
  const m = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  const nowSec = Math.floor(now / 1000);
  /* 지난 것, 그리고 TTL 보다 먼 미래(시계가 어긋난 서명)를 받지 않는다. */
  if (exp < nowSec || exp > nowSec + PREVIEW_TTL_SECONDS + 60) return false;
  const given = Buffer.from(m[2]);
  const expected = Buffer.from(sign(k, id, exp));
  return given.length === expected.length && timingSafeEqual(given, expected);
}
