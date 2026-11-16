import { toSafeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostView from "@/components/blog/post-view";
import { getAbsoluteAssetUrl, getPostUrl } from "@/lib/content-system";
import { siteConfig } from "@/lib/constants";
import { readingMinutes } from "@/lib/content/post-data";
import { ogImage } from "@/lib/og";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

/* 빌드 때 DB 사본에 있는 게시 글을 미리 그린다. 빌드 뒤 게시한 글은 처음 방문 때 그려 담는다(dynamicParams 기본값).
   내린 글은 관리자가 다시 그리기를 부른 뒤 그 주소를 한 번 불러 404 로 바꿔 둔다(admin/src/lib/publish.ts). */
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

function toIsoDate(value?: string) {
  return value ? `${value}T00:00:00+09:00` : undefined;
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {};
  }

  const articleUrl = getPostUrl(post.meta.slug);
  const image = getAbsoluteAssetUrl(post.meta.coverImage);
  const modifiedTime = toIsoDate(
    post.meta.updatedAt ?? post.meta.lastChecked ?? post.meta.date
  );
  const publishedTime = toIsoDate(post.meta.date);

  return {
    title: post.meta.title,
    description: post.meta.description,
    authors: [{ name: post.meta.author ?? siteConfig.founder }],
    keywords: post.meta.keywords,
    alternates: {
      canonical: articleUrl,
    },
    /* 표지가 없는 글(거의 전부)도 공유 카드에 그림이 서도록 사이트 공통 그림으로 받친다.
       openGraph 를 통째로 갈아 끼우므로 사이트 이름 · 언어도 여기서 다시 적는다(src/lib/og.ts). */
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      locale: "ko_KR",
      url: articleUrl,
      title: post.meta.title,
      description: post.meta.description,
      publishedTime,
      modifiedTime,
      authors: [post.meta.author ?? siteConfig.founder],
      tags: post.meta.keywords,
      images: [image ? { url: image, alt: post.meta.title } : ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
      images: [image ?? ogImage.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const readingTime = readingMinutes(post.content);
  const articleWordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const relatedPosts = getRelatedPosts(post.meta, getAllPosts(), 3);
  const articleUrl = getPostUrl(post.meta.slug);
  const coverImageUrl = getAbsoluteAssetUrl(post.meta.coverImage);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    headline: post.meta.title,
    description: post.meta.description,
    datePublished: toIsoDate(post.meta.date),
    dateModified: toIsoDate(
      post.meta.updatedAt ?? post.meta.lastChecked ?? post.meta.date
    ),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    url: articleUrl,
    image: coverImageUrl ? [coverImageUrl] : undefined,
    author: {
      "@type": "Person",
      name: post.meta.author ?? siteConfig.founder,
      url: new URL("/about", siteConfig.url).toString(),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: new URL("/images/logo.png", siteConfig.url).toString(),
      },
    },
    articleSection: post.meta.category,
    wordCount: articleWordCount,
    timeRequired: `PT${readingTime}M`,
    about:
      post.meta.keywords.length > 0
        ? post.meta.keywords.map((keyword) => ({
            "@type": "Thing",
            name: keyword,
          }))
        : undefined,
    keywords:
      post.meta.keywords.length > 0 ? post.meta.keywords.join(", ") : undefined,
    citation:
      post.meta.sourceLinks.length > 0
        ? post.meta.sourceLinks.map((source) => source.url)
        : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Insights",
        item: new URL("/blog", siteConfig.url).toString(),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.meta.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(breadcrumbJsonLd) }}
      />

      <PostView post={post} relatedPosts={relatedPosts} />
    </>
  );
}
