"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { POST_CATEGORIES } from "@/lib/content/post-data";
import { newPost } from "@admin/app/post-actions";
import { whenSaved } from "@admin/lib/format";
import { Icon } from "@admin/ui/icons";

export type PostListItem = {
  id: number;
  title: string;
  slug: string;
  category: string;
  keywords: string[];
  status: "draft" | "live" | "changed" | "trash";
  savedAt: string | null;
  savedBy: string | null;
  createdAt: string;
  publishedAt: string | null;
  reviewDays: number | null;
  empty: boolean;
};

type Filter = "all" | "live" | "draft" | "trash";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "live", label: "게시" },
  { key: "draft", label: "초안" },
  { key: "trash", label: "휴지통" },
];
const STATUS = {
  draft: { label: "초안", className: "st-draft" },
  live: { label: "게시됨", className: "st-live" },
  changed: { label: "게시됨 · 고친 내용 미게시", className: "st-changed" },
  trash: { label: "휴지통", className: "st-trash" },
} as const;

const matches = (item: PostListItem, filter: Filter) =>
  filter === "all" ? item.status !== "trash" : filter === "live" ? item.status === "live" || item.status === "changed" : item.status === filter;

/* 글 목록. 거르기는 상태 · 갈래 · 낱말(제목 · 주소 · 키워드). 「전체」에 휴지통은 넣지 않는다. */
export default function PostList({ items, reviewDays, today }: { items: PostListItem[]; reviewDays: number; today: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        matches(it, filter) &&
        (!category || it.category === category) &&
        (!q || [it.title, it.slug, ...it.keywords].some((t) => t.toLowerCase().includes(q)))
    );
  }, [items, filter, category, query]);
  const count = (f: Filter) => items.filter((it) => matches(it, f)).length;

  return (
    <section className="card" aria-labelledby="posts-h">
      <div className="card-head post-list-head">
        <div className="list-toolbar">
          <div className="left">
            <h2 id="posts-h">글 {count("all")}편</h2>
            <span className="sub">
              게시 {count("live")} · 초안 {count("draft")}
            </span>
          </div>
        </div>
        <form
          action={newPost}
          onSubmit={() => setCreating(true)}
        >
          <button type="submit" className={`btn btn-primary ${creating ? "is-loading" : ""}`} id="post-new" disabled={creating}>
            <Icon name="plus" />새 글
          </button>
        </form>
      </div>

      <div className="post-filters">
        <div className="seg" role="group" aria-label="상태로 거르기">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="seg-count">{count(f.key)}</span>
            </button>
          ))}
        </div>
        <select className="input post-cat" aria-label="갈래로 거르기" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">모든 갈래</option>
          {POST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="post-search">
          <Icon name="search" />
          <span className="sr-only">제목 · 주소 · 키워드로 찾기</span>
          <input className="input" type="search" placeholder="제목 · 주소 · 키워드" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {shown.length ? (
        <ul className="post-rows" aria-label="글">
          {shown.map((it) => {
            const st = STATUS[it.status];
            const due = it.reviewDays !== null && it.reviewDays > reviewDays;
            return (
              <li key={it.id}>
                <Link href={`/posts/${it.id}`} className="post-row">
                  <span className="post-row-main">
                    <span className="post-row-title">{it.title || (it.empty ? "제목 없음 · 빈 초안" : "제목 없음")}</span>
                    <span className="post-row-meta">
                      <span className={`st ${st.className}`}>{st.label}</span>
                      {it.category ? <span className="tag">{it.category}</span> : null}
                      {due ? <span className="st st-due">검토 {it.reviewDays}일 지남</span> : null}
                      <span className="muted">{it.slug ? `/blog/${it.slug}` : "주소 없음"}</span>
                    </span>
                  </span>
                  <span className="post-row-when">
                    {it.savedAt ? `${whenSaved(it.savedAt, today)} ${it.savedBy ?? ""} 저장` : `${whenSaved(it.createdAt, today)} 만듦`}
                  </span>
                  <Icon name="right" className="chev" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">
          <span className="empty-ic">
            <Icon name="post" />
          </span>
          <h3>{items.length ? "맞는 글이 없습니다" : "아직 글이 없습니다"}</h3>
          <p>{items.length ? "거르기를 바꾸거나 찾는 말을 지워 보세요." : "[새 글]을 눌러 첫 글을 써 보세요. 초안은 게시하기 전까지 사이트에 나오지 않습니다."}</p>
        </div>
      )}
    </section>
  );
}
