"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  CASE_CATEGORY,
  CATEGORY_SOURCES,
  POST_CATEGORIES,
  SOURCE_KINDS,
  normalizePost,
  readingMinutes,
  type PostData,
  type PostSource,
} from "@/lib/content/post-data";
import { changePost, previewLink, savePost, uploadImage } from "@admin/app/post-actions";
import {
  DATE_FIELDS,
  DESC_RANGE,
  POST_LIMITS,
  describePost,
  draftIssues,
  publishIssues,
  type PostContext,
  type PostField,
  type PostIssue,
  type PublishCheck,
} from "@admin/content/post";
import { EditorNotices } from "@admin/editing/editor-notices";
import { MarkdownEditor, type MarkdownEditorApi } from "@admin/editing/markdown-editor";
import { SaveBar } from "@admin/editing/save-bar";
import { DRAFT_PREFIX, useEditor } from "@admin/editing/use-editor";
import { whenSaved } from "@admin/lib/format";
import { Icon } from "@admin/ui/icons";

/* 블로그 글 편집(docs/plans/admin-backend/blog.md §4 · §7).
 * - 왼쪽: 제목과 본문(Milkdown). 오른쪽: 「게시」 칸과 「글 정보」 칸. 좁은 화면에서는 위아래로 쌓는다.
 * - 저장 막대의 [초안 저장](Ctrl+S)은 초안만 바꾼다. 사이트는 [게시] · [변경 게시]를 눌러야 바뀐다. 게시 전에
 *   검사 창이 막는 것(오류)과 확인하면 넘어가는 것(경고)을 보인다.
 * - 저장 흐름(이 기기 보관 · 충돌 · 떠날 때 경고)은 일정 · FAQ 와 같은 useEditor 다. 보관 열쇠는 글마다 다르다. */

type Source = PostSource & { id: string };
type State = Omit<PostData, "sources"> & { sources: Source[] };
type Status = {
  live: { slug: string; publishedAt: string; publishedBy: string; dirty: boolean } | null;
  trashedAt: string | null;
  savedAt: string | null;
  savedBy: string | null;
};
type Other = { slug: string; title: string; live: boolean };
type Action = "unpublish" | "trash" | "untrash" | "delete";

let seq = 0;
const rid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const toState = (d: PostData): State => ({ ...d, sources: d.sources.map((s, i) => ({ ...s, id: `s${i}` })) });
/* 저장할 모양: 앞뒤 공백을 덜고, 빈 근거 줄과 겹친 키워드를 뺀다. body 를 주면 그것을 쓴다(편집기에서 바로 꺼낸 값). */
const clean = (s: State, body?: string | null): PostData =>
  normalizePost({
    ...s,
    slug: s.slug.trim(),
    title: s.title.trim(),
    description: s.description.trim(),
    author: s.author.trim(),
    keywords: [...new Set(s.keywords.map((k) => k.trim()).filter(Boolean))],
    sources: s.sources
      .map((x) => ({ label: x.label.trim(), url: x.url.trim(), kind: x.kind, note: x.note.trim() }))
      .filter((x) => x.label || x.url || x.note),
    body: body ?? s.body,
  });

const FIELD_ID: Record<PostField, string> = {
  title: "post-title",
  slug: "post-slug",
  category: "post-category",
  description: "post-description",
  author: "post-author",
  date: "post-date",
  updatedAt: "post-updatedAt",
  lastChecked: "post-lastChecked",
  effectiveFrom: "post-effectiveFrom",
  keywords: "post-keyword-input",
  sources: "post-source-add",
  related: "post-related-add",
  services: "post-services",
  cover: "post-cover-pick",
  body: "post-body-editor",
};

export default function PostEditor({
  id,
  data,
  revision,
  status,
  ctx,
  others,
  services,
  siteUrl,
  founder,
}: {
  id: number;
  data: PostData;
  revision: number;
  status: Status;
  ctx: PostContext;
  others: Other[];
  services: { slug: string; title: string }[];
  siteUrl?: string;
  founder: string;
}) {
  const router = useRouter();
  const bodyApi = useRef<MarkdownEditorApi>(null);
  const touchUpdated = useRef(false);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [check, setCheck] = useState<PublishCheck | null>(null);
  const [touch, setTouch] = useState(false);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; href?: string } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [coverMsg, setCoverMsg] = useState("");
  const trashed = !!status.trashedAt;

  const focusField = (field: PostField, index?: number, list?: Source[]) => {
    requestAnimationFrame(() => {
      if (field === "body") {
        document.getElementById(FIELD_ID.body)?.scrollIntoView({ block: "center" });
        bodyApi.current?.focus();
        return;
      }
      const row = field === "sources" && index !== undefined ? list?.[index] : undefined;
      const el = document.getElementById(row ? `src-label-${row.id}` : FIELD_ID[field]);
      el?.scrollIntoView({ block: "center" });
      el?.focus();
    });
  };

  const payload = useCallback((s: State) => clean(s, bodyApi.current?.getMarkdown()), []);
  const issues = useCallback((s: State) => draftIssues(clean(s), ctx).length, [ctx]);
  const editor = useEditor<PostData, State>({
    kind: "post",
    draftKey: `post:${id}`,
    data,
    revision,
    toState,
    payload,
    describe: describePost,
    issues,
    hasPending: () => !!bodyApi.current?.pending(),
    save: (d, r, mode) =>
      savePost(id, d, r, mode === "publish" ? "publish" : "draft", { touchUpdated: mode === "publish" && touchUpdated.current }),
    onInvalid: (s) => {
      const first = draftIssues(clean(s), ctx)[0];
      if (first) focusField(first.field, first.index, s.sources);
    },
    onSaved: () => publishDialog.current?.close(),
  });
  const s = editor.state;
  const set = (patch: Partial<State>) => editor.setState((prev) => ({ ...prev, ...patch }));
  const current = clean(s);
  const fieldIssues = draftIssues(current, ctx);
  const issueOf = (field: PostField) => fieldIssues.find((i) => i.field === field && i.index === undefined)?.message;
  const slug = status.live?.slug ?? current.slug;
  const liveUrl = siteUrl && slug ? `${siteUrl}/blog/${slug}` : undefined;
  const changed = editor.count > 0;
  /* 본문 편집기가 아직 알리지 않은 변경까지(치자마자 누른 미리 보기). */
  const unsaved = () => changed || !!bodyApi.current?.pending();
  const titleOf = new Map(others.map((o) => [o.slug, o]));

  /* ── 게시 ── */
  const openPublish = () => {
    const p = clean(s, bodyApi.current?.getMarkdown());
    setCheck(publishIssues({ ...p, date: p.date || ctx.today }, ctx));
    setTouch(!!status.live);
    publishDialog.current?.showModal();
  };
  const confirmPublish = async () => {
    touchUpdated.current = touch;
    await editor.save("publish");
    publishDialog.current?.close();
  };
  const gotoIssue = (issue: PostIssue) => {
    publishDialog.current?.close();
    focusField(issue.field, issue.index, s.sources);
  };

  /* ── 미리 보기: 저장한 초안을 공개 사이트가 그린다. 바뀐 것이 있으면 먼저 저장한다. ── */
  const openPreview = async () => {
    /* 창은 누른 그 순간에 연다. 저장을 기다린 뒤 열면 브라우저가 팝업으로 막는다. */
    const win = window.open("about:blank", "_blank");
    if (unsaved() && !(await editor.save())) {
      win?.close();
      return;
    }
    setBusy("preview");
    const link = await previewLink(id).catch(() => null);
    setBusy(null);
    if (link?.ok) {
      if (win) {
        win.opener = null;
        win.location.href = link.url;
      } else setNotice({ tone: "ok", text: "브라우저가 새 창을 막았습니다. 아래 링크로 여세요.", href: link.url });
      return;
    }
    win?.close();
    setNotice({
      tone: "error",
      text:
        link && link.reason === "signed-out"
          ? "로그인이 끝났습니다. 새로고침해서 다시 로그인해 주세요."
          : link && link.reason === "unset"
            ? "미리 보기 설정(PUBLIC_SITE_URL)이 없습니다."
            : "미리 보기를 열지 못했습니다. 연결을 확인하고 다시 눌러 주세요.",
    });
  };

  /* ── 내리기 · 휴지통 · 되살리기 · 완전히 지우기 ── */
  const ask = (action: Action) => {
    setConfirm(action);
    requestAnimationFrame(() => confirmDialog.current?.showModal());
  };
  const act = async (action: Action) => {
    setBusy(action);
    const r = await changePost(id, editor.revision, action).catch(() => null);
    setBusy(null);
    confirmDialog.current?.close();
    if (!r) return setNotice({ tone: "error", text: "연결이 끊겼습니다. 다시 해 보세요." });
    if (r.ok) {
      if (action === "trash" || action === "delete") {
        try {
          localStorage.removeItem(`${DRAFT_PREFIX}post:${id}`);
        } catch {}
        editor.leave();
        router.push("/posts");
        router.refresh();
        return;
      }
      editor.adoptRevision(r.revision);
      if (action === "unpublish")
        setNotice(
          r.published?.ok
            ? { tone: "ok", text: "사이트에서 내렸습니다. 이 글의 주소는 이제 없는 쪽(404)입니다. 초안은 그대로 남아 있습니다." }
            : { tone: "error", text: "내렸지만 사이트에서 사라졌는지 확인하지 못했습니다. 위의 안내에서 [다시 반영]을 눌러 주세요." }
        );
      else setNotice({ tone: "ok", text: "휴지통에서 되살렸습니다." });
      router.refresh();
      return;
    }
    if (r.reason === "signed-out") setNotice({ tone: "error", text: "로그인이 끝났습니다. 새로고침해서 다시 로그인해 주세요." });
    else if (r.reason === "conflict") setNotice({ tone: "error", text: "다른 곳에서 먼저 이 글을 바꿨습니다. 새로고침해서 최신 내용을 본 뒤 다시 해 주세요." });
    else if (r.reason === "invalid") setNotice({ tone: "error", text: r.message });
    else setNotice({ tone: "error", text: "이 글을 찾지 못했습니다. 다른 곳에서 지웠을 수 있습니다." });
  };

  /* ── 사진 ── */
  const upload = async (file: File): Promise<{ ok: true; src: string } | { ok: false; message: string }> => {
    if (file.size > 15 * 1024 * 1024) return { ok: false, message: "사진은 15MB 까지 올릴 수 있습니다." };
    const form = new FormData();
    form.set("file", file);
    const r = await uploadImage(form).catch(() => null);
    if (!r) return { ok: false, message: "사진을 올리지 못했습니다. 연결을 확인하고 다시 해 보세요." };
    if (r.ok) return { ok: true, src: r.src };
    if (r.reason === "signed-out") return { ok: false, message: "로그인이 끝나 사진을 올리지 못했습니다. 적던 글은 이 기기에 남아 있으니 다시 로그인해 주세요." };
    return { ok: false, message: r.message };
  };

  /* ── 키워드 · 근거 · 관련 글 ── */
  const addKeywords = (text: string) => {
    const parts = text
      .split(/[,，\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parts.length) set({ keywords: [...new Set([...s.keywords, ...parts])].slice(0, POST_LIMITS.keywords) });
    setKeyword("");
  };
  const updateSource = (sid: string, patch: Partial<Source>) => set({ sources: s.sources.map((x) => (x.id === sid ? { ...x, ...patch } : x)) });
  const moveSource = (i: number, by: -1 | 1) => {
    const next = [...s.sources];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set({ sources: next });
  };
  const addSource = (rows: PostSource[] = [{ label: "", url: "", kind: "law", note: "" }]) => {
    const fresh = rows.filter((r) => !s.sources.some((x) => x.url.trim() === r.url)).map((r) => ({ ...r, id: rid() }));
    if (!fresh.length) return;
    set({ sources: [...s.sources, ...fresh].slice(0, POST_LIMITS.sources) });
    requestAnimationFrame(() => document.getElementById(`src-label-${fresh[0].id}`)?.focus());
  };
  const moveRelated = (i: number, by: -1 | 1) => {
    const next = [...s.related];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set({ related: next });
  };

  const counter = (len: number, max: number, range?: readonly [number, number]) => (
    <span className={`counter ${len > max ? "over" : range && len && (len < range[0] || len > range[1]) ? "warn" : ""}`}>
      {len}/{range ? `${range[0]}~${range[1]}` : max}
    </span>
  );
  const errorLine = (msg?: string, idAttr?: string) => (
    <div id={idAttr}>
      {msg ? (
        <div className="error-text">
          <Icon name="alert" />
          <span>{msg}</span>
        </div>
      ) : null}
    </div>
  );
  const chars = current.body.replace(/\s/g, "").length;
  const relatedOptions = others.filter((o) => !s.related.includes(o.slug) && o.slug !== current.slug);
  const defaults = CATEGORY_SOURCES[s.category] ?? [];

  return (
    <>
      <EditorNotices draft={editor.draft} lost={editor.lost} onResume={editor.resumeDraft} onDrop={editor.dropDraft} onDismissLost={editor.dismissLost} />

      {trashed ? (
        <div className="page-banners">
          <div className="banner warn" role="status">
            <Icon name="trash" />
            <div className="banner-body">
              <div className="banner-title">휴지통에 있는 글입니다</div>
              <p className="banner-text">
                {whenSaved(status.trashedAt!, ctx.today)}에 휴지통으로 옮겼습니다. 고치려면 먼저 되살리세요. 완전히 지우면 이 글의 변경 기록과, 다른 글이 쓰지 않는
                사진도 함께 지워져 되돌릴 수 없습니다.
              </p>
              <div className="banner-actions">
                <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void act("untrash")}>
                  <Icon name="undo" />
                  되살리기
                </button>
                <button type="button" className="btn btn-danger" disabled={!!busy} onClick={() => ask("delete")}>
                  <Icon name="trash" />
                  완전히 지우기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="page-banners">
          <div className={`banner ${notice.tone === "ok" ? "ok" : "danger"}`} role={notice.tone === "ok" ? "status" : "alert"}>
            <Icon name={notice.tone === "ok" ? "check" : "alert"} />
            <div className="banner-body">
              <p className="banner-text">
                {notice.text}{" "}
                {notice.href ? (
                  <a href={notice.href} target="_blank" rel="noopener noreferrer">
                    미리 보기 열기
                  </a>
                ) : null}
              </p>
            </div>
            <button type="button" className="icon-btn" aria-label="알림 닫기" onClick={() => setNotice(null)}>
              <Icon name="x" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="post-layout" inert={editor.saving || trashed}>
        <div className="post-main">
          <section className="card post-compose" aria-label="제목과 본문">
            <div className={`field post-title-field ${issueOf("title") ? "has-error" : ""}`}>
              <label className="sr-only" htmlFor="post-title">
                제목
              </label>
              <textarea
                id="post-title"
                className="post-title-input"
                rows={1}
                placeholder="제목"
                value={s.title}
                aria-invalid={!!issueOf("title") || undefined}
                aria-describedby="post-title-msg"
                onChange={(e) => set({ title: e.target.value.replace(/\n/g, " ") })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    bodyApi.current?.focus();
                  }
                }}
              />
              {errorLine(issueOf("title"), "post-title-msg")}
            </div>
            <div className="sr-only" id="post-body-label">
              본문
            </div>
            <MarkdownEditor
              ref={bodyApi}
              value={s.body}
              onChange={(markdown) => set({ body: markdown })}
              onUpload={upload}
              labelledBy="post-body-label"
              describedBy="post-body-hint"
              disabled={editor.saving || trashed}
            />
            <p className="hint post-body-hint" id="post-body-hint">
              글자 {chars.toLocaleString("ko-KR")}자 · 읽는 데 약 {readingMinutes(current.body)}분. 워드 · 한글 · 엑셀에서 복사한 표와 서식, 사진은 붙여 넣으면
              그대로 들어옵니다. 소제목은 「문단 종류」에서 고릅니다.
            </p>
            {issueOf("body") ? errorLine(issueOf("body")) : null}
          </section>
        </div>

        <aside className="post-side" aria-label="게시와 글 정보">
          <section className="card post-publish" aria-labelledby="pub-h">
            <div className="card-head">
              <h2 id="pub-h">게시</h2>
              <span className={`st ${status.live ? (status.live.dirty || changed ? "st-changed" : "st-live") : "st-draft"}`}>
                {status.live ? (status.live.dirty || changed ? "고친 내용 미게시" : "게시됨") : "초안"}
              </span>
            </div>
            <div className="card-body pub-body">
              <p className="pub-state">
                {status.live
                  ? status.live.dirty || changed
                    ? "사이트에 나와 있습니다. 고친 내용은 [변경 게시]를 눌러야 사이트에 나옵니다."
                    : "사이트에 나와 있고, 지금 내용과 같습니다."
                  : "아직 사이트에 없습니다. [미리 보기]로 확인한 뒤 [게시]를 누르세요."}
              </p>
              {status.live ? (
                <p className="hint">
                  {whenSaved(status.live.publishedAt, ctx.today)} {status.live.publishedBy} 게시 ·{" "}
                  {liveUrl ? (
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                      /blog/{status.live.slug}
                    </a>
                  ) : (
                    `/blog/${status.live.slug}`
                  )}
                </p>
              ) : null}
              {status.savedAt ? (
                <p className="hint">
                  마지막 저장 {whenSaved(status.savedAt, ctx.today)} {status.savedBy}
                </p>
              ) : null}
              <div className="pub-actions">
                <button type="button" className="btn" id="post-preview" disabled={!!busy} onClick={() => void openPreview()}>
                  <Icon name="eye" />
                  {changed ? "저장하고 미리 보기" : "미리 보기"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  id="post-publish"
                  disabled={!!busy || (!!status.live && !status.live.dirty && !changed)}
                  title={status.live && !status.live.dirty && !changed ? "사이트의 글과 같습니다" : undefined}
                  onClick={openPublish}
                >
                  <Icon name="send" />
                  {status.live ? "변경 게시" : "게시"}
                </button>
              </div>
              <div className="pub-more">
                {status.live ? (
                  <button type="button" className="btn btn-sm btn-ghost" id="post-unpublish" disabled={!!busy} onClick={() => ask("unpublish")}>
                    <Icon name="unpublish" small />
                    사이트에서 내리기
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm btn-ghost" id="post-trash" disabled={!!busy} onClick={() => ask("trash")}>
                    <Icon name="trash" small />
                    휴지통으로
                  </button>
                )}
                <Link className="btn btn-sm btn-ghost" href={`/history?type=post&post=${id}`}>
                  <Icon name="history" small />이 글의 변경 기록
                </Link>
              </div>
            </div>
          </section>

          <section className="card post-meta" aria-labelledby="meta-h">
            <div className="card-head">
              <h2 id="meta-h">글 정보</h2>
            </div>
            <div className="card-body meta-body">
              <div className={`field ${issueOf("slug") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-slug">
                  <span>주소</span>
                  {status.live ? <span className="hint">게시 중에는 잠김</span> : null}
                </label>
                <div className="slug-wrap">
                  <span className="slug-prefix" aria-hidden="true">
                    /blog/
                  </span>
                  <input
                    className="input"
                    id="post-slug"
                    value={s.slug}
                    readOnly={!!status.live}
                    placeholder="예: corporate-tax-rate-2027"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={!!issueOf("slug") || undefined}
                    aria-describedby="post-slug-msg post-slug-hint"
                    onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  />
                </div>
                {errorLine(issueOf("slug"), "post-slug-msg")}
                <p className="hint" id="post-slug-hint">
                  영문 소문자 · 숫자 · 하이픈(-). 게시하면 바꿀 수 없으니 내용을 나타내는 짧은 말로 정하세요.
                </p>
              </div>

              <div className={`field ${issueOf("category") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-category">
                  갈래
                </label>
                <select className="input" id="post-category" value={s.category} onChange={(e) => set({ category: e.target.value })}>
                  <option value="">고르세요</option>
                  {POST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errorLine(issueOf("category"))}
              </div>

              <div className={`field ${issueOf("description") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-description">
                  <span>요약</span>
                  {counter(s.description.trim().length, POST_LIMITS.description, DESC_RANGE)}
                </label>
                <textarea
                  className="textarea"
                  id="post-description"
                  rows={3}
                  value={s.description}
                  aria-describedby="post-description-hint"
                  onChange={(e) => set({ description: e.target.value })}
                />
                {errorLine(issueOf("description"))}
                <p className="hint" id="post-description-hint">
                  블로그 목록 카드 · 검색 결과 · 공유 카드에 나옵니다. {DESC_RANGE[0]}~{DESC_RANGE[1]}자가 알맞습니다.
                </p>
              </div>

              <label className="check-row">
                <input type="checkbox" checked={s.taxFacts} onChange={(e) => set({ taxFacts: e.target.checked })} />
                <span>
                  <strong>세율 · 기한 · 기준금액 · 법 개정을 다룹니다</strong>
                  <span className="hint">켜 두면 근거 자료와 검토 기준일이 있어야 게시됩니다.</span>
                </span>
              </label>

              <div className="date-grid">
                {DATE_FIELDS.map(({ field, label }) => (
                  <div key={field} className={`field ${issueOf(field) ? "has-error" : ""}`}>
                    <label className="field-label" htmlFor={`post-${field}`}>
                      {label}
                    </label>
                    <div className="date-wrap">
                      <input
                        className="input"
                        type="date"
                        id={`post-${field}`}
                        value={s[field]}
                        max={field === "effectiveFrom" ? undefined : ctx.today}
                        onChange={(e) => set({ [field]: e.target.value } as Partial<State>)}
                      />
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ [field]: ctx.today } as Partial<State>)}>
                        {field === "lastChecked" ? "오늘 검토함" : "오늘"}
                      </button>
                    </div>
                    {errorLine(issueOf(field))}
                  </div>
                ))}
              </div>
              <p className="hint">발행일을 비워 두면 처음 게시한 날이 됩니다. 검토 기준일은 세율 · 기한을 마지막으로 확인한 날입니다.</p>

              <div className={`field ${issueOf("author") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-author">
                  글쓴이
                </label>
                <input className="input" id="post-author" value={s.author} placeholder={founder} autoComplete="off" onChange={(e) => set({ author: e.target.value })} />
                {errorLine(issueOf("author"))}
              </div>

              <div className={`field ${issueOf("keywords") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-keyword-input">
                  <span>키워드</span>
                  <span className="counter">
                    {s.keywords.length}/{POST_LIMITS.keywords}
                  </span>
                </label>
                <div className="chips-input">
                  {s.keywords.map((k) => (
                    <span key={k} className="chip">
                      {k}
                      <button type="button" aria-label={`키워드 「${k}」 빼기`} onClick={() => set({ keywords: s.keywords.filter((x) => x !== k) })}>
                        <Icon name="x" small />
                      </button>
                    </span>
                  ))}
                  <input
                    id="post-keyword-input"
                    value={keyword}
                    placeholder={s.keywords.length ? "" : "입력하고 Enter"}
                    autoComplete="off"
                    onChange={(e) => (/[,，]/.test(e.target.value) ? addKeywords(e.target.value) : setKeyword(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        addKeywords(keyword);
                      } else if (e.key === "Backspace" && !keyword && s.keywords.length) set({ keywords: s.keywords.slice(0, -1) });
                    }}
                    onBlur={() => addKeywords(keyword)}
                  />
                </div>
                {errorLine(issueOf("keywords"))}
                <p className="hint">사이트 검색과 관련 글 고르기에 씁니다. 비워 두면 갈래와 제목 낱말로 채웁니다.</p>
              </div>

              <fieldset className="field sources">
                <legend className="field-label">
                  <span>근거 자료</span>
                  <span className="counter">
                    {s.sources.length}/{POST_LIMITS.sources}
                  </span>
                </legend>
                {issueOf("sources") ? errorLine(issueOf("sources")) : null}
                {s.sources.length ? (
                  <ol className="source-list">
                    {s.sources.map((x, i) => {
                      const rowIssue = fieldIssues.find((f) => f.field === "sources" && f.index === i)?.message;
                      return (
                        <li key={x.id} className={`source-row ${rowIssue ? "is-err" : ""}`}>
                          <div className="source-fields">
                            <input
                              className="input"
                              id={`src-label-${x.id}`}
                              aria-label={`${i + 1}번째 근거 이름`}
                              placeholder="이름 (예: 법인세법 제55조)"
                              value={x.label}
                              onChange={(e) => updateSource(x.id, { label: e.target.value })}
                            />
                            <input
                              className="input"
                              aria-label={`${i + 1}번째 근거 주소`}
                              placeholder="https://www.law.go.kr/…"
                              inputMode="url"
                              value={x.url}
                              aria-invalid={!!rowIssue || undefined}
                              onChange={(e) => updateSource(x.id, { url: e.target.value })}
                            />
                            <div className="source-line">
                              <select className="input" aria-label={`${i + 1}번째 근거 종류`} value={x.kind} onChange={(e) => updateSource(x.id, { kind: e.target.value })}>
                                {SOURCE_KINDS.map((k) => (
                                  <option key={k.value} value={k.value}>
                                    {k.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="input"
                                aria-label={`${i + 1}번째 근거 메모`}
                                placeholder="메모 (선택)"
                                value={x.note}
                                onChange={(e) => updateSource(x.id, { note: e.target.value })}
                              />
                            </div>
                            {rowIssue ? errorLine(rowIssue) : null}
                          </div>
                          <div className="source-moves">
                            <button type="button" className="icon-btn" aria-label={`${i + 1}번째 근거 위로`} disabled={i === 0} onClick={() => moveSource(i, -1)}>
                              <Icon name="up" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`${i + 1}번째 근거 아래로`}
                              disabled={i === s.sources.length - 1}
                              onClick={() => moveSource(i, 1)}
                            >
                              <Icon name="down" />
                            </button>
                            <button type="button" className="icon-btn" aria-label={`${i + 1}번째 근거 지우기`} onClick={() => set({ sources: s.sources.filter((y) => y.id !== x.id) })}>
                              <Icon name="trash" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="hint">법령 · 국세청 안내처럼 글이 기대는 공식 자료를 먼저 적습니다. 글 아래 「검토에 사용한 근거」로 나옵니다.</p>
                )}
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" id="post-source-add" disabled={s.sources.length >= POST_LIMITS.sources} onClick={() => addSource()}>
                    <Icon name="plus" small />줄 더하기
                  </button>
                  {defaults.length ? (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => addSource(defaults)}>
                      {s.category} 기본 근거 넣기
                    </button>
                  ) : null}
                </div>
              </fieldset>

              <div className={`field ${issueOf("related") ? "has-error" : ""}`}>
                <label className="field-label" htmlFor="post-related-add">
                  <span>관련 글</span>
                  <span className="counter">
                    {s.related.length}/{POST_LIMITS.related}
                  </span>
                </label>
                {s.related.length ? (
                  <ol className="related-list">
                    {s.related.map((r, i) => {
                      const o = titleOf.get(r);
                      return (
                        <li key={r}>
                          <span className="related-title">
                            {o ? o.title : r}
                            {!o ? <span className="badge del">없는 글</span> : !o.live ? <span className="badge edit">초안</span> : null}
                          </span>
                          <span className="source-moves">
                            <button type="button" className="icon-btn" aria-label={`「${o?.title ?? r}」 위로`} disabled={i === 0} onClick={() => moveRelated(i, -1)}>
                              <Icon name="up" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`「${o?.title ?? r}」 아래로`}
                              disabled={i === s.related.length - 1}
                              onClick={() => moveRelated(i, 1)}
                            >
                              <Icon name="down" />
                            </button>
                            <button type="button" className="icon-btn" aria-label={`「${o?.title ?? r}」 빼기`} onClick={() => set({ related: s.related.filter((x) => x !== r) })}>
                              <Icon name="x" />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                <select
                  className="input"
                  id="post-related-add"
                  value=""
                  disabled={!relatedOptions.length || s.related.length >= POST_LIMITS.related}
                  onChange={(e) => e.target.value && set({ related: [...s.related, e.target.value] })}
                >
                  <option value="">{relatedOptions.length ? "관련 글 더하기…" : "고를 수 있는 다른 글이 없습니다"}</option>
                  {relatedOptions.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.title}
                      {o.live ? "" : " (초안)"}
                    </option>
                  ))}
                </select>
                {errorLine(issueOf("related"))}
                <p className="hint">고른 순서대로 글 아래 「관련 글」에 먼저 섭니다. 비우면 같은 갈래 · 키워드로 고릅니다.</p>
              </div>

              {s.category === CASE_CATEGORY || s.services.length ? (
                <fieldset className="field" id="post-services" tabIndex={-1}>
                  <legend className="field-label">연결 서비스</legend>
                  <div className="check-grid">
                    {services.map((sv) => (
                      <label key={sv.slug} className="check-row compact">
                        <input
                          type="checkbox"
                          checked={s.services.includes(sv.slug)}
                          onChange={(e) =>
                            set({ services: e.target.checked ? [...s.services, sv.slug] : s.services.filter((x) => x !== sv.slug) })
                          }
                        />
                        <span>{sv.title}</span>
                      </label>
                    ))}
                  </div>
                  {errorLine(issueOf("services"))}
                  <p className="hint">업무경험 글은 고른 서비스의 상세 쪽 「업무 경험」 칸에 나옵니다.</p>
                </fieldset>
              ) : null}

              <div className={`field ${issueOf("cover") ? "has-error" : ""}`}>
                <span className="field-label">표지 사진</span>
                {s.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="cover-thumb" src={s.cover} alt="" />
                ) : null}
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" id="post-cover-pick" onClick={() => coverInput.current?.click()}>
                    <Icon name="image" small />
                    {s.cover ? "바꾸기" : "사진 올리기"}
                  </button>
                  {s.cover ? (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ cover: "" })}>
                      빼기
                    </button>
                  ) : null}
                </div>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  data-testid="cover-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setCoverMsg("올리는 중…");
                    const r = await upload(file);
                    if (r.ok) {
                      set({ cover: r.src });
                      setCoverMsg("");
                    } else setCoverMsg(r.message);
                  }}
                />
                {coverMsg ? (
                  <p className="hint" role="status">
                    {coverMsg}
                  </p>
                ) : null}
                {errorLine(issueOf("cover"))}
                <p className="hint">블로그 목록 카드와 글 위에 나옵니다. 없으면 제목으로 만든 카드가 나옵니다.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <SaveBar
        editor={editor}
        object="이 글을"
        siteUrl={liveUrl}
        onGotoIssue={() => {
          const first = fieldIssues[0];
          if (first) focusField(first.field, first.index, s.sources);
        }}
        labels={{
          save: "초안 저장",
          dirtyHint: status.live ? "초안만 저장합니다. 사이트는 [변경 게시]를 눌러야 바뀝니다." : "초안은 사이트에 나오지 않습니다.",
          saved: (mode) =>
            mode === "publish"
              ? { title: "게시했습니다", sub: "사이트에 나왔습니다. 블로그 목록 · 홈 · 검색에도 들어갔습니다.", site: true }
              : {
                  title: "초안을 저장했습니다",
                  sub: status.live ? "사이트의 글은 그대로입니다. 고친 내용을 내려면 [변경 게시]를 누르세요." : "아직 사이트에 없습니다. [미리 보기]로 확인한 뒤 [게시]를 누르세요.",
                  site: false,
                },
        }}
      />

      <dialog className="dialog dialog-wide" ref={publishDialog} aria-labelledby="pubd-h" onClose={() => setCheck(null)}>
        {check ? (
          <>
            <div className="dialog-head">
              <span className={`icon-badge ${check.errors.length ? "danger" : check.warnings.length ? "warn" : ""}`}>
                <Icon name={check.errors.length || check.warnings.length ? "alert" : "send"} />
              </span>
              <h2 id="pubd-h">
                {check.errors.length
                  ? `고칠 곳이 ${check.errors.length}군데 있어 게시할 수 없습니다`
                  : status.live
                    ? "고친 내용을 게시할까요?"
                    : "이 글을 게시할까요?"}
              </h2>
            </div>
            <div className="dialog-body">
              {check.errors.length ? (
                <ul className="check-list" aria-label="고칠 곳">
                  {check.errors.map((x, i) => (
                    <li key={i} className="is-error">
                      <Icon name="alert" small />
                      <span>{x.message}</span>
                      <button type="button" className="link-btn" onClick={() => gotoIssue(x)}>
                        그 칸으로
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {check.warnings.length ? (
                <>
                  <p className="hint">{check.errors.length ? "그 밖에 확인할 것" : "확인할 것 — 이대로 게시해도 됩니다"}</p>
                  <ul className="check-list" aria-label="확인할 것">
                    {check.warnings.map((x, i) => (
                      <li key={i} className="is-warn">
                        <Icon name="info" small />
                        <span>{x.message}</span>
                        <button type="button" className="link-btn" onClick={() => gotoIssue(x)}>
                          그 칸으로
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {!check.errors.length ? (
                <>
                  <p>
                    게시하면 바로 사이트의 <strong>/blog/{current.slug}</strong> 에 나오고, 블로그 목록 · 홈 · 사이트 검색에도 들어갑니다.
                  </p>
                  {status.live ? (
                    <label className="check-row">
                      <input type="checkbox" checked={touch} onChange={(e) => setTouch(e.target.checked)} />
                      <span>
                        업데이트 날짜를 오늘({ctx.today})로
                        <span className="hint">글 위의 「업데이트」와 검색엔진이 보는 수정일이 바뀝니다. 오타만 고쳤으면 끄세요.</span>
                      </span>
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="dialog-foot">
              <button type="button" className="btn" onClick={() => publishDialog.current?.close()}>
                닫기
              </button>
              {!check.errors.length ? (
                <button type="button" className="btn btn-primary" id="post-publish-confirm" disabled={editor.saving} onClick={() => void confirmPublish()}>
                  <Icon name="send" />
                  {check.warnings.length ? "확인했습니다, 게시" : "게시"}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </dialog>

      <dialog className="dialog" ref={confirmDialog} aria-labelledby="confirm-h" onClose={() => setConfirm(null)}>
        {confirm ? (
          <>
            <div className="dialog-head">
              <span className={`icon-badge ${confirm === "unpublish" ? "warn" : "danger"}`}>
                <Icon name={confirm === "unpublish" ? "unpublish" : "trash"} />
              </span>
              <h2 id="confirm-h">
                {confirm === "unpublish" ? "사이트에서 내릴까요?" : confirm === "trash" ? "휴지통으로 옮길까요?" : "완전히 지울까요?"}
              </h2>
            </div>
            <div className="dialog-body">
              {confirm === "unpublish" ? (
                <p>
                  <strong>/blog/{status.live?.slug}</strong> 주소가 없는 쪽(404)이 되고, 블로그 목록 · 홈 · 검색에서 빠집니다. 초안은 그대로 남아 다시 게시할 수 있습니다.
                </p>
              ) : confirm === "trash" ? (
                <p>
                  목록의 「휴지통」으로 옮깁니다. 거기서 되살릴 수 있습니다.
                  {changed ? " 저장하지 않은 변경은 버려집니다." : ""}
                </p>
              ) : (
                <p>
                  이 글과 이 글의 변경 기록을 지웁니다. 다른 글이 쓰지 않는 사진도 사이트에서 사라집니다. <strong>되돌릴 수 없습니다.</strong> (서버 백업에는 최대 90일
                  남습니다.)
                </p>
              )}
            </div>
            <div className="dialog-foot">
              <button type="button" className="btn" autoFocus onClick={() => confirmDialog.current?.close()}>
                그만두기
              </button>
              <button
                type="button"
                className={`btn ${confirm === "unpublish" ? "btn-primary" : "btn-danger"}`}
                id="post-confirm-action"
                disabled={!!busy}
                onClick={() => void act(confirm)}
              >
                {busy ? <span className="spinner" aria-hidden="true" /> : null}
                {confirm === "unpublish" ? "내리기" : confirm === "trash" ? "휴지통으로" : "완전히 지우기"}
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
