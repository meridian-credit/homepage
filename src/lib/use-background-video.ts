"use client";
import { useEffect, type RefObject } from 'react';

/** Pause decorative footage offscreen, in background tabs, and for reduced motion. */
export function useBackgroundVideo(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    const video = root instanceof HTMLVideoElement ? root : root?.querySelector('video');
    if (!video) return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden && !query.matches) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(video);
    query.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); query.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, [ref]);
}
