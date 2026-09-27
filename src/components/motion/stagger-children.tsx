"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReveal } from "./use-reveal";

/* 묶음 리빌. 묶음이 10% 보이면 안의 StaggerItem 이 staggerDelay 초 간격으로 차례로 올라온다.
   묶음 자체는 움직이지 않는다. */
interface StaggerChildrenProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export default function StaggerChildren({ children, staggerDelay = 0.08, className }: StaggerChildrenProps) {
  const ref = useRef<HTMLDivElement>(null);
  /* 항목 차례는 DOM 이 안다. useReveal 보다 먼저 돌아 지연을 적어 둔다. */
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${index * staggerDelay}s`);
    });
  }, [staggerDelay]);
  useReveal(ref, 0.1);
  return (
    <div ref={ref} className={className} data-reveal-group="">
      {children}
    </div>
  );
}
