"use client";

/* 「메리디안의 약속」 한 섹션. 대화와 약속이 같은 자리를 쓴다.

   1) 사업주 말이 한 마디씩 올라온다
   2) 마지막 우리 답이 느리게 켜지며 한 번 부풀었다 가라앉는다
   3) 손님 말은 왼쪽으로, 우리 말은 오른쪽으로 날아가 사라진다
   4) 비워진 그 자리에 약속 두 개가 천천히 올라온다

   이 네 장면은 「시간」이 아니라 「스크롤 위치」가 넘긴다. 시간으로 돌리면
   스크롤을 빨리 내린 사람은 대화를 통째로 놓친다. 무대를 화면에 붙여
   두고(sticky), 그 뒤로 남겨 둔 스크롤 길이만큼 장면이 넘어간다.

   두 덩어리를 위아래로 쌓지 않고 grid 한 칸에 겹쳐 둔다. 그래야 약속이
   「그 자리에」 나온다. 높이는 둘 중 큰 쪽을 따라간다.

   휴대폰(≤900px)과 움직임을 꺼 둔 사람에게는 붙이지 않고 대화와 약속을 위아래로 그냥
   놓는다. 판 하나(100svh)에 대화와 약속이 다 들어가지 않아 답하는 쪽과 약속 01 이 아래에서
   잘려 나갔고, 스크롤을 빨리 굴리면 장면이 건너뛰어 화면이 튀었다.
   붙일지 쌓을지는 CSS 가 정한다. DOM 은 하나라 서버 HTML 이 처음부터 맞는 판이다. */

import { useRef, useState, type ReactNode } from "react";
import { STAGE_MEDIA, useScrollProgress, type ScrollRange } from "@/lib/use-scroll-progress";
import ComplaintThread, { THREAD_STEPS } from "./complaint-thread";
import PromiseOrbs from "./promise-orbs";

/* 스크롤을 어디까지 내렸을 때 무엇이 일어나는가.
   대화는 앞쪽 절반에서 한 마디씩 차오르고, 다 읽을 틈을 둔 다음 날아간다. */
const TALK_FROM = 0;
/* 판이 붙기 전(제목이 아래에서 올라오는 동안)에는 스크롤 진행이 0 이라
   화면 아래쪽이 통째로 비어 있었다. 제목이 보이는 순간 이미 대화가
   굴러가고 있게 바닥을 깔아 둔다.
   첫 마디가 다 올라오는 눈금이 5 다(말풍선 하나가 5 칸). 6 으로 두면
   첫 마디는 서 있고 두 번째 마디가 입력 중인 상태에서 시작한다. */
const STEP_FLOOR = 6;
/* 손님 말 세 마디가 여기까지 다 오른다. */
const TALK_TO = 0.46;
/* 우리 답 두 마디를 읽을 자리. 예전에는 0.5 에서 답이 나오고 0.62 에 벌써
   날아가서, 두 번째 마디(「구조 자체를 다르게 두기로 했습니다」)가
   화면에 떴다가 바로 사라졌다. */
const EXIT_AT = 0.7;
const ORBS_AT = 0.78;

const WHOLE: ScrollRange = [[0, 0], [1, 1]];

/* head — 「Our Promise / 메리디안의 약속」 제목. 무대 안에 같이 붙인다.
   바깥에 두면 무대가 화면에 붙어 있는 동안 제목만 위로 흘러 나가서,
   지금 보고 있는 게 무엇에 대한 이야기인지 알 수 없게 된다. */
export default function PromiseStage({ head }: { head?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(STEP_FLOOR);
  const [exit, setExit] = useState(false);
  const [orbs, setOrbs] = useState(false);

  /* 장면 길이로 읽을 시간을 확보하고 사용자의 스크롤은 잠그지 않는다.
     쌓은 판에서는 재지 않는다 — 쓰는 데가 없고, CSS 가 상태와 상관없이 다 켜 둔다.
     상태는 훅이 그 프레임 안에 반영한다. 같은 값이면 React 가 그리지 않는다. */
  useScrollProgress(ref, WHOLE, {
    media: STAGE_MEDIA,
    onProgress: (v) => {
      const t = (v - TALK_FROM) / (TALK_TO - TALK_FROM);
      setStep(Math.max(STEP_FLOOR, Math.min(THREAD_STEPS, Math.ceil(t * THREAD_STEPS))));
      setExit(v >= EXIT_AT);
      setOrbs(v >= ORBS_AT);
    },
  });

  return (
    /* 이 통이 길다. 그 길이만큼 스크롤이 장면을 넘긴다. */
    <div ref={ref} className="promise-scroll">
      <div className="promise-pin">
        {head ? <div className="promise-head">{head}</div> : null}
        <div className="promise-stage">
          {/* 대화. 나간 뒤에는 자리를 차지하지 않도록 클릭도 막는다(data-off). */}
          <div className="promise-stage-layer" data-off={exit || undefined}>
            <ComplaintThread step={step} exit={exit} />
          </div>
          {/* 약속. 대화가 나가기 시작할 때부터 천천히 올라온다. */}
          <div className="promise-stage-layer" data-off={!orbs || undefined}>
            <PromiseOrbs show={orbs} />
          </div>
        </div>
      </div>
    </div>
  );
}
