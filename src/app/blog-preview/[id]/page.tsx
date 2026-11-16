import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostView from "@/components/blog/post-view";
import { getPostDraft } from "@/lib/content/read";
import { verifyPreview } from "@/lib/content/preview-token";
import { getAllPosts, getRelatedPosts, toPostMeta } from "@/lib/posts";

/* 관리자 「미리 보기」. 관리자에 저장한 초안을 공개 글 쪽과 같은 화면(PostView)으로 그린다.
   서명된 주소로만 열린다(src/lib/content/preview-token.ts). 틀리거나 지난 주소는 없는 주소처럼 404 다.
   매번 새로 그린다. 검색엔진에는 나오지 않는다(아래 robots, robots.ts, sitemap 에 없음). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미리 보기",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function PostPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { id: raw } = await params;
  const { t } = await searchParams;
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  if (!verifyPreview(id, t)) notFound();
  const draft = getPostDraft(id);
  if (!draft) notFound();
  const meta = toPostMeta(draft.data, draft.publishedAt);
  return (
    <PostView
      post={{ meta: { ...meta, title: meta.title || "제목 없음" }, content: draft.data.body }}
      relatedPosts={getRelatedPosts(meta, getAllPosts(), 3)}
      preview
    />
  );
}
