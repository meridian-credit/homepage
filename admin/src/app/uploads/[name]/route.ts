import { UPLOAD_NAME } from "@/lib/content/post-data";
import { readUpload } from "@admin/lib/posts";
import { adminOrNull } from "@admin/lib/session";

/* 편집기 · 표지 칸이 보여 줄 사진. 본문에는 /uploads/<이름> 으로 적히고, 관리자 화면에서는 이 주소가 관리자 앱으로
   온다. 공개 사이트에서 가져오지 않는다 — 관리자 CSP(img-src 'self')와 공개 사이트의 Cross-Origin-Resource-Policy 가
   둘 다 막는다. 로그인한 사람에게만 보낸다. */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await adminOrNull())) return new Response(null, { status: 404 });
  const { name } = await params;
  const upload = UPLOAD_NAME.test(name) ? readUpload(name) : null;
  if (!upload) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(upload.bytes), {
    headers: { "content-type": "image/webp", "cache-control": "private, max-age=86400, immutable" },
  });
}
