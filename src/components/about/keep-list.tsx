"use client";

/* 지켜가는 방식 셋. 박스를 없앤 자리에 사진 한 장씩을 붙였다.
   글만 셋을 세로로 쌓으면 약관처럼 읽힌다.

   사진은 상자 안에 갇히고(마스킹), 테두리는 없다. 상자와 글이 한 덩어리로
   좌·우에서 번갈아 들어온다 — 사진만 따로 움직이면 목록에 장식을 붙인 게 된다.

   들어오는 속도는 시간이 아니라 「스크롤 위치」가 정한다. 시간으로 돌리면
   세 줄이 한꺼번에 화면에 들어와 셋이 동시에 켜진다. 스크롤에 묶어 두면
   한 줄씩 차례로 들어온다 — 다시 whileInView 로 되돌리지 말 것. */

import { useRef } from "react";
import { useScrollProgress, type ScrollRange } from "@/lib/use-scroll-progress";

const ITEMS = [
  {
    num: "01",
    title: "메리디안은 직원이 더 많이 생각할 수 있는 환경을 만듭니다.",
    /* 줄바꿈은 글쓴이가 정한다. 화면 폭에 맡기면 뜻이 끊기는 자리에서 접힌다. */
    body: [
      "고객과의 소통에 더 많은 시간을 할애할 수 있도록,",
      "단순·반복 작업은 자체 개발 솔루션으로 자동화·체계화합니다.",
    ],
    img: "/images/keep/keep-01.jpg",
    alt: "책상에 앉아 화면을 보며 일하는 사람",
  },
  {
    num: "02",
    title: "염가경쟁을 하지 않습니다.",
    body: [
      "염가 수임은 정당한 대가를 지불해주시는 고객분들께서",
      "받으셔야 할 서비스 품질을 떨어뜨립니다.",
      "정당한 대가로 업무를 수임하고 지속가능하게 운영하는 것은",
      "메리디안과 함께하는 고객님 그리고 직원과의 약속입니다.",
    ],
    img: "/images/keep/keep-02.jpg",
    alt: "회의 탁자에 마주 앉아 이야기하는 두 사람",
  },
  {
    num: "03",
    title: "회계사가 많이 일합니다.",
    body: [
      "적게 일하고 많이 벌겠다는 욕심을 버리고,",
      "직접 발로 뛰고 더 많이 고민합니다.",
    ],
    img: "/images/keep/keep-03.jpg",
    alt: "서류를 펼쳐 놓고 검토하는 손",
  },
];

export default function KeepList() {
  return (
    <ol className="keep-list">
      {ITEMS.map((it, i) => (
        /* 홀수 줄은 왼쪽에서, 짝수 줄은 오른쪽에서. */
        <KeepRow key={it.num} item={it} fromRight={i % 2 === 1} />
      ))}
    </ol>
  );
}

type Item = (typeof ITEMS)[number];

/* 줄의 윗변이 화면 아래 82% 지점을 지날 때 켜지기 시작해서,
   45% 지점에 닿으면 다 켜진다. 화면 높이의 3분의 1 남짓을 굴려야 한 줄이
   자리를 잡으므로, 세 줄이 겹쳐 켜지지 않는다. 모양은 globals.css 의 .keep-row. */
const ROW_RANGE: ScrollRange = [[0, 0.82], [0, 0.45]];
const MOTION_OK = "(prefers-reduced-motion: no-preference)";

function KeepRow({ item, fromRight }: { item: Item; fromRight: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  useScrollProgress(ref, ROW_RANGE, { media: MOTION_OK });

  return (
    <li ref={ref} className={`keep-row${fromRight ? " keep-row--r" : ""}`}>
      <div className="keep-shot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt={item.alt} loading="lazy" />
      </div>
      <div className="keep-text">
        <span className="keep-num" aria-hidden>
          {item.num}
        </span>
        <h3 className="keep-title" style={{ wordBreak: "keep-all" }}>
          {item.title}
        </h3>
        <p className="keep-body" style={{ wordBreak: "keep-all" }}>
          {item.body.map((line) => (
            <span key={line} className="keep-line">
              {line}
            </span>
          ))}
        </p>
      </div>
    </li>
  );
}
