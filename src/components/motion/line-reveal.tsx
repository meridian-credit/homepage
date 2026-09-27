"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { onceInView } from "@/lib/in-view";

/* 히어로 밑줄. 절반이 보이면 왼쪽에서 0.8s 에 그어진다.
   글 리빌과 달리 첫 화면에서도 그어진다 — 이 선은 장식이고, 로드 때 그어지는 것이
   원래 연출이다. 그래서 숨김은 CSS 가 (scripting: enabled) 일 때만 건다(globals.css).
   JS 가 없으면 처음부터 그어진 선이다. */
interface LineRevealProps {
  className?: string;
  delay?: number;
}

export default function LineReveal({ className = "h-0.5 w-24 bg-accent-bright", delay = 0 }: LineRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => {
      el.dataset.reveal = "shown";
    };
    if (typeof IntersectionObserver === "undefined") return show();
    return onceInView(el, 0.5, show);
  }, []);
  return <div ref={ref} className={className} data-reveal-line="" style={{ "--reveal-delay": `${delay}s` } as CSSProperties} />;
}
