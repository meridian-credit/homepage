import { toSafeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Image from "next/image";
import { siteConfig } from "@/lib/constants";
import ContactForm from "@/components/contact/contact-form";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import { contactFaq } from "@/lib/faq";
import HeroVideo from "@/components/layout/hero-video";

export const metadata: Metadata = {
  title: "문의",
  description: "현재 상황과 필요한 서비스를 알려주시면 적용 범위와 다음 단계를 정리해 드립니다.",
  alternates: {
    canonical: "/contact",
  },
};

const contactInfo = [
  { label: "Kakao", value: "카카오톡 채널", href: siteConfig.kakaoChannelUrl, external: true },
  { label: "Email", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { label: "Location", value: siteConfig.location },
  { label: "Hours", value: "평일 09:00 - 18:00 · 사전 약속 권장" },
];

/* 검색엔진이 FAQ를 그대로 읽어가도록 같은 내용을 구조화해서 한 벌 더 넣는다. */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: contactFaq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};


export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero bg-deep text-white relative overflow-hidden">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[16rem] font-bold leading-none tracking-tighter select-none">
            CONTACT
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          <AnimateOnScroll variant="fadeIn">
            <p className="text-xs tracking-[0.4em] text-on-deep-muted mb-6 uppercase">
              Contact
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05] max-w-4xl">
              현재 상황을 알려주세요
            </h1>
          </AnimateOnScroll>
          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>
          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <p className="mt-8 text-lg text-neutral-400 max-w-3xl leading-relaxed">
              매출 규모, 기존 기장 여부, 가장 급한 이슈.
              <br />
              세 줄이면 충분합니다. 필요한 범위와 다음 단계를 회신드립니다.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
            <AnimateOnScroll variant="fadeUp" className="lg:col-span-7">
              <h2 className="t-h3 mb-10">
                문의 내용
              </h2>
              <ContactForm />
            </AnimateOnScroll>

            <AnimateOnScroll variant="fadeUp" delay={0.2} className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <p className="t-eyebrow mb-3">
                  Contact Details
                </p>
                <h2 className="t-h3 mb-10">
                  직접 연락처로 보내기
                </h2>
                <div className="space-y-0">
                  {contactInfo.map((info, i) => (
                    <div
                      key={i}
                      className="py-6 border-b border-border first:border-t"
                    >
                      <p className="t-label mb-2">
                        {info.label}
                      </p>
                      {"href" in info && info.href ? (
                        <a
                          href={info.href}
                          {...("external" in info && info.external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          className="text-foreground leading-relaxed hover:text-accent transition-colors"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-foreground leading-relaxed">
                          {info.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* 소속 고지. 박스에 가두면 각주처럼 보여서 그냥 꺼내 두고,
                    법정 업무 주체가 어디인지 눈에 걸리도록 파란색으로 둔다. */}
                <div className="mt-10">
                  <p className="t-label mb-3 text-accent">
                    Affiliation Notice
                  </p>
                  <p className="text-xs text-accent leading-relaxed">
                    {siteConfig.affiliation}
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* 폼을 보내기 전에 걸리는 것들. 눌러서 펴 보는 방식이라 화면이 길어지지 않는다. */}
      <section className="py-24 md:py-32 bg-card border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20">
            <AnimateOnScroll variant="fadeUp" className="lg:col-span-4">
              <p className="t-eyebrow mb-3">FAQ</p>
              <h2 className="t-h2">자주 묻는 질문</h2>
              <p className="t-desc mt-5" style={{ wordBreak: "keep-all" }}>
                여기에 없는 것은 문의에 적어 주세요. 같이 답을 드립니다.
              </p>
              {/* 답하는 사람은 대표 회계사다. /members 의 사진과 같은 사람을
                  그린 캐릭터. 「직접 답한다」는 말을 글로 한 번 더 쓰지 않고
                  그림으로 둔다. */}
              <Image
                src="/images/founder-3d-idea.png"
                alt=""
                aria-hidden
                width={360}
                height={360}
                className="mt-8 w-[148px] h-auto -ml-3 select-none"
              />
            </AnimateOnScroll>

            <AnimateOnScroll variant="fadeUp" delay={0.15} className="lg:col-span-8">
              <div className="border-t border-border">
                {contactFaq.map((item) => (
                  <details
                    key={item.q}
                    name="contact-faq"
                    className="faq-item border-b border-border"
                  >
                    <summary className="faq-q">
                      <span className="t-h4" style={{ wordBreak: "keep-all" }}>
                        {item.q}
                      </span>
                      <span className="faq-mark" aria-hidden />
                    </summary>
                    <p className="t-body text-muted faq-a" style={{ wordBreak: "keep-all" }}>
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(faqJsonLd) }}
      />
    </>
  );
}
