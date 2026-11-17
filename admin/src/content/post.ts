import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  CASE_CATEGORY,
  EMPTY_POST,
  POST_CATEGORIES,
  POST_SLUG,
  UPLOAD_SRC,
  normalizePost,
  type PostData,
  type PostSource,
} from "@/lib/content/post-data";
import { DIAGRAM_KINDS, parseDiagram } from "@/lib/diagram.mjs";
import type { Change } from "./types";

/* 블로그 글의 규칙 · 게시 전 검사 · 비교(docs/plans/admin-backend/blog.md §5). 편집 화면(브라우저)과 저장 액션(서버)이
   같은 것을 돌린다. 오류 문구는 「무엇을 넣으면 되는지」를 말한다. */

export type { PostData, PostSource };

export const POST_LIMITS = {
  slug: 80,
  title: 100,
  description: 300,
  author: 40,
  body: 200_000,
  keywords: 12,
  keyword: 30,
  sources: 20,
  sourceLabel: 120,
  sourceUrl: 500,
  sourceNote: 300,
  related: 6,
} as const;
/* 요약의 권장 길이. 검색 결과는 대략 이 안에서 잘린다. */
export const DESC_RANGE = [50, 160] as const;
/* 검토 기준일이 이보다 오래되면 경고한다(docs/content-system.md). */
export const REVIEW_DAYS = 120;

export type PostField =
  | "title"
  | "slug"
  | "category"
  | "description"
  | "author"
  | "date"
  | "updatedAt"
  | "lastChecked"
  | "effectiveFrom"
  | "keywords"
  | "sources"
  | "related"
  | "services"
  | "cover"
  | "body";
export type PostIssue = { field: PostField; message: string; index?: number };

export type PostContext = {
  today: string;
  /* 다른 글(휴지통 포함)이 쓰는 주소 → 그 글 제목. */
  taken: Record<string, string>;
  /* 이 글이 게시 중이면 그 주소. 게시 중에는 주소를 바꿀 수 없다. */
  liveSlug: string | null;
  /* 게시된 다른 글의 주소. */
  published: string[];
  /* 고를 수 있는 서비스(주소 뒷조각). */
  services: string[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v: string) => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
const isSafeHref = (value: string) => !value.startsWith("//") && (value.startsWith("/") || value.startsWith("#") || isHttpUrl(value));
const sourceFilled = (s: PostSource) => !!(s.label.trim() || s.url.trim() || s.note.trim());

export const DATE_FIELDS: { field: "date" | "updatedAt" | "lastChecked" | "effectiveFrom"; label: string }[] = [
  { field: "date", label: "발행일" },
  { field: "updatedAt", label: "업데이트" },
  { field: "lastChecked", label: "검토 기준일" },
  { field: "effectiveFrom", label: "적용 시점" },
];

/* 초안 저장도 막는 것: 꼴이 틀린 값. 빈 칸은 초안이니 괜찮다. */
export function draftIssues(post: PostData, ctx: PostContext): PostIssue[] {
  const out: PostIssue[] = [];
  const add = (field: PostField, message: string, index?: number) => out.push({ field, message, index });
  const slug = post.slug.trim();
  if (slug) {
    if (!POST_SLUG.test(slug)) add("slug", "주소는 영문 소문자 · 숫자 · 하이픈(-)만 씁니다. 예: vat-return-2027");
    else if (slug.length > POST_LIMITS.slug) add("slug", `주소는 ${POST_LIMITS.slug}자 안으로 적어 주세요.`);
    else if (ctx.taken[slug] !== undefined) add("slug", `「${ctx.taken[slug] || "제목 없음"}」 글이 이미 이 주소를 씁니다. 다른 주소를 적어 주세요.`);
  }
  if (ctx.liveSlug && slug !== ctx.liveSlug) add("slug", `게시 중인 글은 주소를 바꿀 수 없습니다(지금 주소: ${ctx.liveSlug}). 바꾸려면 먼저 내리세요.`);
  if (post.title.trim().length > POST_LIMITS.title) add("title", `제목은 ${POST_LIMITS.title}자 안으로 적어 주세요.`);
  if (post.description.trim().length > POST_LIMITS.description) add("description", `요약은 ${POST_LIMITS.description}자 안으로 적어 주세요.`);
  if (post.author.trim().length > POST_LIMITS.author) add("author", `글쓴이는 ${POST_LIMITS.author}자 안으로 적어 주세요.`);
  if (post.category && !(POST_CATEGORIES as readonly string[]).includes(post.category)) add("category", "목록에 있는 갈래를 골라 주세요.");
  for (const { field, label } of DATE_FIELDS) {
    const v = post[field].trim();
    if (v && !isDate(v)) add(field, `${label}은 2026-11-16 꼴로 적어 주세요.`);
  }
  if (post.keywords.length > POST_LIMITS.keywords) add("keywords", `키워드는 ${POST_LIMITS.keywords}개까지 둡니다.`);
  else if (post.keywords.some((k) => k.trim().length > POST_LIMITS.keyword)) add("keywords", `키워드 하나는 ${POST_LIMITS.keyword}자 안으로 적어 주세요.`);
  if (post.sources.length > POST_LIMITS.sources) add("sources", `근거 자료는 ${POST_LIMITS.sources}줄까지 둡니다.`);
  post.sources.forEach((s, i) => {
    const url = s.url.trim();
    if (url && (!isHttpUrl(url) || url.length > POST_LIMITS.sourceUrl))
      add("sources", `근거 자료 ${i + 1}번째 줄의 주소는 https:// 로 시작하는 웹 주소여야 합니다.`, i);
    else if (s.label.trim().length > POST_LIMITS.sourceLabel) add("sources", `근거 자료 ${i + 1}번째 줄의 이름은 ${POST_LIMITS.sourceLabel}자 안으로 적어 주세요.`, i);
    else if (s.note.trim().length > POST_LIMITS.sourceNote) add("sources", `근거 자료 ${i + 1}번째 줄의 메모는 ${POST_LIMITS.sourceNote}자 안으로 적어 주세요.`, i);
  });
  if (post.related.length > POST_LIMITS.related) add("related", `관련 글은 ${POST_LIMITS.related}편까지 고릅니다.`);
  if (slug && post.related.includes(slug)) add("related", "관련 글에 이 글 자신이 들어 있습니다.");
  const unknownService = post.services.find((s) => !ctx.services.includes(s));
  if (unknownService) add("services", `없는 서비스입니다: ${unknownService}`);
  if (post.cover && !UPLOAD_SRC.test(post.cover)) add("cover", "표지는 여기서 올린 사진만 쓸 수 있습니다. 다시 올려 주세요.");
  if (post.body.length > POST_LIMITS.body) add("body", `본문이 너무 깁니다(${POST_LIMITS.body.toLocaleString("ko-KR")}자까지).`);
  return out;
}

/* 본문을 사이트와 같은 해석(remark + GFM)으로 읽어 링크 · 사진 · 제목 1 · HTML 을 센다. */
type MdNode = { type: string; url?: string; alt?: string | null; depth?: number; value?: string; lang?: string | null; meta?: string | null; children?: MdNode[] };
const mdParser = unified().use(remarkParse).use(remarkGfm);
export function bodyFacts(body: string) {
  const facts = { badLinks: [] as string[], foreignImages: 0, images: [] as string[], noAlt: 0, h1: 0, html: 0, text: "", badDiagrams: [] as string[] };
  const walk = (node: MdNode) => {
    if (node.type === "link" && node.url !== undefined && !isSafeHref(node.url)) facts.badLinks.push(node.url);
    if (node.type === "image") {
      const name = UPLOAD_SRC.exec(node.url ?? "")?.[1];
      if (name) facts.images.push(name);
      else facts.foreignImages++;
      if (!node.alt?.trim()) facts.noAlt++;
    }
    if (node.type === "heading" && node.depth === 1) facts.h1++;
    if (node.type === "code" && node.lang && DIAGRAM_KINDS.includes(node.lang)) {
      const r = parseDiagram(node.lang, node.value ?? "", node.meta);
      if (!r.ok) facts.badDiagrams.push(`${node.lang}: ${r.error}`);
    }
    /* 편집기는 빈 문단을 <br /> 로 적는다. 사이트에서는 그냥 빈 줄이 없어질 뿐이라 알리지 않는다. */
    if (node.type === "html" && !/^<br\s*\/?>$/i.test((node.value ?? "").trim())) facts.html++;
    node.children?.forEach(walk);
  };
  walk(mdParser.parse(body) as MdNode);
  return facts;
}

export type PublishCheck = { errors: PostIssue[]; warnings: PostIssue[] };

/* 게시 전 검사. 오류는 게시를 막고, 경고는 확인하면 넘어간다. knownUploads: 서버가 아는 사진 이름(브라우저는 모른다). */
export function publishIssues(post: PostData, ctx: PostContext, knownUploads?: Set<string>): PublishCheck {
  const errors = draftIssues(post, ctx);
  const warnings: PostIssue[] = [];
  const err = (field: PostField, message: string, index?: number) => errors.push({ field, message, index });
  const warn = (field: PostField, message: string) => warnings.push({ field, message });

  if (!post.title.trim()) err("title", "제목을 적어 주세요.");
  if (!post.slug.trim()) err("slug", "주소를 정해 주세요. 사이트 주소 끝에 붙습니다(영문 소문자 · 숫자 · -).");
  if (!post.category) err("category", "갈래를 골라 주세요.");
  const desc = post.description.trim();
  if (!desc) err("description", "요약을 적어 주세요. 블로그 목록 카드와 검색 결과에 나옵니다.");
  if (!post.body.trim()) err("body", "본문이 비어 있습니다.");
  if (isDate(post.date) && post.date > ctx.today) err("date", "발행일이 오늘보다 뒤입니다. 예약 게시는 없으니 그날 게시해 주세요.");
  if (isDate(post.lastChecked) && post.lastChecked > ctx.today) err("lastChecked", "검토 기준일이 오늘보다 뒤입니다.");
  const sources = post.sources.filter(sourceFilled);
  post.sources.forEach((s, i) => {
    if (sourceFilled(s) && (!s.label.trim() || !s.url.trim())) err("sources", `근거 자료 ${i + 1}번째 줄에 이름과 주소를 모두 적어 주세요.`, i);
  });
  if (post.taxFacts) {
    if (!sources.length) err("sources", "세율 · 기한을 다루는 글은 근거 자료가 하나 이상 있어야 합니다. 법령을 먼저 적어 주세요.");
    if (!post.lastChecked.trim()) err("lastChecked", "세율 · 기한을 다루는 글은 검토 기준일이 있어야 합니다. 내용을 확인한 날을 적어 주세요.");
  } else if (!sources.length) warn("sources", "근거 자료가 없습니다. 세율 · 기한을 다루지 않는 글이면 그대로 게시해도 됩니다.");

  let facts: ReturnType<typeof bodyFacts> | null = null;
  try {
    facts = bodyFacts(post.body);
  } catch {
    err("body", "본문을 읽지 못했습니다. 마지막으로 붙여 넣은 부분을 확인해 주세요.");
  }
  if (facts) {
    if (facts.badLinks.length) err("body", `본문의 링크 주소가 웹 주소가 아닙니다: ${facts.badLinks.slice(0, 3).join(", ")}`);
    /* 틀린 도식은 사이트에 코드 그대로 나오고, 계산 도식은 검산이 틀린 경우다. 그대로 내보내지 않는다. */
    if (facts.badDiagrams.length) err("body", `그리지 못하는 도식이 있습니다. ${facts.badDiagrams.slice(0, 2).join(" / ")}`);
    if (facts.foreignImages) err("body", `본문에 여기서 올리지 않은 사진이 ${facts.foreignImages}장 있습니다. 사이트에 나오지 않으니 사진 넣기로 다시 올려 주세요.`);
    if (knownUploads) {
      const missing = facts.images.filter((n) => !knownUploads.has(n)).length;
      if (missing) err("body", `본문 사진 ${missing}장을 찾을 수 없습니다. 다시 올려 주세요.`);
    }
    if (facts.noAlt) warn("body", `사진 ${facts.noAlt}장에 설명이 없습니다. 화면 낭독기와 검색엔진이 읽는 글입니다(사진을 누르고 「사진 설명」).`);
    if (facts.h1) warn("body", "본문에 제목 1 이 있습니다. 글 제목과 겹치므로 사이트에서는 소제목으로 나옵니다.");
    if (facts.html) warn("body", "본문에 사이트에 나오지 않는 HTML 이 있습니다. 붙여 넣은 글이면 그 부분을 다시 확인해 주세요.");
  }
  if (knownUploads && post.cover) {
    const name = UPLOAD_SRC.exec(post.cover)?.[1];
    if (name && !knownUploads.has(name)) err("cover", "표지 사진을 찾을 수 없습니다. 다시 올려 주세요.");
  }

  if (desc && (desc.length < DESC_RANGE[0] || desc.length > DESC_RANGE[1]))
    warn("description", `요약이 ${desc.length}자입니다. ${DESC_RANGE[0]}~${DESC_RANGE[1]}자면 검색 결과에서 잘리지 않고 넉넉하게 보입니다.`);
  if (isDate(post.lastChecked) && daysBetween(post.lastChecked, ctx.today) > REVIEW_DAYS)
    warn("lastChecked", `검토 기준일이 ${daysBetween(post.lastChecked, ctx.today)}일 전입니다. 내용을 다시 확인했으면 [오늘 검토함]을 눌러 주세요.`);
  if (!post.keywords.some((k) => k.trim())) warn("keywords", "키워드가 없습니다. 비워 두면 갈래와 제목 낱말로 채웁니다.");
  if (post.category === CASE_CATEGORY && !post.services.length) warn("services", "업무경험 글인데 연결 서비스가 없습니다. 서비스 상세의 「업무 경험」 칸에 나오지 않습니다.");
  const unpublished = post.related.filter((s) => !ctx.published.includes(s));
  if (unpublished.length) warn("related", `관련 글 중 게시되지 않은 글은 건너뜁니다: ${unpublished.join(", ")}`);
  return { errors, warnings };
}

/* ── 비교 ── */

const FIELD_LABELS: [keyof PostData, string][] = [
  ["title", "제목"],
  ["slug", "주소"],
  ["category", "갈래"],
  ["author", "글쓴이"],
  ["date", "발행일"],
  ["updatedAt", "업데이트"],
  ["lastChecked", "검토 기준일"],
  ["effectiveFrom", "적용 시점"],
];
const shown = (v: string) => v.trim() || "(비어 있음)";
const blocks = (body: string) =>
  body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b && !/^<br\s*\/?>$/i.test(b));

/* 본문을 문단 단위로 비교한다(LCS). 붙어 있는 「지움 + 추가」는 「고침」으로 읽는다. */
function diffBody(before: string, after: string, limit = 8): Change[] {
  const a = blocks(before);
  const b = blocks(after);
  if (a.join("\n\n") === b.join("\n\n")) return [];
  /* 앞뒤의 같은 문단을 먼저 덜어 낸다. 긴 글의 한 곳만 고쳤을 때 표가 작아진다. */
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const x = a.slice(start, endA);
  const y = b.slice(start, endB);
  const dp = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: { op: "del" | "add"; text: string }[][] = [[]];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) {
      if (ops.at(-1)!.length) ops.push([]);
      i++;
      j++;
    } else if (j < y.length && (i === x.length || dp[i][j + 1] >= dp[i + 1][j])) ops.at(-1)!.push({ op: "add", text: y[j++] });
    else ops.at(-1)!.push({ op: "del", text: x[i++] });
  }
  const out: Change[] = [];
  for (const run of ops.filter((r) => r.length)) {
    const dels = run.filter((o) => o.op === "del");
    const adds = run.filter((o) => o.op === "add");
    const pairs = Math.min(dels.length, adds.length);
    for (let k = 0; k < pairs; k++) out.push({ op: "mod", text: "본문 문단", before: dels[k].text, after: adds[k].text, block: true });
    for (const d of dels.slice(pairs)) out.push({ op: "del", text: "본문 문단", detail: d.text });
    for (const ad of adds.slice(pairs)) out.push({ op: "add", text: "본문 문단", detail: ad.text });
  }
  if (out.length > limit) {
    const rest = out.length - limit + 1;
    return [...out.slice(0, limit - 1), { op: "mod", text: `본문 그 밖에 ${rest}곳` }];
  }
  return out;
}

function listDiff(label: string, before: string[], after: string[]): Change[] {
  const b = new Set(before);
  const a = new Set(after);
  return [
    ...after.filter((v) => !b.has(v)).map((v) => ({ op: "add" as const, text: `${label} 「${v}」` })),
    ...before.filter((v) => !a.has(v)).map((v) => ({ op: "del" as const, text: `${label} 「${v}」` })),
  ];
}

/* 두 작업본의 차이. 저장 막대의 「저장하지 않은 변경」, 충돌 창, 변경 기록이 모두 이것으로 그린다. */
export function describePost(beforeRaw: unknown, afterRaw: unknown) {
  const before = normalizePost(beforeRaw ?? EMPTY_POST);
  const after = normalizePost(afterRaw ?? EMPTY_POST);
  const fields: Change[] = FIELD_LABELS.filter(([k]) => (before[k] as string).trim() !== (after[k] as string).trim()).map(([k, label]) => ({
    op: "mod",
    text: label,
    before: shown(before[k] as string),
    after: shown(after[k] as string),
  }));
  const desc: Change[] =
    before.description.trim() !== after.description.trim()
      ? [{ op: "mod", text: "요약", before: shown(before.description), after: shown(after.description), block: true }]
      : [];
  const flag: Change[] =
    before.taxFacts !== after.taxFacts ? [{ op: "mod", text: "세율 · 기한 표시", before: before.taxFacts ? "켬" : "끔", after: after.taxFacts ? "켬" : "끔" }] : [];
  const cover: Change[] =
    before.cover !== after.cover ? [{ op: after.cover ? (before.cover ? "mod" : "add") : "del", text: "표지 사진" } as Change] : [];
  const sourceKey = (s: PostSource) => `${s.label.trim()} <${s.url.trim()}>${s.note.trim() ? ` — ${s.note.trim()}` : ""}${s.kind ? ` [${s.kind}]` : ""}`;
  const sources = listDiff("근거", before.sources.filter(sourceFilled).map(sourceKey), after.sources.filter(sourceFilled).map(sourceKey));
  const keywords = listDiff("키워드", before.keywords.map((k) => k.trim()).filter(Boolean), after.keywords.map((k) => k.trim()).filter(Boolean));
  const related = listDiff("관련 글", before.related, after.related);
  const services = listDiff("서비스", before.services, after.services);
  const body = diffBody(before.body, after.body);

  const changes = [...fields, ...desc, ...body, ...cover, ...flag, ...keywords, ...sources, ...related, ...services];
  const named = [
    ...fields.map((c) => c.text),
    desc.length && "요약",
    body.length && (body.length === 1 && body[0].text.startsWith("본문 그 밖에") ? "본문" : `본문 ${body.reduce((n, c) => n + (c.text.startsWith("본문 그 밖에") ? Number(/(\d+)곳/.exec(c.text)?.[1] ?? 1) : 1), 0)}곳`),
    cover.length && "표지",
    flag.length && "세율 · 기한 표시",
    keywords.length && "키워드",
    sources.length && "근거 자료",
    related.length && "관련 글",
    services.length && "서비스",
  ].filter(Boolean) as string[];
  const summary = named.length ? `${named.slice(0, 4).join(" · ")}${named.length > 4 ? ` 외 ${named.length - 4}` : ""} 고침` : "바뀐 것 없음";
  return { changes, summary };
}

/* 변경 기록에 담는 글 한 편의 사진. draft 가 null 이면 그때 글이 없었다(새 글 · 완전히 지움). */
export type PostSnapshot = { draft: PostData; live: boolean; trashed: boolean } | null;

export function describePostEvent(before: PostSnapshot, after: PostSnapshot) {
  const title = (after?.draft.title || before?.draft.title || "").trim() || "제목 없음";
  const status: Change[] = [];
  if (!after) status.push({ op: "del", text: "글을 완전히 지움" });
  else if (!before) status.push({ op: "add", text: "새 글" });
  else {
    if (!before.live && after.live) status.push({ op: "add", text: "사이트에 게시함" });
    if (before.live && !after.live) status.push({ op: "del", text: "사이트에서 내림" });
    if (!before.trashed && after.trashed) status.push({ op: "del", text: "휴지통으로 옮김" });
    if (before.trashed && !after.trashed) status.push({ op: "add", text: "휴지통에서 되살림" });
  }
  const content = before && after ? describePost(before.draft, after.draft) : { changes: [], summary: "" };
  const changes = [...status, ...content.changes];
  const headline = status.length
    ? status.map((s) => s.text).join(" · ") + (content.changes.length ? ` · ${content.summary}` : "")
    : before && after && after.live && content.changes.length
      ? `${content.summary} · 게시`
      : content.summary;
  return { title, changes, summary: `「${title}」 — ${headline || "바뀐 것 없음"}` };
}
