"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef } from "react";
import { CONTENT_TYPES, NAV_GROUPS, type ContentKind } from "@admin/content/registry";
import { authClient } from "@admin/lib/auth-client";
import { DRAFT_PREFIX } from "@admin/editing/use-editor";
import { BrandMark, Icon } from "./icons";

/* 관리자 화면의 틀: 왼쪽 메뉴(넓은 화면), 머리줄 + 메뉴 시트(960px 이하).
   메뉴는 콘텐츠 종류 목록(registry)에서 나온다. 종류가 8개로 늘어도 모양은 그대로다.
   점(•)은 손볼 일이 있을 때만 단다 — 늘 붙어 있으면 아무도 안 본다. */

type Alerts = Partial<Record<ContentKind, "warn" | "danger">>;
type User = { name: string; username: string };

export function Shell({
  user,
  siteUrl,
  siteLabel,
  alerts,
  children,
}: {
  user: User;
  siteUrl?: string;
  siteLabel: string;
  alerts: Alerts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const current = pathname === "/" ? "홈" : (CONTENT_TYPES.find((t) => pathname.startsWith(t.href))?.label ?? (pathname.startsWith("/history") ? "변경 기록" : "사이트 관리"));

  /* 메뉴 시트에서 다른 쪽으로 옮기면 시트를 닫는다. */
  useEffect(() => {
    sheet.current?.close();
  }, [pathname]);

  return (
    <>
      <a className="skip" href="#main">
        본문으로 건너뛰기
      </a>
      <div className="shell">
        <aside className="sidebar" aria-label="관리자 메뉴">
          <Brand />
          <Nav pathname={pathname} alerts={alerts} />
          <SidebarFoot user={user} siteUrl={siteUrl} siteLabel={siteLabel} />
        </aside>

        <header className="topbar">
          <button type="button" className="icon-btn" aria-label="메뉴 열기" onClick={() => sheet.current?.showModal()}>
            <Icon name="menu" />
          </button>
          <span className="topbar-title">{current}</span>
          {siteUrl ? (
            <a className="icon-btn" href={siteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${siteLabel} (새 창)`}>
              <Icon name="external" />
            </a>
          ) : null}
        </header>

        <main className="main" id="main">
          <div className="main-in">{children}</div>
        </main>
      </div>

      <dialog
        className="sheet"
        ref={sheet}
        aria-label="메뉴"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="sheet-head">
          <Brand />
          <button type="button" className="icon-btn" aria-label="메뉴 닫기" onClick={() => sheet.current?.close()}>
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <Nav pathname={pathname} alerts={alerts} />
          <SidebarFoot user={user} siteUrl={siteUrl} siteLabel={siteLabel} />
        </div>
      </dialog>
    </>
  );
}

function Brand() {
  return (
    <Link className="brand" href="/">
      <BrandMark />
      <span className="brand-word">
        <strong>MERIDIAN</strong>
        <span>사이트 관리</span>
      </span>
    </Link>
  );
}

function Nav({ pathname, alerts }: { pathname: string; alerts: Alerts }) {
  const at = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)) || undefined;
  return (
    <nav className="nav" aria-label="주 메뉴">
      <Link className="nav-item" href="/" aria-current={at("/") && "page"}>
        <Icon name="home" />홈
      </Link>
      {NAV_GROUPS.map((group) => (
        <Fragment key={group.key}>
          <div className="nav-label">{group.label}</div>
          {CONTENT_TYPES.filter((t) => t.group === group.key).map((t) => (
            <Link key={t.kind} className="nav-item" href={t.href} aria-current={at(t.href) && "page"}>
              <Icon name={t.icon} />
              {t.label}
              {alerts[t.kind] ? (
                <span className={`dot ${alerts[t.kind] === "danger" ? "danger" : ""}`} role="img" aria-label="확인 필요" />
              ) : null}
            </Link>
          ))}
        </Fragment>
      ))}
      <div className="nav-sep" role="separator" />
      <Link className="nav-item" href="/history" aria-current={at("/history") && "page"}>
        <Icon name="history" />
        변경 기록
      </Link>
    </nav>
  );
}

function SidebarFoot({ user, siteUrl, siteLabel }: { user: User; siteUrl?: string; siteLabel: string }) {
  const router = useRouter();
  return (
    <div className="sidebar-foot">
      {siteUrl ? (
        <a className="nav-item" href={siteUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="external" />
          {siteLabel}
          <span className="sr-only">(새 창)</span>
        </a>
      ) : null}
      <div className="who">
        <span className="avatar" aria-hidden="true">
          {(user.name || user.username).slice(0, 1).toUpperCase()}
        </span>
        <span className="who-name">
          <strong>{user.name || user.username}</strong>
          {user.name && user.name !== user.username ? <span>{user.username}</span> : null}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="로그아웃"
          title="로그아웃"
          onClick={async () => {
            /* 이 기기에 보관한 작업본도 지운다(함께 쓰는 컴퓨터). */
            try {
              Object.keys(localStorage)
                .filter((k) => k.startsWith(DRAFT_PREFIX))
                .forEach((k) => localStorage.removeItem(k));
            } catch {}
            await authClient.signOut().catch(() => undefined);
            router.replace("/login");
            router.refresh();
          }}
        >
          <Icon name="logout" />
        </button>
      </div>
    </div>
  );
}
