import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { flushSync } from "react-dom";

/* 스크롤 장면의 레이아웃은 CSS 가 정한다(붙임 · 쌓음). 이 미디어 쿼리가 맞을 때만
   「붙은 무대」이고, 아니면 위아래로 쌓은 판이다. 휴대폰(≤900px)과 움직임 끔은 쌓는다.
   scripting 조건 덕에 JS 를 끈 브라우저도 처음부터 쌓은 판을 받는다 — 붙은 무대는
   JS 가 진행도를 넣어야 넘어가므로, JS 없이 붙이면 첫 장면에 멈춘다.
   globals.css 의 @media 와 같은 문자열이어야 한다. 폭은 범위 문법(width > 900px)이다 —
   min-width: 901px 로 쓰면 900.5px 같은 폭(창 확대 · 축소)에서 휴대폰 쪽(max-width: 900px)과
   이쪽이 둘 다 안 맞는다. */
export const STAGE_MEDIA = "(width > 900px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)";

/* [요소 쪽 점, 화면 쪽 점] 두 쌍. motion 의 offset 과 같은 뜻이다(0 = 윗변, 1 = 아랫변).
   [[0, 0], [1, 1]] 은 "start start" → "end end", [[0, 0.82], [0, 0.45]] 는 "start 0.82" → "start 0.45". */
export type ScrollRange = readonly [readonly [number, number], readonly [number, number]];

/* 요소가 range 를 지나는 진행도(0..1)를 프레임마다 한 번 재서 요소의 --p 에 쓴다.
   React 는 다시 그리지 않는다. 값이 바뀔 때만 onProgress 를 부른다.
   media 가 맞지 않으면 재지 않고 --p 를 지운다(CSS 기본값이 쓰인다).

   onProgress 에서 바꾼 상태는 그 프레임 안에 DOM 까지 반영한다(flushSync). 그냥 두면 React 가
   한두 프레임 뒤에 그려서, 상태에 걸린 CSS 전환이 40ms 늦게 출발했다. 처음 한 번은
   useLayoutEffect 안이라 React 가 어차피 그리기 전에 반영한다 — 거기서 flushSync 를 부르면
   React 가 오류를 낸다. */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  range: ScrollRange,
  { media, onProgress }: { media: string; onProgress?: (p: number) => void },
) {
  const report = useEffectEvent((p: number, inFrame: boolean) => {
    if (!onProgress) return;
    if (inFrame) flushSync(() => onProgress(p));
    else onProgress(p);
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const [[elFrom, viewFrom], [elTo, viewTo]] = range;
    const query = matchMedia(media);
    const resize = new ResizeObserver(() => queue());
    let frame = 0;
    let last = NaN;
    let running = false;

    const draw = (inFrame: boolean) => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const view = document.documentElement.clientHeight;
      /* 시작점까지 남은 거리와 구간 길이. 스크롤 값 대신 요소 위치로 재서, 위쪽 내용이
         늘거나 줄어도 따로 다시 잴 필요가 없다. */
      const ahead = box.top + elFrom * box.height - viewFrom * view;
      const length = (elTo - elFrom) * box.height - (viewTo - viewFrom) * view;
      const p = length > 0 ? Math.min(1, Math.max(0, -ahead / length)) : ahead <= 0 ? 1 : 0;
      if (p === last) return;
      last = p;
      el.style.setProperty("--p", String(Math.round(p * 1e4) / 1e4));
      report(p, inFrame);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(() => draw(true));
    };
    const start = () => {
      if (running) return;
      running = true;
      draw(false);
      window.addEventListener("scroll", queue, { passive: true });
      window.addEventListener("resize", queue);
      resize.observe(document.body);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      last = NaN;
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      resize.disconnect();
      el.style.removeProperty("--p");
    };
    const sync = () => (query.matches ? start() : stop());

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      stop();
    };
  }, [ref, range, media]);
}
