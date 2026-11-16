import "server-only";
import { cache } from "react";
import { insightCategories } from "@/lib/constants";
import { getPublishedPost, getPublishedPosts, type PublishedPost } from "@/lib/content/read";
import { POST_CATEGORIES, POST_SLUG } from "@/lib/content/post-data";
import { seoulToday } from "@/lib/schedule";

/* 블로그 글. 2026-11-16 부터 글은 파일(content/posts/*.mdx)이 아니라 관리자 앱의 DB 에 있다
   (docs/plans/admin-backend/blog.md). 여기는 게시본(post_public)만 읽는다 — 초안은 사이트에 나올 길이 없다.
   함수 이름과 모양(PostMeta)은 파일 시절 그대로라, 쓰는 쪽(블로그 · 홈 · 서비스 · 검색 · sitemap · llms.txt ·
   메뉴)은 바뀌지 않았다. CONTENT_DB 가 없는 곳(CI · 로컬)에서는 글이 0편이다. */

/* 관리자가 고르는 갈래가 사이트의 거르기에 다 들어 있어야 한다. 빠지면 그 갈래의 글이 ?cat= 에서 사라진다. */
const matched = new Set(insightCategories.flatMap((c) => c.match));
const unmatched = POST_CATEGORIES.filter((c) => !matched.has(c));
if (unmatched.length) throw new Error(`insightCategories 에 없는 글 갈래: ${unmatched.join(", ")}`);

export interface PostSourceLink {
  label: string;
  url: string;
  kind?: string;
  note?: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  published: boolean;
  author?: string;
  updatedAt?: string;
  lastChecked?: string;
  effectiveFrom?: string;
  coverImage?: string;
  sourceLinks: PostSourceLink[];
  relatedSlugs: string[];
  keywords: string[];
  /* 이 글이 어느 서비스 이야기인가. 「업무경험」 갈래의 글에만 적는다 —
     서비스 상세 아래 「업무 경험」 칸이 이 값을 보고 제 사례만 고른다.
     값은 서비스 주소 뒷조각이다. 예) tax-bookkeeping */
  services: string[];
  /* 마지막으로 게시한 시각(ISO). 글 쪽 <article> 에 찍는다 — 관리자가 게시 · 다시 게시한 뒤 사이트가 새로 그렸는지
     이것으로 확인한다(admin/src/lib/publish.ts). */
  publishedAt?: string;
}

export interface PostData {
  meta: PostMeta;
  content: string;
}

const keywordStopwords = new Set([
  "합니다",
  "입니다",
  "그리고",
  "정리",
  "관점에서",
  "반드시",
  "확인",
  "하는",
  "해야",
  "자주",
  "어떤",
  "있나",
  "생기나",
  "이유",
]);

/* 키워드를 적지 않은 글은 갈래와 제목 낱말로 채운다. 관련 글 고르기와 검색에만 쓰인다. */
function defaultKeywords(title: string, category: string) {
  const terms = title.match(/[가-힣A-Za-z0-9]{2,}/g)?.filter((t) => !keywordStopwords.has(t)).slice(0, 4) ?? [];
  return [...new Set([category, ...terms].map((t) => t.trim()).filter(Boolean))].slice(0, 8);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const opt = (value: string) => value.trim() || undefined;
const seoulDate = (iso: string) => seoulToday(new Date(iso));

/* DB 의 글 한 편 → 사이트가 쓰는 모양. 발행일이 비어 있으면 게시한 날이다(관리자는 게시할 때 채운다). */
export function toPostMeta(data: PublishedPost["data"], publishedAt: string | null): PostMeta {
  const keywords = data.keywords.map((k) => k.trim()).filter(Boolean);
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    date: data.date || (publishedAt ? seoulDate(publishedAt) : seoulToday()),
    category: data.category || "기타",
    published: true,
    author: opt(data.author),
    updatedAt: opt(data.updatedAt),
    lastChecked: opt(data.lastChecked),
    effectiveFrom: opt(data.effectiveFrom),
    coverImage: opt(data.cover),
    sourceLinks: data.sources
      .filter((s) => s.label.trim() && isHttpUrl(s.url.trim()))
      .map((s) => ({ label: s.label.trim(), url: s.url.trim(), kind: opt(s.kind), note: opt(s.note) })),
    relatedSlugs: data.related,
    keywords: keywords.length ? keywords : defaultKeywords(data.title, data.category),
    services: data.services,
    publishedAt: publishedAt ?? undefined,
  };
}

function comparePostDates(a: PostMeta, b: PostMeta) {
  if (a.date === b.date) return a.slug.localeCompare(b.slug);
  return a.date > b.date ? -1 : 1;
}

/* 한 번 그리는 동안(요청 하나) 같은 목록을 여러 곳(메뉴 · 쪽 · 관련 글)이 읽는다. 요청마다 새로 읽는다 —
   모듈에 담아 두면 관리자가 게시한 글이 다시 그린 쪽에 안 나온다. */
export const getAllPosts = cache((): PostMeta[] =>
  getPublishedPosts()
    .map((p) => toPostMeta(p.data, p.publishedAt))
    .sort(comparePostDates)
);

export const getPostBySlug = cache((slug: string): PostData | null => {
  if (!POST_SLUG.test(slug)) return null;
  const post = getPublishedPost(slug);
  return post ? { meta: toPostMeta(post.data, post.publishedAt), content: post.data.body } : null;
});

export function getCategories(): string[] {
  const posts = getAllPosts();
  const categories = Array.from(new Set(posts.map((post) => post.category)));
  return ["전체", ...categories];
}

function getKeywordOverlap(currentPost: PostMeta, candidate: PostMeta) {
  const currentKeywords = new Set(currentPost.keywords);
  return candidate.keywords.reduce((count, keyword) => (currentKeywords.has(keyword) ? count + 1 : count), 0);
}

export function getRelatedPosts(currentPost: PostMeta, posts: PostMeta[] = getAllPosts(), limit = 3): PostMeta[] {
  const manualOrder = new Map(currentPost.relatedSlugs.map((slug, index) => [slug, index]));

  return posts
    .filter((post) => post.slug !== currentPost.slug && post.published)
    .map((post) => {
      const manualIndex = manualOrder.get(post.slug);
      const manualScore = manualIndex !== undefined ? 1000 - manualIndex * 10 : 0;
      const categoryScore = post.category === currentPost.category ? 100 : 0;
      const keywordScore = getKeywordOverlap(currentPost, post) * 10;
      return { post, score: manualScore + categoryScore + keywordScore };
    })
    .sort((a, b) => (a.score === b.score ? comparePostDates(a.post, b.post) : b.score - a.score))
    .slice(0, limit)
    .map(({ post }) => post);
}
