import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { siteConfig } from "@/lib/constants";

const postsDirectory = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "content",
  "posts"
);
const normalizedPostsDirectory = path.normalize(`${postsDirectory}${path.sep}`);
const postSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
     값은 서비스 주소 뒷조각이다. 예) services: [tax-bookkeeping] */
  services: string[];
}

export interface PostData {
  meta: PostMeta;
  content: string;
}

const defaultSourceLinksByCategory: Record<string, PostSourceLink[]> = {
  법인세: [
    {
      label: "법인세법",
      url: "https://www.law.go.kr/법령/법인세법",
      kind: "law",
      note: "법인세 과세표준, 세율, 손금·익금 판단의 기본 법령입니다.",
    },
  ],
  소득세: [
    {
      label: "소득세법",
      url: "https://www.law.go.kr/법령/소득세법",
      kind: "law",
      note: "종합소득세, 원천징수, 비과세·공제 판단의 기본 법령입니다.",
    },
  ],
  부가가치세: [
    {
      label: "부가가치세법",
      url: "https://www.law.go.kr/법령/부가가치세법",
      kind: "law",
      note: "부가가치세 과세, 신고, 매입세액 공제 판단의 기본 법령입니다.",
    },
  ],
  "원천세·4대보험": [
    {
      label: "소득세법",
      url: "https://www.law.go.kr/법령/소득세법",
      kind: "law",
      note: "근로소득, 원천징수, 지급명세서 판단의 기본 법령입니다.",
    },
    {
      label: "4대사회보험 정보연계센터",
      url: "https://www.4insure.or.kr/",
      kind: "guidance",
      note: "4대 보험 가입·신고 실무를 확인할 수 있는 공식 안내입니다.",
    },
  ],
  "상속·증여세": [
    {
      label: "상속세 및 증여세법",
      url: "https://www.law.go.kr/법령/상속세및증여세법",
      kind: "law",
      note: "상속세와 증여세 공제, 세율, 합산 과세 판단의 기본 법령입니다.",
    },
  ],
  세무일반: [
    {
      label: "국세기본법",
      url: "https://www.law.go.kr/법령/국세기본법",
      kind: "law",
      note: "신고·납부, 가산세, 납세자 권리 판단의 기본 법령입니다.",
    },
    {
      label: "국세청",
      url: "https://www.nts.go.kr/",
      kind: "guidance",
      note: "국세 신고와 납부 절차를 확인할 수 있는 공식 안내입니다.",
    },
  ],
  자문철학: [
    {
      label: "메리디안 택스 어드바이저리 소개",
      url: `${siteConfig.url}/about`,
      kind: "internal",
      note: "서비스 운영 철학과 업무 범위를 설명하는 내부 기준입니다.",
    },
  ],
};

const defaultKeywordsByCategory: Record<string, string[]> = {
  법인세: ["법인세", "세무조정", "중소기업"],
  소득세: ["소득세", "종합소득세", "세액공제"],
  부가가치세: ["부가가치세", "부가세 신고", "매입세액 공제"],
  "원천세·4대보험": ["원천세", "4대보험", "지급명세서"],
  "상속·증여세": ["상속세", "증여세", "상속공제"],
  세무일반: ["세무", "신고기한", "가산세"],
  자문철학: ["세무자문", "업무철학", "시스템"],
};

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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getDefaultSourceLinks(category: string) {
  return defaultSourceLinksByCategory[category] ?? [];
}

function getDefaultKeywords(slug: string, title: string, category: string) {
  const titleTerms =
    title
      .match(/[가-힣A-Za-z0-9]{2,}/g)
      ?.filter((term) => !keywordStopwords.has(term))
      .slice(0, 4) ?? [];

  return uniqueStrings([
    category,
    ...(defaultKeywordsByCategory[category] ?? []),
    ...titleTerms,
  ]).slice(0, 8);
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSafePostSlug(value: string) {
  return postSlugPattern.test(value);
}

function getPostPath(slug: string) {
  if (!isSafePostSlug(slug)) {
    return null;
  }

  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  return path.normalize(fullPath).startsWith(normalizedPostsDirectory)
    ? fullPath
    : null;
}

function toHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function toSourceLinks(value: unknown): PostSourceLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    const label = toOptionalString(candidate.label);
    const url = toOptionalString(candidate.url);
    const safeUrl = url ? toHttpUrl(url) : undefined;

    if (!label || !safeUrl) {
      return [];
    }

    return [
      {
        label,
        url: safeUrl,
        kind: toOptionalString(candidate.kind),
        note: toOptionalString(candidate.note),
      },
    ];
  });
}

function parsePostMeta(slug: string, data: Record<string, unknown>): PostMeta {
  const title = toOptionalString(data.title) ?? "";
  const category = toOptionalString(data.category) ?? "기타";
  const sourceLinks = toSourceLinks(data.sourceLinks);
  const keywords = toStringArray(data.keywords);

  return {
    slug,
    title,
    description: toOptionalString(data.description) ?? "",
    date: toOptionalString(data.date) ?? "",
    category,
    published: data.published !== false,
    author: toOptionalString(data.author),
    updatedAt: toOptionalString(data.updatedAt),
    lastChecked: toOptionalString(data.lastChecked),
    effectiveFrom: toOptionalString(data.effectiveFrom),
    coverImage: toOptionalString(data.coverImage),
    sourceLinks:
      sourceLinks.length > 0 ? sourceLinks : getDefaultSourceLinks(category),
    relatedSlugs: toStringArray(data.relatedSlugs),
    keywords: keywords.length > 0 ? keywords : getDefaultKeywords(slug, title, category),
    services: toStringArray(data.services),
  };
}

function comparePostDates(a: PostMeta, b: PostMeta) {
  if (a.date === b.date) {
    return a.slug.localeCompare(b.slug);
  }

  return a.date > b.date ? -1 : 1;
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(/*turbopackIgnore: true*/ postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(/*turbopackIgnore: true*/ postsDirectory);

  return fileNames
    .filter((name) => name.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const fullPath = getPostPath(slug);
      if (!fullPath) {
        return null;
      }
      const fileContents = fs.readFileSync(
        /*turbopackIgnore: true*/ fullPath,
        "utf8"
      );
      const { data } = matter(fileContents);

      return parsePostMeta(slug, data as Record<string, unknown>);
    })
    .filter((post): post is PostMeta => Boolean(post))
    .filter((post) => post.published)
    .sort(comparePostDates);
}

export function getPostBySlug(slug: string): PostData | null {
  const fullPath = getPostPath(slug);
  if (!fullPath) {
    return null;
  }

  if (!fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(
    /*turbopackIgnore: true*/ fullPath,
    "utf8"
  );
  const { data, content } = matter(fileContents);
  const meta = parsePostMeta(slug, data as Record<string, unknown>);

  if (!meta.published) {
    return null;
  }

  return {
    meta,
    content,
  };
}

export function getCategories(): string[] {
  const posts = getAllPosts();
  const categories = Array.from(new Set(posts.map((post) => post.category)));
  return ["전체", ...categories];
}

function getKeywordOverlap(currentPost: PostMeta, candidate: PostMeta) {
  const currentKeywords = new Set(currentPost.keywords);

  return candidate.keywords.reduce((count, keyword) => {
    return currentKeywords.has(keyword) ? count + 1 : count;
  }, 0);
}

export function getRelatedPosts(
  currentPost: PostMeta,
  posts: PostMeta[] = getAllPosts(),
  limit = 3
): PostMeta[] {
  const manualOrder = new Map(
    currentPost.relatedSlugs.map((slug, index) => [slug, index])
  );

  return posts
    .filter((post) => post.slug !== currentPost.slug && post.published)
    .map((post) => {
      const manualIndex = manualOrder.get(post.slug);
      const manualScore =
        manualIndex !== undefined ? 1000 - manualIndex * 10 : 0;
      const categoryScore = post.category === currentPost.category ? 100 : 0;
      const keywordScore = getKeywordOverlap(currentPost, post) * 10;

      return {
        post,
        score: manualScore + categoryScore + keywordScore,
      };
    })
    .sort((a, b) => {
      if (a.score === b.score) {
        return comparePostDates(a.post, b.post);
      }

      return b.score - a.score;
    })
    .slice(0, limit)
    .map(({ post }) => post);
}
