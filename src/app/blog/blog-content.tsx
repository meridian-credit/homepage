"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { insightCategories } from "@/lib/constants";
import { getCategoryStyle } from "@/lib/category-colors";
import { splitHeadline } from "@/lib/headline";
import type { PostMeta } from "@/lib/posts";

interface BlogContentProps {
  posts: PostMeta[];
  /* 주소의 쿼리 문자열(`cat=vat&page=2`). 서버가 미리 그릴 때는 비어 있다.
     URLSearchParams 를 그대로 넘기지 않는다 — 서버에서 클라이언트로 넘기는
     값은 평범한 값이어야 하고, 넘어오면서 .get() 같은 메서드가 사라진다. */
  query?: string;
}

/* 제목 마지막 글자만 브랜드색으로.
   레퍼런스가 마지막 글자를 주황으로 찍는데, 우리 브랜드색은 파랑이라 파랑을 쓴다.
   글자 하나에 색을 주면 줄 끝이 어디인지 눈이 먼저 잡는다. */
function TitleWithTail({ title }: { title: string }) {
  const head = title.slice(0, -1);
  const tail = title.slice(-1);
  return (
    <>
      {head}
      <span className="text-accent-bright">{tail}</span>
    </>
  );
}

/* 표지 이미지가 없는 글이 대부분이라(54개 중 51개) 카드가 비지 않게
   제목 앞 20글자로 카드뉴스를 만든다. 문구 자체가 표지다.
   어두운 판을 51장 깔면 화면이 무거워서, 밝은 바탕에 검은 글씨로 뒤집었다.
   카테고리색은 위쪽에 옅게 한 번만 번지게 두고 글자는 먹색으로 읽는다. */
function CardNews({ post }: { post: PostMeta }) {
  const tone = getCategoryStyle(post.category, false);
  const { head, tail } = splitHeadline(post.title);

  return (
    <div
      className="absolute inset-0 flex flex-col justify-center px-4 pb-16 pt-12"
      style={{
        background: `radial-gradient(130% 100% at 15% 0%, ${tone.backgroundColor} 0%, rgba(255,255,255,0) 62%), #FFFFFF`,
      }}
    >
      {/* 앞 20글자. 카드에서 제일 큰 글자라 여기서 다 읽힌다. */}
      <p
        className="text-[19px] font-bold leading-[1.35] tracking-[-0.03em] text-foreground sm:text-[22px]"
        style={{ wordBreak: "keep-all", textWrap: "balance" }}
      >
        {head}
      </p>
      {tail && (
        <p
          className="mt-3 line-clamp-3 border-t pt-3 text-xs leading-relaxed"
          style={{
            color: "rgba(0,0,0,0.5)",
            borderColor: "rgba(0,0,0,0.1)",
            wordBreak: "keep-all",
          }}
        >
          {tail}
        </p>
      )}
    </div>
  );
}


/* 한 판에 몇 장. 12 는 3열 × 4줄 · 4열 × 3줄에 다 맞아떨어진다. */
const PER_PAGE = 12;
/* 맨 위에서 돌려 보는 글 수. */
const LEAD_N = 5;

/* 주소를 읽는 쪽. useSearchParams 는 미리 그리는 정적 페이지에서 Suspense
   안에서만 쓸 수 있다. 그래서 주소 읽기는 여기 따로 두고, 화면은 아래
   BlogContent 하나가 그린다 — page.tsx 가 같은 BlogContent 를 쿼리 없이
   fallback 으로도 그려서 목록이 정적 HTML 에 그대로 실린다.
   (예전에는 fallback 이 null 이라 HTML 에 글이 한 편도 없었고, 수화 뒤
   목록이 들어오며 푸터를 밀어냈다 — CLS 0.6.) */
export function BlogContentFromUrl({ posts }: { posts: PostMeta[] }) {
  const params = useSearchParams();
  return <BlogContent posts={posts} query={params.toString()} />;
}

export default function BlogContent({ posts, query = "" }: BlogContentProps) {
  /* 고른 갈래를 화면 안에만 담아 두면 상단 메뉴의 「인사이트 → 법인세」가
     아무 일도 못 한다. 주소에 적어 두면 메뉴도 링크도 되고, 그 화면을
     그대로 남에게 보낼 수도 있다. */
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const active =
    insightCategories.find((c) => c.slug === params.get("cat")) ??
    insightCategories[0];

  /* 문답은 /faq 로 나갔다. 여기는 글만 본다 — 「블로그 안의 탭 하나」로
     두었더니 목록을 지나야 문답에 닿았고, 둘이 같은 것처럼 읽혔다. */
  const q = params.get('q') || '';
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
  const updateQuery = (patch: Record<string, string>, replace = false) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    const url = `/blog${next.size ? `?${next}` : ''}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  };
  /* 판 번호는 목록 맨 아래에 있다. 주소만 바꾸면 화면이 아래에 머물러 새 판의 첫 글들이 화면 위로
     지나가 있었다. 목록 머리가 화면 위로 올라가 있을 때만 그 자리로 올린다. */
  const listTop = useRef<HTMLElement>(null);
  const setPage = (value: number) => {
    updateQuery({ page: String(value) });
    const top = listTop.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
  };
  const setQ = (value: string) => updateQuery({ q: value, page: '' }, true);
  const [lead, setLead] = useState(0);

  /* 갈래가 바뀌면 맨 위 한 장과 몇 번째 판을 처음으로 되돌린다.
     상단 메뉴에서 「법인세」로 넘어올 때는 pick() 을 안 거치고 주소만
     바뀌므로, 여기서 주소를 보고 맞춘다. */
  const [lastCat, setLastCat] = useState(active.slug);
  if (lastCat !== active.slug) {
    setLastCat(active.slug);
    setLead(0);
  }

  const countOf = (match: string[]) =>
    match.length === 0
      ? posts.length
      : posts.filter((p) => match.includes(p.category)).length;

  /* 맨 위 한 장도 고른 갈래를 따라간다.
     예전에는 늘 전체 최신순이라, 메뉴에서 「법인세」를 눌러도 첫 화면은
     그대로였다. 바뀌는 건 한참 아래 목록뿐이어서 아무 일도 안 일어난
     것처럼 보였다. 찾는 말은 안 본다 — 글자를 칠 때마다 맨 위가 튄다. */
  const byCat = useMemo(
    () =>
      active.match.length === 0
        ? posts
        : posts.filter((p) => active.match.includes(p.category)),
    [posts, active],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return byCat;
    /* 제목 · 요약 · 열쇳말까지 본다. 제목만 보면 「가지급금」처럼 본문에만
       나오는 말로는 아무것도 안 걸린다. */
    return byCat.filter((p) =>
      [p.title, p.description, p.category, ...(p.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [byCat, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const leads = byCat.slice(0, LEAD_N);
  /* 다섯 장이 안 되는 갈래가 있다. 돌려보기 수를 실제 장수로 센다. */
  const leadN = leads.length;
  const heroPost = leads[Math.min(lead, Math.max(0, leadN - 1))];

  const pick = (slug: string) => {
    updateQuery({ cat: slug === "all" ? "" : slug, page: "" });
  };

  return (
    <section className="ins">
      <div className="ins-in">
        {/* ── 맨 위 한 장. 글이 왼쪽, 표지가 오른쪽. ── */}
        {/* 맨 위 한 장은 첫 화면 안이라 나타나는 연출을 걸지 않는다.
            걸면 정적 목록이 수화 때 새로 그려지면서 한 번 꺼졌다 켜진다. */}
        {heroPost && (
          <div className="ins-lead">
            <div className="ins-lead-text">
              {/* 위 묶음은 사진 윗변에, 아래 묶음은 사진 아랫변에 맞춘다.
                  가운데 정렬로 두면 제목이 사진 한복판에 떠서 두 칸이
                  따로 놀았다. */}
              <div className="ins-lead-top">
              <p className="ins-lead-tag">
                <span>인사이트</span>
                <i aria-hidden>|</i>
                <b style={{ color: getCategoryStyle(heroPost.category, false).color }}>
                  {heroPost.category}
                </b>
              </p>
              <h2 className="ins-lead-title">
                <Link href={`/blog/${heroPost.slug}`}>
                  <TitleWithTail title={heroPost.title} />
                </Link>
              </h2>
              </div>

              <div className="ins-lead-bot">
              <p className="ins-lead-excerpt">{heroPost.description}</p>

              {/* 최대 다섯 장을 돌려 본다. 자동으로 넘어가지 않는다 —
                  읽는 중에 바뀌면 방금 본 글을 다시 찾아야 한다.
                  한 장뿐인 갈래에서는 「1 / 1」과 못 쓰는 화살표만
                  남으니 아예 안 세운다. */}
              {leadN > 1 && (
              <div className="ins-step">
                <button
                  type="button"
                  onClick={() => setLead((v) => (v - 1 + leadN) % leadN)}
                  aria-label="이전 글"
                >
                  <Chevron dir="left" />
                </button>
                <span>
                  <b>{Math.min(lead, leadN - 1) + 1}</b> / {leadN}
                </span>
                <button
                  type="button"
                  onClick={() => setLead((v) => (v + 1) % leadN)}
                  aria-label="다음 글"
                >
                  <Chevron dir="right" />
                </button>
              </div>
              )}
              </div>
            </div>

            <Link href={`/blog/${heroPost.slug}`} className="ins-lead-thumb" aria-label={heroPost.title}>
              {heroPost.coverImage ? (
                <Image
                  src={heroPost.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 55vw"
                  className="object-cover object-top"
                />
              ) : (
                <CardNews post={heroPost} />
              )}
            </Link>
          </div>
        )}

        {/* ── 찾기 ── */}
        <div className="ins-bar">
          <div className="ins-tabs">
            <span className="is-on">인사이트</span>
          </div>

            <div className="ins-search">
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);

                }}
                placeholder="검색어를 입력하세요"
                aria-label="인사이트 검색"
              />
              <span className="ins-search-go" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="7.2" cy="7.2" r="4.4" />
                  <path d="m10.6 10.6 3 3" />
                </svg>
              </span>
            </div>
        </div>

        {(
          <>
            {/* id 는 지우지 않는다. 전역 [id] { scroll-margin-top } 이 있어야 위 setPage 의 스크롤이
                고정 헤더 밑에 멈춘다. */}
            <nav ref={listTop} id="blog-list" className="ins-cats" aria-label="갈래">
              {/* 글 없는 갈래는 칩도 뺀다(메뉴와 같다). 주소로 곧장 들어온 갈래는
                  비었어도 남겨 둔다 — 지금 어디에 있는지는 보여야 한다. */}
              {insightCategories.filter((c) => c.slug === active.slug || countOf(c.match) > 0).map((c, i) => (
                <span key={c.slug} className="contents">
                  {i > 0 && <i aria-hidden>|</i>}
                  <button
                    type="button"
                    onClick={() => pick(c.slug)}
                    aria-current={active.slug === c.slug ? "page" : undefined}
                  >
                    {c.label}
                    <em>{countOf(c.match)}</em>
                  </button>
                </span>
              ))}
            </nav>

            {shown.length > 0 && (
              <ul className="ins-grid">
                {shown.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="ins-card">
                      <span className="ins-thumb">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt=""
                            fill
                            sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover object-top"
                          />
                        ) : (
                          <CardNews post={post} />
                        )}
                      </span>
                      <span className="ins-body">
                        <span className="ins-meta">
                          <b style={{ color: getCategoryStyle(post.category, false).color }}>
                            {post.category}
                          </b>
                          <i aria-hidden>|</i>
                          <time dateTime={post.date}>{post.date}</time>
                        </span>
                        <h3 className="ins-title">
                          <TitleWithTail title={post.title} />
                        </h3>
                        <span className="ins-excerpt">{post.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {filtered.length === 0 && (
              <div className="ins-empty">
                {q.trim()
                  ? `「${q.trim()}」에 걸리는 글이 없습니다.`
                  : "이 갈래엔 아직 글이 없습니다."}
                <p className="mt-4"><Link href="/services" className="underline">서비스 살펴보기</Link> · <Link href="/contact" className="underline">문의하기</Link></p>
              </div>
            )}

            {pages > 1 && (
              <nav className="ins-pager" aria-label="페이지">
                <button
                  type="button"
                  onClick={() => setPage(cur - 1)}
                  disabled={cur === 1}
                  aria-label="이전 판"
                >
                  <Chevron dir="left" />
                </button>
                <span className="ins-pager-n">
                  {Array.from({ length: pages }, (_, i) => i + 1)
                    /* 판이 많으면 앞뒤 한 칸과 처음 · 끝만 세운다. 마흔 칸을
                       다 세우면 그 줄이 목록보다 길어진다. */
                    .filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 1)
                    .map((n, i, arr) => (
                      <span key={n} className="contents">
                        {i > 0 && arr[i - 1] !== n - 1 && <em aria-hidden>…</em>}
                        <button
                          type="button"
                          onClick={() => setPage(n)}
                          aria-current={n === cur ? "page" : undefined}
                        >
                          {n}
                        </button>
                      </span>
                    ))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(cur + 1)}
                  disabled={cur === pages}
                  aria-label="다음 판"
                >
                  <Chevron dir="right" />
                </button>
              </nav>
            )}
          </>
        )}

      </div>
    </section>
  );
}

/* 화살괄호 하나. 앞뒤 · 페이지 · 돌려보기가 전부 이걸 쓴다. */
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M10 3 5 8l5 5" /> : <path d="m6 3 5 5-5 5" />}
    </svg>
  );
}
