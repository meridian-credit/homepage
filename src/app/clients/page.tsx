import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import Link from "next/link";
import { personas, services } from "@/lib/data";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import HeroVideo from "@/components/layout/hero-video";
import StagePicker from "@/components/clients/stage-picker";

const description =
  "설립 직후부터 성장기, 중요한 결정 직전까지. 단계별로 필요한 세무 서비스를 정리합니다.";

export const metadata: Metadata = {
  title: "고객 유형별 안내",
  description,
  openGraph: pageOpenGraph("/clients", "고객 유형별 안내", description),
  alternates: {
    canonical: "/clients",
  },
};

export default function WhoPage() {
  return (
    <>
      <section className="page-hero bg-deep text-white relative overflow-hidden">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[16rem] font-bold leading-none tracking-tighter select-none">
            WHO
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          <AnimateOnScroll variant="fadeIn">
            <p className="text-xs tracking-[0.4em] text-on-deep-muted mb-6 uppercase">
              Who
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05] max-w-4xl">
              대표의 단계마다
              <br />
              필요한 일이 다릅니다
            </h1>
          </AnimateOnScroll>
          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>
          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <p className="mt-8 text-lg text-neutral-400 max-w-3xl leading-relaxed svc-desc--lines">
              {"설립 직후엔 기장 기준을 세웁니다.\n성장기엔 신고와 조정을 다시 잡습니다. 큰 결정 앞에선 세부담부터 비교합니다."}
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* 단계 셋. 한 번에 하나씩 본다 — 세로로 이어 붙이면 페이지가
          4,200px 이 되는데, 읽는 사람은 자기 단계 하나만 본다. */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1600px] mx-auto px-6">
          <StagePicker personas={personas} services={services} />
        </div>
      </section>

      <AnimateOnScroll variant="fadeIn">
        <section className="py-24 md:py-32 bg-deep text-white">
          <div className="max-w-[1600px] mx-auto px-6 text-center">
            <AnimateOnScroll variant="fadeUp">
              <p className="t-eyebrow t-eyebrow-d t-eyebrow-c mb-6">
                Contact
              </p>
              <h2 className="t-h2 max-w-3xl mx-auto">
                지금 어디가 막혔습니까
                <br />
                그 자리부터 보겠습니다
              </h2>
              <p className="t-desc t-desc-d mt-6 max-w-2xl mx-auto">
                매출 규모와 기존 기장 여부, 가장 급한 이슈 한 줄이면 충분합니다.
              </p>
              <Link
                href="/contact"
                className="group mt-10 inline-flex items-center btn-blue rounded-[10px] px-10 py-4 text-sm font-medium tracking-wider transition-all duration-300 hover:tracking-widest"
              >
                문의하기
                <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </Link>
            </AnimateOnScroll>
          </div>
        </section>
      </AnimateOnScroll>
    </>
  );
}
