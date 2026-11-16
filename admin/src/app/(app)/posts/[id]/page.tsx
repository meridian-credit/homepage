import { notFound } from "next/navigation";
import { orderedServices, siteConfig } from "@/lib/constants";
import { listPosts, postContext } from "@admin/lib/posts";
import { requireAdmin } from "@admin/lib/session";
import { PageHeader } from "@admin/ui/page-header";
import PostEditor from "./post-editor";

export const metadata = { title: "글 편집" };

/* 블로그 글 한 편의 편집 화면(docs/plans/admin-backend/blog.md §7). */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: raw } = await params;
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
  const rows = listPosts();
  const row = rows.find((r) => r.id === id);
  if (!row) notFound();
  const site = process.env.PUBLIC_SITE_URL;
  const others = rows
    .filter((r) => r.id !== id && !r.trashedAt && (r.live?.slug || r.draft.slug))
    .map((r) => ({ slug: r.live?.slug ?? r.draft.slug, title: r.draft.title.trim() || "제목 없음", live: !!r.live }));
  return (
    <>
      <PageHeader
        eyebrow="블로그 글"
        title={row.draft.title.trim() || "새 글"}
        siteHref={row.live && site ? `${site}/blog/${row.live.slug}` : undefined}
        historyHref={`/history?type=post&post=${id}`}
      />
      <PostEditor
        key={id}
        id={id}
        data={row.draft}
        revision={row.revision}
        status={{
          live: row.live ? { slug: row.live.slug, publishedAt: row.live.publishedAt, publishedBy: row.live.publishedBy, dirty: row.live.dirty } : null,
          trashedAt: row.trashedAt,
          savedAt: row.savedAt,
          savedBy: row.savedBy,
        }}
        ctx={postContext(id, rows)}
        others={others}
        services={orderedServices.map((s) => ({ slug: s.slug, title: s.title }))}
        siteUrl={site}
        founder={siteConfig.founder}
      />
    </>
  );
}
