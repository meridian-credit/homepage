import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";
import { services, personas } from "@/lib/data";
import { sitePages } from "@/lib/constants";

/**
 * 검색 목록.
 *
 * 글 파일은 서버에서만 읽을 수 있어서 목록을 여기서 한 번 만든다.
 * 헤더 검색창이 이걸 받아 화면에서 거른다.
 * 글이 54개뿐이라 글자를 칠 때마다 서버로 물어볼 이유가 없다.
 */

export interface SearchItem {
  title: string;
  href: string;
  kind: "글" | "서비스" | "고객" | "페이지";
  hint: string;
  terms: string;
}

let cache: SearchItem[] | null = null;

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
  if (!cache) cache = build();
  return NextResponse.json(cache, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
