import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/og";
import Link from "next/link";
import { notFound } from "next/navigation";
import { services, oneLine } from "@/lib/data";
import { siteConfig, orderedServices } from "@/lib/constants";
import { AnimateOnScroll, LineReveal } from "@/components/motion";
import HeroVideo from "@/components/layout/hero-video";
import ServiceBar from "@/components/services/service-bar";
import { getAllPosts } from "@/lib/posts";
import DeliverableIcon from "@/components/services/deliverable-icon";
import ServiceIcon from "@/components/services/service-icon";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  const description = oneLine(service.description);
  return {
    title: service.title,
    description,
    openGraph: pageOpenGraph(`/services/${service.slug}`, service.title, description),
    alternates: {
      canonical: `/services/${service.slug}`,
    },
  };
}

/* 「DCF 모델 (Excel 워크북, 가정 변경 가능 구조)」처럼 괄호가 붙은 이름을
   이름과 설명으로 가른다. 괄호가 없으면 이름 하나로 그대로 둔다. */
function splitName(label: string) {
  const at = label.indexOf(" (");
  if (at < 0) return { name: label, note: "" };
  return { name: label.slice(0, at), note: label.slice(at + 1) };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  /* 번호는 목록 순서로 센다. services 에는 분류 페이지가 섞여 있어
     그대로 세면 상세 히어로의 번호가 목록과 어긋난다. */
  const currentIndex = orderedServices.findIndex((s) => s.slug === slug);
  if (!service) notFound();

  /* 이 서비스와 맞물리는 글 셋. 갈래만 맞추고 최신순으로 자른다 —
     글 목록을 서비스마다 손으로 붙이면 글이 늘 때마다 여기를 고쳐야 한다. */
  const all = getAllPosts();
  const related = service.postTopics?.length
    ? all.filter((post) => service.postTopics!.includes(post.category)).slice(0, 3)
    : [];
  /* 실제로 한 일을 적은 글. 갈래가 「업무경험」인 것만 센다 — 해설 글을
     「업무 경험」이라 달아 두면 읽는 사람이 사례로 오해한다.
     그중에서도 이 서비스 것만 고른다. 글 머리말에
     services: [tax-bookkeeping] 처럼 적어 두면 여기에 선다.
     services 를 안 적은 사례 글은 어느 서비스에도 안 붙는다 —
     아무 데나 붙는 것보다 안 붙는 편이 낫다. */
  const cases = all
    .filter(
      (post) =>
        (post.category === "업무경험" || post.category === "업무 경험") &&
        post.services.includes(slug),
    )
    .slice(0, 3);

  /* 사례를 앞에, 해설 글을 뒤에 세운다. 예전에는 사례가 없을 때만
     해설 글을 대신 넣고 「아직 올린 사례가 없습니다」를 붙였는데,
     사과부터 하는 칸이 됐다. 둘을 같이 세우고 이름은 둘 다 부른다. */
  const reads = [...cases, ...related.filter((r) => !cases.some((c) => c.slug === r.slug))].slice(0, 4);

  const num = currentIndex >= 0 ? String(currentIndex + 1).padStart(2, "0") : null;


  return (
    <>
      {/* Hero */}
      <section className="page-hero page-hero--svc page-hero--tall bg-deep text-white relative overflow-hidden">
        {/* 히어로 배경 영상. 사이트 전체가 같은 소재를 쓴다. */}
        <HeroVideo opacity={0.38} />
        {num && (
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[14rem] font-bold leading-none tracking-tighter select-none">
              {num}
            </div>
          </div>
        )}
        <div className="max-w-[1600px] mx-auto px-6 relative z-10">
          {/* 「홈 / 서비스 / 세무 조정」 한 줄은 뺐다. 히어로 바로 밑에
              형제 여섯이 다 서 있는 이동 띠가 같은 일을 한다. */}

          <AnimateOnScroll variant="fadeUp" delay={0.1}>
            <div className="flex items-baseline gap-5">
              {num && (
                <span className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-700">
                  {num}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                {service.title}
              </h1>
            </div>
          </AnimateOnScroll>
          <div className="mt-6">
            <LineReveal className="h-0.5 w-20 bg-accent-bright" delay={0.3} />
          </div>
          <AnimateOnScroll variant="fadeUp" delay={0.4}>
            {/* 어절 중간에서 끊지 않는다. 「따져야 하 / 는 이슈를」로 갈라져 있었다. */}
            {/* 문장이 끝나는 자리에서 줄을 끊는다. 화면 폭에 맡기면
                「제공합니다. 부가적으로」가 한 줄에 붙는다. */}
            <p className="svc-desc svc-desc--lines">{service.description}</p>
          </AnimateOnScroll>

          {/* 형제 여섯. 첫 화면 안에 같이 넣는다 — 밖에 띠로 깔았더니
              제목 · 선 · 설명이 333px 안에 눌려 숨통이 없었다. */}
          <AnimateOnScroll variant="fadeUp" delay={0.55}>
            <ServiceBar services={services} slug={slug} />
          </AnimateOnScroll>
        </div>
      </section>


      {/* ── 위계 ────────────────────────────────────
          셋을 같은 제목·같은 카드로 세워 두니 무엇이 본체이고 무엇이
          곁가지인지 안 보였다. 게다가 순서가 거꾸로였다 —
          「내 상황인가」가 맨 뒤에 있었다.

          읽는 순서대로, 무게를 셋으로 나눈다.
            들머리  이런 때  → 띠 하나. 번호 없음. 훑고 지나가는 곳
            본체    하는 일  → 번호 붙은 큰 제목 + 카드
            결론    드리는 것 → 짙은 판 전체 폭. 이 페이지에서 제일 무겁다
            각주    근거 법령 → 제일 작게

          번호는 본체와 결론에만 붙인다. 번호가 붙었다는 것 자체가
          「이 둘이 핵심」이라는 표시가 된다. */}

      {/* 들머리 — 이런 때 */}
      {service.applicableScenarios?.length > 0 && (
        <section className="svc-when">
          <div className="max-w-[1600px] mx-auto px-6">
            <AnimateOnScroll variant="fadeUp">
              <p className="svc-when-lab">이런 때 필요합니다</p>
              {/* 「결산 일정이 매번 밀리는 경우」처럼 상황만 늘어놓으면
                  내 이야기인지 알기 어렵다. 언제 맡기는지를 앞에 세우고
                  무엇부터 하는지 뒤에 적는다. 「 · 」는 제목 안에도 나오니
                  가르는 표시는 「 — 」를 쓴다(첨삭 #55). */}
              <ul className="svc-when-list">
                {service.applicableScenarios.map((item) => {
                  const at = item.indexOf(" — ");
                  if (at < 0) return <li key={item}>{item}</li>;
                  return (
                    <li key={item} className="svc-when-two">
                      <b>{item.slice(0, at)}</b>
                      <span>{item.slice(at + 3)}</span>
                    </li>
                  );
                })}
              </ul>
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* 분류 페이지의 세부 업무. 여기서 상세로 바로 간다(첨삭 #74). */}
      {service.childSlugs?.length && (
        <section className="svc-body svc-kids-sec">
          <div className="max-w-[1600px] mx-auto px-6">
            <AnimateOnScroll variant="fadeUp">
              <div className="svc-head svc-head--lead">
                <h2 className="svc-h">세부 업무</h2>
                <span className="svc-en">Practices</span>
              </div>
              <ul className="svc-kids">
                {service.childSlugs.map((cs) => {
                  const kid = services.find((x) => x.slug === cs);
                  if (!kid) return null;
                  return (
                    <li key={cs}>
                      <Link href={`/services/${cs}`}>
                        <ServiceIcon name={kid.icon} className="svc-kid-i" />
                        <h3>{kid.title}</h3>
                        <p>{oneLine(kid.description)}</p>
                        <span className="svc-kid-go" aria-hidden>&rarr;</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* 본체 — 주요 업무. 분류 페이지는 비어 있으니 안 세운다.
          예전에는 「하는 일」 한 줄짜리 목록 대여섯 개였다. 이름만 늘어놓아
          무엇을 어떻게 하는지가 안 읽혔다. 이름을 앞에 세우고 그 아래에
          하는 일을 적는다. */}
      {(service.mainWork?.length || service.details.length > 0) && (
      <section className="svc-body">
        <div className="max-w-[1600px] mx-auto px-6">
          <AnimateOnScroll variant="fadeUp">
            <div className="svc-head svc-head--lead">
              <h2 className="svc-h">주요 업무</h2>
              <span className="svc-en">Main practice</span>
            </div>
            {service.mainWork?.length ? (
              <ul className="svc-cards svc-cards--work">
                {service.mainWork.map((w, i) => (
                  <li key={w.title} className="svc-card">
                    <span className="svc-chip">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="svc-card-h">{w.title}</h3>
                    <p>{w.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="svc-cards">
                {service.details.map((detail, i) => (
                  <li key={i} className="svc-card">
                    <span className="svc-chip">{String(i + 1).padStart(2, "0")}</span>
                    <p>{detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </AnimateOnScroll>
        </div>
      </section>
      )}

      {/* 이름이 비슷한 짝을 나란히 세운다. 문단에 묻어 두었더니
          어디까지가 기장이고 어디부터가 경리인지 안 읽혔다(첨삭 #69). */}
      {service.compare && (
        <section className="svc-body svc-cmp-sec">
          <div className="max-w-[1600px] mx-auto px-6">
            <AnimateOnScroll variant="fadeUp">
              <div className="svc-head svc-head--lead">
                <h2 className="svc-h">{service.compare.title}</h2>
                <span className="svc-en">Scope</span>
              </div>
              <dl className="svc-cmp">
                {service.compare.rows.map((r) => (
                  <div key={r.name}>
                    <dt>{r.name}</dt>
                    <dd>{r.what}</dd>
                  </div>
                ))}
              </dl>
              {service.compare.note && (
                <p className="svc-cmp-note">{service.compare.note}</p>
              )}
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* 결론 — 드리는 것.
          손에 남는 물건이라 페이지에서 제일 무거워야 한다. 짙은 판을
          페이지 폭으로 깔아 「하는 일」과 격을 벌린다. */}
      {(service.deliverableCards?.length || service.deliverables?.length) && (
        <section className="svc-give">
          <div className="max-w-[1600px] mx-auto px-6">
            <AnimateOnScroll variant="fadeUp">
              <div className="svc-head svc-head--lead svc-head--on">
                <h2 className="svc-h">드리는 것</h2>
                <span className="svc-en">Deliverables</span>
              </div>
              {/* 손에 남는 물건이라 하나씩 세워 둔다. 두 기둥에 눕히면
                  「하는 일」과 같은 목록으로 읽혀서, 받는 것인지 하는
                  것인지 구분이 안 됐다. 다섯에서 여섯이 한 줄에 선다. */}
              {service.deliverableCards?.length ? (
                /* 이름을 맨 위에 올리고, 그 아래에 무엇을 언제 받는지 적는다.
                   이름만 세워 두었더니 어떤 서류를 언제 받는지 알 수 없었다
                   (첨삭 #61). */
                <ul className="svc-give-cards svc-give-cards--when">
                  {service.deliverableCards.map((card) => (
                    <li key={card.name}>
                      <DeliverableIcon label={card.name} />
                      <p>
                        <span className="svc-give-name">{card.name}</span>
                        <span className="svc-give-note">{card.what}</span>
                        <span className="svc-give-when">{card.when}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="svc-give-cards">
                  {(service.deliverables ?? []).map((item, i) => (
                    <li key={i}>
                      <DeliverableIcon label={item} />
                      {/* 괄호 안은 이름이 아니라 설명이다. 한 줄에 이어 붙이면
                          「가정 변경 가능 / 구조)」처럼 닫는 괄호만 떨어진다. */}
                      <p>
                        <span className="svc-give-name">{splitName(item).name}</span>
                        {splitName(item).note && (
                          <span className="svc-give-note">{splitName(item).note}</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </AnimateOnScroll>
          </div>
        </section>
      )}

      <section className="svc-body svc-body--tail">
        <div className="max-w-[1600px] mx-auto px-6">


        {/* 서비스 설명은 「무엇을 하는가」까지고, 실제 사안이 어떻게
            굴러갔는지는 글이 보여 준다. 업무 경험은 블로그에 쌓고 여기서는
            그리로 보낸다(첨삭 #62). 관련 글이 없어도 보내는 칸은 남긴다. */}
        <div className="svc-read">
            <AnimateOnScroll variant="fadeUp">
              <div className="svc-head">
                {/* 업무경험 글이 아직 없으면 제목에 그 말을 걸지 않는다. */}
                <h2 className="svc-h">{cases.length ? <>업무 경험 &amp; 인사이트</> : "인사이트"}</h2>
                <span className="svc-en">{cases.length ? <>Case notes &amp; insights</> : "Insights"}</span>
              </div>
              {reads.length > 0 && (
                <ul className="svc-read-list">
                  {reads.map((post) => (
                    <li key={post.slug}>
                      <Link href={`/blog/${post.slug}`}>
                        <span className="svc-read-cat">{post.category}</span>
                        <span className="svc-read-title">{post.title}</span>
                        <span className="svc-read-date">{post.date}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="svc-read-more">
                {cases.length > 0 && (
                  <Link href="/blog?cat=case" className="svc-read-all">
                    업무 경험 전체 보기 <span aria-hidden>&rarr;</span>
                  </Link>
                )}
                <Link
                  href="/blog"
                  className={`svc-read-all${cases.length > 0 ? " svc-read-all--sub" : ""}`}
                >
                  블로그 전체 보기 <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            </AnimateOnScroll>
        </div>

        </div>
      </section>

      <section className="svc-ask">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="svc-ask-in">
            <p className="svc-ask-lab">Contact</p>
            <h3>{service.title} 케이스를 상담하시려면</h3>
            <p className="svc-ask-p svc-desc--lines">
              {"사업 유형과 현재 세무 관리 방식을 남겨주시면\n필요한 업무와 준비 서류를 안내해 드립니다."}
            </p>
            <div className="svc-ask-cta">
              <Link
                href={`/contact?type=${encodeURIComponent(service.title)}&output=${encodeURIComponent(
                  service.deliverableCards?.[0]?.name ??
                    service.deliverables?.[0] ??
                    "적용 범위 검토"
                )}`}
                className="svc-ask-btn"
              >
                문의하기 <span aria-hidden>&rarr;</span>
              </Link>
              {/* 「전화로 문의」라 적어 두고 문의 양식으로 보내고 있었다.
                  누르면 바로 걸린다(첨삭 #88). */}
              <a href={`tel:${siteConfig.tel}`} className="svc-ask-btn svc-ask-btn--line">
                전화 문의
              </a>
            </div>
            <p className="svc-ask-note">상담은 무료입니다.</p>
          </div>
        </div>
      </section>

      {/* 맨 아래 있던 「다른 서비스」 여섯 줄은 뺐다. 위 띠가 같은 목록을
          내내 들고 다녀서, 남겨 두면 한 페이지에 여섯 이름이 두 번 선다. */}

    </>
  );
}
