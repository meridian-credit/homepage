import { useEffect, type RefObject } from "react";
import { onceInView } from "@/lib/in-view";

/* 스크롤 리빌 공용. 모양(거리 · 시간 · 곡선)은 globals.css 의 [data-reveal] 규칙이 맡는다.

   서버 HTML 과 JS 전 화면은 늘 보이는 상태다. 수화 뒤 움직임이 허용되고 요소가 아직
   화면 아래에 있을 때만 data-reveal="pending"(CSS 가 숨긴 처음 상태)을 걸고, amount 만큼
   보이면 "shown" 으로 바꿔 CSS 전환을 탄다.
   이미 화면 안이나 위에 있는 요소는 건드리지 않는다. motion 판은 수화 직후 한 번 숨김으로
   갔다가 돌아와서, 첫 화면 글이 잠깐 흐려졌다(0.7 까지) 되돌아왔다.
   관찰이 끝나기 전에 떨어지면 속성을 지워 보이는 상태로 돌린다.
   React 가 다시 그리지 않도록 속성은 DOM 에 바로 쓴다. */
export function useReveal(ref: RefObject<HTMLElement | null>, amount: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (!matchMedia("screen and (prefers-reduced-motion: no-preference)").matches) return;
    if (el.getBoundingClientRect().top < document.documentElement.clientHeight) return;
    el.dataset.reveal = "pending";
    const stop = onceInView(el, amount, () => {
      el.dataset.reveal = "shown";
    });
    return () => {
      stop();
      delete el.dataset.reveal;
    };
  }, [ref, amount]);
}
