import Image from "next/image";
import Link from "next/link";
import CopyUrlButton from "@/components/blog/copy-url-button";
import PostBody from "@/components/blog/post-body";
import HeroVideo from "@/components/layout/hero-video";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import { getCategoryStyle } from "@/lib/category-colors";
import { siteConfig } from "@/lib/constants";
import { formatContentDate, getSourceKindLabel } from "@/lib/content-system";
import { readingMinutes } from "@/lib/content/post-data";
import type { PostData, PostMeta } from "@/lib/posts";

/* 글 한 편의 화면. 공개 글 쪽(/blog/[slug])과 관리자 미리 보기(/blog-preview/[id])가 같이 쓴다 —
   미리 보기가 실제 글과 다르게 보일 수 없게. 메타데이터 · JSON-LD 는 공개 쪽에만 있다. */
export default function PostView({ post, relatedPosts, preview = false }: { post: PostData; relatedPosts: PostMeta[]; preview?: boolean }) {
  const readingTime = readingMinutes(post.content);

  const articleMeta = [
    { label: "작성자", value: post.meta.author ?? siteConfig.founder },
    { label: "발행일", value: formatContentDate(post.meta.date) ?? post.meta.date },
    post.meta.updatedAt
      ? {
          label: "업데이트",
          value: formatContentDate(post.meta.updatedAt) ?? post.meta.updatedAt,
        }
      : null,
    post.meta.lastChecked
      ? {
          label: "검토 기준일",
          value:
            formatContentDate(post.meta.lastChecked) ?? post.meta.lastChecked,
        }
      : null,
    post.meta.effectiveFrom
      ? {
          label: "적용 시점",
          value:
            formatContentDate(post.meta.effectiveFrom) ??
            post.meta.effectiveFrom,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <>
      {preview ? (
        <div className="post-preview-band" role="status">
          <strong>미리 보기</strong> 관리자에 저장한 초안입니다. 이 주소는 1시간 뒤 닫히고, 검색엔진에 나오지 않습니다.
        </div>
      ) : null}
      <section className="page-hero relative overflow-hidden bg-deep text-white">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.3} />
        <div className="relative z-10 mx-auto max-w-3xl px-6">
          {/* 등장 순서는 다른 페이지 히어로와 같다. 0 → 0.1 → 0.3 → 0.4 */}
          <AnimateOnScroll variant="fadeIn">
          <nav className="mb-10 flex items-center gap-2 text-sm text-neutral-200">
            <Link href="/" className="transition-colors hover:text-white">
              HOME
            </Link>
            <span>/</span>
            <Link
              href="/blog"
              className="transition-colors hover:text-white"
            >
              BLOG
            </Link>
            <span>/</span>
            <span className="line-clamp-1 text-white">{post.meta.title}</span>
          </nav>
          </AnimateOnScroll>

          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span
                className="inline-block rounded-sm px-3 py-1 text-xs font-medium tracking-wider"
                style={getCategoryStyle(post.meta.category, true)}
              >
                {post.meta.category}
              </span>
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
              {post.meta.title}
            </h1>
          </AnimateOnScroll>

          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>

          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-neutral-200">
              <span>{formatContentDate(post.meta.date) ?? post.meta.date}</span>
              <span className="h-1 w-1 rounded-full bg-neutral-400" />
              <span>{readingTime}분 소요</span>
              {post.meta.updatedAt && (
                <>
                  <span className="h-1 w-1 rounded-full bg-neutral-400" />
                  <span>
                    업데이트{" "}
                    {formatContentDate(post.meta.updatedAt) ?? post.meta.updatedAt}
                  </span>
                </>
              )}
            </div>

            <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {articleMeta.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/30 bg-white/10 px-4 py-4"
                >
                  <dt className="t-label text-neutral-200">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </AnimateOnScroll>
        </div>
      </section>

      {post.meta.coverImage && (
        <section className="pt-12 md:pt-16">
          <div className="mx-auto max-w-3xl px-6">
            <Image
              src={post.meta.coverImage}
              alt={post.meta.title}
              width={1200}
              height={675}
              sizes="(min-width: 768px) 768px, calc(100vw - 48px)"
              className="w-full rounded-lg border border-border"
            />
          </div>
        </section>
      )}

      <section className="py-16 md:py-24">
        <article className="prose mx-auto max-w-3xl px-6" data-published-at={preview ? undefined : post.meta.publishedAt}>
          <PostBody source={post.content} />
        </article>
      </section>

      {post.meta.sourceLinks.length > 0 && (
        <section className="pb-12">
          <div className="mx-auto max-w-3xl px-6">
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="t-label">
                    SOURCES
                  </p>
                  <h2 className="t-h4 mt-2 text-foreground">
                    검토에 사용한 근거
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  공식 자료와 원문 링크를 함께 남깁니다.
                </p>
              </div>

              <ul className="mt-6 space-y-3">
                {post.meta.sourceLinks.map((source) => {
                  const kindLabel = getSourceKindLabel(source.kind);

                  return (
                    <li
                      key={`${source.label}-${source.url}`}
                      className="rounded-2xl border border-border bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent"
                        >
                          {source.label}
                        </a>
                        {kindLabel && (
                          <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium tracking-wider text-subtle">
                            {kindLabel}
                          </span>
                        )}
                      </div>
                      {source.note && (
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {source.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-border py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm font-medium tracking-wider text-muted transition-colors hover:text-foreground"
            >
              <span className="mr-2">&larr;</span>
              블로그 목록으로
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xs uppercase tracking-wider text-subtle">
                Share
              </span>
              <CopyUrlButton />
            </div>
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="bg-card py-20 md:py-24">
          <div className="mx-auto max-w-[1600px] px-6">
            <h3 className="t-h4 mb-10 text-center">
              관련 글
            </h3>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="group border border-border bg-white transition-all duration-300 hover:border-foreground hover-lift"
                >
                  <div className="p-8">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span
                        className="inline-block rounded-sm px-2.5 py-1 text-xs font-medium tracking-wider"
                        style={getCategoryStyle(relatedPost.category)}
                      >
                        {relatedPost.category}
                      </span>
                      <span className="text-xs text-subtle">
                        {relatedPost.date}
                      </span>
                    </div>
                    <h4 className="font-bold leading-snug decoration-1 underline-offset-4 group-hover:underline">
                      {relatedPost.title}
                    </h4>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {relatedPost.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-deep py-16 text-white md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="mb-6 leading-relaxed text-neutral-400">
            글 내용이 현재 상황에 바로 적용되는지 확인이 필요하면 상담으로 이어서 보겠습니다.
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center btn-blue rounded-[10px] px-8 py-4 text-sm font-medium tracking-wider transition-all duration-300"
          >
            문의하기
            <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
