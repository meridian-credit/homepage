import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getFaq, getSchedule } from "@/lib/content/read";

/* 관리자 앱(admin/)이 세무 일정 · FAQ 를 저장한 뒤 부른다. 모든 쪽에 「다음 방문 때 다시 만든다」고 표시한다.
   일정 큐브가 모든 쪽의 머리에 있어서 쪽 하나만 고르지 않고 layout 전체를 표시한다.
   REVALIDATE_SECRET 이 없는 곳(운영 · CI)에서는 없는 주소처럼 404 로 답한다. */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 404 });

  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  /* DB 를 먼저 한 번 읽어 본다. 못 읽으면 쪽을 다시 그리다 실패하고, Next 는 그때 앞의 쪽을 그대로 낸다.
     그러면 관리자에는 「반영했습니다」가 뜨는데 사이트는 옛 내용이다. 그래서 여기서 실패로 답한다. */
  try {
    getSchedule();
    getFaq();
  } catch (error) {
    console.error("[revalidate] 콘텐츠 DB 를 읽지 못함", error instanceof Error ? error.message : error);
    return Response.json({ error: "content_unreadable" }, { status: 500 });
  }

  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
