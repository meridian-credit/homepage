import { toSafeJsonLd } from "@/lib/json-ld";
/* 자주 묻는 질문.
 *
 * 원래는 /blog 안의 탭이었다. 상단 메뉴에 FAQ 칸이 생겼는데 누르면
 * 인사이트 페이지가 열리고 그 안에서 탭이 하나 바뀌는 식이라, 목록을
 * 지나야 문답에 닿았고 「블로그 안의 무엇」으로 읽혔다.
 * 글 모음과 문답은 읽는 목적이 다르다. 쪽을 따로 둔다.
 *
 * 생김새는 /blog 과 같다 — 짙은 첫 화면 + 영상, 그 아래 같은 폭의 목록.
 * 두 쪽이 형제라, 넘어갈 때 다른 사이트처럼 보이면 안 된다.
 * blog-hero 를 같이 쓰는 이유는 손 안에서 첫 화면을 접는 규칙까지
 * 그대로 물려받기 위해서다.
 *
 * 답은 src/lib/faq.ts 하나에서 온다 — 컨택트 페이지도 같은 것을 본다.
 */

import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import { contactFaq } from "@/lib/faq";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import HeroVideo from "@/components/layout/hero-video";
import FaqList from "./faq-list";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "상담 전에 자주 나오는 질문과 답. 회신 시점, 비용, 기장 이관, 준비 서류를 먼저 적어 둡니다.",
  openGraph: pageOpenGraph(
    "/faq",
    "자주 묻는 질문",
    "상담 전에 자주 나오는 질문과 답. 회신 시점, 비용, 기장 이관, 준비 서류를 먼저 적어 둡니다."
  ),
  alternates: { canonical: "/faq" },
};

/* 검색엔진이 문답을 그대로 읽게 둔다. 접혀 있어도 구조는 남는다. */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: contactFaq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(faqJsonLd) }}
      />

      <section className="blog-hero page-hero relative overflow-hidden bg-deep text-white">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute right-[-2.5rem] top-1/2 -translate-y-1/2 select-none text-[16rem] font-bold leading-none tracking-tighter">
            FAQ
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1600px] px-6">
          <AnimateOnScroll variant="fadeIn">
            <p className="mb-6 text-xs uppercase tracking-[0.4em] text-on-deep-muted">
              FAQ
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tighter md:text-6xl">
              자주 묻는 질문
            </h1>
          </AnimateOnScroll>

          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>

          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-400">
              상담 전에 자주 나오는 것부터 적어 둡니다.
              여기에 없는 것은 문의에 적어 주세요. 같이 답을 드립니다.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* 목록은 /blog 과 같은 통(.ins / .ins-in)을 쓴다. 폭과 여백이
          한 픽셀이라도 다르면 두 쪽을 오갈 때 판이 흔들린다. */}
      <section className="ins ins--faq">
        <div className="ins-in">
          <div className="ins-bar ins-bar--faq">
            <div className="ins-tabs">
              <span className="is-on">자주 묻는 질문</span>
            </div>
            <p className="ins-count">{contactFaq.length}개</p>
          </div>

          <AnimateOnScroll variant="fadeUp">
            <FaqList items={contactFaq} />
          </AnimateOnScroll>
        </div>
      </section>
    </>
  );
}
