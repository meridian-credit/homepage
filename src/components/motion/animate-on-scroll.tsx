"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useReveal } from "./use-reveal";

/* 화면 아래에서 올라오며(fadeUp, 20px) 또는 제자리에서(fadeIn) 나타난다.
   0.6s, 15% 보일 때. 모양은 globals.css 의 [data-reveal-kind] 규칙, 판정은 useReveal. */
interface AnimateOnScrollProps {
  children: ReactNode;
  variant?: "fadeUp" | "fadeIn";
  delay?: number;
  className?: string;
}

export default function AnimateOnScroll({ children, variant = "fadeUp", delay = 0, className }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, 0.15);
  /* 지연은 늘 적는다. 사용자 속성은 상속되니, 안쪽 리빌이 바깥 지연을 물려받지 않게 한다. */
  return (
    <div ref={ref} className={className} data-reveal-kind={variant} style={{ "--reveal-delay": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  );
}
