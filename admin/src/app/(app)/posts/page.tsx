import { seoulToday } from "@/lib/schedule";
import { REVIEW_DAYS } from "@admin/content/post";
import { contentType } from "@admin/content/registry";
import { listPosts } from "@admin/lib/posts";
import { requireAdmin } from "@admin/lib/session";
import { PageHeader } from "@admin/ui/page-header";
import PostList, { type PostListItem } from "./post-list";

export const metadata = { title: "블로그 글" };

const daysSince = (ymd: string, today: string) => Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${ymd}T00:00:00Z`)) / 86400000);

/* 블로그 글 목록(docs/plans/admin-backend/blog.md §7). 글은 수십 편이라 전부 보내고 거르기는 화면에서 한다. */
export default async function PostsPage() {
  await requireAdmin();
  const today = seoulToday();
  const type = contentType("post");
  const site = process.env.PUBLIC_SITE_URL;
  const items: PostListItem[] = listPosts().map((r) => ({
    id: r.id,
    title: r.draft.title.trim(),
    slug: r.live?.slug ?? r.draft.slug,
    category: r.draft.category,
    keywords: r.draft.keywords,
    status: r.trashedAt ? "trash" : r.live ? (r.live.dirty ? "changed" : "live") : "draft",
    savedAt: r.savedAt,
    savedBy: r.savedBy,
    createdAt: r.createdAt,
    publishedAt: r.live?.publishedAt ?? null,
    reviewDays: r.live && r.draft.lastChecked ? daysSince(r.draft.lastChecked, today) : null,
    empty: r.revision === 0,
  }));
  return (
    <>
      <PageHeader title={type.label} desc={type.appears} siteHref={site ? `${site}${type.sitePath}` : undefined} historyHref="/history?type=post" />
      <PostList items={items} reviewDays={REVIEW_DAYS} today={today} />
    </>
  );
}
