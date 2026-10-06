import Link from "next/link";
import type { Metadata } from "next";

import { siteConfig, serviceGroups, groupBlurbs, orderedServices } from "@/lib/constants";
import { getAllPosts } from "@/lib/posts";
import PromoMotion from "@/components/home/promo-motion";
import AboutOpening from "@/components/about/about-opening";
import PromiseStage from "@/components/about/promise-stage";
import DashboardPeek from "@/components/home/dashboard-peek";
import PortalStage from "@/components/home/portal-stage";
import Wordmark from "@/components/brand/wordmark";

import "./promo.css";
import VsIcon from "@/components/home/vs-icon";

export const metadata: Metadata = {
  title: "기준이 되는 세무회계",
  description:
    "메리디안은 회계사가 직접 책임집니다. 저희가 드리는 약속과 지켜가는 방식, 그리고 회사 전용 세무 대시보드까지.",
};

/* 홈. 대시보드 이야기는 /portal 로, 회계사 이력은 /members 로 옮겼다.
   여기서는 각각 배너 하나와 이름 한 줄로만 건넨다.
   순서: 히어로(영상 → 무슨 회사인가) → 약속 → 대시보드 배너 →
        하는 일 → 무엇이 다른가 → 인사이트 → 상담

   ※ 본초자오선(지구본·광선)은 /about 이 맡는다. 첫 화면에서 이름의
     유래부터 꺼내면 세무·회계 자문사라는 걸 알기 전에 스크롤이 끝난다. */
export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="promo">
      <PromoMotion />
      {/* 일정 팝업을 없앴다. 헤더의 큐브가 같은 일정을 계속 돌려 주고 있어서,
          들어오자마자 화면을 덮을 이유가 없다. */}

      {/* 우측 앵커. 선과 빈 원. 원하는 데만 보고 갈 수 있게. */}
      <nav className="anchor" id="anchor" aria-label="구역 바로가기">
        <a href="#top" data-sec="top"><span className="lb">메리디안</span><span className="cir"></span></a>
        <a href="#promise" data-sec="promise"><span className="lb">약속</span><span className="cir"></span></a>
        <a href="#portal" data-sec="portal"><span className="lb">대시보드</span><span className="cir"></span></a>
        <a href="#svc" data-sec="svc"><span className="lb">하는 일</span><span className="cir"></span></a>
        <a href="#vs" data-sec="vs"><span className="lb">무엇이 다른가</span><span className="cir"></span></a>
        <a href="#insight" data-sec="insight"><span className="lb">인사이트</span><span className="cir"></span></a>
        <a href="#end" data-sec="end"><span className="lb">상담</span><span className="cir"></span></a>
      </nav>

      <div id="top">

      {/* 1. 첫 화면. 영상 한 판, 그다음 무슨 회사인가 한 판.
          바탕이 헤더 뒤까지 올라가도록 컴포넌트가 스스로 위로 당긴다. */}
      <AboutOpening />

      {/* 2. 메리디안의 약속. ABOUT 에 있던 한 무대를 그대로 가져왔다.
          대화가 한 마디씩 오르고, 다 듣고 나면 좌우로 날아가 사라진다.
          비워진 그 자리에 약속 두 개가 천천히 올라온다. */}
      <section id="promise" className="promise-sec invert">
        <div className="wrap">
          {/* 제목을 무대 안으로 넣는다. 무대가 화면에 붙어 있는 동안 제목만
              위로 흘러 나가면, 지금 보는 대화가 무엇인지 알 수 없다. */}
          <PromiseStage
            head={
              <>
                <p className="tick">Our Promise</p>
                <h2 className="sec">메리디안의 약속<span className="dot-b">.</span></h2>
                <p className="lede">사업주분들이 세무대리인과 관련해 흔히 하시는 이야기입니다.</p>
              </>
            }
          />

          {/* 선언문. 원래 따로 한 장이었는데, 약속의 결론이라 같은 장에 둔다.
              장을 나눠 두니 화면 하나를 통째로 쓰면서 같은 말을 두 번 했다. */}
        </div>

      </section>

      {/* 「지켜가는 방식」은 /about 으로 옮겼다. 약속은 홈이 원본,
          그 약속을 어떻게 지키는지는 어바웃이 원본이다. */}

      {/* 5. 대시보드. 길게 늘어놓던 구간은 /portal 로 옮겼다.
          여기서는 한 문장과 버튼 둘로만 건넨다. */}
      <section id="portal" className="pbanner">
        {/* 색 띠. 섹션 전체가 아니라 가운데 일부만 칠한다.
            띠가 태블릿보다 세로로 짧아야 화면이 띠 밖으로 걸쳐 나온다 —
            그래야 「배너 안에 갇힌 그림」이 아니라 기기로 읽힌다. */}
        <div className="pb-band" aria-hidden />
        <div className="wrap">
          <div className="pb-grid">
            {/* 왼쪽: 무엇인지. 오른쪽: 그래서 어떻게 생겼는지.
                글만 두면 「대시보드」가 무슨 화면인지 끝까지 모른 채 지나간다. */}
            <div className="pb-copy">
              <p className="tick rise">기장을 맡기시면</p>
              <h2 className="sec rise">
                <span className="c">회계사가 정리한 자료를</span><span className="c">한 화면에서 봅니다<span className="dot-b">.</span></span>
              </h2>
              <p className="lede rise">
                <span className="s">세무기장 고객님께 세무 정보, 원천세, 각종 서식 정보를 제공하는 업무 대시보드를 무료로 제공합니다.</span>
              </p>

              <div className="hero-cta rise">
                {/* 가입 없이 아이디·비밀번호만 묻는 고객 전용 화면이다. 「무료 … 시작하기」라고 부르면 처음
                    온 사람이 눌러도 시작할 것이 없다. 아직 고객이 아닌 사람은 옆의 「알아보기」로 간다. */}
                <a
                  className="btn btn-fill"
                  href={siteConfig.clientPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  고객 대시보드 로그인
                </a>
                <a className="btn btn-line" href="/portal">알아보기</a>
              </div>
              <p className="cta-note rise"><span className="s">쓰던 사무소에서 넘어오는 절차는 저희가 처리합니다.</span></p>
            </div>

            {/* 화면은 틀 안에 갇혀야 화면으로 읽힌다.
                전에는 그림이 배너 오른쪽으로 삐져나가 잘려 있었다.
                짙은 틀을 두르고 그 안쪽에 여백을 줘서, 틀이 그림보다 크다. */}
            <div className="pb-shot rise">
              <PortalStage>
                <DashboardPeek />
              </PortalStage>
              <p className="pb-cap">실제 고객 화면 · 표시된 숫자는 예시입니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* 하는 일. 카드로 묶어 하위 페이지로. */}
      <section id="svc">
        <div className="wrap">
          <p className="tick rise">하는 일</p>
          <h2 className="sec rise">기장부터 자문까지<span className="dot-b">.</span></h2>
          <div className="svc svc--grp rise">
            {serviceGroups.map((g, i) => (
              <div key={g.title} className="svc-grp">
                <p className="no">{String(i + 1).padStart(2, "0")}</p>
                <h3>{g.title}</h3>
                <p><span className="s">{groupBlurbs[g.title]}</span></p>
                {/* 대분류 설명을 한 번 더 읽히지 않는다. 세부 업무 이름을
                    그대로 눌러 상세로 간다(첨삭 #7 #74). */}
                <ul className="svc-grp-list">
                  {g.slugs.map((slug) => {
                    const svc = orderedServices.find((x) => x.slug === slug);
                    if (!svc) return null;
                    return (
                      <li key={slug}>
                        <Link href={`/services/${slug}`}>
                          {svc.title}<i className="go-a" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {/* 여덟 개를 다 보고 싶은 사람에게. 카드 안의 이름들과 다른 곳으로
              간다 — 이건 목록 전체다. */}
          <div className="svc-cta rise">
            <Link className="btn btn-line" href="/services">하는 일 자세히 보기 →</Link>
          </div>
        </div>
      </section>

      {/* 하는 일 다음, 비교표 앞. 여섯 개를 다 읽고 나면 「그래서 우리는
          어떤데?」가 되는 자리다 — main 에 있던 그 블록을 그대로 쓴다. */}
      <section className="mid-cta invert deep">
        <div className="wrap">
          <div className="mid-cta-in rise">
            <h3>
              지금 기장 상황부터 점검해 드립니다<span className="dot-b">.</span>
            </h3>
            <a className="mid-cta-go" href="/contact">
              무료 진단 요청 <span aria-hidden>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* 비교표. 무엇이 다른지는 나란히 놓아야 보인다.
          우리 칸을 크게 잡고 파란 바탕을 깐다 — 눈이 먼저 가야 할 쪽이다. */}
      <section id="vs" className="vs-dark">
        <div className="vs-rail">
        <div className="vs-fix wrap">
          <p className="tick rise">Comparison</p>
          <h2 className="sec rise"><span className="c">누구와 준비하느냐에 따라</span><span className="c">결과는 달라집니다<span className="dot-b">.</span></span></h2>
          <div className="vs-line" aria-hidden />
          <table className="vs rise">
            <thead>
              <tr>
                <th><span className="sr-only">비교 항목</span></th>
                <th className="theirs">저가 기장 사무소</th>
                <th className="ours"><Wordmark className="vs-logo" /></th>
              </tr>
            </thead>
            <tbody>
              <tr><th><VsIcon name="view" />관점</th><td className="theirs">가격 경쟁력 중심</td><td className="ours">대표 본업의 시간 확보</td></tr>
              <tr><th><VsIcon name="who" />누가 답하나</th><td className="theirs">사무 직원</td><td className="ours">공인회계사 직접</td></tr>
              <tr><th><VsIcon name="tech" />자료 처리 도구</th><td className="theirs">수기 · 단순 전산</td><td className="ours">자체 개발 소프트웨어</td></tr>
              <tr><th><VsIcon name="board" />회사 자료 확인</th><td className="theirs">-</td><td className="ours">대시보드에 반영된 매출 · 매입 · 세무 현황 직접 조회</td></tr>
              <tr><th><VsIcon name="talk" />소통 방식</th><td className="theirs">담당자 연결 지연</td><td className="ours">회계사 직접 답신</td></tr>
            </tbody>
          </table>
        </div>
        </div>
      </section>

      {/* 7. 대표 회계사 구역은 뺐다. 회계사 소개는 /members 가 원본이고,
          홈에서 얼굴부터 내밀 자리는 아니다. 헤더 PEOPLE 과 어바웃에서 간다. */}

      <section id="insight">
        <div className="wrap">
          <p className="tick rise">Our thinking</p>
          <h2 className="sec rise">최근 인사이트<span className="dot-b">.</span></h2>
          <div className="posts rise">
            {posts.slice(0, 4).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <span className="cat">{post.category}</span>
                <h3>{post.title}</h3>
                <time dateTime={post.date}>{post.date.replaceAll("-", ".")}</time>
              </Link>
            ))}
          </div>
          <p style={{'marginTop': 'var(--s4)', 'textAlign': 'right'}}><Link href="/blog" style={{'fontSize': 'var(--t-0)', 'fontWeight': '600', 'color': 'var(--blue)', 'textDecoration': 'none'}}>모든 글 보기 →</Link></p>
        </div>
      </section>

      {/* 8. 맺음. 「우리 회사 자료로 먼저 보시고」 한 장은 뺐다 — 같은 자리에서
          같은 일을 하는 선언문이 이미 있다. 그 선언문을 여기로 옮겨 왔다. */}
      <section className="end invert deep" style={{ paddingBlock: 0 }}>
        {/* 선언문 한 장. 물음과 답을 한 판에 같이 올린다 — 물음만 흰 바탕에
            남겨 두니 답과 갈라져 두 이야기로 읽혔다. 폭은 화면 끝까지 쓴다.
            이 장의 결론이라 여기서 색이 한 번 바뀌어야 한다. */}
        <div className="creed-ans" id="end">
          <div className="wrap creed">
            <p className="creed-q rise">
              <span className="c">세금은 <em>&lsquo;내는 것&rsquo;</em>이 아니라</span><span className="c"><em>&lsquo;설계하는 것&rsquo;</em>입니다<span className="dot-b">.</span></span>
            </p>
            <p className="creed-a rise">
              <span className="s">매일의 기장이 검토가 되고, 검토가 자문이 되고,</span><span className="s">자문이 다음 결정의 근거가 됩니다.</span><span className="s">그 흐름을 끊지 않는 일이 메리디안의 본업입니다.</span>
            </p>
            <div className="creed-cta rise">
              <a className="btn btn-fill" href="/contact">기장 이관 상담하기</a>
              <a className="btn btn-line" href={`tel:${siteConfig.tel}`}>전화 문의</a>
            </div>
            <p className="cta-note rise" style={{ color: "#7E90AB" }}>상담은 무료입니다.</p>
          </div>
        </div>
      </section>

      </div>


    </div>
  );
}
