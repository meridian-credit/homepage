"use client";

/* 사업주들이 실제로 하는 말. 문단으로 늘어놓으면 남 얘기가 되니까
   아이메시지 대화창을 그대로 옮겼다. 회색 말풍선이 한 마디씩 올라오고,
   다 올라온 뒤에야 파란 말풍선(우리 답)이 붙는다.

   언제 몇 마디가 올라와 있는지는 시간이 아니라 「스크롤 위치」가 정한다.
   위(PromiseStage)가 step 을 세어 내려준다. 시간으로 돌리면 스크롤을 빨리
   내린 사람은 대화를 통째로 놓친다.

   말풍선은 두 개가 아니라 하나다. 점 세 개가 뜬 그 말풍선이 그대로 부풀면서
   말이 들어찬다. 점 풍선과 말 풍선을 따로 두면 둘이 같이 보여서 대화가 아니라
   목록이 된다 — 다시 나누지 말 것.

   마지막 한 마디는 느리게 켜지면서 살짝 부풀었다 가라앉는다. 거기가 이 대화의
   끝이라는 표시다. 그 다음 손님 말은 왼쪽으로, 우리 말은 오른쪽으로 날아간다.

   켜짐 · 나감의 모양과 시간은 globals.css 가 data-state 를 보고 정한다. 붙은 무대에서만
   그렇다 — 쌓은 판(휴대폰 · 움직임 끔 · JS 끔)에서는 상태와 상관없이 전부 켜진 채 보인다. */

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STAGE_MEDIA } from "@/lib/use-scroll-progress";

type Msg = {
  face: string;
  text: string;
};

const INCOMING: Msg[] = [
  {
    face: "growing-ceo",
    text: "세무사·회계사와 연락이 닿지 않고 직원과만 소통한다.",
  },
  {
    face: "early-stage-founder",
    text: "서류 요청이나 질의 사항에 회신이 지나치게 늦거나, 자주 내용이 틀려 내용을 믿기 어렵다.",
  },
  {
    face: "owner-in-transition",
    text: "직원의 응대가 불친절하다.",
  },
];

const OUTGOING = [
  "기준이 되어주어야 할 세무대리인이 오히려 사업주의 고민거리가 되는 현실.",
  "메리디안은 그 구조 자체를 다르게 두기로 했습니다.",
];

/* 「입력 중…」이 머무는 칸 수. 한 칸만 주면 점이 뜨자마자 말이 나와서
   쓰는 중이라는 게 안 읽힌다. 여러 칸을 비워 그만큼 붙잡아 둔다.
   손님 쪽은 세 마디가 이어지므로 우리 쪽보다 짧게 잡는다. */
const IN_HOLD = 4;
const TYPING_HOLD = 6;

/* 손님 말 한 마디가 차지하는 칸: 「입력 중」 + 말 한 줄. */
const IN_BLOCK = IN_HOLD + 1;

/* 세 마디가 다 올라온 다음에야 누가 한 말인지 밝힌다.
   먼저 밝히면 대화가 아니라 인용문 상자가 된다. */
const STAMP_AT = INCOMING.length * IN_BLOCK;
const STAMP_HOLD = 2;

/* 우리가 답을 쓰기 시작하는 칸. */
const TYPING_AT = STAMP_AT + STAMP_HOLD;
const OUT_FROM = TYPING_AT + 1 + TYPING_HOLD;

/* 스크롤로 하나씩 켜지는 칸 수 전체. */
export const THREAD_STEPS = OUT_FROM + OUTGOING.length + 1;

/* 점 세 개 → 말. 같은 말풍선이 부푸는 시간(ms)과 곡선. */
const GROW = 520;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
/* 글자는 풍선이 웬만큼 커진 뒤에 들어온다. 같이 켜면 작은 칸에서 글자가 눌린다. */
const INK = { duration: 300, delay: 300 };

type RowState = "hidden" | "shown" | "gone";

export default function ComplaintThread({
  step = THREAD_STEPS,
  exit = false,
}: {
  step?: number;
  exit?: boolean;
}) {
  /* i 번째 줄이 켜졌는지. 스크롤이 거기까지 왔으면 켠다. 나가면 다 같이 나간다. */
  const state = (i: number): RowState => (exit ? "gone" : step > i ? "shown" : "hidden");

  /* 「입력 중」 점 세 개는 무한히 돈다. 화면 밖에 있어도 브라우저는
     프레임마다 그걸 다시 그린다 — 홈 어디를 굴러도 계속 값이 나갔다.
     이 대화가 화면에 들어와 있을 때만 돌린다.
     스크롤마다 재지 않는다. 들어오고 나가는 그 순간에만 한 번씩 불린다. */
  const rootRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setOnScreen(e.isIntersecting),
      { rootMargin: "160px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="imsg" ref={rootRef} data-live={onScreen ? "1" : "0"}>
      {INCOMING.map((m, i) => {
        const at = i * IN_BLOCK;
        /* 점 세 개가 뜨는 구간. 이 구간이 지나면 같은 풍선이 말로 부푼다. */
        const typing = step > at && step <= at + IN_HOLD;
        return (
          <div key={m.text} className="imsg-row" data-state={state(at)}>
            {/* lazy — 첫 화면 아래 한참 뒤라, 두면 React 가 <head> 에 preload 를 걸어
                첫 화면 포스터와 대역폭을 나눈다. */}
            <span className="imsg-face" aria-hidden>
              <img src={`/images/personas/${m.face}.svg`} alt="" loading="lazy" />
            </span>
            <Bubble kind="in" typing={typing} text={m.text} />
          </div>
        );
      })}

      {/* 세 마디 뒤에 「사업주 세 분이 말씀하신 것」을 달아 두었는데,
          세 명이 한 말로 전체를 말하는 꼴이라 뺐다(첨삭 #21).
          STAMP_AT 은 답이 뜨는 시점을 재는 데 계속 쓴다. */}

      {/* 다 듣고 나서 답한다. 한 덩어리로 보내면 공지가 되니 두 마디로 나눈다.
          첫 마디는 점 세 개로 먼저 뜨고, 그 풍선이 그대로 말로 부푼다. */}
      {/* 우리 답 두 마디와 답하는 사람. 사람을 한 덩어리로 옆에 세운다 —
          동그란 프로필로 넣으면 아이콘이 되고, 누가 말하는지가 안 읽힌다. */}
      <div className="imsg-out">
        <div className="imsg-out-lines">
          {OUTGOING.map((t, i) => {
            const first = i === 0;
            const last = i === OUTGOING.length - 1;
            const at = first ? TYPING_AT : OUT_FROM + i;
            const typing = first && step > at && step <= OUT_FROM;
            return (
              /* 마지막 한 마디만 느리게(1.1s) 켜진다. */
              <div
                key={t}
                className={`imsg-row imsg-row--out${last ? " imsg-row--last" : ""}`}
                data-state={state(at)}
              >
                <Bubble kind="out" typing={typing} text={t} tailless={!last} />
              </div>
            );
          })}
        </div>

        <div className="imsg-who" data-state={state(OUT_FROM)} aria-hidden>
          <Image
            src="/images/founder-3d-idea.png"
            alt=""
            width={688}
            height={688}
            sizes="(max-width: 760px) 132px, 236px"
          />
        </div>
      </div>

    </div>
  );
}

/* 말풍선 하나. 점 세 개로 떴다가, 같은 풍선이 그대로 부풀면서 말이 들어찬다.
   풍선을 둘로 나누면(점 풍선 + 말 풍선) 둘이 한 화면에 같이 남는다 — 나누지 말 것.
   점과 글은 늘 DOM 에 있고, 어느 쪽을 보일지는 imsg-b--typing 과 CSS 가 정한다.
   그래서 JS 없이도, 쌓은 판에서도 글이 그대로 읽힌다. */
function Bubble({
  kind,
  text,
  typing,
  tailless = false,
}: {
  kind: "in" | "out";
  text: string;
  typing: boolean;
  tailless?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const was = useRef(typing);
  const running = useRef<Animation[]>([]);

  /* 점 풍선 ↔ 말 풍선(FLIP). 레이아웃은 한 번에 바꾸고, 바뀌기 전 상자에서 transform 으로
     이어 준다. 바뀌기 전 상자는 클래스를 잠깐 되돌려 같은 프레임 안에서 잰다.
     모서리는 늘어난 비율만큼 거꾸로 줄여 둥근 채로 둔다(radius / scale).
     글은 풍선이 95% 자란 뒤(0.3s)에 들어오므로 따로 역보정하지 않는다. */
  useLayoutEffect(() => {
    const el = ref.current;
    const from = was.current;
    was.current = typing;
    if (!el || from === typing || !matchMedia(STAGE_MEDIA).matches) return;
    /* 앞의 변신이 아직 돌고 있으면 먼저 끝낸다. 스크롤을 크게 굴리면 점 → 글이 120ms 안에
       연달아 온다. 도는 중에 재면 그 transform 과 줄어든 모서리 값이 섞여 들어와, 모서리가
       각진 채로 부풀었다. 우리가 건 것만 끈다 — 점의 CSS 애니메이션은 건드리지 않는다. */
    running.current.forEach((animation) => animation.cancel());
    el.classList.toggle("imsg-b--typing", from);
    const a = el.getBoundingClientRect();
    el.classList.toggle("imsg-b--typing", typing);
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const frames = Array.from({ length: 11 }, (_, k) => {
      const u = k / 10;
      const sx = a.width / b.width + (1 - a.width / b.width) * u;
      const sy = a.height / b.height + (1 - a.height / b.height) * u;
      return {
        transformOrigin: "0 0",
        transform: `translate(${(a.left - b.left) * (1 - u)}px, ${(a.top - b.top) * (1 - u)}px) scale(${sx}, ${sy})`,
        borderRadius: `${radius / sx}px / ${radius / sy}px`,
      };
    });
    /* 곡선은 애니메이션 전체에 걸고, 칸은 곡선을 지난 값(u) 기준으로 나눈다. */
    running.current = [el.animate(frames, { duration: GROW, easing: EASE })];
    const ink = typing ? null : el.querySelector(".imsg-ink");
    if (ink) running.current.push(ink.animate([{ opacity: 0 }, { opacity: 1 }], { ...INK, fill: "backwards" }));
  }, [typing]);

  const cls = [
    "imsg-b",
    `imsg-b--${kind}`,
    tailless ? "imsg-b--tailless" : "",
    typing ? "imsg-b--typing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p ref={ref} className={cls}>
      <span className="imsg-dots" role="status" aria-label="입력 중">
        <span /><span /><span />
      </span>
      <span className="imsg-ink">{text}</span>
    </p>
  );
}
