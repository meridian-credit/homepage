import { useEffect, useState, type RefObject } from "react";

/* 요소가 처음 보일 때 한 번 부르고 관찰을 끝낸다. 돌려주는 함수로 미리 멈춘다.
   판정은 motion 의 inView 와 같다 — threshold 가 amount(0..1)인
   IntersectionObserver 의 isIntersecting. 리빌과 숫자 셈이 이 판정을 같이 쓴다. */
export function onceInView(el: Element, amount: number, onEnter: () => void): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      onEnter();
    },
    { threshold: amount },
  );
  io.observe(el);
  return () => io.disconnect();
}

/* 한 번이라도 보였는가. 보인 뒤에는 관찰하지 않는다. */
export function useInViewOnce(ref: RefObject<Element | null>, amount = 0): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    return onceInView(el, amount, () => setSeen(true));
  }, [ref, amount, seen]);
  return seen;
}
