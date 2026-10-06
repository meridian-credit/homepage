"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useId } from "react";
import { rankOf } from "@/lib/search-match";

/**
 * 헤더 검색.
 *
 * 평소엔 물음표 하나짜리 동그라미다. 누르면 그 동그라미가 그대로
 * 오른쪽으로 늘어나 알약(pill) 검색창이 된다. 새 창이 뜨는 게 아니라
 * 있던 단추가 자라는 것처럼 보여야 한다.
 * 돋보기 아이콘은 쓰지 않는다. 물음표가 곧 "뭘 찾으세요"다.
 *
 * 글자를 치면 밑에 자동완성처럼 목록이 깔린다.
 * 목록은 /api/search 에서 한 번만 받아 두고 화면에서 거른다.
 */

interface SearchItem {
  title: string;
  href: string;
  kind: string;
  hint: string;
  terms: string;
}

/* 예전에는 「부가세 신고 언제까지인가요」처럼 물음을 돌려 가며 띄웠다.
   자연어로 물으면 답이 나오는 줄 알게 되는데, 실제로는 서비스와 고객사
   이름을 찾는다. 무엇을 찾는 자리인지 그대로 적는다(첨삭 #11). */
const PLACEHOLDER = "서비스 검색 · 예: 세무기장, 기업실사, 결산 지원";

/* onNavigate: 결과로 이동할 때 바깥에 알린다. 모바일 메뉴 안에 놓인 검색은 이것으로 메뉴를 닫는다.
   안 닫으면 주소는 바뀌는데 메뉴가 새 페이지를 덮은 채 남고 스크롤도 잠겨 있다. */
export default function SiteSearch({ onNavigate }: { onNavigate?: () => void } = {}) {
  const router = useRouter();
  const listId = useId();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retry, setRetry] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [cursor, setCursor] = useState(0);
  /* 예시 문구는 열 때마다 하나씩 돌려 쓴다. 늘 같은 줄이면 장식처럼 보인다. */

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current); }, []);

  /* 목록은 처음 열 때 한 번만 받는다. */
  useEffect(() => {
    if (!open || items.length) return;
    let alive = true;
    const controller = new AbortController();
    Promise.resolve().then(() => { if (alive) setLoadState('loading'); });
    fetch("/api/search", { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('search'); return r.json(); })
      .then((d: SearchItem[]) => { if (!Array.isArray(d)) throw new Error('search'); if (alive) { setItems(d); setLoadState('ready'); } })
      .catch(() => { if (alive) setLoadState('error'); });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [open, items.length, retry]);

  /* 바깥을 누르면 닫는다. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* 띄어쓰기 · 첫 자음 · 글자 하나 오타까지 본다. 규칙은 search-match.ts.
     예전에는 소문자 포함 여부만 봐서 「세무기장」이 「세무 기장」을 못
     찾았다. 「세」만 쳐도, 「ㅅㅁㄱㅈ」이라 쳐도 나와야 한다. */
  const hits = q.trim()
    ? items
        .map((it) => ({ it, rank: rankOf(q, it.title, it.terms) }))
        .filter((r) => r.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.it.title.length - b.it.title.length)
        .slice(0, 7)
        .map((r) => r.it)
    : [];

  /* 찾는 말이 바뀌면 고른 줄을 첫 줄로 되돌린다.
     useEffect 로 하면 한 번 그린 뒤에 또 그린다 — 그 사이 한 프레임 동안
     지워진 목록의 세 번째 줄이 골라진 채로 보인다.
     그리는 중에 바로 되돌리면 그 한 번이 없다. React 가 권하는 방식이다. */
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setCursor(0);
  }

  function openBox() {
    /* 알약은 오른쪽으로 늘어난다. 마지막 메뉴 오른쪽 끝에서 시작하게
       그 자리를 재서 넘긴다 — 메뉴는 한 픽셀도 안 움직인다. */
    const bar = boxRef.current?.closest<HTMLElement>(".hdr-bar");
    const nav = bar?.querySelector<HTMLElement>('nav[aria-label="주 메뉴"]');
    const cta = bar?.querySelector<HTMLElement>(".hdr-cta");
    if (bar && nav) {
      const b = bar.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      bar.style.setProperty("--search-x", `${Math.round(n.right - b.left + 20)}px`);
      if (cta) {
        const c = cta.getBoundingClientRect();
        bar.style.setProperty("--search-r", `${Math.round(b.right - c.left + 16)}px`);
      }
    }
    setOpen(true);
    /* 늘어나는 동안 글자가 튀지 않게 조금 기다렸다 커서를 준다. */
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => { if (boxRef.current?.hasAttribute("data-open")) inputRef.current?.focus(); }, 260);
  }

  function go(href: string) {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || !hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[Math.min(cursor, hits.length - 1)].href);
    }
  }

  return (
    <div ref={boxRef} className="site-search relative flex-none" data-open={open || undefined}>
      {/* 동그라미가 알약으로 자란다. 폭 하나만 움직인다. */}
      <div className="site-search-shell">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && q.trim().length > 0}
          aria-controls={open && q.trim() ? listId : undefined}
          aria-activedescendant={open && hits.length ? `${listId}-${Math.min(cursor, hits.length - 1)}` : undefined}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDER}
          aria-label="사이트 검색"
          tabIndex={open ? 0 : -1}
          className="site-search-input"
        />
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openBox())}
          ref={triggerRef}
          aria-label={open ? "검색 닫기" : "검색 열기"}
          aria-expanded={open}
          className="site-search-mark"
        >
          {open ? (
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="8.6" cy="8.6" r="5.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.8 12.8L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open && q.trim().length > 0 && (
        <div className="site-search-drop">
          {loadState === "loading" && <p role="status" className="site-search-empty">검색 목록을 불러오는 중입니다.</p>}
          {loadState === "error" && <div role="alert" className="site-search-empty">검색을 불러오지 못했습니다. <button onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>}
          <div id={listId} role="listbox" aria-label="검색 결과">
          {hits.length === 0 ? (
            loadState === "ready" ? <p className="site-search-empty">찾는 글이 없습니다.</p> : null
          ) : (
            hits.map((it, i) => (
              <Link
                key={it.href}
                href={it.href}
                id={`${listId}-${i}`}
                tabIndex={-1}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  onNavigate?.();
                }}
                className={`site-search-row${i === cursor ? " is-on" : ""}`}
              >
                <span className="site-search-kind">{it.kind}</span>
                <span className="site-search-title">{it.title}</span>
                <span className="site-search-hint">{it.hint}</span>
              </Link>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
