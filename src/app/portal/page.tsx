import EvidenceDemo from "@/components/home/evidence-demo";
import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import { orderedServices } from "@/lib/constants";
import { siteConfig } from "@/lib/constants";
import PromoMotion from "@/components/home/promo-motion";
import ServiceMerge from "@/components/home/service-merge";
import SchedulePopup, { ScheduleButton } from "@/components/home/schedule-popup";
import "../promo.css";

/* 이번 분기 주요 일정. 홈에 있던 것을 그대로 가져왔다.
   D-day 는 적지 않는다. 하루만 지나도 틀린 숫자가 화면에 남는다. */
import { scheduleDates as SCHEDULE_DATES } from "@/lib/schedule";

const title = "회계사가 정리한 자료를 한 화면에서 보는 세무 대시보드";
const description =
  "기장을 맡기시면 회사 전용 세무 대시보드가 무료로 제공됩니다. 홈택스·카드·통장 자료를 매일 자동으로 모으고, 지금 이 순간의 손익과 부가세를 봅니다.";

export const metadata: Metadata = {
  alternates: { canonical: "/portal" },
  title,
  description,
  openGraph: pageOpenGraph("/portal", title, description),
};

/* 대시보드 이야기만 모아둔 페이지.
   홈에 길게 붙어 있던 구간을 통째로 옮겼다 — 지운 것은 없다.
   홈은 메리디안이 어떤 곳인지 말하고, 숫자와 화면 이야기는 여기서 한다. */
export default function Portal() {
  return (
    <div className="promo">
      <PromoMotion />
      {/* 여긴 홈이 아니다. 들어오자마자 뜨지 않고, 아래 버튼을 눌렀을 때만 연다. */}
      <SchedulePopup items={SCHEDULE_DATES} trigger="schedOpen" auto={false} />

      {/* 우측 앵커. 선과 빈 원. 원하는 데만 보고 갈 수 있게. */}
      <nav className="anchor" id="anchor" aria-label="구역 바로가기">
        <a href="#top" data-sec="top"><span className="lb">처음</span><span className="cir"></span></a>
        <a href="#stats" data-sec="stats"><span className="lb">따라오는 것</span><span className="cir"></span></a>
        <a href="#feat" data-sec="feat"><span className="lb">고객 화면</span><span className="cir"></span></a>
        <a href="#menu" data-sec="menu"><span className="lb">지원 기능</span><span className="cir"></span></a>
        <a href="#evid" data-sec="evid"><span className="lb">근거</span><span className="cir"></span></a>
        <a href="#flow" data-sec="flow"><span className="lb">시작하기</span><span className="cir"></span></a>
        <a href="#vs" data-sec="vs"><span className="lb">비교</span><span className="cir"></span></a>
        <a href="#end" data-sec="end"><span className="lb">상담</span><span className="cir"></span></a>
      </nav>

      <div id="top">

      {/* 1. 히어로 */}
      <section className="hero">
        {/* 글 + 모이는 화면. 다 모이고 문구가 뜰 때까지 화면에 붙잡아 둔다. */}
        <div className="hero-hold">
        <div className="wrap">
          <div className="hero-grid">
            {/* 왼쪽 글. 카드가 다 모이면 물러난다 — 그 뒤는 대시보드 차례다.
                투명도는 service-merge 가 스크롤에 맞춰 넣는다. */}
            <div className="hero-copy">
          <p className="tick">Meridian만의 특별한 서비스</p>
          <h1><span className="c">회계사가 정리한 자료를,</span><span className="c">한 화면에서<span className="dot-b">.</span></span></h1>
          <p className="hero-sub"><span className="c">기장을 맡기시면</span><span className="c"><b>회사 전용 세무 대시보드</b>가 무료로 제공됩니다.</span></p>
          <div className="hero-cta">
            <a className="btn btn-fill" href="#end">기장 이관 상담하기</a>
            {/* 홈의 같은 버튼과 같은 곳(고객 전용 로그인 화면)으로 간다. 이름도 같게 —
                같은 일을 하는 버튼은 어디서든 같은 이름이어야 한다. 가입이 없는 화면이라
                「시작하기」가 아니라 「로그인」이다. */}
            <a
              className="btn btn-line"
              href={siteConfig.clientPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              고객 대시보드 로그인
            </a>
          </div>
          <p className="cta-note"><span className="s">상담은 무료입니다.</span><span className="s">쓰던 사무소에서 넘어오는 절차는 저희가 처리합니다.</span></p>
          {/* 팝업을 닫아도 여기서 다시 연다 */}
          <ScheduleButton items={SCHEDULE_DATES} />
            </div>

            {/* 일정표가 있던 자리. 흩어진 서비스가 한 장으로 모인다.
                일정은 팝업으로 뺐다 — 히어로의 '일정 보기' 버튼으로 다시 연다. */}
            <ServiceMerge items={orderedServices.map(s => ({ slug: s.slug, title: s.title }))} />
          </div>
        </div>
        </div>

        {/* 붙잡힌 구간을 지나면 대시보드가 이어받는다 */}
        <div className="wrap">
          {/* 빈 흰 네모 안에 뜨는 문구. .stage 밖에 둔다 —
              .stage 는 투명도 0 에서 시작하므로 그 안에 넣으면 같이 숨는다. */}
          <p className="svm-label" aria-hidden="true">
            따로 퍼져있던 일이 <span className="hl">한 화면</span>으로 모입니다.
          </p>

          <div className="stage">
            <div className="shot" id="shot">
              <div className="shot-win" id="shotWin">
                <div className="shot-caption" id="shotCap"></div>
                {/* 실제 홈 화면 그대로. 캡처가 아니라 요소로 그린다. */}
                <div className="db" role="img" aria-label="MERIDIAN 세무 대시보드 홈 화면 예시">
                  <aside className="db-side">
                    <p className="db-brand">MERIDIAN<span>TAX &amp; ADVISORY</span></p>
                    <p className="db-co">㈜메리디안 데모</p>
                    <p className="db-gr">개요</p>
                    <p className="db-mi on">홈</p>
                    <p className="db-gr">증빙</p>
                    <p className="db-mi">세금계산서</p><p className="db-mi">현금영수증</p>
                    <p className="db-mi">신용카드</p><p className="db-mi">통장</p>
                    <p className="db-gr">장부·신고</p>
                    <p className="db-mi">분개·전표</p><p className="db-mi">재무제표</p><p className="db-mi">부가세 리포트</p>
                    <p className="db-gr">인건비</p>
                    <p className="db-mi">급여 입력</p><p className="db-mi">임직원 관리</p>
                  </aside>

                  <div className="db-main">
                    <header className="db-bar">
                      <span className="db-pick"><i></i>㈜메리디안 데모</span>
                      <span className="db-search">거래처, 금액, 증빙 검색<b>⌘K</b></span>
                      <span className="db-live"><i></i>반영 08-10 03:35</span>
                    </header>

                    <div className="db-body">
                      <p className="db-eyebrow">종합 현황</p>
                      <div className="db-h1row">
                        <p className="db-h1">한눈에 보는 우리 회사</p>
                        <div className="db-seg"><span className="on">최근 반영월</span><span>올해</span><span>지난분기</span><span>이번분기</span><span>지난달</span><span>이번달</span></div>
                      </div>
                      <p className="db-tagline"><b>2026년 7월 확정자료</b> 국세청 수집자료 기준</p>

                      <section className="db-card" data-hs="cash">
                        <p className="db-ey">TODAY CASH</p>
                        <p className="db-ct">오늘 현금 현황</p>
                        <p className="db-cs">최종 통장 업로드 08. 09. 03:35 · 2026-08 기준</p>
                        <div className="db-cells">
                          <div><p className="k">오늘 입금</p><p className="v num up">0원</p></div>
                          <div><p className="k">오늘 출금</p><p className="v num dn">0원</p></div>
                          <div><p className="k">이번 달 순현금</p><p className="v num up">0원</p></div>
                          <div><p className="k">미처리</p><p className="v num">0건</p><p className="m">0원</p></div>
                          <div><p className="k">기한 지난 미수</p><p className="v num">0원</p><p className="m">0건</p></div>
                          <div><p className="k">기한 지난 미지급</p><p className="v num">18,240,000원</p><p className="m">12건</p></div>
                        </div>
                      </section>

                      <div className="db-row3" data-hs="alert">
                        <div className="db-card sm"><p className="k2">다음 부가세 신고</p><p className="v2">2기 예정 신고 · D-76</p><p className="m2">부가세 리포트에서 예상액 확인 →</p></div>
                        <div className="db-card sm"><p className="k2">불공제 후보</p><p className="v2">4건 · 매입세액 1,240,000원 검토</p><p className="m2">리스트 펼치기 ▾</p></div>
                        <div className="db-card sm"><p className="k2">카드 자료</p><p className="v2">2026년 7월까지 반영</p><p className="m2">정상 반영 중 ✓</p></div>
                      </div>

                      <div className="db-row2">
                        <div className="db-vat" data-hs="vat">
                          <p className="k3">납부 예상 부가세 <span>2026년 7월 기준</span></p>
                          <p className="v3 num">6,351,500<em>원</em></p>
                          <p className="m3"><b>납부 예상</b> 매출세액 18,492,000원 &nbsp; 공제 매입세액 12,140,500원</p>
                        </div>
                        <div className="db-card" data-hs="trend">
                          <p className="k2">월별 추이</p>
                          <div className="ui-bars sm">
                            <div className="bg"><span className="b now" style={{'--h': '96%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '22%'} as React.CSSProperties}></span><i>1월</i></div>
                            <div className="bg"><span className="b now" style={{'--h': '8%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '8%'} as React.CSSProperties}></span><i>2월</i></div>
                            <div className="bg"><span className="b now" style={{'--h': '9%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '10%'} as React.CSSProperties}></span><i>3월</i></div>
                            <div className="bg"><span className="b now" style={{'--h': '18%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '12%'} as React.CSSProperties}></span><i>4월</i></div>
                            <div className="bg"><span className="b now" style={{'--h': '11%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '22%'} as React.CSSProperties}></span><i>5월</i></div>
                            <div className="bg"><span className="b now" style={{'--h': '14%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '16%'} as React.CSSProperties}></span><i>6월</i></div>
                          </div>
                          <p className="m2">최근 6개월 합계 — 매출 512,880,000원 · 매입 349,610,000원 · 차익 <b className="up">+163,270,000원</b></p>
                        </div>
                      </div>

                      <div className="db-row2" data-hs="sum">
                        <div className="db-card"><p className="k2">매출 합계</p><p className="v4 num">184,920,000원</p>
                          <p className="m2">주요 매출처</p>
                          <p className="li"><span>1 ㈜대성물산</span><span className="num">184,920,000원</span></p></div>
                        <div className="db-card"><p className="k2">매입 합계</p><p className="v4 num">121,405,000원</p>
                          <p className="m2">주요 매입처</p>
                          <p className="li"><span>1 원자재 공급 — A사</span><span className="num">58,310,000원</span></p></div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                {/* 대시보드 위 그 자리에서 조각이 하나씩 확대된다.
                    조각은 그림의 일부라 읽어 주지 않는다(aria-hidden) — 말은 figcaption 이 한다.
                    그림 속 글자라 사이트 최소 글자(12px)의 예외다. */}
                <figure className="hotspot" data-at="0.08" style={{'--fx': '0%', '--fy': '-30%'} as React.CSSProperties}><figcaption className="say">통장까지 붙어서, <b>오늘 돈이 어떻게 도는지</b> 바로 보입니다</figcaption><div className="hs-in" aria-hidden="true">
                    <p className="db-ey">TODAY CASH</p>
                    <p className="db-ct">오늘 현금 현황</p>
                    <div className="db-cells" style={{'gridTemplateColumns': 'repeat(3,1fr)'}}>
                      <div><p className="k">이번 달 순현금</p><p className="v num up">0원</p></div>
                      <div><p className="k">기한 지난 미수</p><p className="v num">0원</p><p className="m">0건</p></div>
                      <div><p className="k">기한 지난 미지급</p><p className="v num">18,240,000원</p><p className="m">12건</p></div>
                    </div>
                  </div></figure>
                <figure className="hotspot" data-at="0.32" style={{'--fx': '0%', '--fy': '-8%'} as React.CSSProperties}><figcaption className="say">낼 세금과 <b>놓칠 뻔한 것</b>을 미리 짚어줍니다</figcaption><div className="hs-in" aria-hidden="true">
                    <p className="ui-lab" style={{'color': 'var(--blue)', 'fontWeight': '800'}}>다음 부가세 신고</p>
                    <p className="v2" style={{'fontSize': '26px'}}>2기 예정 신고 · D-76</p>
                    <p className="m2">부가세 리포트에서 예상액 확인 →</p>
                    <p className="ui-lab" style={{'color': 'var(--blue)', 'fontWeight': '800', 'marginTop': 'var(--s5)'}}>불공제 후보</p>
                    <p className="v2" style={{'fontSize': '26px'}}>4건 · 매입세액 1,240,000원</p>
                    <p className="m2">회계사가 먼저 걸러 알려드립니다.</p>
                  </div></figure>
                <figure className="hotspot" data-at="0.56" style={{'--fx': '-28%', '--fy': '20%'} as React.CSSProperties}>
                  <figcaption className="say">신고 전에 <b>낼 금액</b>이 이미 나와 있습니다</figcaption>
                  <div className="hs-in vat" aria-hidden="true">
                    <p className="vat-lab">납부 예상 부가세 <span>2026년 7월 기준</span></p>
                    <p className="vat-big num">6,351,500<em>원</em></p>
                    <div className="vat-calc">
                      <span><i>매출세액</i><b className="num">18,492,000원</b></span>
                      <span className="op">−</span>
                      <span><i>공제 매입세액</i><b className="num">12,140,500원</b></span>
                    </div>
                    <p className="vat-note">확정 신고 전 잠정치입니다. 불공제 후보 4건은 아직 빼지 않았습니다.</p>
                  </div>
                </figure>
                <figure className="hotspot" data-at="0.82" style={{'--fx': '26%', '--fy': '20%'} as React.CSSProperties}><figcaption className="say"><b>여섯 달 흐름</b>이 막대 하나로 보입니다</figcaption><div className="hs-in" aria-hidden="true">
                    <p className="k2">월별 추이</p>
                    <div className="ui-bars">
                      <div className="bg"><span className="b now" style={{'--h': '96%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '22%'} as React.CSSProperties}></span><i>1월</i></div>
                      <div className="bg"><span className="b now" style={{'--h': '8%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '8%'} as React.CSSProperties}></span><i>2월</i></div>
                      <div className="bg"><span className="b now" style={{'--h': '9%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '10%'} as React.CSSProperties}></span><i>3월</i></div>
                      <div className="bg"><span className="b now" style={{'--h': '18%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '12%'} as React.CSSProperties}></span><i>4월</i></div>
                      <div className="bg"><span className="b now" style={{'--h': '11%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '22%'} as React.CSSProperties}></span><i>5월</i></div>
                      <div className="bg"><span className="b now" style={{'--h': '14%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '16%'} as React.CSSProperties}></span><i>6월</i></div>
                    </div>
                    <p className="m2" style={{'marginTop': 'var(--s5)'}}>최근 6개월 — 매출 512,880,000원 · 매입 349,610,000원 · 차익 <b className="up">+163,270,000원</b></p>
                  </div></figure>
              </div>
            </div>
          </div>
      </section>

      {/* 2. 지표 띠 */}
      <section id="stats"><div className="stats-rail"><div className="stats-fix wrap">
        <p className="tick rise">기장을 맡기면</p>
        <h2 className="sec rise">이만큼이 자동으로 따라옵니다<span className="dot-b">.</span></h2>
        <div className="stats rise">
          <div className="stat"><b className="num">매일</b><span>홈택스·카드·통장 자동 수집</span></div>
          <div className="stat"><b className="num">30<em>종</em></b><span>서식 자동 채움</span></div>
          <div className="stat"><b className="num">19<em>종</em></b><span>민원증명 안내</span></div>
          <div className="stat"><b className="num">0<em>건</em></b><span>대표님이 찾아 보낼 자료</span></div>
        </div>
      </div></div></section>

      {/* 4. 기능 : 왼쪽 누르면 오른쪽 실제 화면이 바뀐다 */}
      <section id="feat">

        <div className="feat-rail">
          <div className="feat-fix wrap">
            <div className="feat-copy">
              {/* 이 구간의 히어로. 카드 왼쪽에 고정으로 남는다. */}
              <div className="feat-hero">
                <p className="tick">고객 화면</p>
                <h2 className="sec">신고 때까지<br className="brk" />기다리지 않아도 됩니다<span className="dot-b">.</span></h2>
              </div>
              <div className="feat-slots">
              <article className="fc on">
                <p className="no">01</p><h3>이번 달, 얼마 벌었나</h3>
                <p><span className="c">확정 전이라도</span><span className="c">지금까지 모인 자료로 계산합니다.</span><span className="c">마진율과 전년 대비 증감이 같이 나옵니다.</span></p>
              </article>
              <article className="fc">
                <p className="no">02</p><h3>작년 같은 기간과 나란히</h3>
                <p><span className="s">매출·매입·손익을 한 표에 놓습니다.</span><span className="s">차이와 증감률까지 같이 봅니다.</span></p>
              </article>
              <article className="fc">
                <p className="no">03</p><h3>올해와 작년을 겹쳐서</h3>
                <p><span className="s">계절을 타는 업종이라면</span><span className="s">이 막대 하나로 흐름이 보입니다.</span></p>
              </article>
              <article className="fc">
                <p className="no">04</p><h3>어디까지 반영됐는지</h3>
                <p><span className="s">카드 매입은 청구 시차가 있습니다.</span><span className="s">숨기지 않고 며칠까지인지 적어둡니다.</span></p>
              </article>
              <article className="fc">
                <p className="no">05</p><h3>어디에 얼마를 쓰나</h3>
                <p><span className="s">증빙 유형별 구성과 상위 지출처.</span><span className="s">비율로 한눈에 봅니다.</span></p>
              </article>
              <article className="fc">
                <p className="no">06</p><h3>놓칠 뻔한 것</h3>
                <p><span className="s">불공제 후보, 갑자기 늘어난 매입처,</span><span className="s">고액 1회성 지출을 먼저 짚어줍니다.</span></p>
              </article>
              </div>
              <div className="fdots" id="fdots"><i className="on"></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="deck" id="deck">

                {/* 01 이번 달 손익 */}
                <div className="fpane on">
                  <p className="ui-lab">잠정 손익 <span>2026년 7월 기준</span></p>
                  <p className="ui-big num">98,750,000<em>원</em></p>
                  <p className="ui-sub"><b className="pill up">흑자 +57.7%</b> 전년 동기 6,260만원 → <b>9,875만원</b></p>
                  <p className="ui-foot">마진율 <b>11.1%</b> · 전년 7.9% · <b className="up">+3.2%p</b></p>
                </div>

                {/* 02 전년 동기 비교 */}
                <div className="fpane">
                  <table className="ui-tb">
                    <thead><tr><th><span className="sr-only">비교 항목</span></th><th>이번 기간</th><th>전년 동기</th><th>증감률</th></tr></thead>
                    <tbody>
                      <tr><th>매출</th><td className="num">892,400,000</td><td className="num">796,800,000</td><td className="num up">+12.0%</td></tr>
                      <tr><th>매입</th><td className="num">793,650,000</td><td className="num">734,200,000</td><td className="num dn">+8.1%</td></tr>
                      <tr className="tot"><th>손익</th><td className="num">98,750,000</td><td className="num">62,600,000</td><td className="num up">+57.7%</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 03 월별 추이 */}
                <div className="fpane">
                  <p className="ui-lab">월별 매출 · 2026 vs 2025</p>
                  <div className="ui-bars">
                    <div className="bg"><span className="b now" style={{'--h': '74%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '62%'} as React.CSSProperties}></span><i>1월</i></div>
                    <div className="bg"><span className="b now" style={{'--h': '86%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '70%'} as React.CSSProperties}></span><i>2월</i></div>
                    <div className="bg"><span className="b now" style={{'--h': '96%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '84%'} as React.CSSProperties}></span><i>3월</i></div>
                    <div className="bg"><span className="b now" style={{'--h': '88%'} as React.CSSProperties}></span><span className="b old" style={{'--h': '86%'} as React.CSSProperties}></span><i>4월</i></div>
                  </div>
                  <p className="ui-foot"><b className="sw now"></b> 2026 &nbsp; <b className="sw old"></b> 2025</p>
                </div>

                {/* 04 자료 반영 상태 */}
                <div className="fpane">
                  <p className="ui-lab">데이터 반영 상태</p>
                  <div className="ui-cols">
                    <div><p className="k">세금계산서</p><p className="v num">2026-04-07</p><p className="m"><b className="ok">정상</b> 최근 7일 24건</p></div>
                    <div><p className="k">현금영수증</p><p className="v num">2026-04-07</p><p className="m"><b className="ok">정상</b> 최근 7일 11건</p></div>
                    <div><p className="k">신용카드</p><p className="v num">2026-03-25</p><p className="m"><b className="warn">확인 필요</b> 청구 시차 D-13</p></div>
                  </div>
                </div>

                {/* 05 지출 구조 */}
                <div className="fpane">
                  <p className="ui-lab">증빙 유형 믹스</p>
                  <div className="ui-mix">
                    <div><span className="k">세금계산서</span><span className="v num">517,400,000원</span><span className="bar" style={{'--p': '65.2%'} as React.CSSProperties}></span><span className="m">전체 매입의 65.2%</span></div>
                    <div><span className="k">신용카드</span><span className="v num">191,300,000원</span><span className="bar" style={{'--p': '24.1%'} as React.CSSProperties}></span><span className="m">전체 매입의 24.1%</span></div>
                    <div><span className="k">현금영수증</span><span className="v num">84,950,000원</span><span className="bar" style={{'--p': '10.7%'} as React.CSSProperties}></span><span className="m">전체 매입의 10.7%</span></div>
                  </div>
                </div>

                {/* 06 주의 항목 */}
                <div className="fpane">
                  <p className="ui-lab">주의 항목</p>
                  <ul className="ui-list">
                    <li><span className="k">법인카드 — 대형마트</span><span className="m">불공제 상위 · 카드 8건</span><span className="v num">3,240,000원</span></li>
                    <li><span className="k">원자재 공급 — A사</span><span className="m">급증 매입처 · 평균 대비 2.4배</span><span className="v num">84,200,000원</span></li>
                    <li><span className="k">설비 도입 — 정밀가공기</span><span className="m">고액 1회성 · 2026-02-14</span><span className="v num">48,500,000원</span></li>
                  </ul>
                </div>
            </div>
          </div>
        </div>
      </section>


      {/* 지원 기능. 카드가 흩어져 있다가 한 화면으로 모인다. */}
      <section id="menu">
        <div className="gather" id="gather">
          <div className="gather-in wrap">
            <div className="gather-head">
              <p className="tick">대시보드에서 되는 일</p>
              <h2 className="sec"><span className="c">흩어져 있던 정보가</span><span className="c">한 곳으로 모입니다<span className="dot-b">.</span></span></h2>
              <p className="lede"><span className="s">증빙부터 장부, 인건비, 서식까지.</span><span className="s">따로 챙기던 것을 한 화면에서 봅니다.</span></p>
            </div>
            <div className="gather-grid">
            <article className="gc" data-g="증빙"><span className="gk">증빙</span><b>세금계산서</b><p>주고받은 계산서를 한 표에서</p></article>
            <article className="gc" data-g="증빙"><span className="gk">증빙</span><b>현금영수증</b><p>발행·수취 내역 자동 수집</p></article>
            <article className="gc" data-g="증빙"><span className="gk">증빙</span><b>신용카드</b><p>사업용 카드 승인 내역</p></article>
            <article className="gc" data-g="증빙"><span className="gk">증빙</span><b>통장</b><p>입출금을 증빙과 짝지어</p></article>
            <article className="gc" data-g="장부"><span className="gk">장부·신고</span><b>분개·전표</b><p>거래를 장부 형태로 확정</p></article>
            <article className="gc" data-g="장부"><span className="gk">장부·신고</span><b>재무제표</b><p>시산표·총계정원장 표준 서식</p></article>
            <article className="gc" data-g="장부"><span className="gk">장부·신고</span><b>부가세 리포트</b><p>낼 금액을 미리</p></article>
            <article className="gc" data-g="인건비"><span className="gk">인건비</span><b>급여 입력</b><p>넣으면 세금이 자동 계산</p></article>
            <article className="gc" data-g="인건비"><span className="gk">인건비</span><b>임직원 관리</b><p>직원 명단과 4대보험</p></article>
            <article className="gc" data-g="인건비"><span className="gk">인건비</span><b>사업소득 입력</b><p>프리랜서 지급 기록</p></article>
            <article className="gc" data-g="인건비"><span className="gk">인건비</span><b>기타소득 입력</b><p>강의료 등 기타 지급</p></article>
            <article className="gc" data-g="인건비"><span className="gk">인건비</span><b>사업·기타소득자 관리</b><p>지급 대상 명단</p></article>
            <article className="gc" data-g="서식"><span className="gk">서식·증명</span><b>서식자료</b><p>30종을 회사 정보 채워서</p></article>
            <article className="gc" data-g="서식"><span className="gk">서식·증명</span><b>민원증명</b><p>19종 발급 안내</p></article>
            <article className="gc" data-g="시스템"><span className="gk">시스템</span><b>설정</b><p>팀 권한과 알림</p></article>
            </div>
          </div>
        </div>
      </section>




      {/* 5. 근거 */}
      <EvidenceDemo />

      {/* 6. 흐름 */}
      <section id="flow">
        <div className="wrap">
          <p className="tick rise">시작하기</p>
          <h2 className="sec rise">대표님이 하실 일은<br className="brk" />서류 한 장입니다<span className="dot-b">.</span></h2>
          <div className="flow rise">
            <div className="step"><h3>상담</h3><p><span className="s">지금 상황과 필요한 것을 듣습니다.</span><span className="s">비용도 이때 확정합니다.</span></p></div>
            <div className="step"><h3>이관 동의</h3><p><span className="s">서류 한 장이면 됩니다.</span><span className="s">나머지 절차는 저희가 처리합니다.</span></p></div>
            <div className="step"><h3>자료 연결</h3><p><span className="s">홈택스와 카드, 통장을 연결합니다.</span><span className="s">과거 자료도 가져옵니다.</span></p></div>
            <div className="step"><h3>대시보드 사용</h3><p><span className="s">다음 날부터 대시보드에서</span><span className="s">우리 회사 숫자를 봅니다.</span></p></div>
          </div>
        </div>
      </section>

      {/* 7. 비교 */}
      <section id="vs" style={{'background': 'var(--w-2)'}}>
        <div className="vs-rail">
        <div className="vs-fix wrap">
          <p className="tick rise">무엇이 다른가</p>
          <h2 className="sec rise">같은 기장인데<br className="brk" />결과가 다른 이유<span className="dot-b">.</span></h2>
          {/* 표 머리의 로고는 lazy 다. 두면 React 가 <head> 에 preload 를 거는데, 한참 아래라
              몇 초 안에 안 쓰여 브라우저가 경고를 남겼다. */}
          <table className="vs rise">
            <thead><tr><th><span className="sr-only">비교 항목</span></th><th className="theirs">보통의 세무사무소</th><th className="ours"><span className="vs-brand"><img src="/meridian-logo.png" alt="" loading="lazy" />MERIDIAN</span></th></tr></thead>
            <tbody>
              <tr><th>자료 전달</th><td className="theirs">월말마다 대표님이 모아서 보냄</td><td className="ours"><strong>매일 자동 수집.</strong> 보낼 것이 없음</td></tr>
              <tr><th>숫자 확인</th><td className="theirs">신고 끝나고 결과만 받음</td><td className="ours"><strong>지금 이 순간</strong>의 손익과 부가세</td></tr>
              <tr><th>근거</th><td className="theirs">왜 이 금액인지 물어봐야 함</td><td className="ours">숫자를 누르면 <strong>계산식과 원본</strong></td></tr>
              <tr><th>자료 기준 시점</th><td className="theirs">언제까지 반영됐는지 모름</td><td className="ours">화면마다 <strong>기준 시각 표시</strong></td></tr>
              <tr><th>같은 판단 반복</th><td className="theirs">매달 다시 물어봄</td><td className="ours">한 번 확정하면 <strong>규칙으로 학습</strong></td></tr>
            </tbody>
          </table>
        </div>
        </div>
      </section>

      {/* 8. 마무리 (반전) */}
      <section className="end invert" id="end" style={{'paddingBottom': 'var(--s7)'}}>
        <div className="wrap">
          <p className="tick rise">기장 이관</p>
          <h2 className="rise">우리 회사 자료로 먼저 보시고 정하셔도 됩니다<span className="dot-b">.</span></h2>
          <p className="lede rise"><span className="s">상담에서 실제 대시보드를 보여드립니다.</span><span className="s">그다음에 정하셔도 늦지 않습니다.</span></p>
          <div className="hero-cta rise" style={{'justifyContent': 'center', 'marginTop': 'var(--s5)'}}>
            <a className="btn btn-fill" href="/contact">기장 이관 상담하기</a>
            <a className="btn btn-line" href={`tel:${siteConfig.tel}`}>전화 문의</a>
          </div>
          <p className="cta-note rise">상담은 무료입니다.</p>
        </div>
      </section>

      </div>


    </div>
  );
}
