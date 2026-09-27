"use client";

/* 상단 메뉴.
 *
 * 여섯 칸 중 셋(메리디안·서비스·인사이트)이 하위를 갖는다. 목록은
 * lib/constants 의 navMenu 하나가 정하고, 데스크톱과 모바일이 그걸 같이 본다.
 *
 * 데스크톱은 내려오는 판, 모바일은 눌러서 펴는 아코디언이다. 손가락에는
 * 「올려 놓기」가 없어서 같은 방식을 쓰면 상위 칸을 누르는 순간 페이지가
 * 넘어가 버린다.
 *
 * 판은 유리로 만들지 않는다. 뒤에 영상이 지나가는 자리라 반투명이면 글자가
 * 묻힌다. 메뉴는 읽히는 게 먼저다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { navMenu } from "@/lib/constants";

export type NavEntry = (typeof navMenu)[number];

/* 글이 한 편도 없는 블로그 갈래는 메뉴에서 뺀다. 누르면 「아직 글이 없습니다」만
   보게 된다. 어느 갈래가 비었는지는 글을 읽을 수 있는 서버(layout)가 세어 넘긴다.
   갈래 표(insightCategories)는 그대로 둔다 — 글이 생기면 저절로 다시 선다. */
export function visibleMenu(hiddenHrefs: readonly string[]): NavEntry[] {
  if (!hiddenHrefs.length) return navMenu;
  return navMenu.map((entry) =>
    "items" in entry && entry.items
      ? { ...entry, items: entry.items.filter((item) => !hiddenHrefs.includes(item.href)) }
      : entry
  );
}

/* 대각선으로 판까지 내려가는 동안 마우스가 칸을 잠깐 벗어난다.
   그때 바로 닫으면 판을 못 누른다. 이만큼만 기다렸다 닫는다. */
const CLOSE_DELAY = 120;

function isOn(pathname: string, href: string) {
  const path = href.split(/[?#]/)[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(path + "/");
}

/* ── 데스크톱 ─────────────────────────────────────────────── */

/* 열림 상태는 헤더가 갖는다. 판이 헤더 안에서 열리기 때문에, 판 위에
   마우스가 올라가 있는 동안에도 닫히면 안 된다 — 그 판단을 헤더가 한다. */
export function useMenuOpen() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
  };
  useEffect(() => cancelClose, []);
  return { open, setOpen, cancelClose, scheduleClose };
}

export type MenuCtl = ReturnType<typeof useMenuOpen>;

export function DesktopNav({ ctl, entries }: { ctl: MenuCtl; entries: NavEntry[] }) {
  const pathname = usePathname();
  const { open, setOpen, cancelClose, scheduleClose } = ctl;
  const navRef = useRef<HTMLElement>(null);

  /* 바깥을 누르거나 Esc 를 치면 닫는다. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      /* 닫고 나서 포커스가 허공에 남으면 다음 Tab 이 페이지 맨 앞으로 튄다.
         열었던 칸으로 돌려준다. */
      navRef.current?.querySelector<HTMLElement>(`[data-trigger="${open}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element)?.closest?.('.site-header')) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, setOpen]);


  return (
    <nav ref={navRef} className="flex items-center gap-9" aria-label="주 메뉴">
      {entries.map((entry) => {
        const hasPanel = Boolean(entry.items || entry.columns);
        const active = isOn(pathname, entry.href);
        const shown = open === entry.label;

        const face = `relative text-[0.8125rem] font-medium tracking-[0.04em] transition-colors duration-300 hover-underline ${
          active ? "text-accent font-semibold nav-on" : "text-muted hover:text-foreground"
        }`;

        if (!hasPanel) {
          /* 펼침판 있는 칸과 껍데기를 똑같이 맞춘다. 저쪽은 판을 앉히려고
             div 로 한 겹 감싸는데, 이쪽만 안 감싸면 flex 자식이 되어
             display 가 flex 로 바뀌고 글자 밑선이 0.9px 어긋난다. */
          return (
            <div key={entry.href} className="relative">
              <Link
                href={entry.href}
                className={`${face} inline-flex items-center`}
              >
                {entry.label}
              </Link>
            </div>
          );
        }

        return (
          <div
            key={entry.href}
            className="relative"
            /* 마우스를 올리면 열린다. 누르면 그 페이지로 간다 —
               둘 다 되어야 한 칸이 두 일을 한다. */
            onPointerEnter={() => {
              cancelClose();
              setOpen(entry.label);
            }}
            onPointerLeave={scheduleClose}
            /* 포커스가 닿는 것만으로는 안 연다.
               Esc 로 닫으면 포커스를 칸으로 돌려주는데, 그때 다시 열려서
               Esc 가 듣지 않았다. 키보드로 여는 건 ArrowDown 과 Enter 다. */

          >
            {/* 칸 자체가 링크다. 판은 마우스를 올리면 열리고,
                키보드는 ArrowDown 으로 연다. */}
            <Link
              href={entry.href}
              data-trigger={entry.label}
              aria-expanded={shown}
              aria-controls="desktop-navigation-panel"
              className={`${face} inline-flex items-center gap-1.5`}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  cancelClose();
                  setOpen(entry.label);
                  requestAnimationFrame(() => document.querySelector<HTMLElement>("#desktop-navigation-panel a")?.focus());
                }
              }}
            >
              {entry.label}
              {/* 하위가 있다는 표시. 눌러서 여는 방식이라도 표시는 있어야
                  「여기 뭔가 더 있다」를 안다. 열리면 뒤집힌다. */}
              <svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                aria-hidden
                className={`transition-transform duration-200 ${shown ? "rotate-180" : ""}`}
              >
                <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.3" fill="none" />
              </svg>
            </Link>

            {/* 판은 여기서 그리지 않는다. 헤더가 키를 키워 그 안에 담는다 —
                아래는 자리만 알려 주는 표시다. */}
          </div>
        );
      })}
    </nav>
  );
}

/* 떠 있던 판(Panel · PanelRow)은 지웠다. 헤더가 스스로 키를 키워
   그 안에 담는 MegaPanel 이 그 일을 한다. */

/* ── 모바일 ───────────────────────────────────────────────── */

export function MobileNav({ onNavigate, entries }: { onNavigate: () => void; entries: NavEntry[] }) {
  const pathname = usePathname();
  /* 처음에는 다 접혀 있다. 여섯 칸이 한눈에 들어와야 어디로 갈지 고른다. */
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  return (
    <nav className="mnav" aria-label="주 메뉴">
      {entries.map((entry) => {
        const cols =
          entry.columns ?? (entry.items ? [{ title: "", items: entry.items }] : []);
        const rows = cols.flatMap((c) => c.items);
        const active = isOn(pathname, entry.href);
        const shown = openLabel === entry.label;

        if (rows.length === 0) {
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onNavigate}
              className={`mnav-row ${active ? "is-on" : ""}`}
            >
              {entry.label}
            </Link>
          );
        }

        return (
          <div key={entry.href} className="mnav-group">
            <div className={`mnav-row mnav-row--split ${active ? "is-on" : ""}`}>
              {/* 상위도 갈 데가 있다. 글자를 누르면 그리로 가고,
                  펴는 건 오른쪽 단추가 맡는다. 하나로 묶으면 둘 중 하나를 못 쓴다. */}
              <Link href={entry.href} onClick={onNavigate} className="mnav-rowlink">
                {entry.label}
              </Link>
              <button
                type="button"
                className="mnav-toggle"
                aria-expanded={shown}
                aria-label={`${entry.label} 하위 ${shown ? "접기" : "펼치기"}`}
                onClick={() => setOpenLabel(shown ? null : entry.label)}
              >
                <svg width="12" height="8" viewBox="0 0 8 5" aria-hidden
                  className={shown ? "rotate-180" : ""}>
                  <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.3" fill="none" />
                </svg>
              </button>
            </div>

            {shown && (
              <ul className="mnav-sub">
                {cols.map((c) => (
                  <li key={c.title || "flat"}>
                    {c.title && <p className="mnav-sublab">{c.title}</p>}
                    <ul className="mnav-subin">
                      {c.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className="mnav-sublink"
                            aria-current={isOn(pathname, item.href) ? "page" : undefined}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}


/* ── 헤더 안에서 열리는 판 ─────────────────────────────────
   칸 밑에 카드가 뜨는 게 아니라, 헤더가 스스로 키를 키워 그 안에 담는다.
   그래서 판이 헤더와 같은 유리 위에 앉고 경계가 안 생긴다. */
export function MegaPanel({ ctl, entries }: { ctl: MenuCtl; entries: NavEntry[] }) {
  const pathname = usePathname();
  const { open, setOpen, cancelClose, scheduleClose } = ctl;
  const entry = entries.find((m) => m.label === open);
  const rows = entry?.columns ?? (entry?.items ? [{ title: "", items: entry.items }] : []);

  /* 하위 메뉴는 그 칸 바로 밑에 선다. 통 왼쪽 끝에서 시작하면
     어느 칸에서 나온 건지 알 수 없다. 칸의 x 를 재서 그만큼 민다. */
  const inRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = inRef.current;
    if (!box || !open) return;
    const trigger = document.querySelector<HTMLElement>(`[data-trigger="${open}"]`);
    if (!trigger) return;
    const t = trigger.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    /* 통은 좌우 여백을 갖는다. 그 여백 안쪽이 0 이라 빼 줘야 칸과 맞는다. */
    const pad = parseFloat(getComputedStyle(box).paddingLeft) || 0;
    /* 글자 왼쪽에 맞추되 통 밖으로는 안 나간다. 밀 수 있는 끝은 칸들이
       실제로 차지하는 폭으로 잰다 — 260 으로 박아 두었더니 서비스가
       넷으로 늘었을 때 오른쪽으로 삐져나갔다. */
    const cols = box.querySelector<HTMLElement>(".hdr-mega-cols");
    const colsW = cols ? cols.scrollWidth : 260;
    const x = Math.max(0, Math.min(t.left - b.left - pad, b.width - pad * 2 - colsW));
    box.style.setProperty("--mega-x", `${Math.round(x)}px`);

    /* 판 높이는 내용이 정한다. 15rem 에 붙박아 두니 인사이트처럼 줄이
       다섯인 판은 마지막 줄이 아래 테두리에 붙어 잘렸다.
       여백(--mega-x)이 0.24초에 걸쳐 밀리는데 높이는 밀기 전에 쟀다.
       다 밀리고 나서 칸이 접히면 그만큼 아래가 잘렸다(95px).
       내용 크기가 바뀔 때마다 다시 잰다. */
    const panel = box.parentElement;
    const fit = () => panel?.style.setProperty("--mega-h", `${Math.ceil(box.scrollHeight)}px`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    if (cols) ro.observe(cols);
    return () => ro.disconnect();
  }, [open, setOpen]);

  return (
    <div
      id="desktop-navigation-panel"
      className="hdr-mega"
      inert={!entry}
      data-open={entry ? "true" : "false"}
      onPointerEnter={cancelClose}
      onPointerLeave={scheduleClose}
      aria-hidden={!entry}
    >
      <div ref={inRef} className="hdr-mega-in max-w-[1600px] mx-auto px-6">
        {entry && (
          <>
            <div className="hdr-mega-cols">
              {rows.map((col, i) => (
                <div key={col.title || i}>
                  {col.title && <p className="hdr-mega-coltitle">{col.title}</p>}
                  <ul>
                    {col.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(null)}
                          aria-current={isOn(pathname, item.href) ? "page" : undefined}
                        >
                          <span className="hdr-mega-label">{item.label}</span>
                          {item.hint && <span className="hdr-mega-hint">{item.hint}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
