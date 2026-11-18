/* 블로그 글 한 편의 모양. DB 에 JSON 으로 담는다(post.draft · post_public.data, schema.ts).
 * 관리자(브라우저 · 서버)와 공개 사이트가 같이 쓰므로 서버 전용 코드를 넣지 않는다.
 *
 * 글 정보를 하나 더할 때: 여기 PostData · EMPTY_POST · normalizePost 에 한 줄씩. 이전(MIGRATIONS)은 필요 없다.
 * 옛 글에는 그 키가 없으니 normalizePost 가 기본값으로 채운다. */

export type PostSource = { label: string; url: string; kind: string; note: string };

export type PostData = {
  /* 주소 뒷조각. 영문 소문자 · 숫자 · - 만. 새 글은 비어 있을 수 있다. */
  slug: string;
  title: string;
  /* 요약. 목록 카드 · 검색 결과 · 공유 카드에 나온다. */
  description: string;
  category: string;
  /* 비우면 대표 회계사 이름(siteConfig.founder). */
  author: string;
  /* 날짜는 모두 YYYY-MM-DD 또는 빈 문자열. date(발행일)가 비어 있으면 처음 게시한 날로 채운다. */
  date: string;
  updatedAt: string;
  lastChecked: string;
  effectiveFrom: string;
  keywords: string[];
  sources: PostSource[];
  /* 관련 글의 주소. 이 순서대로 먼저 선다. */
  related: string[];
  /* 연결 서비스(서비스 주소 뒷조각). 업무경험 글만 쓴다. */
  services: string[];
  /* 표지 사진. /uploads/<이름> 또는 빈 문자열. */
  cover: string;
  /* 세율 · 기한 · 기준금액 · 법 개정을 다루는 글. 켜져 있으면 검토 기준일이 있어야 게시되고, 근거 자료가 없으면
     더 분명한 경고가 나온다(근거 자료는 막지 않는다 — 주인 결정 2026-11-18). */
  taxFacts: boolean;
  /* 본문 GFM Markdown. */
  body: string;
};

export const EMPTY_POST: PostData = {
  slug: "",
  title: "",
  description: "",
  category: "",
  author: "",
  date: "",
  updatedAt: "",
  lastChecked: "",
  effectiveFrom: "",
  keywords: [],
  sources: [],
  related: [],
  services: [],
  cover: "",
  taxFacts: true,
  body: "",
};

/* 글이 고를 수 있는 갈래. 사이트의 블로그 거르기(src/lib/constants.ts insightCategories 의 match)와 같아야 한다 —
   목록에 없는 갈래의 글은 ?cat= 에서 조용히 사라진다. src/lib/posts.ts 가 뜰 때 둘을 맞춰 보고 다르면 멈춘다. */
export const POST_CATEGORIES = ["법인세", "부가가치세", "소득세", "세무일반", "원천세·4대보험", "상속·증여세", "기타", "업무경험"] as const;
export const CASE_CATEGORY = "업무경험";

export const SOURCE_KINDS = [
  { value: "law", label: "법령" },
  { value: "guidance", label: "행정안내" },
  { value: "news", label: "보도자료" },
  { value: "internal", label: "내부정리" },
  { value: "", label: "기타" },
] as const;

/* [갈래 기본 근거 넣기]가 넣는 줄. 예전에는 근거를 안 적은 글에 사이트가 이것을 몰래 붙였다. 쓰지 않은 근거를
   「검토에 사용한 근거」로 보이게 하므로, 이제는 글쓴이가 보고 넣는다(docs/plans/admin-backend/blog.md §3). */
export const CATEGORY_SOURCES: Record<string, PostSource[]> = {
  법인세: [{ label: "법인세법", url: "https://www.law.go.kr/법령/법인세법", kind: "law", note: "법인세 과세표준, 세율, 손금·익금 판단의 기본 법령입니다." }],
  소득세: [{ label: "소득세법", url: "https://www.law.go.kr/법령/소득세법", kind: "law", note: "종합소득세, 원천징수, 비과세·공제 판단의 기본 법령입니다." }],
  부가가치세: [{ label: "부가가치세법", url: "https://www.law.go.kr/법령/부가가치세법", kind: "law", note: "부가가치세 과세, 신고, 매입세액 공제 판단의 기본 법령입니다." }],
  "원천세·4대보험": [
    { label: "소득세법", url: "https://www.law.go.kr/법령/소득세법", kind: "law", note: "근로소득, 원천징수, 지급명세서 판단의 기본 법령입니다." },
    { label: "4대사회보험 정보연계센터", url: "https://www.4insure.or.kr/", kind: "guidance", note: "4대 보험 가입·신고 실무를 확인할 수 있는 공식 안내입니다." },
  ],
  "상속·증여세": [{ label: "상속세 및 증여세법", url: "https://www.law.go.kr/법령/상속세및증여세법", kind: "law", note: "상속세와 증여세 공제, 세율, 합산 과세 판단의 기본 법령입니다." }],
  세무일반: [
    { label: "국세기본법", url: "https://www.law.go.kr/법령/국세기본법", kind: "law", note: "신고·납부, 가산세, 납세자 권리 판단의 기본 법령입니다." },
    { label: "국세청", url: "https://www.nts.go.kr/", kind: "guidance", note: "국세 신고와 납부 절차를 확인할 수 있는 공식 안내입니다." },
  ],
};

export const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/* 올린 사진의 이름과 주소. 이름은 내용 sha256 앞 24자다(admin/src/lib/upload.ts). */
export const UPLOAD_NAME = /^[a-f0-9]{24}\.webp$/;
export const UPLOAD_SRC = /^\/uploads\/([a-f0-9]{24}\.webp)$/;
export const uploadName = (src: string) => UPLOAD_SRC.exec(src)?.[1] ?? null;

/* 본문 · 표지에 쓰인 올린 사진의 이름들. 공개 쪽이 가로 · 세로를 한 번에 읽고, 게시 전 검사가 있는지 본다. */
export function uploadsIn(post: Pick<PostData, "body" | "cover">) {
  const names = new Set<string>();
  const cover = uploadName(post.cover);
  if (cover) names.add(cover);
  for (const m of post.body.matchAll(/\/uploads\/([a-f0-9]{24}\.webp)/g)) names.add(m[1]);
  return [...names];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/* DB 의 JSON(또는 화면이 보낸 값)을 빠짐없는 PostData 로. 모르는 키는 버린다. */
export function normalizePost(raw: unknown): PostData {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sources = Array.isArray(o.sources)
    ? o.sources.map((s) => {
        const x = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
        return { label: str(x.label), url: str(x.url), kind: str(x.kind), note: str(x.note) };
      })
    : [];
  return {
    slug: str(o.slug),
    title: str(o.title),
    description: str(o.description),
    category: str(o.category),
    author: str(o.author),
    date: str(o.date),
    updatedAt: str(o.updatedAt),
    lastChecked: str(o.lastChecked),
    effectiveFrom: str(o.effectiveFrom),
    keywords: strs(o.keywords),
    sources,
    related: strs(o.related),
    services: strs(o.services),
    cover: str(o.cover),
    taxFacts: typeof o.taxFacts === "boolean" ? o.taxFacts : EMPTY_POST.taxFacts,
    body: str(o.body),
  };
}

/* 키 순서를 고정한 JSON. 작업본과 게시본을 문자열로 비교해 「고친 내용 미게시」를 안다. */
export function postJson(post: PostData) {
  const p = normalizePost(post);
  return JSON.stringify(p, Object.keys(EMPTY_POST).concat(["label", "url", "kind", "note"]));
}

/* 사이트와 같은 계산: 공백을 뺀 글자 400자에 1분. */
export function readingMinutes(body: string) {
  return Math.max(1, Math.ceil(body.replace(/\s/g, "").length / 400));
}
