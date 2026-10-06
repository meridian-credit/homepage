import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { members } from "@/lib/data";
import SectionHeading from "@/components/ui/section-heading";
import { AnimateOnScroll, StaggerChildren, LineReveal } from "@/components/motion";
import { StaggerItem } from "@/components/motion/stagger-item";
import HeroVideo from "@/components/layout/hero-video";

export const metadata: Metadata = {
  title: "회계사 소개",
  description: "메리디안 택스 어드바이저리의 사람을 소개합니다.",
  openGraph: pageOpenGraph("/members", "회계사 소개", "메리디안 택스 어드바이저리의 사람을 소개합니다."),
  alternates: {
    canonical: "/members",
  },
};

export default function PeoplePage() {
  const lead = members.find((m) => !m.placeholder);
  const placeholders = members.filter((m) => m.placeholder);

  return (
    <>
      {/* Hero */}
      <section className="page-hero bg-deep text-white relative overflow-hidden">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[16rem] font-bold leading-none tracking-tighter select-none">
            PEOPLE
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          <AnimateOnScroll variant="fadeIn">
            <p className="text-xs tracking-[0.4em] text-on-deep-muted mb-6 uppercase">
              People
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
              일하는 사람
            </h1>
          </AnimateOnScroll>
          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>
          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <p className="mt-8 text-lg text-neutral-400 max-w-xl leading-relaxed">
              기장도, 신고도, 자문도.
              같은 사람이 처음부터 끝까지 봅니다.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Founder */}
      {lead && (
        <section className="py-24 md:py-32">
          <div className="max-w-[1600px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Photo */}
              <div className="bg-card border border-border overflow-hidden">
                {lead.image ? (
                  <Image
                    src={lead.image}
                    alt={`${lead.name} ${lead.role}`}
                    width={900}
                    height={1200}
                    sizes="(min-width: 1024px) 50vw, calc(100vw - 48px)"
                    className="w-full"
                    style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top" }}
                  />
                ) : (
                  <div className="flex items-center justify-center" style={{ aspectRatio: "1/1" }}>
                    <span className="text-[10rem] md:text-[14rem] font-bold text-neutral-200/60 select-none">
                      {lead.name[0]}
                    </span>
                  </div>
                )}
              </div>
              {/* Info */}
              <AnimateOnScroll variant="fadeUp" delay={0.15}>
                <p className="t-eyebrow mb-4">
                  Founder
                </p>
                <h2 className="t-h2">
                  {lead.name}
                </h2>
                <p className="t-subtitle mt-2">{lead.role}</p>
                <div className="mt-6 h-px w-16 bg-accent" />
                {lead.description && (
                  <p className="t-desc mt-6">
                    {lead.description}
                  </p>
                )}

                {lead.practiceAreas && lead.practiceAreas.length > 0 && (
                  <div className="mt-10">
                    <p className="t-label mb-4">
                      전문 영역 · Service Areas
                    </p>
                    <div className="space-y-3">
                      {lead.practiceAreas.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                          <p className="text-sm text-muted leading-relaxed">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lead.credentials && lead.credentials.length > 0 && (
                  <div className="mt-10">
                    <p className="t-label mb-4">
                      자격 · 학력
                    </p>
                    <div className="space-y-3">
                      {lead.credentials.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                          <p className="text-sm text-muted leading-relaxed">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-10">
                  <p className="t-label mb-4">
                    경력
                  </p>
                  <div className="space-y-3">
                    {lead.experience.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>
      )}

      {placeholders.length > 0 && (
        <>
          <hr className="section-divider" />

          {/* Coming Soon — TBD collaborators */}
          <section className="py-24 md:py-32 bg-card">
            <div className="max-w-[1600px] mx-auto px-6">
              <AnimateOnScroll>
                <SectionHeading
                  label="Joining Soon"
                  title="함께하실 분을 모십니다"
                  align="left"
                />
              </AnimateOnScroll>
              <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                {placeholders.map((member, idx) => (
                  <StaggerItem key={`${member.name}-${idx}`}>
                    <div className="border border-dashed border-border bg-white p-10 md:p-12 group hover:border-foreground transition-colors duration-300">
                      <div className="flex items-center gap-6 mb-6">
                        <div className="relative w-20 h-20 rounded-full bg-card border border-dashed border-border flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-subtle">
                            ?
                          </span>
                        </div>
                        <div>
                          <p className="t-label mb-1">
                            {member.role}
                          </p>
                          <h3 className="t-h4">
                            {member.name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted leading-relaxed mb-6">
                        {member.description}
                      </p>
                      <div className="pt-6 border-t border-border">
                        {member.experience.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2">
                            <span className="w-1 h-1 rounded-full bg-subtle mt-2 flex-shrink-0" />
                            <p className="text-xs text-muted leading-relaxed">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/contact"
                        className="mt-6 inline-flex items-center text-xs font-medium tracking-wider hover-underline"
                      >
                        관심 있으시면 연락주세요
                        <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                          &rarr;
                        </span>
                      </Link>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          </section>
        </>
      )}
    </>
  );
}
