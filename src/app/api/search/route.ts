import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";
import { services, personas } from "@/lib/data";
import { sitePages } from "@/lib/constants";

/**
 * 검색 목록.
 *
 * 글은 서버에서만 읽을 수 있어서(관리자 DB) 목록을 여기서 만든다.
 * 헤더 검색창이 이걸 받아 화면에서 거른다.
 * 글이 수십 편이라 글자를 칠 때마다 서버로 물어볼 이유가 없다.
 *
 * 정적 응답으로 담아 두고, 관리자가 글을 게시 · 내리면 다른 쪽과 함께 다시 만든다(/api/revalidate).
 * 예전에는 모듈 변수에 담아 두어 서버를 다시 띄우기 전까지 새 글이 검색되지 않았다.
 * 브라우저도 5분만 들고 있게 한다 — 1시간이면 방금 게시한 글이 그 사람의 검색에 한 시간 동안 안 나온다.
 */
export const dynamic = "force-static";

export interface SearchItem {
  title: string;
  href: string;
  kind: "글" | "서비스" | "고객" | "페이지";
  hint: string;
  terms: string;
}

function build(): SearchItem[] {
  const items: SearchItem[] = [];

  for (const p of getAllPosts()) {
    items.push({
      title: p.title,
      href: `/blog/${p.slug}`,
      kind: "글",
      hint: p.category,
      terms: `${p.title} ${p.description} ${p.category} ${p.keywords.join(" ")}`,
    });
  }

  for (const s of services) {
    items.push({
      title: s.title,
      href: `/services/${s.slug}`,
      kind: "서비스",
      hint: "PRACTICE",
      terms: `${s.title} ${s.description} ${s.details.join(" ")} ${(s.keywords ?? []).join(" ")}`,
    });
  }

  for (const p of personas) {
    items.push({
      title: p.title,
      href: `/clients#${p.slug}`,
      kind: "고객",
      hint: p.englishLabel,
      terms: `${p.title} ${p.englishLabel} ${p.description} ${p.bottlenecks.join(" ")}`,
    });
  }

  /* 상단 메뉴만 색인하면 메뉴에 없는 페이지는 검색해도 안 나온다.
     수임료·회계사 소개가 그렇게 빠져 있었다. 이제 전체 목록을 본다. */
  for (const l of sitePages) {
    items.push({ title: l.label, href: l.href, kind: "페이지", hint: l.hint, terms: `${l.label} ${l.hint} ${l.terms ?? ""}` });
  }

  return items;
}

export async function GET() {
  return NextResponse.json(build(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
