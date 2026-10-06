import "server-only";

/* 저장한 내용을 공개 사이트에 반영한다.
   1) 공개 사이트의 /api/revalidate 를 불러 모든 쪽을 「다음 방문 때 다시 만들기」로 표시한다.
   2) 일정 · FAQ 가 보이는 쪽을 한 번씩 불러 둔다. 표시만 하면 첫 방문자가 옛 쪽을 한 번 볼 수 있다.
   공개 사이트는 같은 서버의 컨테이너라 내부 주소(PUBLIC_SITE_INTERNAL_URL)로 부른다. */
const WARM_PATHS = ["/", "/faq", "/contact", "/portal"];

export async function publishToSite(): Promise<{ ok: true } | { ok: false; detail: string }> {
  const base = process.env.PUBLIC_SITE_INTERNAL_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return { ok: false, detail: "사이트 반영 설정(PUBLIC_SITE_INTERNAL_URL, REVALIDATE_SECRET)이 없습니다." };
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, detail: `공개 사이트가 ${res.status} 로 답했습니다.` };
  } catch (error) {
    return { ok: false, detail: `공개 사이트에 닿지 못했습니다(${error instanceof Error ? error.name : "오류"}).` };
  }
  for (const path of WARM_PATHS) {
    await fetch(`${base}${path}`, { signal: AbortSignal.timeout(15000) }).catch(() => undefined);
  }
  return { ok: true };
}
