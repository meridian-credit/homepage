/* 개발 서버(CONTENT_DB 가 있을 때)만: 서버가 뜨면 모든 쪽을 「다음 방문 때 DB 에서 다시 그리기」로 표시한다.
 *
 * 쪽은 빌드 때의 DB 사본으로 미리 그려져 있다. 그 뒤 관리자에서 저장해 다시 그린 쪽은 컨테이너 안에만 있고,
 * 「다시 그리기」 표시는 메모리에만 있다. 그래서 이런 때 옛 내용이 나온다.
 * - 배포가 실패해 앞 이미지로 되돌리거나, .env 를 바꾸고 컨테이너를 다시 만들 때(빌드 때 사본으로 돌아간다)
 * - 저장 뒤 아직 아무도 열지 않은 쪽(/about 등)이 있는 채로 서버가 다시 뜰 때(표시가 사라진다)
 * revalidatePath 는 요청 안에서만 부를 수 있어서, 뜬 뒤 자기 자신의 /api/revalidate 를 부른다.
 * 운영(CONTENT_DB · REVALIDATE_SECRET 없음)에서는 아무것도 하지 않는다. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const secret = process.env.REVALIDATE_SECRET;
  if (!process.env.CONTENT_DB || !secret) return;
  /* next start 는 PORT 를 읽는다. 포트를 -p 로 주면 여기서 알 수 없으니 PORT 로 준다. */
  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/revalidate`;
  /* 기다리지 않는다. register 가 끝나야 서버가 요청을 받기 시작한다. */
  void (async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
        if (res.ok) return;
        console.error(`[content] 시작 뒤 다시 그리기 요청이 ${res.status} 로 끝남`);
        return;
      } catch {
        /* 아직 듣기 전이다. 1초 뒤 다시. */
      }
    }
    console.error("[content] 시작 뒤 다시 그리기 요청이 서버에 닿지 못함");
  })();
}
