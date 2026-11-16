import { getUpload } from "@/lib/content/read";
import { UPLOAD_NAME } from "@/lib/content/post-data";

/* 관리자에서 올린 사진(블로그 본문 · 표지). DB 의 upload 표에서 읽는다(사진도 DB 에 있다 — 백업과 복원이 같이 맡는다).
   이름이 내용의 해시라 같은 이름의 내용은 바뀌지 않는다. 그래서 1년 · immutable 로 보낸다. */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const upload = UPLOAD_NAME.test(name) ? getUpload(name) : null;
  if (!upload) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(new Uint8Array(upload.bytes), {
    headers: {
      "content-type": "image/webp",
      "content-length": String(upload.bytes.length),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
