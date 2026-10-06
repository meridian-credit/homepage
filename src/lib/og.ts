import type { Metadata } from "next";
import { siteConfig } from "./constants";

/* 공유 카드(og:*).
 *
 * Next 는 openGraph 를 쪽마다 통째로 갈아 끼운다(얕은 병합).
 * - 쪽이 openGraph 를 안 적으면 layout 의 것, 곧 홈의 제목과 주소(og:url)를 그대로 물려받는다.
 *   어느 쪽을 카카오톡으로 보내도 홈 카드가 떴다.
 * - 하나라도 적으면 layout 의 그림 · 사이트 이름 · 언어가 다 사라진다. /blog · /faq 의 카드에 그림이
 *   없던 까닭이다.
 * 그래서 공통 칸을 여기 한 군데 두고, 쪽마다 제목 · 설명 · 주소만 바꾼다.
 * 그림은 SNS 캐시 때문에 주소를 바꾸지 않는다(/home-hero-poster.jpg). */
export const ogImage = { url: "/home-hero-poster.jpg", alt: "Meridian 세무·회계 자문" };

/* title 은 쪽 이름만 넘긴다. 카드에는 <title> 의 틀(「… | 회사 이름」)이 붙지 않아 여기서 붙인다. */
export function pageOpenGraph(
  path: string,
  title: string,
  description: string
): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    locale: "ko_KR",
    siteName: siteConfig.name,
    images: [ogImage],
    title: `${title} | ${siteConfig.name}`,
    description,
    url: path,
  };
}
