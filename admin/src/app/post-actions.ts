"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizePost, uploadsIn, type PostData } from "@/lib/content/post-data";
import { markdownToHast } from "@/lib/content/markdown";
import { signPreview } from "@/lib/content/preview-token";
import { describePost, draftIssues, publishIssues, type PostIssue } from "@admin/content/post";
import { contentType } from "@admin/content/registry";
import type { Change, Published, SaveResult } from "@admin/content/types";
import { whenSaved } from "@admin/lib/format";
import { changePostState, countLaterPostSaves, createPost, getPostEvent, knownUploads, postContext, readPost, restorePostDraft, saveUpload, writePost } from "@admin/lib/posts";
import { publishToSite, type Expect } from "@admin/lib/publish";
import { adminOrNull } from "@admin/lib/session";
import { processImage } from "@admin/lib/upload";

/* 블로그 글 액션(docs/plans/admin-backend/blog.md §4). 화면을 거치지 않고도 POST 로 부를 수 있으므로, 매번 로그인과
   입력을 처음부터 다시 본다. 로그인이 끝났으면 로그인 화면으로 보내지 않고 「signed-out」으로 답한다. */

const SIGNED_OUT = { ok: false, reason: "signed-out" } as const;
const invalid = (message: string) => ({ ok: false, reason: "invalid", message }) as const;
const idSchema = z.number().int().positive().max(1e9);
const revisionSchema = z.number().int().nonnegative();
const str = (max: number) => z.string().max(max);
const postSchema = z.object({
  slug: str(200),
  title: str(500),
  description: str(2000),
  category: str(50),
  author: str(200),
  date: str(20),
  updatedAt: str(20),
  lastChecked: str(20),
  effectiveFrom: str(20),
  keywords: z.array(str(200)).max(50),
  sources: z.array(z.object({ label: str(500), url: str(2000), kind: str(20), note: str(2000) })).max(50),
  related: z.array(str(200)).max(20),
  services: z.array(str(100)).max(20),
  cover: str(200),
  taxFacts: z.boolean(),
  body: str(400_000),
});

const POST = contentType("post");
const issueText = (i: PostIssue) => i.message;

/* 게시한 글이 사이트에 나오는 곳. 다시 그리기는 사이트 전체에 걸리고, 여기는 먼저 데워 둘 쪽이다. */
const warmFor = (slug: string | null) => ["/", "/blog", ...(slug ? [`/blog/${slug}`] : []), "/api/search"];

/* [새 글]: 빈 초안을 만들고 그 편집 화면으로 간다. */
export async function newPost() {
  const user = await adminOrNull();
  if (!user) redirect("/login?next=/posts");
  const id = createPost(user.actor);
  redirect(`/posts/${id}`);
}

export type PostSaveResult = SaveResult<PostData>;

/* 초안 저장(draft) · 게시(publish). 게시는 오류가 없어야 하고, 경고는 화면이 확인을 받은 뒤 보낸다. */
export async function savePost(
  id: number,
  data: PostData,
  revision: number,
  mode: "draft" | "publish" = "draft",
  opts: { touchUpdated?: boolean } = {}
): Promise<PostSaveResult> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  if (!idSchema.safeParse(id).success || !revisionSchema.safeParse(revision).success || (mode !== "draft" && mode !== "publish"))
    return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const parsed = postSchema.safeParse(data);
  if (!parsed.success) return invalid("입력을 읽지 못했습니다. 새로고침해 주세요.");
  const post = normalizePost(parsed.data);
  const ctx = postContext(id);
  if (mode === "publish") {
    const { errors } = publishIssues({ ...post, date: post.date || ctx.today }, ctx, knownUploads(uploadsIn(post)));
    if (errors.length) return invalid(`게시하지 않았습니다 — ${issueText(errors[0])}`);
    try {
      /* 사이트와 같은 해석으로 한 번 그려 본다. 실패하면 게시하지 않는다. */
      markdownToHast(post.body);
    } catch {
      return invalid("게시하지 않았습니다 — 본문을 사이트 모양으로 그리지 못했습니다. 마지막으로 붙여 넣은 부분을 확인해 주세요.");
    }
  } else {
    const issues = draftIssues(post, ctx);
    if (issues.length) return invalid(issueText(issues[0]));
  }
  const result = writePost(user.actor, id, post, revision, mode, opts);
  if (!result.ok) {
    if (result.reason === "conflict") return { ok: false, reason: "conflict", latest: result.latest };
    if (result.reason === "missing") return invalid("이 글을 찾지 못했습니다. 다른 곳에서 휴지통에 넣었거나 지웠을 수 있습니다.");
    return invalid(result.message);
  }
  let published: Published = { ok: true };
  if (mode === "publish") {
    const slug = result.saved.slug;
    published = await publishToSite(POST.object, {
      paths: warmFor(slug),
      expect: [
        { path: `/blog/${slug}`, status: 200, contains: `data-published-at="${result.row.live!.publishedAt}"` },
        { path: "/blog", status: 200, contains: `href="/blog/${slug}"` },
      ],
    });
  }
  return { ok: true, revision: result.revision, saved: result.saved, warnings: [], published };
}

export type PostStateResult =
  | { ok: true; revision: number; published: Published | null }
  | { ok: false; reason: "signed-out" | "missing" }
  | { ok: false; reason: "conflict"; latest: { at: string; actor: string } | null }
  | { ok: false; reason: "invalid"; message: string };

/* 내리기 · 휴지통 · 되살리기 · 완전히 지우기. */
export async function changePost(id: number, revision: number, action: "unpublish" | "trash" | "untrash" | "delete"): Promise<PostStateResult> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  if (!idSchema.safeParse(id).success || !revisionSchema.safeParse(revision).success || !["unpublish", "trash", "untrash", "delete"].includes(action))
    return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const result = changePostState(user.actor, id, revision, action);
  if (!result.ok) {
    if (result.reason === "conflict") return { ok: false, reason: "conflict", latest: result.latest };
    if (result.reason === "missing") return { ok: false, reason: "missing" };
    return invalid(result.message);
  }
  let published: Published | null = null;
  if (action === "unpublish") {
    const slug = result.row.draft.slug;
    const expect: Expect[] = [
      { path: `/blog/${slug}`, status: 404 },
      { path: "/blog", status: 200, lacks: `href="/blog/${slug}"` },
    ];
    published = await publishToSite(POST.object, { paths: warmFor(slug), expect });
  }
  return { ok: true, revision: result.revision, published };
}

/* 미리 보기 주소. 저장한 초안을 공개 사이트가 그린다. 1시간 뒤 닫힌다. */
export async function previewLink(id: number): Promise<{ ok: true; url: string } | { ok: false; reason: "signed-out" | "missing" | "unset" }> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  if (!idSchema.safeParse(id).success || !readPost(id)) return { ok: false, reason: "missing" };
  const site = process.env.PUBLIC_SITE_URL;
  const token = signPreview(id);
  if (!site || !token) return { ok: false, reason: "unset" };
  return { ok: true, url: `${site}/blog-preview/${id}?t=${token}` };
}

/* 사진 올리기. 다시 구워 DB 에 넣고 주소를 돌려준다. 글에 넣는 것은 화면이 한다(저장해야 글에 남는다). */
export async function uploadImage(
  form: FormData
): Promise<{ ok: true; src: string; width: number; height: number } | { ok: false; reason: "signed-out" } | { ok: false; reason: "invalid"; message: string }> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return invalid("사진 파일을 골라 주세요.");
  const result = await processImage(Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return invalid(result.message);
  saveUpload(user.actor, { ...result, originalName: file.name });
  return { ok: true, src: `/uploads/${result.name}`, width: result.width, height: result.height };
}

/* ── 변경 기록에서 되돌리기 ── */

export type PostRestorePreview =
  | { ok: true; at: string; title: string; changes: Change[]; later: number; blocked: string | null; revision: number }
  | { ok: false; reason: "signed-out" | "missing" };

export async function previewPostRestore(eventId: number): Promise<PostRestorePreview> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  const event = idSchema.safeParse(eventId).success ? getPostEvent(eventId) : null;
  if (!event) return { ok: false, reason: "missing" };
  const row = readPost(event.postId);
  const title = (row?.draft.title || event.before?.draft.title || event.after?.draft.title || "").trim() || "제목 없음";
  if (!row) return { ok: true, at: event.at, title, changes: [], later: 0, revision: 0, blocked: "완전히 지운 글이라 되돌릴 수 없습니다." };
  if (!event.before) return { ok: true, at: event.at, title, changes: [], later: 0, revision: row.revision, blocked: "처음 저장이라 그 이전이 없습니다." };
  const target = { ...event.before.draft, slug: row.live ? row.live.slug : event.before.draft.slug };
  const { changes } = describePost(row.draft, target);
  return {
    ok: true,
    at: event.at,
    title,
    changes,
    later: countLaterPostSaves(event),
    revision: row.revision,
    blocked: row.trashedAt ? "휴지통에 있는 글입니다. 먼저 되살려 주세요." : changes.length ? null : "지금 초안이 이미 그 저장 이전과 같습니다.",
  };
}

export async function restorePostBefore(
  eventId: number,
  expectedRevision: number
): Promise<{ ok: true; postId: number } | { ok: false; reason: "signed-out" | "missing" | "conflict" } | { ok: false; reason: "invalid"; message: string }> {
  const user = await adminOrNull();
  if (!user) return SIGNED_OUT;
  if (!revisionSchema.safeParse(expectedRevision).success) return invalid("잘못된 요청입니다. 새로고침해 주세요.");
  const event = idSchema.safeParse(eventId).success ? getPostEvent(eventId) : null;
  if (!event) return { ok: false, reason: "missing" };
  const row = readPost(event.postId);
  if (row?.trashedAt) return invalid("휴지통에 있는 글입니다. 먼저 되살려 주세요.");
  const result = restorePostDraft(user.actor, event, expectedRevision, `${whenSaved(event.at)} 저장 이전으로`);
  if (!result.ok) return result.reason === "invalid" ? invalid(result.message) : { ok: false, reason: result.reason };
  return { ok: true, postId: event.postId };
}
