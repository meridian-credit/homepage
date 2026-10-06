"use client";

/* 서비스 고르기.
 *
 * 넓은 화면 — 왼쪽은 여섯 줄, 오른쪽은 고른 하나. 예전에는 이름 여섯 줄만
 * 세워 두고 오른쪽을 비워 뒀는데, 이름만으로는 뭐 하는 건지 알 수 없어서
 * 여섯 번 다 눌러 봐야 했다. 올리면 오른쪽이 바뀌고, 누르면 상세로 간다.
 *
 * 손 안 — 마우스를 올릴 수가 없다. 그래서 누르면 곧바로 상세로 넘어가
 * 「뭐 하는 건지 보고 고르는」 자리가 통째로 없어졌다.
 * 누른 줄 바로 밑이 펼쳐지고, 다시 누르면 접힌다. 상세로 가는 건
 * 그 안의 「자세히 보기」다.
 *
 * 묶음은 헤더 메뉴와 같다. 전에는 메뉴만 「정기 / 사안별」로 갈라 놓고
 * 여기는 01~06 한 줄이라, 같은 여섯 개가 두 화면에서 다르게 묶였다.
 */

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { flushSync } from "react-dom";
import { oneLine, type Service } from "@/lib/data";
import { serviceGroups, orderedServices } from "@/lib/constants";
import { useHandheld } from "@/lib/use-media";
import ServiceIcon from "./service-icon";

/* 고른 하나를 보여 주는 판. 넓은 화면은 오른쪽에, 손 안에서는 누른 줄
   바로 밑에 같은 것이 선다 — 두 벌로 쓰면 한쪽만 고쳐져 어긋난다. */
function Detail({ s }: { s: Service }) {
  return (
    <>
      {/* 왼쪽 정사각 사진. 판 안쪽으로 꽉 채운다 — 여백을 두면 붙여 놓은
          썸네일이 되고, 꽉 채워야 판의 한쪽 면이 된다. */}
      <div className="spick-shot">
        <Image
          key={s.slug}
          src={`/images/pick/${s.slug}.webp`}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 34vw"
          className="object-cover"
        />
      </div>

      <div className="spick-body">
        <ServiceIcon name={s.icon} className="spick-big" />
        <h3>{s.title}</h3>
        <p className="spick-desc">{oneLine(s.description)}</p>

        {/* 알약 안에 긴 문장을 넣어 두었더니 설명인지 누르는 것인지
            구분이 안 됐다. 핵심 업무 몇 마디를 목록으로 세운다(첨삭 #66). */}
        <ul className="spick-tags">
          {(s.keywords ?? s.details.slice(0, 4)).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        <Link href={`/services/${s.slug}`} className="spick-go">
          자세히 보기 <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </>
  );
}

export default function ServicePicker() {
  const [pick, setPick] = useState(0);
  const handheld = useHandheld();
  /* 손 안에서 지금 펼쳐 둔 줄. null 이면 다 접혀 있다. */
  const [open, setOpen] = useState<number | null>(null);
  const cur = orderedServices[pick];

  /* ── 손 안 — 누른 줄 밑이 펼쳐진다 ───────────────────────── */
  if (handheld) {
    return (
      <div className="spick spick--fold">
        <ul className="spick-list" aria-label="서비스 고르기">
          {serviceGroups.map((g) => (
            <li key={g.title} className="spick-grp">
              <p className="spick-glab">{g.title}</p>
              <ul>
                {g.slugs.map((slug) => {
                  const i = orderedServices.findIndex((x) => x.slug === slug);
                  const s = orderedServices[i];
                  if (!s) return null;
                  const isOpen = open === i;
                  return (
                    <li key={slug}>
                      {/* 링크가 아니라 단추다. 누르면 페이지를 넘기는 게
                          아니라 여기서 펼친다. */}
                      <button
                        type="button"
                        className={`spick-item ${isOpen ? "is-on" : ""}`}
                        aria-expanded={isOpen}
                        aria-controls={`spick-fold-${slug}`}
                        onClick={(e) => {
                          const row = e.currentTarget;
                          flushSync(() => setOpen(isOpen ? null : i));
                          /* 위에서 펼쳐 둔 줄이 접히면 그 높이만큼 아래가 끌려 올라가, 누른 줄이
                             화면 위로 사라졌다(iPhone 에서 1288px → -181px). 헤더 밑으로 숨었을
                             때만 그 줄을 헤더 바로 밑으로 데려온다. */
                          if (row.getBoundingClientRect().top < 80) row.scrollIntoView({ block: "start" });
                        }}
                      >
                        <ServiceIcon name={s.icon} className="spick-icon" />
                        <span className="spick-no">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="spick-title">{s.title}</span>
                        <span className="spick-caret" aria-hidden />
                      </button>
                      {isOpen && (
                        <div className="spick-fold" id={`spick-fold-${slug}`}>
                          <div className="spick-panel">
                            <Detail s={s} />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /* ── 넓은 화면 — 왼쪽 목록, 오른쪽 한 판 ─────────────────── */
  return (
    <div className="spick">
      {/* 번호는 묶음을 건너뛰지 않고 01 부터 06 까지 이어 붙인다.
          상세 히어로의 큰 번호와 같은 값이라, 끊으면 어긋난다. */}
      <ul className="spick-list" aria-label="서비스 고르기">
        {serviceGroups.map((g) => (
          <li key={g.title} className="spick-grp">
            <p className="spick-glab">{g.title}</p>
            <ul>
              {g.slugs.map((slug) => {
                const i = orderedServices.findIndex((x) => x.slug === slug);
                const s = orderedServices[i];
                if (!s) return null;
                return (
                  <li key={slug}>
                    {/* 올리면 오른쪽이 바뀌고, 누르면 그 페이지로 간다.
                        단추로 두니 눌러도 판만 바뀌어서, 「자세히 보기」를
                        한 번 더 찾아 눌러야 했다. */}
                    <Link
                      href={`/services/${slug}`}
                      className={`spick-item ${i === pick ? "is-on" : ""}`}
                      aria-current={i === pick ? "true" : undefined}
                      onMouseEnter={() => setPick(i)}
                      onFocus={() => setPick(i)}
                    >
                      <ServiceIcon name={s.icon} className="spick-icon" />
                      <span className="spick-no">{String(i + 1).padStart(2, "0")}</span>
                      <span className="spick-title">{s.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {/* 오른쪽 — 고른 하나 */}
      <div className="spick-panel" id="spick-panel">
        <Detail s={cur} />
      </div>
    </div>
  );
}
