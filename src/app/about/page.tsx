import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import Image from "next/image";
import Link from "next/link";
import { members } from "@/lib/data";
import { siteConfig } from "@/lib/constants";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import HeroVideo from "@/components/layout/hero-video";
import KeepList from "@/components/about/keep-list";
import Wordmark from "@/components/brand/wordmark";
import MeridianGlobe from "@/components/about/meridian-globe";

/* ─────────────────────────────────────────────────────────────
   회사 소개.

   짜임은 넷이다 — 어디서 시작했나(이름) · 누가 맡나(사람) · 어떻게 하나
   (방식) · 어디에 있나(사무소). 그다음 맺음. 읽는 사람이 회사 소개에서
   찾는 순서 그대로다.

   글은 새로 쓰지 않는다. 사이트 안에 이미 있던 것을 모아 한 장으로 눌러
   담는다. 첫 화면은 다른 하위 페이지와 같은 틀을 쓴다 — 자오선 연출은
   홈에 하나만 둔다.
   ───────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "회사 소개",
  description: siteConfig.description,
  openGraph: pageOpenGraph("/about", "회사 소개", siteConfig.description),
  alternates: {
    canonical: "/about",
  },
};


export default function AboutPage() {
  const lead = members.find((m) => !m.placeholder);

  return (
    <>
      {/* ─── 첫 화면 ─── */}
      <section className="page-hero bg-deep text-white relative overflow-hidden">
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[16rem] font-bold leading-none tracking-tighter select-none">
            ABOUT
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          <AnimateOnScroll variant="fadeIn">
            <p className="text-xs tracking-[0.4em] text-on-deep-muted mb-6 uppercase">
              About
            </p>
          </AnimateOnScroll>

          {/* main(라이브)의 첫 화면 문구를 그대로 쓴다 — 로고 · Prime Meridian ·
              한 줄. 바탕과 짜임은 지금 것 그대로. */}
          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="abt-hero-logo">
              <Wordmark mark={false} />
            </h1>
          </AnimateOnScroll>

          <AnimateOnScroll variant="fadeIn" delay={0.3}>
            <p className="abt-hero-sub">Prime Meridian</p>
          </AnimateOnScroll>

          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.4} />
          </div>

          <AnimateOnScroll variant="fadeUp" delay={0.5}>
            <p className="abt-hero-lede">메리디안은 기준점을 제시해드립니다.</p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ─── ① 이름 ───
          글 왼쪽, 지구본 오른쪽. 홈 첫 화면에 도는 그 지구본이다 —
          이름의 뜻을 글로만 적으면 그냥 사전 풀이가 된다. */}
      <section id="name" className="abt-sec scroll-mt-32">
        <div className="abt-in abt-in--split">
          <AnimateOnScroll variant="fadeUp">
            <div className="abt-side">
              <p className="abt-eyebrow">Prime Meridian</p>
              <h2 className="abt-h">
                본초자오선<span className="green-dot">.</span>
              </h2>
              <div className="abt-body">
                {/* 앞은 사실, 뒤는 그래서 우리가 하는 말이다. 뒤가 결론이라
                    앞보다 커야 순서대로 읽힌다. */}
                <p className="abt-fact">
                  <span className="s">영국 그리니치 천문대를 지나는 <strong>경도 0°선</strong>.</span>
                  <span className="s">세계의 시간은 여기서 출발합니다.</span>
                  <span className="s">런던도, 서울도, 뉴욕도 이 한 선에 시각을 맞춥니다.</span>
                </p>
                <p className="abt-claim">
                  사업의 모든 결정에도 <strong>기준선</strong>이 필요합니다.
                </p>
              </div>
            </div>
          </AnimateOnScroll>

          <div className="abt-globe">
            <MeridianGlobe />
          </div>
        </div>
      </section>

      <div className="abt-rule" />

      {/* ─── ② 맡는 사람 ───
          사진 위에 검은 그라데이션을 덮고 그 위에 약속 한 줄. 사람 소개가
          아니라 「우리가 기준선이 된다」를 말하는 자리다.
          이력 전체는 /members 가 맡는다. */}
      {lead && (
        <section id="partner" className="abt-sec abt-sec--who scroll-mt-32">
          <div className="abt-in">
            <AnimateOnScroll variant="fadeUp">
              <figure className="who-hero">
                <Image
                  src={lead.image ?? "/images/founder.webp"}
                  alt={`${lead.name} ${lead.role}`}
                  width={1440}
                  height={900}
                  className="who-hero-img"
                  priority={false}
                />
                <figcaption className="who-hero-cap">
                  <p className="abt-eyebrow">People</p>
                  <h2 className="who-hero-h">
                    <span className="text-accent-bright">메리디안</span>이 그 기준선이
                    되어드리겠습니다<span className="green-dot">.</span>
                  </h2>
                </figcaption>
              </figure>
            </AnimateOnScroll>

            <AnimateOnScroll variant="fadeUp" delay={0.12}>
              <div className="who-under">
                <div className="who-say">
                  {/* 줄은 지정한 자리에서 끊는다. 앞줄이 주장이고 뒷줄이
                      그 근거라, 한 줄로 흘리면 둘이 뭉개진다. */}
                  <p>
                    <span className="s">
                      장부 한 줄을 어떻게 적느냐가 <strong>다음 결정의 근거</strong>가 됩니다.
                    </span>
                    <span className="s">
                      계정 분류 하나, 증빙 하나도 그 무게로 다룹니다.
                    </span>
                  </p>
                  <p>
                    <span className="s">
                      그래서 <strong>장부가 곧 자료</strong>입니다.
                    </span>
                    <span className="s">
                      대표가 다음 결정을 내릴 때 펼쳐 보는 자료.
                    </span>
                  </p>
                  <Link href="/members" className="abt-more">
                    전문 분야와 경력 보기 <span aria-hidden>&rarr;</span>
                  </Link>
                </div>

                {lead.practiceAreas && lead.practiceAreas.length > 0 && (
                  <div className="who-areas">
                    <p className="abt-eyebrow">Practice areas</p>
                    <ul>
                      {lead.practiceAreas.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      )}

      <div className="abt-rule" />

      {/* ─── ③ 지켜가는 방식 ───
          약속은 홈이 원본(무대 연출), 그 약속을 어떻게 지키는지는 여기가
          원본이다. */}
      <section id="keep" className="abt-sec abt-sec--soft scroll-mt-32">
        <div className="abt-in abt-in--left">
          <AnimateOnScroll variant="fadeUp">
            <p className="abt-eyebrow">How we keep it</p>
            <h2 className="abt-h">
              메리디안이 일하는 방식<span className="green-dot">.</span>
            </h2>
          </AnimateOnScroll>
          <div className="mt-14">
            <KeepList />
          </div>
        </div>
      </section>

      {/* ─── ④ 소속 ───
          main(라이브)의 Affiliation 구역을 그대로 쓴다. 이 글은 법정 업무를
          누구 명의로 하는지 밝히는 고지라, 손대면 안 되는 문장이다. */}
      <section id="office" className="abt-sec abt-affil-sec scroll-mt-32">
        <div className="abt-in abt-in--split">
          <AnimateOnScroll variant="fadeUp">
            <div className="abt-side">
              <p className="abt-eyebrow">Affiliation</p>
              <div className="abt-affil-rule" />
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll variant="fadeUp" delay={0.12}>
            <div className="abt-affil">
              {/* 법적 무게가 있는 문단이라 이름을 손으로 적지 않는다. 여기만 「메리디안
                  어드바이저리」로 남아 사이트의 다른 곳과 이름이 달랐다. */}
              <p>
                <strong>{siteConfig.name}</strong>는 박민상 공인회계사가
                운영하는 개인 자문 브랜드이며, 별도의 법인이 아닙니다.
              </p>
              <p>
                박민상 공인회계사는 <strong>동성회계법인</strong> 소속이며,{" "}
                {siteConfig.name}를 통해 수임하는 모든 업무는 동성회계법인과의
                계약에 따라 수행됩니다.
              </p>

              <div className="abt-direct">
                <p className="abt-eyebrow">Direct Contact</p>
                <p>
                  Kakao{" "}
                  <a
                    href={siteConfig.kakaoChannelUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    카카오톡 채널
                  </a>
                </p>
                <p>Email {siteConfig.email}</p>
                <p className="abt-direct-loc">{siteConfig.location}</p>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ─── 맺음. 서비스 상세와 같은 짜임을 쓴다. ─── */}
      <section className="svc-ask">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="svc-ask-in">
            <p className="svc-ask-lab">Contact</p>
            <h3>사업의 시작부터 다음 결정까지, 메리디안이 함께합니다</h3>
            <p className="svc-ask-p">
              지금 상황과 필요한 산출물을 짧게 보내주시면, 이 케이스에 들어맞는지부터 회신드립니다.
            </p>
            <div className="svc-ask-cta">
              <Link href="/contact" className="svc-ask-btn">
                기장 이관 상담하기 <span aria-hidden>&rarr;</span>
              </Link>
              <a href={`tel:${siteConfig.tel}`} className="svc-ask-btn svc-ask-btn--line">
                전화 문의
              </a>
            </div>
            <p className="svc-ask-note">상담은 무료입니다.</p>
          </div>
        </div>
      </section>
    </>
  );
}
