"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@admin/lib/auth-client";

const LINKS = [
  { href: "/", label: "오늘 할 일" },
  { href: "/schedule", label: "세무 일정" },
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/history", label: "변경 기록" },
];

export default function TopBar({ email, siteUrl }: { email: string; siteUrl?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <header className="top">
      <div className="top-in">
        <Link href="/" className="brand">메리디안 관리자</Link>
        <nav className="nav" aria-label="관리자 메뉴">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="who">
          {siteUrl ? (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer">사이트 보기</a>
          ) : null}
          <span>{email}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
