import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import Link from "next/link";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import HeroVideo from "@/components/layout/hero-video";
import ServicePicker from "@/components/services/service-picker";

const description =
  "세무자문 · 회계감사 · 회계자문 · 재무자문. 네 갈래 아래 여덟 가지 업무를 안내합니다.";

export const metadata: Metadata = {
  title: "서비스",
  description,
  openGraph: pageOpenGraph("/services", "서비스", description),
  alternates: {
    canonical: "/services",
  },
};

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero bg-deep text-white relative overflow-hidden">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[16rem] font-bold leading-none tracking-tighter select-none">
            SERVICE
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          <AnimateOnScroll variant="fadeIn">
            <p className="text-xs tracking-[0.4em] text-on-deep-muted mb-6 uppercase">
              Service
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05] max-w-4xl">
              서비스 범위
            </h1>
          </AnimateOnScroll>
          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>
          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            <p className="mt-8 text-lg text-neutral-400 max-w-3xl leading-relaxed">
              세무자문 · 회계감사 · 회계자문 · 재무자문.
              네 갈래 아래에 여덟 가지 업무가 있습니다.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ─── 목차 ───
          아래 붙잡는 스크롤은 한 번에 하나씩만 보여준다. 여섯 개가 뭐가
          있는지 훑고 싶은 사람은 여기서 바로 고르고, 읽고 싶은 사람만
          아래로 내려간다. 상단 메뉴의 「서비스」 판과 같은 목록이다. */}
      <section className="py-20 md:py-24">
        <div className="max-w-[1600px] mx-auto px-6">
          <AnimateOnScroll variant="fadeUp">
            {/* 이 구역의 제목. 없으면 아래 서비스 이름(h3)이 h1 바로 밑에 서서 제목 단계가 건너뛴다. */}
            <h2 className="t-eyebrow mb-8"><span aria-hidden="true">SERVICE</span><span className="sr-only">서비스 목록</span></h2>
          </AnimateOnScroll>
          <ServicePicker />
        </div>
      </section>

      {/* 붙잡는 스크롤을 없앴다.
          여섯 개를 한 번에 하나씩 넘겨 보여주는 구간이었는데, 같은 여섯 개가
          위 목차에도 있고 상세 여섯 장에도 있었다. 세 번째였다. */
      }

      {/* ─── 1년의 흐름 ─── */}
      <section className="py-24 md:py-32 bg-card border-y border-border overflow-x-clip">
        <div className="max-w-[1600px] mx-auto px-6">
          <AnimateOnScroll variant="fadeUp">
            <p className="t-eyebrow mb-8">
              Annual Flow
            </p>
            <h2
              className="t-h2 max-w-3xl"
              style={{ wordBreak: "keep-all" }}
            >
              1년의 흐름.
            </h2>
            <div className="mt-8 h-px w-12 bg-accent" />
            <p className="t-desc mt-8 max-w-2xl">
              매월 어느 일정이 돌아가고, 그 사이에 무엇을 하는지.
              {/* 뒷문장이 이 장의 답이다. 앞문장에 붙여 두면 한 문단으로
                  뭉개져서, 정작 읽어야 할 한 줄이 안 보인다. */}
              <span className="yflow-lede">
                기장은 매일, 신고는 분기, 자문은 결정이 닥칠 때.
              </span>
            </p>
          </AnimateOnScroll>

          <ol className="yflow mt-16">
            {[
              {
                q: "Q1",
                months: "1 – 3월",
                deadlines: [
                  "1.25 · 부가세 2기 확정신고",
                  "2.10 · 면세사업장 현황",
                  "3.31 · 법인세 신고 (12월 결산)",
                ],
                role: "전년 결산을 닫고, 법인세 절세 라인을 마무리. 새해 장부 기준을 다시 잡습니다.",
              },
              {
                q: "Q2",
                months: "4 – 6월",
                deadlines: [
                  "4.25 · 부가세 1기 예정신고",
                  "5.31 · 종합소득세 신고",
                  "6.30 · 성실신고확인서 제출",
                ],
                role: "종소세 절세선을 다시 보고, 성실신고 라인을 잡습니다. 1분기 결산도 이때 점검.",
              },
              {
                q: "Q3",
                months: "7 – 9월",
                deadlines: [
                  "7.25 · 부가세 1기 확정신고",
                  "8.31 · 법인세 중간예납",
                ],
                role: "반기 결산을 끊고, 하반기 절세 방향을 다시 잡습니다. 자료도 이때 정돈.",
              },
              {
                q: "Q4",
                months: "10 – 12월",
                deadlines: [
                  "10.25 · 부가세 2기 예정신고",
                  "11.30 · 종합소득세 중간예납",
                  "12월 · 결산 사전 정리",
                ],
                role: "연말 결산을 미리 다듬어두고, 다음 해 그림을 그립니다. 큰 의사결정이 몰리는 분기.",
              },
            ].map((item, i) => (
              <li key={item.q} className="yflow-q">
                {/* 눈금 위의 점. 선은 목록 전체가 하나로 긋는다 —
                    칸마다 그으면 사이가 끊겨 계단처럼 보인다. */}
                <span className="yflow-dot" aria-hidden />
                <p className="yflow-label">
                  <b>{item.q}</b>
                  <span>{item.months}</span>
                </p>

                {/* 열두 달 중 이 분기가 어디인지. 글로 「1 – 3월」이라 적어 두면
                    한 해에서 어느 자리인지가 안 잡힌다. */}
                <span className="yflow-months" aria-hidden>
                  {Array.from({ length: 12 }, (_, m) => (
                    <i key={m} className={Math.floor(m / 3) === i ? "on" : ""} />
                  ))}
                </span>
                <ul className="yflow-dl">
                  {item.deadlines.map((d) => {
                    const [head, ...rest] = d.split(" · ");
                    const body = rest.length ? rest.join(" · ") : head;
                    /* 세목을 색으로 나눈다. 열두 줄이 다 같은 검정이면
                       무엇이 되풀이되는 일인지 안 보인다. */
                    const kind = body.includes("부가세")
                      ? "vat"
                      : body.includes("법인세")
                        ? "corp"
                        : body.includes("소득세") || body.includes("성실신고")
                          ? "inc"
                          : "etc";
                    return (
                      <li key={d}>
                        <span className="yflow-m">{rest.length ? head : ""}</span>
                        <span className="yflow-t">
                          <i className={`yflow-k yflow-k--${kind}`} aria-hidden />
                          {body}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="yflow-role">{item.role}</p>
                <span className="yflow-i" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>

          {/* 원천세는 Q3 안에 끼워 두면 3분기 일로 읽힌다. 열두 번 돌아오는
              일이라 넷 아래 따로 한 줄을 둔다. */}
          <p className="yflow-every">
            <span className="yflow-every-lab">매월</span>
            <span className="yflow-every-d">10일</span>
            <i className="yflow-k yflow-k--etc" aria-hidden />
            원천세 신고 · 납부
          </p>

          {/* 여기 날짜는 해마다 같은 법정 기한이다. 헤더의 일정은 올해 실제 마감일이라 휴일이면
              하루 이틀 밀린다(2026년 10.25 → 10.26). 그 차이를 적어 두지 않으면 둘 중 하나가
              틀린 것으로 읽힌다. */}
          <p className="mt-10 text-xs text-muted leading-relaxed">
            ※ 국세청 기준 주요 신고·납부 법정 기한. 기한이 토요일·일요일·공휴일이면 그다음 날까지입니다.
            담당 법인의 신고 의무 및 마감일은 실제와 상이할 수 있습니다.
          </p>
        </div>
      </section>

      {/* CTA */}
      <AnimateOnScroll variant="fadeIn">
        <section className="py-24 md:py-32 bg-deep text-white">
          <div className="max-w-[1600px] mx-auto px-6 text-center">
            <AnimateOnScroll variant="fadeUp">
              <p className="t-eyebrow t-eyebrow-d t-eyebrow-c mb-6">
                Contact
              </p>
              <h2 className="t-h2">
                어디서부터 시작할지
                <br className="hidden md:block" />
                같이 짚어 보겠습니다
              </h2>
              <p className="t-desc t-desc-d mt-6 max-w-2xl mx-auto">
                지금 가장 급한 이슈 한 줄이면 충분합니다. 들어맞는 범위부터 추려 회신드립니다.
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
