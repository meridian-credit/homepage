"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* 헤더 밑 읽은 만큼 막대. 스크롤 · 창 크기 · 문서 높이가 바뀌면 프레임마다 한 번 잰다.
   Lenis 가 없어도(reduced-motion) 네이티브 스크롤로 돈다.
   motion 판의 spring(stiffness 200 · damping 50)은 시간 상수가 약 0.23s 인 뒤따름이었다.
   값을 프레임마다 새로 쓰면 CSS 전환이 그때마다 다시 시작해 비슷하게 뒤따른다(globals.css). */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = root.scrollHeight - root.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const resize = new ResizeObserver(queue);
    resize.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      resize.disconnect();
    };
  }, [pathname]);

  return <div ref={ref} className="scroll-progress absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-left" aria-hidden="true" />;
}
