import "server-only";
import { rememberPublish } from "./content";

/* 저장한 내용을 공개 사이트에 반영한다.
   1) 공개 사이트의 /api/revalidate 를 불러 모든 쪽을 「다음 방문 때 다시 만들기」로 표시한다.
   2) 바뀐 내용이 보이는 쪽을 한 번씩 불러 둔다. 첫 방문자가 다시 그리기를 기다리지 않게.
   3) 꼭 맞아야 하는 쪽은 확인한다(블로그: 게시한 글은 200 과 이번 게시 시각, 내린 글은 404).
      다시 그리기 표시를 하는 순간 누군가의 그리기가 진행 중이었으면, 그 그리기는 옛 DB 로 그렸는데도 새것으로
      담긴다. FAQ 라면 다음 저장 때 고쳐지지만, 내린 글이 그대로 떠 있는 것은 그냥 둘 수 없다. 틀리면 한 번 더
      표시하고 다시 본다. 그래도 틀리면 반영 실패로 기억한다.
   4) 결과를 기억한다. 실패하면 모든 관리자 화면 위에 띠가 뜨고, 다음에 성공하면 사라진다.
   공개 사이트는 같은 서버의 컨테이너라 내부 주소(PUBLIC_SITE_INTERNAL_URL)로 부른다. */
const WARM_PATHS = ["/", "/faq", "/contact", "/portal"];

type Published = { ok: true } | { ok: false; detail: string };
export type Expect = { path: string; status: 200 | 404; contains?: string; lacks?: string };

async function revalidate(base: string, secret: string): Promise<Published> {
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, detail: `공개 사이트가 ${res.status} 로 답했습니다.` };
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: `공개 사이트에 닿지 못했습니다(${error instanceof Error ? error.name : "오류"}).` };
  }
}

async function mismatch(base: string, expect: Expect[]) {
  for (const e of expect) {
    const res = await fetch(`${base}${e.path}`, { signal: AbortSignal.timeout(15000), cache: "no-store" }).catch(() => null);
    if (!res) return `${e.path} 를 열지 못했습니다.`;
    const body = await res.text().catch(() => "");
    if (res.status !== e.status) return `${e.path} 가 ${e.status} 가 아니라 ${res.status} 로 답했습니다.`;
    if (e.contains && !body.includes(e.contains)) return `${e.path} 에 아직 옛 내용이 나옵니다.`;
    if (e.lacks && body.includes(e.lacks)) return `${e.path} 에 아직 옛 내용이 나옵니다.`;
  }
  return null;
}

async function request(paths: string[], expect: Expect[]): Promise<Published> {
  const base = process.env.PUBLIC_SITE_INTERNAL_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return { ok: false, detail: "사이트 반영 설정(PUBLIC_SITE_INTERNAL_URL, REVALIDATE_SECRET)이 없습니다." };
  for (let attempt = 0; attempt < 2; attempt++) {
    const done = await revalidate(base, secret);
    if (!done.ok) return done;
    for (const path of paths) {
      await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000), cache: "no-store" }).catch(() => undefined);
    }
    const wrong = expect.length ? await mismatch(base, expect) : null;
    if (!wrong) return { ok: true };
    if (attempt === 1) return { ok: false, detail: wrong };
  }
  return { ok: true };
}

/* what: 실패했을 때 띠에 적을 이름(「자주 묻는 질문을」). 다시 반영할 때는 비워 앞의 이름을 그대로 둔다.
   paths: 데울 쪽(없으면 일정 · FAQ 쪽). expect: 반영 뒤 꼭 맞아야 하는 쪽. */
export async function publishToSite(what?: string, opts: { paths?: string[]; expect?: Expect[] } = {}): Promise<Published> {
  const result = await request(opts.paths ?? WARM_PATHS, opts.expect ?? []);
  rememberPublish(result, what);
  return result;
}
